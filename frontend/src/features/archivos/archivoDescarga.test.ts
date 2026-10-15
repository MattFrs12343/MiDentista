/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import {
  crearGestorDescargas, DEMORA_REVOCACION_MS, entregarBlob, errorDescarga, esDescargable,
  MENSAJES_DESCARGA, validarBlobDescarga, type DescargasPorId, type EntornoDescarga, type ResultadoDescarga,
} from "./archivoDescarga.ts";
import type { Archivo } from "./tipos.ts";

function archivo(cambios: Partial<Archivo> = {}): Archivo {
  return {
    id: "archivo", pacienteId: "paciente", clinicaId: "clinica", nombre: "Nombre original con acentos.pdf",
    ruta: "ruta-interna", mime: "application/pdf", tamano: 3, categoria: "clinico", tipoArchivo: "documento",
    descripcion: "", subidoPor: "autor", creadoEl: "2026-10-06T12:00:00Z", ...cambios,
    evolucionClinicaId: cambios.evolucionClinicaId ?? null, planTratamientoId: cambios.planTratamientoId ?? null,
  };
}
function resultado(datos = archivo()): ResultadoDescarga {
  return { archivo: datos, blob: new Blob([new Uint8Array([1, 2, 3])], { type: datos.mime }) };
}

test("descargables dependen del MIME, sin filtro por categoría ni clasificación", () => {
  for (const mime of ["image/jpeg", "image/png", "image/webp", "application/pdf"]) {
    for (const categoria of ["clinico", "administrativo", "portal"] as const) {
      assert.equal(esDescargable(archivo({ mime, categoria, tipoArchivo: "documento" })), true);
    }
  }
  assert.equal(esDescargable(archivo({ mime: "image/gif" })), false);
});

test("doble clic queda bloqueado antes de red y otro archivo descarga independientemente", async () => {
  let completar!: (valor: ResultadoDescarga) => void;
  const llamadas: string[] = [];
  const entregadas: string[] = [];
  let estados: DescargasPorId = {};
  const gestor = crearGestorDescargas("paciente", [archivo(), archivo({ id: "segunda" })], async (id) => {
    llamadas.push(id);
    return id === "archivo" ? new Promise<ResultadoDescarga>((resolve) => { completar = resolve; }) : resultado(archivo({ id }));
  }, (datos) => entregadas.push(datos.archivo.id), (actuales) => { estados = actuales; });
  const primera = gestor.descargar("archivo");
  assert.equal(estados.archivo.estado, "descargando");
  await gestor.descargar("archivo");
  await gestor.descargar("segunda");
  assert.deepEqual(llamadas, ["archivo", "segunda"]);
  assert.deepEqual(entregadas, ["segunda"]);
  assert.equal(estados.archivo.estado, "descargando");
  assert.equal(estados.segunda.estado, "inactivo");
  completar(resultado());
  await primera;
  assert.deepEqual(entregadas, ["segunda", "archivo"]);
  assert.equal(estados.archivo.estado, "inactivo");
});

test("id fuera de lista, paciente incorrecto y MIME no permitido nunca acceden a red", async () => {
  const gestor = crearGestorDescargas("paciente", [archivo({ id: "ajeno", pacienteId: "otro" }), archivo({ id: "gif", mime: "image/gif" })],
    async () => { assert.fail("No acceder a red"); }, () => assert.fail("No entregar"), () => {});
  await gestor.descargar("desconocido");
  await gestor.descargar("ajeno");
  await gestor.descargar("gif");
});

test("invalidación cancela señal y una respuesta tardía no inicia descarga ni publica estado", async () => {
  let completar!: (valor: ResultadoDescarga) => void;
  let signal!: AbortSignal;
  const estados: DescargasPorId[] = [];
  const gestor = crearGestorDescargas("paciente", [archivo()], (_id, _paciente, recibido) => {
    signal = recibido;
    return new Promise<ResultadoDescarga>((resolve) => { completar = resolve; });
  }, () => assert.fail("No entregar respuesta antigua"), (actuales) => estados.push(actuales));
  const pendiente = gestor.descargar("archivo");
  gestor.invalidar();
  assert.equal(signal.aborted, true);
  completar(resultado());
  await pendiente;
  await gestor.descargar("archivo");
  assert.equal(estados.length, 1);
  assert.equal(estados[0].archivo.estado, "descargando");
});

test("error es local, no expone detalles y permite reintentar el mismo archivo", async () => {
  let peticiones = 0;
  let estados: DescargasPorId = {};
  const entregadas: string[] = [];
  const gestor = crearGestorDescargas("paciente", [archivo(), archivo({ id: "otra" })], async (id) => {
    if (++peticiones === 1) throw { status: 403, message: "token/ruta privados" };
    return resultado(archivo({ id }));
  }, (datos) => entregadas.push(datos.archivo.id), (actuales) => { estados = actuales; });
  await gestor.descargar("archivo");
  assert.deepEqual(estados.archivo, { estado: "error", mensaje: MENSAJES_DESCARGA.sin_permiso });
  await gestor.descargar("otra");
  assert.equal(estados.archivo.estado, "error");
  await gestor.descargar("archivo");
  assert.deepEqual(entregadas, ["otra", "archivo"]);
});

test("resultado con id o paciente incompatibles no se entrega", async () => {
  for (const cambios of [{ id: "otro" }, { pacienteId: "otro" }]) {
    let estados: DescargasPorId = {};
    const gestor = crearGestorDescargas("paciente", [archivo()], async () => resultado(archivo(cambios)),
      () => assert.fail("No entregar resultado ajeno"), (actuales) => { estados = actuales; });
    await gestor.descargar("archivo");
    assert.deepEqual(estados.archivo, { estado: "error", mensaje: MENSAJES_DESCARGA.no_visible });
  }
});

function entornoSimulado(fallo?: "crearEnlace" | "agregar" | "click" | "programar") {
  const llamadas: string[] = [];
  let cleanup: (() => void) | undefined;
  let demora: number | undefined;
  const enlace = {
    href: "", download: "",
    click() { llamadas.push("click"); if (fallo === "click") throw new Error("fallo click"); },
    remove() { llamadas.push("remove"); },
  };
  const entorno: EntornoDescarga = {
    crearUrl(blob) { assert.equal(blob.size, 3); llamadas.push("createObjectURL"); return "blob:temporal"; },
    revocarUrl(url) { assert.equal(url, "blob:temporal"); llamadas.push("revokeObjectURL"); },
    crearEnlace() { llamadas.push("crearEnlace"); if (fallo === "crearEnlace") throw new Error("fallo creación"); return enlace; },
    agregarEnlace(recibido) { assert.strictEqual(recibido, enlace); llamadas.push("agregar"); if (fallo === "agregar") throw new Error("fallo agregar"); },
    programar(funcion, milisegundos) {
      llamadas.push("programar");
      if (fallo === "programar") throw new Error("fallo timer");
      cleanup = funcion; demora = milisegundos;
    },
  };
  return { entorno, llamadas, enlace, limpiar: () => cleanup?.(), demora: () => demora };
}

test("entrega usa Blob, nombre original, click y elimina enlace; revoca diferido", () => {
  const fake = entornoSimulado();
  entregarBlob(resultado(), fake.entorno);
  assert.equal(fake.enlace.href, "blob:temporal");
  assert.equal(fake.enlace.download, "Nombre original con acentos.pdf");
  assert.deepEqual(fake.llamadas, ["createObjectURL", "crearEnlace", "agregar", "click", "remove", "programar"]);
  assert.equal(fake.demora(), DEMORA_REVOCACION_MS);
  assert.equal(DEMORA_REVOCACION_MS, 60000);
  fake.limpiar();
  assert.equal(fake.llamadas.at(-1), "revokeObjectURL");
});

test("fallos previos a la entrega revocan inmediatamente y retiran enlace si existe", () => {
  for (const fallo of ["crearEnlace", "agregar", "click"] as const) {
    const fake = entornoSimulado(fallo);
    assert.throws(() => entregarBlob(resultado(), fake.entorno));
    assert.equal(fake.llamadas.at(-1), "revokeObjectURL");
    assert.equal(fake.llamadas.includes("programar"), false);
    assert.equal(fake.llamadas.includes("remove"), fallo !== "crearEnlace");
  }
});

test("si no puede programarse cleanup, la URL tampoco queda sin revocar", () => {
  const fake = entornoSimulado("programar");
  entregarBlob(resultado(), fake.entorno);
  assert.equal(fake.llamadas.at(-1), "revokeObjectURL");
});

test("validación de Blob conserva bytes y rechaza contenido inválido o demasiado grande", async () => {
  const datos = archivo();
  const original = new Blob([new Uint8Array([0, 255, 1])]);
  const normalizado = validarBlobDescarga(original, datos);
  assert.equal(normalizado.type, "application/pdf");
  assert.deepEqual(await normalizado.arrayBuffer(), await original.arrayBuffer());
  for (const blob of [null, new Blob([]), new Blob(["imagen"], { type: "image/png" }), new Blob([new Uint8Array(10485761)])]) {
    assert.throws(() => validarBlobDescarga(blob, datos), (error: Error) => error.message === MENSAJES_DESCARGA.invalida);
  }
});

test("clasifica códigos y transporte sin publicar mensajes técnicos", () => {
  assert.equal(errorDescarga({ code: "AccessDenied", status: 400 }).message, MENSAJES_DESCARGA.sin_permiso);
  assert.equal(errorDescarga({ code: "NoSuchKey", status: 400 }).message, MENSAJES_DESCARGA.no_encontrado);
  assert.equal(errorDescarga({ originalError: new TypeError("detalle privado") }).message, MENSAJES_DESCARGA.red);
  assert.equal(errorDescarga(new Error("detalle privado")).message, MENSAJES_DESCARGA.storage);
});

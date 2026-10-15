/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import { crearGestorUrls, etiquetaCategoria, etiquetaTipo, miniaturaVencida, miniaturasPendientes, necesitaMiniatura, prepararPresentacion, resolverMiniaturas } from "./archivosGaleria.ts";
import type { Archivo } from "./tipos.ts";
import { formatearFechaCorta, hoyEnIso } from "../evolucion/fechasEvolucion.ts";

function archivo(cambios: Partial<Archivo> = {}): Archivo {
  return {
    id: "foto", clinicaId: "clinica", pacienteId: "paciente", nombre: "foto.jpg", ruta: "ruta",
    mime: "image/jpeg", tamano: 1, categoria: "clinico", tipoArchivo: "fotografia",
    descripcion: "  Control  ", subidoPor: "autor", creadoEl: "2026-10-06T02:00:00Z",
    evolucionClinicaId: null, planTratamientoId: null, ...cambios,
  };
}

test("miniatura depende del MIME: fotografía, radiografía y documento escaneado sí; PDF no", () => {
  for (const tipoArchivo of ["fotografia", "radiografia", "documento"] as const) {
    for (const mime of ["image/jpeg", "image/png", "image/webp"]) {
      assert.equal(necesitaMiniatura(archivo({ tipoArchivo, mime })), true);
    }
  }
  assert.equal(necesitaMiniatura(archivo({ tipoArchivo: "documento", mime: "application/pdf" })), false);
});

test("etiquetas de clasificación y categoría son independientes", () => {
  assert.equal(etiquetaTipo(archivo()), "Fotografía clínica");
  assert.equal(etiquetaTipo(archivo({ tipoArchivo: "radiografia" })), "Radiografía");
  assert.equal(etiquetaTipo(archivo({ tipoArchivo: "documento", mime: "application/pdf" })), "Documento PDF");
  assert.equal(etiquetaTipo(archivo({ tipoArchivo: "documento" })), "Documento");
  for (const [categoria, etiqueta] of [["clinico", "Clínico"], ["administrativo", "Administrativo"], ["portal", "Portal"]] as const) {
    assert.equal(etiquetaCategoria(categoria), etiqueta);
    assert.equal(prepararPresentacion(archivo({ categoria })).tipo, "Fotografía clínica");
    assert.equal(prepararPresentacion(archivo({ categoria })).categoria, etiqueta);
  }
});

test("presentación recorta descripción y reutiliza fecha local del timestamp", () => {
  const original = archivo();
  const presentacion = prepararPresentacion(original);
  assert.equal(presentacion.descripcion, "Control");
  assert.equal(prepararPresentacion(archivo({ descripcion: "   " })).descripcion, "");
  assert.equal(presentacion.fecha, formatearFechaCorta(hoyEnIso(new Date(original.creadoEl))));
  assert.equal(original.descripcion, "  Control  ");
});

test("lista vacía no firma y pendientes incluye solo imágenes", async () => {
  assert.deepEqual(await resolverMiniaturas([], async () => { assert.fail("No firmar"); }), {});
  assert.deepEqual(miniaturasPendientes([
    archivo(), archivo({ id: "pdf", mime: "application/pdf", tipoArchivo: "documento" }),
  ]), { foto: { estado: "pendiente" } });
});

test("una URL fallida conserva archivos y aísla su estado; PDF no firma", async () => {
  const originales = [archivo(), archivo({ id: "fallida" }), archivo({ id: "pdf", mime: "application/pdf", tipoArchivo: "documento" })];
  const llamadas: string[] = [];
  const estados: string[] = [];
  const urls = await resolverMiniaturas(originales, async (item, segundos) => {
    llamadas.push(item.id);
    assert.equal(segundos, 300);
    if (item.id === "fallida") throw new Error("Storage rechaza");
    return "https://ejemplo.test/foto";
  }, () => 1000, (id, estado) => estados.push(`${id}:${estado.estado}`));
  assert.deepEqual(llamadas, ["foto", "fallida"]);
  assert.deepEqual(originales.map((item) => item.id), ["foto", "fallida", "pdf"]);
  assert.deepEqual(urls.fallida, { estado: "fallida" });
  assert.deepEqual(urls.foto, { estado: "disponible", url: "https://ejemplo.test/foto", venceEn: 271000 });
  assert.equal(estados.includes("fallida:fallida"), true);
  assert.equal("pdf" in urls, false);
});

test("respuestas en distinto orden conservan asociación y orden original", async () => {
  let terminarPrimera!: (url: string) => void;
  const originales = [archivo({ id: "primera" }), archivo({ id: "segunda" })];
  const pendientes = resolverMiniaturas(originales, (item) => item.id === "primera"
    ? new Promise<string>((resolve) => { terminarPrimera = resolve; }) : Promise.resolve("segunda-url"));
  terminarPrimera("primera-url");
  const urls = await pendientes;
  assert.deepEqual(Object.keys(urls), ["primera", "segunda"]);
  assert.deepEqual(originales.map((item) => item.id), ["primera", "segunda"]);
  assert.deepEqual(urls.primera.estado, "disponible");
  if (urls.primera.estado === "disponible") assert.equal(urls.primera.url, "primera-url");
});

test("URL vacía es fallo individual y la recarga obtiene una firma nueva", async () => {
  const fallida = await resolverMiniaturas([archivo()], async () => " ");
  assert.deepEqual(fallida.foto, { estado: "fallida" });
  const nueva = await resolverMiniaturas([archivo()], async () => "nueva-url", () => 2000);
  assert.deepEqual(nueva.foto, { estado: "disponible", url: "nueva-url", venceEn: 272000 });
});

test("vencimiento conservador permite renovar antes de los 300 segundos", async () => {
  const urls = await resolverMiniaturas([archivo()], async () => "url", () => 0);
  assert.equal(miniaturaVencida(urls.foto, 269999), false);
  assert.equal(miniaturaVencida(urls.foto, 270000), true);
  assert.equal(miniaturaVencida(urls.foto, 400000), true);
  assert.equal(miniaturaVencida({ estado: "fallida" }, 400000), false);
  assert.equal(miniaturaVencida(undefined, 400000), false);
});

test("una firma demorada fuera de la vigencia conservadora no se publica ni causa un bucle de renovación", async () => {
  let instante = 0;
  const urls = await resolverMiniaturas([archivo()], async () => {
    instante = 280000;
    return "url-demasiado-tarde";
  }, () => instante);
  assert.deepEqual(urls.foto, { estado: "fallida" });
});

test("visor reutiliza firma válida y renueva al llegar al vencimiento conservador", async () => {
  let instante = 0;
  let peticiones = 0;
  const gestor = crearGestorUrls([archivo()], async () => `url-${++peticiones}`, () => {}, () => instante);
  const primera = await gestor.asegurarUrlArchivo("foto");
  instante = 269999;
  assert.strictEqual(await gestor.asegurarUrlArchivo("foto"), primera);
  assert.equal(peticiones, 1);
  instante = 270000;
  assert.deepEqual(await gestor.asegurarUrlArchivo("foto"), { estado: "disponible", url: "url-2", venceEn: 540000 });
  assert.equal(peticiones, 2);
});

test("recuperación individual reemplaza solo la firma solicitada y mantiene las otras", async () => {
  let urls = {};
  const llamadas: string[] = [];
  const originales = [archivo(), archivo({ id: "otra" })];
  const gestor = crearGestorUrls(originales, async (item) => {
    llamadas.push(item.id);
    return `${item.id}-${llamadas.length}`;
  }, (actuales) => { urls = actuales; }, () => 0);
  const otra = await gestor.asegurarUrlArchivo("otra");
  await gestor.asegurarUrlArchivo("foto");
  const recuperada = await gestor.asegurarUrlArchivo("foto", true);
  assert.deepEqual(recuperada, { estado: "disponible", url: "foto-3", venceEn: 270000 });
  assert.strictEqual(await gestor.asegurarUrlArchivo("otra"), otra);
  assert.deepEqual(llamadas, ["otra", "foto", "foto"]);
  assert.deepEqual(Object.keys(urls), ["otra", "foto"]);
  assert.deepEqual(originales.map((item) => item.id), ["foto", "otra"]);
});

test("peticiones concurrentes del mismo archivo comparten promesa incluso al forzar", async () => {
  let completar!: (url: string) => void;
  let peticiones = 0;
  const gestor = crearGestorUrls([archivo()], () => {
    peticiones++;
    return new Promise<string>((resolve) => { completar = resolve; });
  }, () => {}, () => 0);
  const primera = gestor.asegurarUrlArchivo("foto");
  const segunda = gestor.asegurarUrlArchivo("foto", true);
  assert.strictEqual(primera, segunda);
  await Promise.resolve();
  assert.equal(peticiones, 1);
  completar("url");
  assert.deepEqual(await segunda, { estado: "disponible", url: "url", venceEn: 270000 });
});

test("firma fallida puede recuperarse y un PDF o id desconocido no solicita URL", async () => {
  let peticiones = 0;
  const gestor = crearGestorUrls([
    archivo(), archivo({ id: "pdf", mime: "application/pdf", tipoArchivo: "documento" }),
  ], async () => {
    if (++peticiones === 1) throw new Error("fallo Storage");
    return "recuperada";
  }, () => {}, () => 0);
  assert.deepEqual(await gestor.asegurarUrlArchivo("foto"), { estado: "fallida" });
  assert.deepEqual(await gestor.asegurarUrlArchivo("foto"), { estado: "disponible", url: "recuperada", venceEn: 270000 });
  assert.equal(await gestor.asegurarUrlArchivo("pdf", true), undefined);
  assert.equal(await gestor.asegurarUrlArchivo("desconocido"), undefined);
  assert.equal(peticiones, 2);
});

test("invalidar generación descarta respuestas tardías y nuevas solicitudes", async () => {
  let completar!: (url: string) => void;
  const publicados: string[] = [];
  const gestor = crearGestorUrls([archivo()], () => new Promise<string>((resolve) => { completar = resolve; }),
    (urls) => publicados.push(urls.foto.estado), () => 0);
  const pendiente = gestor.asegurarUrlArchivo("foto");
  await Promise.resolve();
  gestor.invalidar();
  completar("url-anterior");
  assert.equal(await pendiente, undefined);
  assert.deepEqual(publicados, ["pendiente"]);
  assert.equal(await gestor.asegurarUrlArchivo("foto", true), undefined);
});

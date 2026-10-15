/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import { archivoDesdeFila, archivoParaGuardar, referenciasDesdeAsociacion, rutaEnBucket, type ArchivoFila } from "./archivoMapper.ts";

const CLINICA = "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA";
const PACIENTE = "BBBBBBBB-BBBB-4BBB-8BBB-BBBBBBBBBBBB";
const AUTOR = "CCCCCCCC-CCCC-4CCC-8CCC-CCCCCCCCCCCC";

function fila(cambios: Partial<ArchivoFila> = {}): ArchivoFila {
  return {
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    clinica_id: CLINICA.toLowerCase(), paciente_id: PACIENTE.toLowerCase(),
    nombre: "Foto clínica.JPG", ruta: `${CLINICA.toLowerCase()}/${PACIENTE.toLowerCase()}/objeto.jpg`,
    mime: "image/jpeg", tamano: 12, categoria: "clinico", tipo_archivo: "fotografia",
    descripcion: null, subido_por: AUTOR.toLowerCase(), creado_en: "2026-10-04T12:00:00Z",
    evolucion_clinica_id: null, plan_tratamiento_id: null, ...cambios,
  };
}

test("fotografía y radiografía se mapean sin inferir la clasificación por MIME", () => {
  for (const tipo of ["fotografia", "radiografia"] as const) {
    const original = fila({ tipo_archivo: tipo });
    const archivo = archivoDesdeFila(original);
    assert.equal(archivo.tipoArchivo, tipo);
    assert.equal(archivo.categoria, "clinico");
    assert.equal(archivo.subidoPor, AUTOR.toLowerCase());
    assert.equal(archivo.descripcion, "");
    const payload = archivoParaGuardar(archivo);
    assert.equal(payload.tipo_archivo, tipo);
    assert.equal(payload.categoria, "clinico");
    assert.equal(payload.subido_por, original.subido_por);
    assert.equal(payload.descripcion, null);
    assert.equal("id" in payload, false);
    assert.equal("creado_en" in payload, false);
  }
});

test("la descripción escrita se recorta y vacía se guarda como null", () => {
  const archivo = archivoDesdeFila(fila());
  assert.equal(archivoParaGuardar({ ...archivo, descripcion: "   " }).descripcion, null);
  assert.equal(archivoParaGuardar({ ...archivo, descripcion: "  Control  " }).descripcion, "Control");
  assert.equal(archivoDesdeFila(fila({ descripcion: "Control" })).descripcion, "Control");
});

test("categorías y clasificaciones desconocidas producen errores explícitos", () => {
  assert.throws(() => archivoDesdeFila(fila({ tipo_archivo: "inventado" as ArchivoFila["tipo_archivo"] })), /Clasificación.*desconocida/);
  assert.throws(() => archivoDesdeFila(fila({ categoria: "inventada" as ArchivoFila["categoria"] })), /Categoría.*desconocida/);
  const archivo = archivoDesdeFila(fila());
  assert.throws(() => archivoParaGuardar({ ...archivo, tipoArchivo: "otro" as typeof archivo.tipoArchivo }), /Clasificación/);
});

test("el autor es obligatorio y los campos NOT NULL no se inventan", () => {
  assert.throws(() => archivoDesdeFila(fila({ subido_por: null as unknown as string })), /subido_por.*obligatorio/);
  assert.throws(() => archivoParaGuardar({ ...archivoDesdeFila(fila()), subidoPor: "" }), /subido_por.*obligatorios/);
  assert.throws(() => archivoDesdeFila(fila({ tamano: null as unknown as number })), /Tamaño/);
  assert.throws(() => archivoDesdeFila(fila({ creado_en: null as unknown as string })), /fecha/);
});

test("la ruta usa tres segmentos, UUID normalizados y extensión canónica", () => {
  for (const [mime, extension] of [["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]) {
    const ruta = rutaEnBucket(CLINICA, PACIENTE, mime);
    const segmentos = ruta.split("/");
    assert.equal(segmentos.length, 3);
    assert.equal(segmentos[0], CLINICA.toLowerCase());
    assert.equal(segmentos[1], PACIENTE.toLowerCase());
    assert.match(segmentos[2], new RegExp(`^[0-9a-f-]{36}\\.${extension}$`));
    assert.equal(ruta.includes("Foto clínica"), false);
  }
});

test("cada intento genera una ruta distinta sin utilizar Date.now", (contexto) => {
  contexto.mock.method(Date, "now", () => { throw new Error("No utilizar Date.now"); });
  assert.notEqual(rutaEnBucket(CLINICA, PACIENTE, "image/jpeg"), rutaEnBucket(CLINICA, PACIENTE, "image/jpeg"));
});

test("la ruta rechaza ids de demo y MIME no soportado por el módulo", () => {
  assert.throws(() => rutaEnBucket("p1", PACIENTE, "image/jpeg"), /UUID/);
  assert.throws(() => rutaEnBucket(CLINICA, PACIENTE, "text/plain"), /MIME/);
});

test("la falta de crypto.randomUUID produce un error explícito", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", { configurable: true, value: undefined });
  try {
    assert.throws(() => rutaEnBucket(CLINICA, PACIENTE, "image/jpeg"), /randomUUID.*no está disponible/);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "crypto", descriptor);
    else Reflect.deleteProperty(globalThis, "crypto");
  }
});

test("el mapper no acepta rutas que mezclen clínica y paciente", () => {
  assert.throws(() => archivoDesdeFila(fila({ ruta: "otra/clinica/foto.jpg" })), /Ruta/);
});

test("ruta PDF única de tres segmentos con UUID en minúsculas y sin nombre original", (contexto) => {
  contexto.mock.method(Date, "now", () => { throw new Error("No utilizar Date.now"); });
  const primera = rutaEnBucket(CLINICA, PACIENTE, "application/pdf");
  const segunda = rutaEnBucket(CLINICA, PACIENTE, "application/pdf");
  assert.notEqual(primera, segunda);
  const segmentos = primera.split("/");
  assert.equal(segmentos.length, 3);
  assert.equal(segmentos[0], CLINICA.toLowerCase());
  assert.equal(segmentos[1], PACIENTE.toLowerCase());
  assert.match(segmentos[2], /^[0-9a-f-]{36}\.pdf$/);
  assert.equal(primera.includes("Informe clínico"), false);
});

test("PDF se mapea como documento con categoría clínica o administrativa", () => {
  for (const categoria of ["clinico", "administrativo"] as const) {
    const original = fila({
      nombre: "Informe clínico.PDF", mime: "application/pdf", tipo_archivo: "documento", categoria,
      ruta: rutaEnBucket(CLINICA, PACIENTE, "application/pdf"),
    });
    const archivo = archivoDesdeFila(original);
    const payload = archivoParaGuardar({ ...archivo, descripcion: "   " });
    assert.equal(archivo.tipoArchivo, "documento");
    assert.equal(payload.tipo_archivo, "documento");
    assert.equal(payload.categoria, categoria);
    assert.equal(payload.nombre, original.nombre);
    assert.equal(payload.descripcion, null);
    assert.equal("id" in payload, false);
    assert.equal("creado_en" in payload, false);
  }
});

test("metadata de galería conserva timestamp completo y normaliza descripción null", () => {
  const original = fila({ creado_en: "2026-10-06T23:15:00-04:00", descripcion: null });
  const archivo = archivoDesdeFila(original);
  assert.equal(archivo.creadoEl, original.creado_en);
  assert.equal(archivo.descripcion, "");
});

test("documento escaneado con MIME de imagen sigue permitido y no cambia categoría", () => {
  const original = fila({ tipo_archivo: "documento", categoria: "administrativo", descripcion: "Escaneo" });
  const archivo = archivoDesdeFila(original);
  assert.equal(archivo.tipoArchivo, "documento");
  assert.equal(archivo.mime, "image/jpeg");
  assert.equal(archivo.categoria, "administrativo");
  assert.equal(archivo.descripcion, "Escaneo");
  assert.equal(archivoParaGuardar(archivo).tipo_archivo, "documento");
});

test("archivos anteriores tras migración son generales y referencias se mapean sin inferir", () => {
  const general = archivoDesdeFila(fila());
  assert.equal(general.evolucionClinicaId, null);
  assert.equal(general.planTratamientoId, null);
  for (const cambios of [{ evolucion_clinica_id: AUTOR.toLowerCase() }, { plan_tratamiento_id: AUTOR.toLowerCase() }]) {
    const original = fila(cambios);
    const archivo = archivoDesdeFila(original);
    const payload = archivoParaGuardar(archivo);
    assert.equal(payload.evolucion_clinica_id, original.evolucion_clinica_id);
    assert.equal(payload.plan_tratamiento_id, original.plan_tratamiento_id);
  }
});

test("mapper rechaza referencias simultáneas, UUID inválido y columnas omitidas", () => {
  assert.throws(() => archivoDesdeFila(fila({ evolucion_clinica_id: AUTOR, plan_tratamiento_id: PACIENTE })), /una asociación/);
  assert.throws(() => archivoDesdeFila(fila({ evolucion_clinica_id: "p1" })), /UUID/);
  assert.throws(() => archivoDesdeFila(fila({ plan_tratamiento_id: "p1" })), /UUID/);
  assert.throws(() => archivoDesdeFila(fila({ evolucion_clinica_id: undefined as unknown as null })), /UUID/);
});

test("DTO discriminado se normaliza a null/UUID sin aceptar ambos destinos", () => {
  assert.deepEqual(referenciasDesdeAsociacion(undefined), { evolucion_clinica_id: null, plan_tratamiento_id: null });
  assert.deepEqual(referenciasDesdeAsociacion({ tipo: "general" }), { evolucion_clinica_id: null, plan_tratamiento_id: null });
  assert.deepEqual(referenciasDesdeAsociacion({ tipo: "evolucion", evolucionClinicaId: AUTOR }), { evolucion_clinica_id: AUTOR.toLowerCase(), plan_tratamiento_id: null });
  assert.deepEqual(referenciasDesdeAsociacion({ tipo: "plan", planTratamientoId: AUTOR }), { evolucion_clinica_id: null, plan_tratamiento_id: AUTOR.toLowerCase() });
  assert.throws(() => referenciasDesdeAsociacion({ tipo: "general", planTratamientoId: AUTOR }), /inválida/i);
  assert.throws(() => referenciasDesdeAsociacion({ tipo: "plan", planTratamientoId: AUTOR, evolucionClinicaId: PACIENTE }), /simultánea/);
});

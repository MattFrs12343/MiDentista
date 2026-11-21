import test from "node:test";
import assert from "node:assert/strict";
import { ejecutarSubida, type DependenciasSubida, type Intento, type Operacion } from "./flujoSubida.ts";
import { LIMITE_PRODUCCION, MAX_ARCHIVO, exigirAlcance, exigirAuditor, hayEspacio, validarContenido,
  type DatosArchivo, type PerfilReal } from "./contrato.ts";

const C = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const P = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const A = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const datos: DatosArchivo = { nombre: "foto.jpg", mime: "image/jpeg", tipo_archivo: "fotografia", descripcion: "",
  evolucion_clinica_id: null, plan_tratamiento_id: null };
const perfil: PerfilReal = { id: A, auth_user_id: A, clinica_id: C, activo: true, rol: "odontologo" };
const intento = (operacion = crypto.randomUUID()): Intento => ({ actor: A, paciente: P, operacion,
  bytes: new Uint8Array([255,216,255,1]), sha256: "a".repeat(64), datos });

test("cuota decimal: espacio, límite exacto, un byte por encima y configuración pequeña", () => {
  assert.equal(LIMITE_PRODUCCION, 5_000_000_000);
  assert.equal(hayEspacio(4_999_999_000, 0, 500, LIMITE_PRODUCCION), true);
  assert.equal(hayEspacio(4_999_999_000, 0, 1000, LIMITE_PRODUCCION), true);
  assert.equal(hayEspacio(4_999_999_000, 0, 1001, LIMITE_PRODUCCION), false);
  assert.equal(hayEspacio(80, 10, 10, 100), true);
  assert.equal(hayEspacio(80, 10, 11, 100), false);
  assert.equal(hayEspacio(0, 0, NaN, 100), false);
  assert.equal(hayEspacio(0, 0, 0, 100), false);
});

/** Modelo en memoria: reserva cambia el contador ANTES de ceder ejecución.
 * Ilustra la condición atómica, no sustituye la prueba de locks PostgreSQL. */
function entorno(opciones: { limite?: number; ocupados?: number; falloUpload?: unknown; falloConfirmacion?: boolean; falloMarca?: boolean } = {}) {
  let ocupados = opciones.ocupados ?? 0;
  let reservados = 0;
  let uploads = 0;
  let confirmaciones = 0;
  const ops = new Map<string, Operacion>();
  const deps: DependenciasSubida = {
    async reservar(i) {
      const existente = ops.get(i.operacion);
      if (existente) return { ...existente };
      if (!hayEspacio(ocupados, reservados, i.bytes.length, opciones.limite ?? LIMITE_PRODUCCION)) throw { message: "CUOTA_EXCEDIDA" };
      reservados += i.bytes.length;
      const op: Operacion = { id: i.operacion, ruta: `${C}/${P}/${i.operacion}.jpg`, estado: "reservada" };
      ops.set(i.operacion, op);
      return { ...op };
    },
    async iniciar(i) { const op = ops.get(i.operacion)!; if (op.estado !== "reservada") return false; op.estado = "subiendo"; return true; },
    async subir() { uploads++; if (opciones.falloUpload) throw opciones.falloUpload; },
    async confirmar(i) {
      if (opciones.falloConfirmacion) throw new Error("timeout");
      const op = ops.get(i.operacion)!;
      if (op.estado !== "confirmada") { confirmaciones++; reservados -= i.bytes.length; ocupados += i.bytes.length; op.estado = "confirmada"; }
      return { id: i.operacion, ruta: op.ruta, tamano: i.bytes.length };
    },
    async rechazoDefinitivo(i) { const op = ops.get(i.operacion)!; op.estado = "cancelada"; reservados -= i.bytes.length; return true; },
    async marcarIncierta(i) { if (opciones.falloMarca) throw new Error("red"); const op = ops.get(i.operacion)!; if (op.estado === "subiendo") op.estado = "incierta"; },
  };
  return { deps, ops, leer: () => ({ ocupados, reservados, uploads, confirmaciones }) };
}

test("subida con espacio confirma y actualiza consumo sin doble contabilización", async () => {
  const e = entorno(); const i = intento();
  assert.ok("archivo" in await ejecutarSubida(i, e.deps));
  assert.deepEqual(e.leer(), { ocupados: 4, reservados: 0, uploads: 1, confirmaciones: 1 });
});
test("reserva rechazada no crea objeto y devuelve código claro", async () => {
  const e = entorno({ limite: 3 });
  const r = await ejecutarSubida(intento(), e.deps);
  assert.ok("codigo" in r); assert.equal(r.codigo, "CUOTA_EXCEDIDA"); assert.equal(r.requiereRevision, false);
  assert.equal(e.leer().uploads, 0); assert.equal(e.leer().reservados, 0);
});
test("confirmación e idempotencia no duplican upload ni consumo", async () => {
  const e = entorno(); const i = intento();
  await ejecutarSubida(i, e.deps); await ejecutarSubida(i, e.deps);
  assert.deepEqual(e.leer(), { ocupados: 4, reservados: 0, uploads: 1, confirmaciones: 1 });
});
test("dos operaciones simultáneas conceptuales: quedan 6, dos de 4, solo una reserva", async () => {
  const e = entorno({ limite: 6 });
  const r = await Promise.all([ejecutarSubida(intento(), e.deps), ejecutarSubida(intento(), e.deps)]);
  assert.equal(r.filter((v) => "archivo" in v).length, 1);
  assert.equal(r.filter((v) => "codigo" in v && v.codigo === "CUOTA_EXCEDIDA").length, 1);
  assert.equal(e.leer().uploads, 1);
});
test("confirmación incierta conserva bytes y nunca elimina objetos", async () => {
  const e = entorno({ falloConfirmacion: true }); const i = intento();
  const r = await ejecutarSubida(i, e.deps);
  assert.ok("codigo" in r); assert.equal(r.codigo, "OPERACION_INCIERTA"); assert.equal(r.requiereRevision, true);
  assert.equal(e.leer().reservados, 4); assert.equal(e.ops.get(i.operacion)?.estado, "incierta");
  assert.equal("remove" in e.deps, false);
});
test("timeout/409/500 Storage conservan reserva, sin nuevo upload al consultar otra vez", async () => {
  for (const falloUpload of [new Error("timeout"), { statusCode: "409" }, { statusCode: "500" }]) {
    const e = entorno({ falloUpload, falloConfirmacion: true }); const i = intento();
    await ejecutarSubida(i, e.deps); await ejecutarSubida(i, e.deps);
    assert.equal(e.leer().reservados, 4); assert.equal(e.leer().uploads, 1);
  }
});
test("rechazo HTTP definitivo del único upload cancela reserva con confirmación SQL", async () => {
  const e = entorno({ falloUpload: { statusCode: "413" } }); const i = intento();
  const r = await ejecutarSubida(i, e.deps);
  assert.ok("codigo" in r); assert.equal(r.codigo, "SUBIDA_RECHAZADA");
  assert.equal(e.leer().reservados, 0); assert.equal(e.ops.get(i.operacion)?.estado, "cancelada");
});
test("si cancelar un rechazo falla, no se anuncia liberación segura", async () => {
  const e = entorno({ falloUpload: { statusCode: "403" } });
  e.deps.rechazoDefinitivo = async () => { throw new Error("red"); };
  const r = await ejecutarSubida(intento(), e.deps);
  assert.ok("codigo" in r); assert.equal(r.requiereRevision, true); assert.equal(e.leer().reservados, 4);
});
test("fallar al marcar incierta conserva el estado durable subiendo y los bytes", async () => {
  const e = entorno({ falloConfirmacion: true, falloMarca: true }); const i = intento();
  await ejecutarSubida(i, e.deps);
  assert.equal(e.ops.get(i.operacion)?.estado, "subiendo"); assert.equal(e.leer().reservados, 4);
});
test("cuota/actor denegados y payload idempotente incompatible no inician upload", async () => {
  for (const error of [{ code: "42501", message: "privado" }, { message: "IDEMPOTENCIA_INCOMPATIBLE" }]) {
    const e = entorno(); e.deps.reservar = async () => { throw error; };
    const r = await ejecutarSubida(intento(), e.deps);
    assert.ok("codigo" in r); assert.notEqual(r.codigo, "CUOTA_EXCEDIDA"); assert.equal(e.leer().uploads, 0);
  }
});
test("una operación incierta puede confirmarse después sin repetir transferencia", async () => {
  const e = entorno({ falloConfirmacion: true }); const i = intento();
  await ejecutarSubida(i, e.deps);
  e.deps.confirmar = async () => ({ id: i.operacion });
  assert.ok("archivo" in await ejecutarSubida(i, e.deps)); assert.equal(e.leer().uploads, 1);
});
test("seguridad clínica A/B y perfil inactivo: backend no usa clínica arbitraria", () => {
  const paciente = { id: P, clinica_id: C, perfil_id: null };
  assert.doesNotThrow(() => exigirAlcance(perfil, paciente, datos));
  assert.throws(() => exigirAlcance(perfil, { ...paciente, clinica_id: P }, datos), /ACCESO/);
  assert.throws(() => exigirAlcance({ ...perfil, activo: false }, paciente, datos), /ACCESO/);
});
test("recepción no gana evoluciones; odontologo_admin mantiene acceso y paciente no asocia", () => {
  const paciente = { id: P, clinica_id: C, perfil_id: A };
  const asociada = { ...datos, evolucion_clinica_id: A };
  assert.throws(() => exigirAlcance({ ...perfil, rol: "recepcionista" }, paciente, asociada), /ACCESO/);
  assert.doesNotThrow(() => exigirAlcance({ ...perfil, rol: "odontologo_admin" }, paciente, asociada));
  assert.throws(() => exigirAlcance({ ...perfil, rol: "paciente" }, paciente, asociada), /ACCESO/);
  assert.doesNotThrow(() => exigirAlcance({ ...perfil, rol: "paciente" }, paciente, datos));
});
test("auditoría global solo superadmin activo, ni siquiera odontologo_admin", () => {
  for (const rol of ["paciente", "recepcionista", "odontologo", "odontologo_admin"]) assert.throws(() => exigirAuditor({ ...perfil, rol }), /DENEGADA/);
  assert.doesNotThrow(() => exigirAuditor({ ...perfil, rol: "superadmin" }));
  assert.throws(() => exigirAuditor({ ...perfil, rol: "superadmin", activo: false }), /DENEGADA/);
});
test("tamaño real y firmas binarias JPEG/PNG/WEBP/PDF, no solo MIME declarado", () => {
  validarContenido(new Uint8Array([255,216,255]), datos);
  validarContenido(new Uint8Array([137,80,78,71,13,10,26,10]), { ...datos, nombre: "f.png", mime: "image/png" });
  validarContenido(new TextEncoder().encode("RIFF0000WEBP"), { ...datos, nombre: "f.webp", mime: "image/webp" });
  validarContenido(new TextEncoder().encode("%PDF-1.7"), { ...datos, nombre: "f.pdf", mime: "application/pdf", tipo_archivo: "documento" });
  assert.throws(() => validarContenido(new TextEncoder().encode("script"), datos), /INVALIDO/);
  assert.throws(() => validarContenido(new Uint8Array(0), datos), /INVALIDO/);
  assert.throws(() => validarContenido(new Uint8Array(MAX_ARCHIVO + 1), datos), /INVALIDO/);
  const maximo = new Uint8Array(MAX_ARCHIVO); maximo.set([255,216,255]);
  assert.doesNotThrow(() => validarContenido(maximo, datos));
});

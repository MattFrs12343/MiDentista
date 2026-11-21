import assert from "node:assert/strict";
import test from "node:test";
import { compararInventario, type ObjetoInventario, type RegistroInventario } from "./archivoHuerfanos.ts";

const ahora = Date.parse("2026-11-20T12:00:00Z");
const objeto = (name = "clinica-a/paciente/objeto.jpg"): ObjetoInventario => ({ name, bucket_id: "archivos-clinica", archived_at: null, created_at: "2026-11-01T00:00:00Z" });
const fila = (ruta = objeto().name): RegistroInventario => ({ ruta, clinica_id: ruta.split("/")[0], creado_en: "2026-11-01T00:00:00Z" });
const comparar = (o: ObjetoInventario[], f: RegistroInventario[]) => compararInventario(o, f, { completo: true, ahora });

test("objeto vigente con fila correcta no es huérfano", () => assert.deepEqual(comparar([objeto()], [fila()]).candidatos, []));
test("objeto vigente sin fila se reporta como A", () => assert.equal(comparar([objeto()], []).candidatos[0].tipo, "A"));
test("fila sin objeto vigente se reporta como B", () => assert.equal(comparar([], [fila()]).candidatos[0].tipo, "B"));
test("dos clínicas y filtro exacto no mezclan rutas", () => {
  const objetos = [objeto(), objeto("clinica-b/paciente/objeto.jpg")];
  const r = compararInventario(objetos, [fila()], { completo: true, ahora, clinicaId: "clinica-b" });
  assert.equal(r.candidatos.length, 1); assert.equal(r.candidatos[0].clinicaId, "clinica-b");
});
test("qr-cobros y cualquier otro bucket se ignoran", () => {
  assert.deepEqual(comparar([{ ...objeto(), bucket_id: "qr-cobros" }], []).candidatos, []);
  assert.equal(comparar([{ ...objeto(), bucket_id: "otro" }], [fila()]).candidatos[0].tipo, "B");
});
test("archivo archivado no acredita objeto vigente y nunca se propone como A", () => {
  const archivado = { ...objeto(), archived_at: "2026-11-10T00:00:00Z" };
  assert.deepEqual(comparar([archivado], []).candidatos, []);
  assert.equal(comparar([archivado], [fila()]).candidatos[0].tipo, "B");
  assert.deepEqual(comparar([archivado, objeto()], [fila()]).candidatos, []);
});
test("inventario incompleto no prueba ausencia en ninguno de los dos sentidos", () => {
  const r = compararInventario([objeto()], [fila("otra/ruta")], { completo: false, ahora });
  assert.equal(r.estado, "indeterminado"); assert.deepEqual(r.candidatos, []);
});
test("subida reciente, operación pendiente y fecha desconocida son indeterminados", () => {
  assert.equal(comparar([{ ...objeto(), created_at: new Date(ahora).toISOString() }], []).candidatos[0].tipo, "indeterminado");
  assert.equal(compararInventario([objeto()], [], { completo: true, ahora, pendientes: [objeto().name] }).candidatos[0].motivo, "operacion_pendiente");
  assert.equal(comparar([{ ...objeto(), created_at: null }], []).candidatos[0].motivo, "fecha_desconocida");
});
test("detección no muta ni elimina ningún objeto o registro", () => {
  const o = Object.freeze(objeto()); const f = Object.freeze(fila("otra/ruta"));
  const objetos = Object.freeze([o]); const filas = Object.freeze([f]);
  const copia = JSON.stringify([objetos, filas]);
  assert.equal(compararInventario(objetos, filas, { completo: true, ahora }).candidatos.length, 2);
  assert.equal(JSON.stringify([objetos, filas]), copia);
});

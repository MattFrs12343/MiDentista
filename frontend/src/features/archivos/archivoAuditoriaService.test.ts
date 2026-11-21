import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cargarAuditoriaArchivos } from "./archivoAuditoriaService.ts";

const C = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const reporte = { estado: "completo", fecha: "2026-11-20T00:00:00Z", fuente: "catalogo_storage", totalCandidatos: 1,
  candidatos: [{ ruta: `${C}/paciente/objeto.jpg`, clinicaId: C, tipo: "A", fecha: null, motivo: null }] };
const cliente = (data: unknown = reporte, error: unknown = null) => ({ functions: {
  invoke: async (nombre: string, opciones: { body: unknown }) => {
    assert.equal(nombre, "archivos"); assert.deepEqual(opciones.body, { accion: "auditar" });
    return { data, error };
  },
} } as unknown as SupabaseClient);
test("reporte administrativo se obtiene sin ninguna API de escritura o borrado", async () => {
  assert.deepEqual(await cargarAuditoriaArchivos(undefined, cliente()), reporte);
});
test("inventario truncado/indeterminado no publica falsos A o B", async () => {
  const r = await cargarAuditoriaArchivos(undefined, cliente({ ...reporte, estado: "indeterminado" }));
  assert.deepEqual(r.candidatos, []); assert.equal(r.estado, "indeterminado");
});
test("denegación administrativa, error y respuesta nula no son inventario vacío exitoso", async () => {
  for (const c of [cliente(null), cliente({ codigo: "ACCESO_DENEGADO" }), cliente(reporte, { message: "403" })]) {
    await assert.rejects(cargarAuditoriaArchivos(undefined, c));
  }
  await assert.rejects(cargarAuditoriaArchivos("demo", {} as SupabaseClient));
});

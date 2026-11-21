import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cargarCuotaArchivos, disponibleCuota, formatearBytesCuota, validarCuota } from "./archivoCuotaService.ts";
import { mensajePublicoSubida } from "./patientFilesSection.ts";

const C = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const cuota = { clinicaId: C, limiteBytes: 5_000_000_000, bytesOcupados: 1000, bytesReservados: 2000, actualizadoEn: "2026-11-20T12:00:00Z" };
function cliente(data: unknown = cuota, error: unknown = null) {
  return { rpc: async (nombre: string, parametros: unknown) => {
    assert.equal(nombre, "archivos_c4_cuota"); assert.deepEqual(parametros, { p_clinica: C });
    return { data, error };
  } } as unknown as SupabaseClient;
}
test("cuota usa RPC autorizada, devuelve bytes y cuenta reservas en disponibilidad", async () => {
  assert.deepEqual(await cargarCuotaArchivos(C, cliente()), cuota);
  assert.equal(disponibleCuota(cuota), 4_999_997_000);
  assert.equal(formatearBytesCuota(5_000_000_000), "5 GB");
});
test("cuota configurable y sobreconsumo anterior no producen disponibles negativos", () => {
  assert.equal(disponibleCuota({ ...cuota, limiteBytes: 3000 }), 0);
  assert.equal(disponibleCuota({ ...cuota, limiteBytes: 2000 }), 0);
  assert.equal(validarCuota({ ...cuota, limiteBytes: 10_000 }, C).limiteBytes, 10_000);
});
test("UUID demo, respuesta null, error RLS y clínica ajena no se convierten en uso cero", async () => {
  await assert.rejects(cargarCuotaArchivos("p1", {} as SupabaseClient));
  await assert.rejects(cargarCuotaArchivos(C, cliente(null)));
  await assert.rejects(cargarCuotaArchivos(C, cliente(cuota, { code: "42501" })));
  assert.throws(() => validarCuota({ ...cuota, clinicaId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }, C));
  for (const bytesOcupados of [-1, NaN, Infinity, 1.1]) assert.throws(() => validarCuota({ ...cuota, bytesOcupados }, C));
});
test("recargar después de éxito refleja aumento de consumo y mensaje de cuota no filtra SQL", async () => {
  const antes = await cargarCuotaArchivos(C, cliente());
  const despues = await cargarCuotaArchivos(C, cliente({ ...cuota, bytesOcupados: 1500 }));
  assert.equal(despues.bytesOcupados - antes.bytesOcupados, 500);
  assert.equal(mensajePublicoSubida({ etapa: "cuota", requiereRevision: false }), "No hay espacio suficiente en el almacenamiento de la clínica.");
});

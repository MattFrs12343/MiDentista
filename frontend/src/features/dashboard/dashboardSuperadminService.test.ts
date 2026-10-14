/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cargarResumenSuperadmin } from "./dashboardSuperadminService.ts";

interface Respuesta {
  data: unknown;
  error: { message: string } | null;
}

/**
 * Simula respuestas PostgREST por tabla, sin conectar a una base ni usar
 * credenciales. El servicio hace `from(tabla).select(columnas)` y espera la
 * promesa directamente (no usa `.single()` ni `.limit()`).
 */
function clienteSimulado(respuestas: Record<string, Respuesta>) {
  const llamadas: { tabla: string; columnas: string }[] = [];
  const cliente = {
    from(tabla: string) {
      return {
        select(columnas: string) {
          llamadas.push({ tabla, columnas });
          return Promise.resolve(respuestas[tabla] ?? { data: [], error: null });
        },
      };
    },
  } as unknown as SupabaseClient;
  return { cliente, llamadas };
}

test("consulta las columnas mínimas y resume clínicas y usuarios", async () => {
  const { cliente, llamadas } = clienteSimulado({
    clinicas: { data: [{ activo: true }, { activo: false }], error: null },
    perfiles: {
      data: [{ rol: "superadmin", activo: true }, { rol: "paciente", activo: false }],
      error: null,
    },
  });

  const resumen = await cargarResumenSuperadmin(cliente);

  assert.deepEqual(resumen, {
    clinicas: { total: 2, activas: 1 },
    usuarios: { total: 2, activos: 1 },
    usuariosPorRol: {
      total: 2,
      items: [
        { rol: "paciente", cantidad: 1 },
        { rol: "superadmin", cantidad: 1 },
      ],
    },
    clinicasPorEstado: { activas: 1, inactivas: 1, total: 2 },
  });
  assert.deepEqual(llamadas, [
    { tabla: "clinicas", columnas: "activo" },
    { tabla: "perfiles", columnas: "rol, activo" },
  ]);
});

test("las agregaciones de gráficos salen de las mismas filas, sin consultas extra", async () => {
  const { cliente, llamadas } = clienteSimulado({
    clinicas: {
      data: [{ activo: true }, { activo: true }, { activo: false }],
      error: null,
    },
    perfiles: {
      data: [
        { rol: "odontologo", activo: true },
        { rol: "odontologo", activo: false },
        { rol: "recepcionista", activo: true },
      ],
      error: null,
    },
  });

  const resumen = await cargarResumenSuperadmin(cliente);

  assert.deepEqual(resumen.clinicasPorEstado, { activas: 2, inactivas: 1, total: 3 });
  assert.deepEqual(resumen.usuariosPorRol, {
    total: 3,
    items: [
      { rol: "odontologo", cantidad: 2 },
      { rol: "recepcionista", cantidad: 1 },
    ],
  });
  // Sigue siendo una única lectura por tabla: los gráficos no disparan otra.
  assert.equal(llamadas.length, 2);
});

test("un SELECT vacío (posible RLS) devuelve ceros, no un error", async () => {
  const { cliente } = clienteSimulado({
    clinicas: { data: [], error: null },
    perfiles: { data: [], error: null },
  });
  assert.deepEqual(await cargarResumenSuperadmin(cliente), {
    clinicas: { total: 0, activas: 0 },
    usuarios: { total: 0, activos: 0 },
    usuariosPorRol: { total: 0, items: [] },
    clinicasPorEstado: { activas: 0, inactivas: 0, total: 0 },
  });
});

test("error al consultar clínicas se propaga y no sigue con usuarios", async () => {
  const { cliente, llamadas } = clienteSimulado({
    clinicas: { data: null, error: { message: "permission denied" } },
    perfiles: { data: [], error: null },
  });
  await assert.rejects(cargarResumenSuperadmin(cliente), /clínicas.*permission denied/);
  assert.equal(llamadas.length, 1);
});

test("error al consultar usuarios se propaga", async () => {
  const { cliente } = clienteSimulado({
    clinicas: { data: [], error: null },
    perfiles: { data: null, error: { message: "permission denied" } },
  });
  await assert.rejects(cargarResumenSuperadmin(cliente), /usuarios.*permission denied/);
});

test("una respuesta sin data válida no se trata como éxito", async () => {
  const sinClinicas = clienteSimulado({
    clinicas: { data: null, error: null },
    perfiles: { data: [], error: null },
  });
  await assert.rejects(cargarResumenSuperadmin(sinClinicas.cliente), /clínicas válido/);

  const sinPerfiles = clienteSimulado({
    clinicas: { data: [], error: null },
    perfiles: { data: null, error: null },
  });
  await assert.rejects(cargarResumenSuperadmin(sinPerfiles.cliente), /usuarios válido/);
});

test("sin configuración de Supabase el error explica qué falta", async () => {
  await assert.rejects(cargarResumenSuperadmin(), /frontend\/\.env\.local/);
});

/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cargarPagosPendientes } from "./dashboardRecepcionService.ts";

interface Respuesta {
  data: unknown;
  error: { message: string } | null;
}

interface Llamada {
  esquema: string;
  tabla: string;
  columnas: string;
  filtro?: [string, string];
  orden?: [string, Record<string, unknown>];
}

/**
 * Simula PostgREST sin conectar a una base. El servicio hace
 * `schema("public").from("pagos").select(columnas).eq(...).order(...)` y espera
 * la promesa del `order`.
 */
function clienteSimulado(respuesta: Respuesta) {
  const llamadas: Llamada[] = [];
  const cliente = {
    schema(esquema: string) {
      return {
        from(tabla: string) {
          return {
            select(columnas: string) {
              const consulta: { filtro?: [string, string] } = {};
              const orden = (columna: string, opciones: Record<string, unknown>) => {
                llamadas.push({
                  esquema,
                  tabla,
                  columnas,
                  filtro: consulta.filtro,
                  orden: [columna, opciones],
                });
                return Promise.resolve(respuesta);
              };
              return {
                eq(campo: string, valor: string) {
                  consulta.filtro = [campo, valor];
                  return { order: orden };
                },
                order: orden,
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;
  return { cliente, llamadas };
}

test("pide solo los pagos pendientes de la clínica y mapea las filas", async () => {
  const { cliente, llamadas } = clienteSimulado({
    data: [
      {
        id: "11111111-1111-1111-1111-111111111111",
        clinica_id: "aaaaaaa1-1111-1111-1111-111111111111",
        paciente_id: "bbbbbbb2-2222-2222-2222-222222222222",
        presupuesto_id: null,
        monto: "150.00",
        metodo_pago: "efectivo",
        fecha_pago: "2026-10-01",
        codigo_referencia: null,
        notas: null,
        estado: "pendiente",
        registrado_por: null,
        creado_en: "2026-10-01T10:00:00Z",
      },
    ],
    error: null,
  });

  const pagos = await cargarPagosPendientes(cliente);

  assert.equal(pagos.length, 1);
  assert.equal(pagos[0].id, "11111111-1111-1111-1111-111111111111");
  assert.equal(pagos[0].pacienteId, "bbbbbbb2-2222-2222-2222-222222222222");
  assert.equal(pagos[0].monto, "150.00");
  assert.equal(pagos[0].fechaPago, "2026-10-01");
  assert.equal(pagos[0].estado, "pendiente");
  // `notas` nulo se normaliza a cadena vacía (mapper del módulo 09).
  assert.equal(pagos[0].notas, "");

  assert.equal(llamadas.length, 1);
  assert.equal(llamadas[0].esquema, "public");
  assert.equal(llamadas[0].tabla, "pagos");
  assert.deepEqual(llamadas[0].filtro, ["estado", "pendiente"]);
  assert.deepEqual(llamadas[0].orden, ["fecha_pago", { ascending: true }]);
  assert.ok(llamadas[0].columnas.includes("monto"));
});

test("un SELECT vacío (posible RLS) devuelve una lista vacía, no un error", async () => {
  const { cliente } = clienteSimulado({ data: [], error: null });
  assert.deepEqual(await cargarPagosPendientes(cliente), []);
});

test("un error de lectura se propaga con su mensaje", async () => {
  const { cliente } = clienteSimulado({ data: null, error: { message: "permission denied" } });
  await assert.rejects(cargarPagosPendientes(cliente), /pendientes.*permission denied/);
});

test("una respuesta sin data válida no se trata como éxito", async () => {
  const { cliente } = clienteSimulado({ data: null, error: null });
  await assert.rejects(cargarPagosPendientes(cliente), /pagos válido/);
});

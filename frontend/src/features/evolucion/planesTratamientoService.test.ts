/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cargarPlanes, cargarProcedimientos } from "./planesTratamientoService.ts";
import {
  etiquetaDeProcedimiento,
  planDesdeFila,
  procedimientoDesdeFila,
  referenciaDesdeSeleccion,
  seleccionDesdeReferencia,
  SIN_PLAN,
  tituloDePlan,
  type PlanTratamientoFila,
  type ProcedimientoTratamientoFila,
} from "./planesTratamientoMapper.ts";
import type { PlanTratamiento } from "./tipos.ts";

const PACIENTE = "22222222-2222-4222-8222-222222222222";
const PLAN = "55555555-5555-4555-8555-555555555555";
const PROCEDIMIENTO = "66666666-6666-4666-8666-666666666666";

function filaPlan(sobrescritas: Partial<PlanTratamientoFila> = {}): PlanTratamientoFila {
  return {
    id: PLAN,
    clinica_id: "11111111-1111-4111-8111-111111111111",
    paciente_id: PACIENTE,
    odontologo_id: "33333333-3333-4333-8333-333333333333",
    titulo: "Restauración del molar superior derecho",
    estado: "en_proceso",
    costo_total: "450000.00",
    notas: null,
    creado_en: "2026-09-01T10:00:00Z",
    actualizado_en: "2026-09-20T10:00:00Z",
    ...sobrescritas,
  };
}

function filaProcedimiento(
  sobrescritas: Partial<ProcedimientoTratamientoFila> = {},
): ProcedimientoTratamientoFila {
  return {
    id: PROCEDIMIENTO,
    clinica_id: "11111111-1111-4111-8111-111111111111",
    plan_tratamiento_id: PLAN,
    servicio_id: null,
    numero_pieza: 16,
    descripcion: "Obturación con resina",
    prioridad: "normal",
    costo: "180000.00",
    estado: "pendiente",
    creado_en: "2026-09-01T10:05:00Z",
    ...sobrescritas,
  };
}

/** Simula PostgREST para las dos tablas, sin base de datos ni credenciales. */
function clienteSimulado({
  filasPlan = [],
  filasProcedimiento = [],
  errorLectura = null,
}: {
  filasPlan?: PlanTratamientoFila[];
  filasProcedimiento?: ProcedimientoTratamientoFila[];
  errorLectura?: { message: string } | null;
} = {}) {
  const llamadas: {
    tabla: string;
    columnas?: string;
    filtros: [string, string][];
    orden?: [string, string, boolean];
  }[] = [];

  const cliente = {
    schema(nombre: string) {
      assert.equal(nombre, "public");
      return {
        from(nombreTabla: string) {
          const llamada: (typeof llamadas)[number] = { tabla: nombreTabla, filtros: [] };
          llamadas.push(llamada);
          const consulta = {
            select(columnas: string) { llamada.columnas = columnas; return consulta; },
            eq(campo: string, valor: string) { llamada.filtros.push([campo, valor]); return consulta; },
            order(campo: string, opciones: { ascending: boolean }) {
              llamada.orden = [campo, opciones.ascending ? "asc" : "desc", opciones.ascending];
              const filas = nombreTabla === "planes_tratamiento" ? filasPlan : filasProcedimiento;
              return Promise.resolve({ data: filas, error: errorLectura });
            },
          };
          return consulta;
        },
      };
    },
  } as unknown as SupabaseClient;

  return { cliente, llamadas };
}

test("los ids de la demo se rechazan antes de tocar la red", async () => {
  const { cliente, llamadas } = clienteSimulado();
  await assert.rejects(cargarPlanes("p1", cliente), /UUID real/);
  await assert.rejects(cargarPlanes("p_123", cliente), /UUID real/);
  await assert.rejects(cargarProcedimientos("plan_1", cliente), /UUID real/);
  assert.equal(llamadas.length, 0);
});

test("los planes se piden por paciente, del más reciente al más antiguo", async () => {
  const { cliente, llamadas } = clienteSimulado({
    filasPlan: [filaPlan(), filaPlan({ id: "77777777-7777-4777-8777-777777777777" })],
  });
  const resultado = await cargarPlanes(PACIENTE, cliente);
  assert.equal(resultado.length, 2);
  assert.equal(llamadas[0].tabla, "planes_tratamiento");
  assert.deepEqual(llamadas[0].filtros, [["paciente_id", PACIENTE]]);
  assert.deepEqual(llamadas[0].orden, ["creado_en", "desc", false]);
  assert.equal(llamadas[0].columnas?.includes("titulo"), true);
});

test("los procedimientos se piden por plan y en el orden en que se agregaron", async () => {
  const { cliente, llamadas } = clienteSimulado({ filasProcedimiento: [filaProcedimiento()] });
  await cargarProcedimientos(PLAN, cliente);
  assert.equal(llamadas[0].tabla, "procedimientos_tratamiento");
  assert.deepEqual(llamadas[0].filtros, [["plan_tratamiento_id", PLAN]]);
  assert.deepEqual(llamadas[0].orden, ["creado_en", "asc", true]);
});

test("un SELECT vacío no es un error: se devuelve una lista vacía", async () => {
  const vacio = clienteSimulado({ filasPlan: [], filasProcedimiento: [] });
  assert.deepEqual(await cargarPlanes(PACIENTE, vacio.cliente), []);
  assert.deepEqual(await cargarProcedimientos(PLAN, vacio.cliente), []);
  // Un error real de RLS sí se propaga, y con su mensaje original.
  const rls = clienteSimulado({ errorLectura: { message: "permission denied for table planes_tratamiento" } });
  await assert.rejects(cargarPlanes(PACIENTE, rls.cliente), /permission denied/);
});

test("el mapper traduce el numeric de PostgREST a número", () => {
  assert.equal(planDesdeFila(filaPlan()).costoTotal, 450000);
  // Si la columna llega ya como número, el resultado es el mismo.
  assert.equal(planDesdeFila(filaPlan({ costo_total: 450000 })).costoTotal, 450000);
  assert.equal(planDesdeFila(filaPlan({ costo_total: null })).costoTotal, null);
  assert.equal(procedimientoDesdeFila(filaProcedimiento()).costo, 180000);
});

test("los estados fuera del check del SQL no se inventan", () => {
  assert.equal(planDesdeFila(filaPlan({ estado: "en_proceso" })).estado, "en_proceso");
  assert.equal(planDesdeFila(filaPlan({ estado: null })).estado, null);
  // Si alguien agrega un estado al `check` sin actualizar el tipo, se muestra
  // como desconocido en vez de mentir.
  assert.equal(planDesdeFila(filaPlan({ estado: "archivado" })).estado, null);
  assert.equal(
    procedimientoDesdeFila(filaProcedimiento({ estado: "postergado" })).estado,
    null,
  );
  assert.equal(procedimientoDesdeFila(filaProcedimiento({ prioridad: "urgente" })).prioridad, "urgente");
  assert.equal(procedimientoDesdeFila(filaProcedimiento({ prioridad: "altisima" })).prioridad, null);
});

test("los títulos y descripciones ausentes no rompen las etiquetas", () => {
  const conTitulo: PlanTratamiento = planDesdeFila(filaPlan());
  assert.equal(tituloDePlan(conTitulo), "Restauración del molar superior derecho");
  assert.equal(tituloDePlan({ ...conTitulo, titulo: null }), "Plan sin título");
  assert.equal(tituloDePlan({ ...conTitulo, titulo: "   " }), "Plan sin título");

  const procedimiento = procedimientoDesdeFila(filaProcedimiento());
  assert.equal(etiquetaDeProcedimiento(procedimiento), "Obturación con resina · pieza 16");
  assert.equal(
    etiquetaDeProcedimiento({ ...procedimiento, numeroPieza: null }),
    "Obturación con resina",
  );
  assert.equal(
    etiquetaDeProcedimiento({ ...procedimiento, descripcion: "  " }),
    "Procedimiento sin descripción · pieza 16",
  );
});

test("el centinela del desplegable se traduce a null y vuelve sin inventar un id", () => {
  // Radix no admite value=""; "ninguno" representa "sin plan".
  assert.equal(referenciaDesdeSeleccion(SIN_PLAN), null);
  assert.equal(referenciaDesdeSeleccion(PLAN), PLAN);
  assert.equal(seleccionDesdeReferencia(null), SIN_PLAN);
  assert.equal(seleccionDesdeReferencia(PLAN), PLAN);
  assert.notEqual(String(SIN_PLAN), "", "Radix rechaza el valor vacío");
  assert.notEqual(seleccionDesdeReferencia(null), "", "el centinela nunca es cadena vacía");
  // Ida y vuelta sin pérdida.
  assert.equal(referenciaDesdeSeleccion(seleccionDesdeReferencia(null)), null);
  assert.equal(referenciaDesdeSeleccion(seleccionDesdeReferencia(PLAN)), PLAN);
});
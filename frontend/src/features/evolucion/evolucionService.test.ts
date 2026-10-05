/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  actualizarEvolucion,
  cargarEvoluciones,
  guardarEvolucion,
  registrarProximaAtencion,
} from "./evolucionService.ts";
import { evolucionDesdeFila, evolucionParaGuardar, type EvolucionClinicaFila } from "./evolucionMapper.ts";
import type { EvolucionNueva } from "./tipos.ts";

const CLINICA = "11111111-1111-4111-8111-111111111111";
const PACIENTE = "22222222-2222-4222-8222-222222222222";
const ODONTOLOGO = "33333333-3333-4333-8333-333333333333";
const EVOLUCION = "44444444-4444-4444-8444-444444444444";

function nueva(sobrescritas: Partial<EvolucionNueva> = {}): EvolucionNueva {
  return {
    clinicaId: CLINICA,
    pacienteId: PACIENTE,
    odontologoId: ODONTOLOGO,
    fechaConsulta: "2026-10-03",
    motivoConsulta: "Dolor al masticar",
    procedimientoRealizado: "Obturación con resina",
    observaciones: "",
    indicaciones: "",
    proximaAtencion: null,
    ...sobrescritas,
  };
}

function fila(sobrescritas: Partial<EvolucionClinicaFila> = {}): EvolucionClinicaFila {
  return {
    id: EVOLUCION,
    creado_en: "2026-10-03T15:20:00Z",
    ...evolucionParaGuardar(nueva(), CLINICA),
    ...sobrescritas,
  };
}

/** Simula respuestas PostgREST sin conectar a una base ni usar credenciales. */
function clienteSimulado({
  filas = [],
  respuesta = fila(),
  errorLectura = null,
  errorEscritura = null,
}: {
  filas?: EvolucionClinicaFila[];
  respuesta?: EvolucionClinicaFila | null;
  errorLectura?: { message: string } | null;
  errorEscritura?: { message: string } | null;
} = {}) {
  const llamadas: {
    operacion: string;
    columnas?: string;
    contenido?: Record<string, unknown>;
    filtros: [string, string][];
    orden?: [string, string, boolean];
    cierre?: string;
  }[] = [];

  const cliente = {
    schema(nombre: string) {
      assert.equal(nombre, "public");
      return {
        from(nombreTabla: string) {
          assert.equal(nombreTabla, "evoluciones_clinicas");
          const llamada: (typeof llamadas)[number] = { operacion: "select", filtros: [] };
          llamadas.push(llamada);
          const consulta = {
            select(columnas: string) { llamada.columnas = columnas; return consulta; },
            eq(campo: string, valor: string) { llamada.filtros.push([campo, valor]); return consulta; },
            order(campo: string, opciones: { ascending: boolean }) {
              llamada.orden = [campo, opciones.ascending ? "asc" : "desc", opciones.ascending];
              return Promise.resolve({ data: filas, error: errorLectura });
            },
            insert(contenido: Record<string, unknown>) { llamada.operacion = "insert"; llamada.contenido = contenido; return consulta; },
            update(contenido: Record<string, unknown>) { llamada.operacion = "update"; llamada.contenido = contenido; return consulta; },
            single() { llamada.cierre = "single"; return Promise.resolve({ data: respuesta, error: errorEscritura }); },
            maybeSingle() { llamada.cierre = "maybeSingle"; return Promise.resolve({ data: respuesta, error: errorEscritura }); },
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
  await assert.rejects(cargarEvoluciones("p1", cliente), /UUID real/);
  await assert.rejects(cargarEvoluciones("p_123", cliente), /UUID real/);
  await assert.rejects(
    guardarEvolucion(nueva({ odontologoId: "p2" }), cliente),
    /UUID real/,
  );
  await assert.rejects(
    guardarEvolucion(nueva({ clinicaId: "Dental Cristo Rey" }), cliente),
    /UUID real/,
  );
  await assert.rejects(
    actualizarEvolucion({ id: "p1", ...evolucionDesdeFilaPrueba() }, cliente),
    /id debe ser un UUID real/,
  );
  await assert.rejects(
    actualizarEvolucion({ id: EVOLUCION, ...evolucionDesdeFilaPrueba(), clinicaId: "p3" }, cliente),
    /clinicaId debe ser un UUID real/,
  );
  assert.equal(llamadas.length, 0);
});

/** Fila mínima reutilizable en el caso del id inválido. */
function evolucionDesdeFilaPrueba() {
  return {
    clinicaId: CLINICA,
    pacienteId: PACIENTE,
    odontologoId: ODONTOLOGO,
    planTratamientoId: null,
    procedimientoId: null,
    numeroPieza: null,
    fechaConsulta: "2026-10-03",
    motivoConsulta: "",
    procedimientoRealizado: "",
    observaciones: "",
    indicaciones: "",
    proximaAtencion: null,
    creadoEn: "",
  };
}

test("los ids de plan y procedimiento se validan aunque sean opcionales", async () => {
  const PLAN = "55555555-5555-4555-8555-555555555555";
  const PROCEDIMIENTO = "66666666-6666-4666-8666-666666666666";
  const { cliente, llamadas } = clienteSimulado();

  // `null` y `undefined` son válidos: la atención no se imputa a ningún plan.
  await assert.rejects(
    guardarEvolucion(nueva({ planTratamientoId: "ninguno" }), cliente),
    /planTratamientoId debe ser un UUID real/,
  );
  await assert.rejects(
    guardarEvolucion(nueva({ procedimientoId: "ninguno" }), cliente),
    /procedimientoId debe ser un UUID real/,
  );
  await assert.rejects(
    actualizarEvolucion(
      { id: EVOLUCION, ...evolucionDesdeFilaPrueba(), planTratamientoId: "plan_1" },
      cliente,
    ),
    /planTratamientoId debe ser un UUID real/,
  );

  // El centinela del desplegable se rechaza antes de tocar la red, no como error
  // de sintaxis de UUID vindo de Postgres.
  assert.equal(llamadas.length, 0);

  // Con UUIDs reales pasa y los dos ids llegan a la fila.
  const ok = clienteSimulado({ respuesta: fila() });
  await guardarEvolucion(
    nueva({ planTratamientoId: PLAN, procedimientoId: PROCEDIMIENTO }),
    ok.cliente,
  );
  assert.equal(ok.llamadas[0].contenido?.plan_tratamiento_id, PLAN);
  assert.equal(ok.llamadas[0].contenido?.procedimiento_id, PROCEDIMIENTO);
});

test("la consulta filtra por paciente y pide fecha descendente", async () => {
  const { cliente, llamadas } = clienteSimulado({
    filas: [fila({ fecha_consulta: "2026-10-03" }), fila({ fecha_consulta: "2026-09-01" })],
  });
  const resultado = await cargarEvoluciones(PACIENTE, cliente);
  assert.equal(resultado.length, 2);
  assert.deepEqual(llamadas[0].filtros, [["paciente_id", PACIENTE]]);
  assert.deepEqual(llamadas[0].orden, ["fecha_consulta", "desc", false]);
  assert.equal(llamadas[0].columnas?.includes("proxima_atencion"), true);
});

test("un SELECT vacío no es un error: se devuelve una lista vacía", async () => {
  const vacio = clienteSimulado({ filas: [] });
  assert.deepEqual(await cargarEvoluciones(PACIENTE, vacio.cliente), []);
  // El mismo caso con un id de demo sí es un error, y se distingue antes.
  await assert.rejects(cargarEvoluciones("p1", vacio.cliente), /UUID real/);
  // Un error real de RLS, en cambio, sí se propaga como error.
  const rls = clienteSimulado({ errorLectura: { message: "permission denied for table evoluciones_clinicas" } });
  await assert.rejects(cargarEvoluciones(PACIENTE, rls.cliente), /permission denied/);
});

test("el INSERT usa los UUID recibidos y devuelve la fila que guardó la base", async () => {
  const guardada = fila({ motivo_consulta: "Texto normalizado por la base" });
  const { cliente, llamadas } = clienteSimulado({ respuesta: guardada });
  const resultado = await guardarEvolucion(nueva({ motivoConsulta: "dolor al masticar" }), cliente);

  assert.equal(llamadas[0].operacion, "insert");
  assert.equal(llamadas[0].cierre, "single");
  assert.equal(llamadas[0].contenido?.paciente_id, PACIENTE);
  assert.equal(llamadas[0].contenido?.clinica_id, CLINICA);
  assert.equal(llamadas[0].contenido?.odontologo_id, ODONTOLOGO);
  assert.equal(llamadas[0].contenido?.fecha_consulta, "2026-10-03");
  for (const campo of ["id", "creado_en"]) {
    assert.equal(campo in (llamadas[0].contenido ?? {}), false);
  }
  // La verdad es la fila devuelta, no la enviada.
  assert.equal(resultado.motivoConsulta, "Texto normalizado por la base");
  assert.equal(resultado.id, EVOLUCION);
});

test("el UPDATE se acota a id, paciente y clínica", async () => {
  const { cliente, llamadas } = clienteSimulado();
  await actualizarEvolucion(
    { id: EVOLUCION, ...evolucionDesdeFilaPrueba() },
    cliente,
  );
  assert.equal(llamadas[0].operacion, "update");
  assert.equal(llamadas[0].cierre, "maybeSingle");
  assert.deepEqual(llamadas[0].filtros, [
    ["id", EVOLUCION],
    ["paciente_id", PACIENTE],
    ["clinica_id", CLINICA],
  ]);
});

test("un UPDATE que no afecta filas devuelve null, no una evolución inventada", async () => {
  const { cliente } = clienteSimulado({ respuesta: null });
  const resultado = await actualizarEvolucion({ id: EVOLUCION, ...evolucionDesdeFilaPrueba() }, cliente);
  assert.equal(resultado, null);
});

test("registrarProximaAtencion solo cambia la fecha y conserva el resto", async () => {
  const original = fila({
    proxima_atencion: null,
    observaciones: "Caries oclusal",
    indicaciones: "Hilo dental",
  });
  const { cliente, llamadas } = clienteSimulado({
    respuesta: { ...original, proxima_atencion: "2026-11-03" },
  });
  const resultado = await registrarProximaAtencion(
    evolucionDesdeFila(original),
    "2026-11-03",
    cliente,
  );

  assert.equal(llamadas[0].contenido?.proxima_atencion, "2026-11-03");
  assert.equal(llamadas[0].contenido?.observaciones, original.observaciones);
  assert.equal(llamadas[0].contenido?.indicaciones, original.indicaciones);
  assert.equal(resultado?.proximaAtencion, "2026-11-03");
});

test("los errores de escritura no se anuncian como éxito", async () => {
  const rls = clienteSimulado({
    errorEscritura: { message: "new row violates row-level security policy" },
  });
  await assert.rejects(
    guardarEvolucion(nueva(), rls.cliente),
    /row-level security/,
  );
  const sinFila = clienteSimulado({ respuesta: null });
  await assert.rejects(guardarEvolucion(nueva(), sinFila.cliente), /no devolvio la fila guardada/);
});

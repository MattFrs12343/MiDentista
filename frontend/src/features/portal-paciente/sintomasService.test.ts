/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cargarPrediagnostico, guardarPrediagnostico } from "./sintomasService.ts";
import type { PrediagnosticoContenido, PrediagnosticoFila } from "./sintomasMapper.ts";

const PACIENTE = "11111111-1111-4111-8111-111111111111";
const CLINICA = "33333333-3333-4333-8333-333333333333";

const CONTENIDO: PrediagnosticoContenido = {
  sintomas: ["dolor_muela", "fiebre"],
  intensidad: "severo",
  duracion: "horas",
  severidad: "emergencia",
};

function fila(extra: Partial<PrediagnosticoFila> = {}): PrediagnosticoFila {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    clinica_id: CLINICA,
    paciente_id: PACIENTE,
    sintomas: CONTENIDO.sintomas,
    intensidad: CONTENIDO.intensidad,
    duracion: CONTENIDO.duracion,
    severidad: CONTENIDO.severidad,
    creado_en: "2026-11-20T10:00:00Z",
    ...extra,
  };
}

/** Simula respuestas PostgREST sin conectar a una base ni usar credenciales. */
function clienteSimulado({
  filas = [],
  respuesta = fila(),
  errorLectura = null,
  errorGuardado = null,
}: {
  filas?: PrediagnosticoFila[];
  respuesta?: PrediagnosticoFila | null;
  errorLectura?: { message: string } | null;
  errorGuardado?: { message: string } | null;
} = {}) {
  const llamadas: { operacion: string; contenido?: Record<string, unknown>; filtros: [string, string][] }[] = [];
  const cliente = {
    schema(nombre: string) {
      assert.equal(nombre, "public");
      return {
        from(nombreTabla: string) {
          assert.equal(nombreTabla, "prediagnosticos_sintomas");
          const llamada: typeof llamadas[number] = { operacion: "select", filtros: [] };
          llamadas.push(llamada);
          const consulta = {
            select() { return consulta; },
            eq(campo: string, valor: string) { llamada.filtros.push([campo, valor]); return consulta; },
            order() { return consulta; },
            limit() { return Promise.resolve({ data: filas, error: errorLectura }); },
            insert(contenido: Record<string, unknown>) { llamada.operacion = "insert"; llamada.contenido = contenido; return consulta; },
            single() { return Promise.resolve({ data: respuesta, error: errorGuardado }); },
          };
          return consulta;
        },
      };
    },
  } as unknown as SupabaseClient;
  return { cliente, llamadas };
}

test("IDs locales se rechazan antes de consultar", async () => {
  const { cliente, llamadas } = clienteSimulado();
  await assert.rejects(cargarPrediagnostico("p1", cliente), /UUID real/);
  await assert.rejects(guardarPrediagnostico("p1", CLINICA, CONTENIDO, cliente), /UUID real/);
  await assert.rejects(guardarPrediagnostico(PACIENTE, "clinica-1", CONTENIDO, cliente), /UUID real/);
  assert.equal(llamadas.length, 0);
});

test("sin fila previa, cargarPrediagnostico devuelve null (no completó el wizard)", async () => {
  const { cliente } = clienteSimulado({ filas: [] });
  assert.equal(await cargarPrediagnostico(PACIENTE, cliente), null);
});

test("cargarPrediagnostico filtra por el paciente indicado", async () => {
  const { cliente, llamadas } = clienteSimulado({ filas: [fila()] });
  const contenido = await cargarPrediagnostico(PACIENTE, cliente);
  assert.deepEqual(contenido, CONTENIDO);
  assert.deepEqual(llamadas[0].filtros, [["paciente_id", PACIENTE]]);
});

test("guardarPrediagnostico inserta con paciente_id y clinica_id", async () => {
  const { cliente, llamadas } = clienteSimulado();
  const resultado = await guardarPrediagnostico(PACIENTE, CLINICA, CONTENIDO, cliente);
  assert.equal(llamadas[0].operacion, "insert");
  assert.equal(llamadas[0].contenido!.paciente_id, PACIENTE);
  assert.equal(llamadas[0].contenido!.clinica_id, CLINICA);
  assert.deepEqual(resultado, CONTENIDO);
});

test("respuesta de otro paciente/clinica no se acepta como éxito", async () => {
  const otroPaciente = clienteSimulado({ respuesta: fila({ paciente_id: "44444444-4444-4444-8444-444444444444" }) });
  await assert.rejects(guardarPrediagnostico(PACIENTE, CLINICA, CONTENIDO, otroPaciente.cliente), /no corresponde/);
});

test("error de RLS o sin fila devuelta no se anuncian como éxito", async () => {
  const rls = clienteSimulado({ respuesta: null, errorGuardado: { message: "new row violates row-level security policy" } });
  await assert.rejects(guardarPrediagnostico(PACIENTE, CLINICA, CONTENIDO, rls.cliente), /row-level security/);
  const sinFila = clienteSimulado({ respuesta: null });
  await assert.rejects(guardarPrediagnostico(PACIENTE, CLINICA, CONTENIDO, sinFila.cliente), /No se confirmó/);
  const errorLectura = clienteSimulado({ errorLectura: { message: "permission denied" } });
  await assert.rejects(cargarPrediagnostico(PACIENTE, errorLectura.cliente), /permission denied/);
});

/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cargarHistoriaClinica, guardarHistoriaClinica } from "./clinicalHistoryService.ts";
import { crearHistoriaClinicaVacia, historiaParaGuardar, type HistorialClinicoFila } from "./clinicalHistoryMapper.ts";

const PACIENTE = "11111111-1111-4111-8111-111111111111";
const CLINICA = "33333333-3333-4333-8333-333333333333";

function fila(): HistorialClinicoFila {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    paciente_id: PACIENTE,
    clinica_id: CLINICA,
    ...historiaParaGuardar(crearHistoriaClinicaVacia(PACIENTE)),
    creado_en: "2026-10-01T10:00:00Z",
    actualizado_en: "2026-10-01T11:00:00Z",
  };
}

/** Simula respuestas PostgREST sin conectar a una base ni usar credenciales. */
function clienteSimulado({
  filas = [],
  respuesta = fila(),
  errorLectura = null,
  errorGuardado = null,
}: {
  filas?: HistorialClinicoFila[];
  respuesta?: HistorialClinicoFila | null;
  errorLectura?: { message: string } | null;
  errorGuardado?: { message: string } | null;
} = {}) {
  const llamadas: { operacion: string; contenido?: Record<string, unknown>; filtros: [string, string][] }[] = [];
  const cliente = {
    schema(nombre: string) {
      assert.equal(nombre, "public");
      return {
        from(nombreTabla: string) {
          assert.equal(nombreTabla, "historiales_clinicos");
          const llamada: typeof llamadas[number] = { operacion: "select", filtros: [] };
          llamadas.push(llamada);
          const consulta = {
            select() { return consulta; },
            eq(campo: string, valor: string) { llamada.filtros.push([campo, valor]); return consulta; },
            limit(cantidad: number) { assert.equal(cantidad, 2); return Promise.resolve({ data: filas, error: errorLectura }); },
            update(contenido: Record<string, unknown>) { llamada.operacion = "update"; llamada.contenido = contenido; return consulta; },
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

test("p1/p2/p3 y clínica inválida se rechazan antes de consultar", async () => {
  const { cliente, llamadas } = clienteSimulado();
  for (const id of ["p1", "p2", "p3"]) {
    await assert.rejects(cargarHistoriaClinica(id, cliente), /UUID real/);
  }
  await assert.rejects(guardarHistoriaClinica(PACIENTE, "Dental Cristo Rey", crearHistoriaClinicaVacia(PACIENTE), cliente), /UUID real/);
  assert.equal(llamadas.length, 0);
});

test("falta de configuración genera un error explicativo al usar el cliente", async () => {
  await assert.rejects(cargarHistoriaClinica(PACIENTE), /frontend\/\.env\.local/);
});

test("consulta solo el paciente indicado; ausencia devuelve historia vacía", async () => {
  const { cliente, llamadas } = clienteSimulado();
  assert.deepEqual(await cargarHistoriaClinica(PACIENTE, cliente), crearHistoriaClinicaVacia(PACIENTE));
  assert.deepEqual(llamadas[0].filtros, [["paciente_id", PACIENTE]]);
});

test("lectura existente recupera contenido y fecha del servidor", async () => {
  const { cliente } = clienteSimulado({ filas: [{ ...fila(), motivo_consulta: "Dolor" }] });
  const historia = await cargarHistoriaClinica(PACIENTE, cliente);
  assert.equal(historia.motivoConsulta, "Dolor");
  assert.equal(historia.actualizadoEl, fila().actualizado_en);
});

test("INSERT usa los UUID recibidos y no escribe fechas ni responsable", async () => {
  const { cliente, llamadas } = clienteSimulado();
  const historia = { ...crearHistoriaClinicaVacia(PACIENTE), actualizadoPor: "Usuario de la demo" };
  const resultado = await guardarHistoriaClinica(PACIENTE, CLINICA, historia, cliente);
  assert.equal(llamadas[1].operacion, "insert");
  assert.equal(llamadas[1].contenido!.paciente_id, PACIENTE);
  assert.equal(llamadas[1].contenido!.clinica_id, CLINICA);
  for (const campo of ["id", "creado_en", "actualizado_en", "actualizado_por", "actualizadoPor"]) {
    assert.equal(campo in llamadas[1].contenido!, false);
  }
  assert.equal(resultado.actualizadoEl, fila().actualizado_en);
  assert.equal(resultado.actualizadoPor, historia.actualizadoPor);
});

test("UPDATE filtra por id, paciente y clínica sin cambiar sus identificadores", async () => {
  const { cliente, llamadas } = clienteSimulado({ filas: [fila()] });
  await guardarHistoriaClinica(PACIENTE, CLINICA, crearHistoriaClinicaVacia(PACIENTE), cliente);
  assert.equal(llamadas[1].operacion, "update");
  assert.deepEqual(llamadas[1].filtros, [["id", fila().id], ["paciente_id", PACIENTE], ["clinica_id", CLINICA]]);
  assert.equal("paciente_id" in llamadas[1].contenido!, false);
  assert.equal("clinica_id" in llamadas[1].contenido!, false);
});

test("historia duplicada, clínica distinta o paciente distinto no permiten escritura", async () => {
  const duplicado = clienteSimulado({ filas: [fila(), fila()] });
  await assert.rejects(guardarHistoriaClinica(PACIENTE, CLINICA, crearHistoriaClinicaVacia(PACIENTE), duplicado.cliente), /varias historias/);
  assert.equal(duplicado.llamadas.length, 1);
  const otraClinica = clienteSimulado({ filas: [{ ...fila(), clinica_id: "44444444-4444-4444-8444-444444444444" }] });
  await assert.rejects(guardarHistoriaClinica(PACIENTE, CLINICA, crearHistoriaClinicaVacia(PACIENTE), otraClinica.cliente), /no pertenece/);
  assert.equal(otraClinica.llamadas.length, 1);
  const otroPaciente = clienteSimulado();
  await assert.rejects(guardarHistoriaClinica(PACIENTE, CLINICA, crearHistoriaClinicaVacia("p1"), otroPaciente.cliente), /no corresponde/);
  assert.equal(otroPaciente.llamadas.length, 0);
});

test("errores de consulta, RLS y UPDATE sin filas no se anuncian como éxito", async () => {
  const consulta = clienteSimulado({ errorLectura: { message: "permission denied" } });
  await assert.rejects(cargarHistoriaClinica(PACIENTE, consulta.cliente), /permission denied/);
  const rls = clienteSimulado({ respuesta: null, errorGuardado: { message: "new row violates row-level security policy" } });
  await assert.rejects(guardarHistoriaClinica(PACIENTE, CLINICA, crearHistoriaClinicaVacia(PACIENTE), rls.cliente), /row-level security/);
  const sinFilas = clienteSimulado({ filas: [fila()], respuesta: null });
  await assert.rejects(guardarHistoriaClinica(PACIENTE, CLINICA, crearHistoriaClinicaVacia(PACIENTE), sinFilas.cliente), /No se confirmó/);
});

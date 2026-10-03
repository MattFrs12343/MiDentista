import type { SupabaseClient } from "@supabase/supabase-js";
import { obtenerSupabase } from "../../lib/supabase.ts";
import {
  esUuid,
  evolucionDesdeFila,
  evolucionParaActualizar,
  evolucionParaGuardar,
  type EvolucionClinicaFila,
} from "./evolucionMapper.ts";
import type { EvolucionClinica, EvolucionNueva } from "./tipos.ts";

const COLUMNAS =
  "id,clinica_id,paciente_id,odontologo_id,plan_tratamiento_id,procedimiento_id,numero_pieza,fecha_consulta,motivo_consulta,procedimiento_realizado,observaciones,indicaciones,proxima_atencion,creado_en";

function exigirUuid(valor: string, campo: string) {
  if (!esUuid(valor)) {
    throw new Error(`${campo} debe ser un UUID real de Supabase; no se admiten IDs de demo.`);
  }
}

function tabla(cliente: SupabaseClient) {
  return cliente.schema("public").from("evoluciones_clinicas");
}

/**
 * Vista cronologica del paciente (T-6.4).
 *
 * Un array vacio NO significa que el paciente no tenga evoluciones: con RLS
 * activo y sin policies que apliquen, un SELECT devuelve `[]` aunque existan
 * filas. La UI debe distinguir "sin evoluciones" de "sin permiso para verlas".
 */
export async function cargarEvoluciones(
  pacienteId: string,
  cliente?: SupabaseClient,
): Promise<EvolucionClinica[]> {
  exigirUuid(pacienteId, "pacienteId");
  const { data, error } = await tabla(cliente ?? obtenerSupabase())
    .select(COLUMNAS)
    .eq("paciente_id", pacienteId)
    .order("fecha_consulta", { ascending: false });

  if (error) throw new Error(`No se pudieron cargar las evoluciones: ${error.message}`);
  if (!data) throw new Error("Supabase no devolvio un resultado de consulta valido.");
  return data.map((fila) => evolucionDesdeFila(fila as EvolucionClinicaFila));
}

/** Crea una evolucion (T-6.3). Exige recuperar la fila guardada. */
export async function guardarEvolucion(
  nueva: EvolucionNueva,
  cliente?: SupabaseClient,
): Promise<EvolucionClinica> {
  exigirUuid(nueva.pacienteId, "pacienteId");
  exigirUuid(nueva.odontologoId, "odontologoId");
  exigirUuid(nueva.clinicaId, "clinicaId");

  const supabase = cliente ?? obtenerSupabase();
  const payload = evolucionParaGuardar(nueva, nueva.clinicaId);

  const { data, error } = await tabla(supabase).insert(payload).select(COLUMNAS).single();
  if (error) throw new Error(`No se pudo guardar la evolucion: ${error.message}`);
  if (!data) throw new Error("La evolucion no devolvio la fila guardada.");
  return evolucionDesdeFila(data as EvolucionClinicaFila);
}

/**
 * Actualiza una evolucion existente.
 *
 * El UPDATE se limita a `id`, `paciente_id` y `clinica_id`: si la evolucion
 * pertenece a otra clinica no se toca. Devuelve `null` cuando la operacion no
 * afecta a ninguna fila, que con RLS es indistinguible de un fallo silencioso.
 */
export async function actualizarEvolucion(
  evolucion: EvolucionClinica,
  cliente?: SupabaseClient,
): Promise<EvolucionClinica | null> {
  exigirUuid(evolucion.id, "id");
  exigirUuid(evolucion.pacienteId, "pacienteId");
  exigirUuid(evolucion.clinicaId, "clinicaId");

  const { data, error } = await tabla(cliente ?? obtenerSupabase())
    .update(evolucionParaActualizar(evolucion))
    .eq("id", evolucion.id)
    .eq("paciente_id", evolucion.pacienteId)
    .eq("clinica_id", evolucion.clinicaId)
    .select(COLUMNAS)
    .maybeSingle();

  if (error) throw new Error(`No se pudo actualizar la evolucion: ${error.message}`);
  if (!data) return null;
  return evolucionDesdeFila(data as EvolucionClinicaFila);
}

/** Marca la proxima atencion para la agenda (T-6.5). No crea la cita. */
export async function registrarProximaAtencion(
  evolucion: EvolucionClinica,
  proximaAtencion: string | null,
  cliente?: SupabaseClient,
): Promise<EvolucionClinica | null> {
  return actualizarEvolucion({ ...evolucion, proximaAtencion }, cliente);
}

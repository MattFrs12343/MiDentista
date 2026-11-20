import type { SupabaseClient } from "@supabase/supabase-js";
import { obtenerSupabase } from "../../lib/supabase.ts";
import {
  esUuid,
  prediagnosticoDesdeFila,
  prediagnosticoParaGuardar,
  type PrediagnosticoContenido,
  type PrediagnosticoFila,
} from "./sintomasMapper.ts";

const COLUMNAS = "id,clinica_id,paciente_id,sintomas,intensidad,duracion,severidad,creado_en";

function exigirUuid(valor: string, campo: string) {
  if (!esUuid(valor)) {
    throw new Error(`${campo} debe ser un UUID real de Supabase; no se admiten IDs locales.`);
  }
}

function tabla(cliente: SupabaseClient) {
  return cliente.schema("public").from("prediagnosticos_sintomas");
}

/**
 * `null` significa "todavía no completó (ni omitió con resultado) el wizard
 * de síntomas" — no es un error. Es insert-only (ver sql.sql): si hay más de
 * una fila por paciente, nos quedamos con la más reciente.
 */
export async function cargarPrediagnostico(
  pacienteId: string,
  cliente?: SupabaseClient,
): Promise<PrediagnosticoContenido | null> {
  exigirUuid(pacienteId, "pacienteId");
  const supabase = cliente ?? obtenerSupabase();
  const { data, error } = await tabla(supabase)
    .select(COLUMNAS)
    .eq("paciente_id", pacienteId)
    .order("creado_en", { ascending: false })
    .limit(1);
  if (error) throw new Error(`No se pudo consultar el pre-diagnóstico: ${error.message}`);
  if (!data) throw new Error("Supabase no devolvió un resultado de consulta válido.");
  const fila = (data as PrediagnosticoFila[])[0];
  return fila ? prediagnosticoDesdeFila(fila) : null;
}

/** INSERT único (sin UPDATE: ver sql.sql) del snapshot del wizard de síntomas. */
export async function guardarPrediagnostico(
  pacienteId: string,
  clinicaId: string,
  contenido: PrediagnosticoContenido,
  cliente?: SupabaseClient,
): Promise<PrediagnosticoContenido> {
  exigirUuid(pacienteId, "pacienteId");
  exigirUuid(clinicaId, "clinicaId");

  const supabase = cliente ?? obtenerSupabase();
  const { data, error } = await tabla(supabase)
    .insert({ ...prediagnosticoParaGuardar(contenido), paciente_id: pacienteId, clinica_id: clinicaId })
    .select(COLUMNAS)
    .single();
  // Exigir la fila devuelta evita anunciar éxito cuando RLS bloqueó el INSERT.
  if (error) throw new Error(`No se pudo guardar el pre-diagnóstico: ${error.message}`);
  if (!data) throw new Error("No se confirmó el guardado del pre-diagnóstico. Revisa permisos y RLS.");
  const fila = data as PrediagnosticoFila;
  if (fila.paciente_id !== pacienteId || fila.clinica_id !== clinicaId) {
    throw new Error("La respuesta de Supabase no corresponde al paciente y clínica indicados.");
  }
  return prediagnosticoDesdeFila(fila);
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { obtenerSupabase } from "../../lib/supabase.ts";
import { esUuid } from "./archivoMapper.ts";

export type ContextoPacienteArchivos = { pacienteId: string; clinicaId: string };

/** Solo lectura bajo RLS: Paciente del store no conserva clinica_id. */
export async function cargarContextoPacienteArchivos(pacienteId: string, cliente?: SupabaseClient): Promise<ContextoPacienteArchivos> {
  if (!esUuid(pacienteId)) throw new Error("El paciente requiere un UUID real.");
  const { data, error } = await (cliente ?? obtenerSupabase()).schema("public").from("pacientes")
    .select("id,clinica_id").eq("id", pacienteId).maybeSingle();
  if (error || !data || !esUuid(data.id) || !esUuid(data.clinica_id) || data.id.toLowerCase() !== pacienteId.toLowerCase()) {
    throw new Error("No pudimos confirmar el contexto del paciente. Puedes consultar los archivos visibles, pero la subida no está disponible.");
  }
  return { pacienteId: data.id, clinicaId: data.clinica_id };
}

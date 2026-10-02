import type { SupabaseClient } from "@supabase/supabase-js";
import type { HistoriaClinica } from "@/types";
import { obtenerSupabase } from "../../lib/supabase.ts";
import {
  crearHistoriaClinicaVacia,
  esUuid,
  historiaDesdeFila,
  historiaParaGuardar,
  type HistorialClinicoFila,
} from "./clinicalHistoryMapper.ts";

const COLUMNAS = "id,clinica_id,paciente_id,motivo_consulta,antecedentes_medicos,antecedentes_odontologicos,alergias,medicamentos,enfermedades,habitos,observaciones,creado_en,actualizado_en";

function exigirUuid(valor: string, campo: string) {
  if (!esUuid(valor)) {
    throw new Error(`${campo} debe ser un UUID real de Supabase; no se admiten IDs locales.`);
  }
}

function tabla(cliente: SupabaseClient) {
  return cliente.schema("public").from("historiales_clinicos");
}

async function buscarFila(cliente: SupabaseClient, pacienteId: string): Promise<HistorialClinicoFila | null> {
  const { data, error } = await tabla(cliente)
    .select(COLUMNAS)
    .eq("paciente_id", pacienteId)
    .limit(2);
  if (error) throw new Error(`No se pudo consultar Historia clínica: ${error.message}`);
  if (!data) throw new Error("Supabase no devolvió un resultado de consulta válido.");
  if (data.length > 1) {
    throw new Error("El paciente tiene varias historias clínicas. El equipo debe definir cuál editar.");
  }
  return (data[0] as HistorialClinicoFila | undefined) ?? null;
}

/** Solo recibe UUIDs reales. SELECT vacío también puede deberse a RLS: ver README. */
export async function cargarHistoriaClinica(
  pacienteId: string,
  cliente?: SupabaseClient,
): Promise<HistoriaClinica> {
  exigirUuid(pacienteId, "pacienteId");
  const fila = await buscarFila(cliente ?? obtenerSupabase(), pacienteId);
  return fila ? historiaDesdeFila(fila) : crearHistoriaClinicaVacia(pacienteId);
}

export async function guardarHistoriaClinica(
  pacienteId: string,
  clinicaId: string,
  historia: HistoriaClinica,
  cliente?: SupabaseClient,
): Promise<HistoriaClinica> {
  exigirUuid(pacienteId, "pacienteId");
  exigirUuid(clinicaId, "clinicaId");
  if (historia.pacienteId !== pacienteId) {
    throw new Error("La historia clínica no corresponde al paciente indicado.");
  }

  const supabase = cliente ?? obtenerSupabase();
  const existente = await buscarFila(supabase, pacienteId);
  if (existente && existente.clinica_id !== clinicaId) {
    throw new Error("La historia existente no pertenece a la clínica indicada.");
  }

  const contenido = historiaParaGuardar(historia);
  const operacion = existente
    ? tabla(supabase).update(contenido)
      .eq("id", existente.id)
      .eq("paciente_id", pacienteId)
      .eq("clinica_id", clinicaId)
    : tabla(supabase).insert({ ...contenido, paciente_id: pacienteId, clinica_id: clinicaId });

  // Exigir la fila devuelta evita anunciar éxito cuando UPDATE no afectó registros.
  const { data, error } = await operacion.select(COLUMNAS).single();
  if (error) throw new Error(`No se pudo guardar Historia clínica: ${error.message}`);
  if (!data) throw new Error("No se confirmó el guardado de Historia clínica. Revisa permisos y RLS.");
  const fila = data as HistorialClinicoFila;
  if (fila.paciente_id !== pacienteId || fila.clinica_id !== clinicaId) {
    throw new Error("La respuesta de Supabase no corresponde al paciente y clínica indicados.");
  }
  return {
    ...historiaDesdeFila(fila),
    // No hay actualizado_por en BD: se conserva únicamente en el frontend.
    ...(historia.actualizadoPor ? { actualizadoPor: historia.actualizadoPor } : {}),
  };
}

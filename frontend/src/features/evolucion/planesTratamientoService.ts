import type { SupabaseClient } from "@supabase/supabase-js";
import { obtenerSupabase } from "../../lib/supabase.ts";
import { esUuid } from "./evolucionMapper.ts";
import {
  planDesdeFila,
  procedimientoDesdeFila,
  type PlanTratamientoFila,
  type ProcedimientoTratamientoFila,
} from "./planesTratamientoMapper.ts";
import type { PlanTratamiento, ProcedimientoTratamiento } from "./tipos.ts";

const COLUMNAS_PLAN =
  "id,clinica_id,paciente_id,odontologo_id,titulo,estado,costo_total,notas,creado_en,actualizado_en";

const COLUMNAS_PROCEDIMIENTO =
  "id,clinica_id,plan_tratamiento_id,servicio_id,numero_pieza,descripcion,prioridad,costo,estado,creado_en";

function exigirUuid(valor: string, campo: string) {
  if (!esUuid(valor)) {
    throw new Error(`${campo} debe ser un UUID real de Supabase; no se admiten IDs de demo.`);
  }
}

/**
 * Lectura de los planes de tratamiento del modulo 05 (T-6.6).
 *
 * Un array vacío NO significa que el paciente no tenga plan: con RLS activo y
 * sin policies que apliquen al rol, un SELECT devuelve `[]` aunque existan
 * filas. Es el mismo caso que ya distingue `useEvolucionSupabase`.
 */
export async function cargarPlanes(
  pacienteId: string,
  cliente?: SupabaseClient,
): Promise<PlanTratamiento[]> {
  exigirUuid(pacienteId, "pacienteId");

  const { data, error } = await (cliente ?? obtenerSupabase())
    .schema("public")
    .from("planes_tratamiento")
    .select(COLUMNAS_PLAN)
    .eq("paciente_id", pacienteId)
    .order("creado_en", { ascending: false });

  if (error) throw new Error(`No se pudieron cargar los planes de tratamiento: ${error.message}`);
  if (!data) throw new Error("Supabase no devolvio un resultado de consulta valido.");
  return data.map((fila) => planDesdeFila(fila as PlanTratamientoFila));
}

/** Procedimientos de un plan, en el orden en que se agregaron al plan. */
export async function cargarProcedimientos(
  planTratamientoId: string,
  cliente?: SupabaseClient,
): Promise<ProcedimientoTratamiento[]> {
  exigirUuid(planTratamientoId, "planTratamientoId");

  const { data, error } = await (cliente ?? obtenerSupabase())
    .schema("public")
    .from("procedimientos_tratamiento")
    .select(COLUMNAS_PROCEDIMIENTO)
    .eq("plan_tratamiento_id", planTratamientoId)
    .order("creado_en", { ascending: true });

  if (error) {
    throw new Error(`No se pudieron cargar los procedimientos del plan: ${error.message}`);
  }
  if (!data) throw new Error("Supabase no devolvio un resultado de consulta valido.");
  return data.map((fila) => procedimientoDesdeFila(fila as ProcedimientoTratamientoFila));
}
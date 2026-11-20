import type { SupabaseClient } from "@supabase/supabase-js";
import { obtenerSupabase } from "../../lib/supabase.ts";

/**
 * Consultas livianas de solo lectura para las tarjetas inline del asistente
 * (módulo 17, pieza B). No reemplazan al servicio real del módulo (no
 * tienen mapper, no se usan para guardar nada) — son un resumen rápido para
 * mostrar dentro del chat sin navegar. Ver AsistenteFlotante.tsx.
 */

export interface ResumenOdontograma {
  tieneRegistro: boolean;
  fechaExamen: string | null;
  totalPiezas: number;
  piezasSanas: number;
}

export async function cargarResumenOdontograma(
  pacienteId: string,
  cliente?: SupabaseClient,
): Promise<ResumenOdontograma> {
  const supabase = cliente ?? obtenerSupabase();
  const { data, error } = await supabase
    .schema("public")
    .from("odontogramas")
    .select("fecha_examen,piezas")
    .eq("paciente_id", pacienteId)
    .order("fecha_examen", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`No se pudo consultar el odontograma: ${error.message}`);
  if (!data) return { tieneRegistro: false, fechaExamen: null, totalPiezas: 0, piezasSanas: 0 };

  const piezas = Array.isArray(data.piezas) ? (data.piezas as Array<{ condicion?: string }>) : [];
  const piezasSanas = piezas.filter((p) => p?.condicion === "sano").length;
  return {
    tieneRegistro: true,
    fechaExamen: (data.fecha_examen as string | null) ?? null,
    totalPiezas: piezas.length,
    piezasSanas,
  };
}

export interface ResumenTratamiento {
  diagnosticosActivos: number;
  planesActivos: number;
  costoTotalPlanes: number;
}

const ESTADOS_PLAN_ACTIVO = ["propuesto", "aceptado", "en_proceso"];

export async function cargarResumenTratamiento(
  pacienteId: string,
  cliente?: SupabaseClient,
): Promise<ResumenTratamiento> {
  const supabase = cliente ?? obtenerSupabase();
  const [diagnosticos, planes] = await Promise.all([
    supabase
      .schema("public")
      .from("diagnosticos")
      .select("id", { count: "exact", head: true })
      .eq("paciente_id", pacienteId)
      .eq("estado", "activo"),
    supabase
      .schema("public")
      .from("planes_tratamiento")
      .select("costo_total")
      .eq("paciente_id", pacienteId)
      .in("estado", ESTADOS_PLAN_ACTIVO),
  ]);

  if (diagnosticos.error) throw new Error(`No se pudieron consultar los diagnósticos: ${diagnosticos.error.message}`);
  if (planes.error) throw new Error(`No se pudieron consultar los planes de tratamiento: ${planes.error.message}`);

  const filasPlanes = (planes.data ?? []) as Array<{ costo_total: number | string | null }>;
  return {
    diagnosticosActivos: diagnosticos.count ?? 0,
    planesActivos: filasPlanes.length,
    costoTotalPlanes: filasPlanes.reduce((suma, p) => suma + Number(p.costo_total ?? 0), 0),
  };
}

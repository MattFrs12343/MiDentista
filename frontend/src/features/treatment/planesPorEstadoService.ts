import type { SupabaseClient } from "@supabase/supabase-js";
import { obtenerSupabase } from "../../lib/supabase.ts";
import { exigirUuid } from "./diagnosticoMapper.ts";
import { compararPlanes, planDesdeFila } from "./planTratamientoMapper.ts";
import { exigirEstadoFiltro, TAMANO_PLANES_ESTADO } from "./planesPorEstado.ts";
import type { PaginaPlanesEstado } from "./planesPorEstado.ts";
import type { EstadoPlanTratamiento } from "./tipos.ts";

// FKs compuestas T-5.1 explícitas: evita ambigüedad con las FKs simples conservadas.
const COLUMNAS = "id,clinica_id,paciente_id,odontologo_id,titulo,estado,costo_total,notas,creado_en,actualizado_en,"
  + "paciente:pacientes!t51_planes_paciente_fk(id,clinica_id,nombre_completo),autor:perfiles!t51_planes_odontologo_fk(id,clinica_id,nombre_completo)";
function nombreRelacionado(valor: unknown, id: string, clinica: string): string | null {
  if (valor === null) return null; // RLS puede ocultar la relación; no ocultar el plan.
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new Error("Relación de plan no confirmada.");
  const f = valor as Record<string, unknown>;
  exigirUuid(f.id, "relaciónId"); exigirUuid(f.clinica_id, "relaciónClinica");
  if ((f.id as string).toLowerCase() !== id || (f.clinica_id as string).toLowerCase() !== clinica
      || typeof f.nombre_completo !== "string" || !f.nombre_completo.trim()) throw new Error("Paciente o autor ajeno al contexto del plan.");
  return f.nombre_completo.trim();
}

/** Solo una página de planes. Clínica obligatoria incluso en auditoría. Sin escrituras. */
export async function listarPlanesPorEstado(clinicaId: string, estado: EstadoPlanTratamiento, pagina: number,
  cliente?: SupabaseClient): Promise<PaginaPlanesEstado> {
  exigirUuid(clinicaId, "clinicaId"); exigirEstadoFiltro(estado);
  if (!Number.isSafeInteger(pagina) || pagina < 1) throw new Error("Página no válida.");
  const desde = (pagina - 1) * TAMANO_PLANES_ESTADO;
  if (!Number.isSafeInteger(desde + TAMANO_PLANES_ESTADO)) throw new Error("Página fuera de rango.");
  const { data, error, count } = await (cliente ?? obtenerSupabase()).schema("public").from("planes_tratamiento")
    .select(COLUMNAS, { count: "exact" }).eq("clinica_id", clinicaId).eq("estado", estado)
    .order("creado_en", { ascending: false, nullsFirst: false }).order("id", { ascending: false })
    .range(desde, desde + TAMANO_PLANES_ESTADO - 1);
  if (error) throw new Error(`No se pudieron consultar los planes por estado: ${error.message}`, { cause: error });
  if (!Array.isArray(data) || count === null || !Number.isSafeInteger(count) || count < 0
      || data.length !== Math.min(TAMANO_PLANES_ESTADO, Math.max(0, count - desde))) {
    throw new Error("No se confirmó la página completa de planes. Reintenta la carga.");
  }
  const planes = data.map((valor) => {
    const plan = planDesdeFila(valor);
    const fila = valor as unknown as Record<string, unknown>;
    if (plan.clinicaId !== clinicaId.toLowerCase() || plan.estado !== estado) throw new Error("Se recibieron planes de otra clínica o estado.");
    return { ...plan, pacienteNombre: nombreRelacionado(fila.paciente, plan.pacienteId, plan.clinicaId),
      autorNombre: nombreRelacionado(fila.autor, plan.odontologoId, plan.clinicaId) };
  });
  if (new Set(planes.map((p) => p.id)).size !== planes.length) throw new Error("Página con planes duplicados.");
  return { planes: planes.sort(compararPlanes), total: count };
}

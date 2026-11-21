import type { SupabaseClient } from "@supabase/supabase-js";
import { obtenerSupabase } from "../../lib/supabase.ts";
import { esUuid } from "./archivoMapper.ts";
import type { ReporteHuerfanos } from "./archivoHuerfanos.ts";

export async function cargarAuditoriaArchivos(clinicaId?: string, cliente?: SupabaseClient): Promise<ReporteHuerfanos> {
  if (clinicaId !== undefined && !esUuid(clinicaId)) throw new Error("La clínica requiere UUID real.");
  const { data, error } = await (cliente ?? obtenerSupabase()).functions.invoke("archivos", {
    body: { accion: "auditar", ...(clinicaId ? { clinicaId: clinicaId.toLowerCase() } : {}) },
  });
  if (error || !data || data.codigo) throw new Error("No pudimos obtener la auditoría autorizada.");
  const r = data as ReporteHuerfanos;
  if (!["completo", "indeterminado"].includes(r.estado) || r.fuente !== "catalogo_storage"
      || !Number.isFinite(Date.parse(r.fecha)) || !Array.isArray(r.candidatos)
      || r.candidatos.some((c) => typeof c.ruta !== "string" || typeof c.clinicaId !== "string"
        || !["A", "B", "indeterminado"].includes(c.tipo)
        || (clinicaId !== undefined && c.clinicaId !== clinicaId.toLowerCase()))) throw new Error("Inventario no verificable.");
  if (r.estado === "indeterminado") return { ...r, candidatos: [], totalCandidatos: 0 };
  return r;
}

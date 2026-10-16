import { exigirUuid } from "./diagnosticoMapper.ts";
import { ESTADOS_PLAN } from "./planTratamientoMapper.ts";
import type { EstadoPlanTratamiento, PerfilDiagnosticos, PlanTratamientoPaciente } from "./tipos.ts";

export const TAMANO_PLANES_ESTADO = 20;
export const FILTROS_PLANES: Record<EstadoPlanTratamiento, string> = {
  propuesto: "Propuestos", aceptado: "Aceptados", en_proceso: "En proceso", completado: "Completados", cancelado: "Cancelados",
};
export const ETIQUETAS_PLAN: Record<EstadoPlanTratamiento, string> = {
  propuesto: "Propuesto", aceptado: "Aceptado", en_proceso: "En proceso", completado: "Completado", cancelado: "Cancelado",
};
export interface PlanPorEstado extends PlanTratamientoPaciente { pacienteNombre: string | null; autorNombre: string | null }
export interface PaginaPlanesEstado { planes: PlanPorEstado[]; total: number }
export function exigirEstadoFiltro(estado: EstadoPlanTratamiento) {
  if (!ESTADOS_PLAN.includes(estado)) throw new Error("Estado de filtro no válido.");
}
/** Superadmin necesita una clínica explícita; el personal nunca puede cambiar la propia. */
export function clinicaParaVista(perfil: PerfilDiagnosticos | null, explicita?: string): string {
  if (!perfil?.activo || !["odontologo", "odontologo_admin", "recepcionista", "superadmin"].includes(perfil.rol)) throw new Error("Perfil sin permiso de lectura de tratamientos.");
  exigirUuid(perfil.id, "perfilId");
  const clinica = perfil.rol === "superadmin" ? explicita : perfil.clinicaId;
  exigirUuid(clinica, "clínica explícita");
  if (perfil.rol !== "superadmin" && explicita && explicita.toLowerCase() !== clinica!.toLowerCase()) throw new Error("No puedes consultar otra clínica.");
  return clinica!.toLowerCase();
}
export function enlacePlan(plan: PlanTratamientoPaciente) {
  exigirUuid(plan.id, "planId"); exigirUuid(plan.pacienteId, "pacienteId");
  return `/app/pacientes/${plan.pacienteId}?tab=tratamiento&plan=${plan.id}`;
}
export function planVisibleDesdeEnlace(parametro: string | null, planes: readonly PlanTratamientoPaciente[]): string | null {
  if (!parametro) return null;
  return planes.find((p) => p.id === parametro.toLowerCase())?.id ?? null;
}

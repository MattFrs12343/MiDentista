import { puedeCrearPlan } from "./planTratamientoPermisos.ts";
import type { PerfilDiagnosticos, PlanTratamientoPaciente, ProcedimientoTratamiento } from "./tipos.ts";

export type PlanProcedimientos = Pick<PlanTratamientoPaciente, "id" | "clinicaId" | "odontologoId" | "pacienteId">;

export function puedeEscribirProcedimientos(perfil: PerfilDiagnosticos | null, plan: PlanProcedimientos | null) {
  return Boolean(plan && puedeCrearPlan(perfil) && perfil!.id.toLowerCase() === plan.odontologoId
    && perfil!.clinicaId!.toLowerCase() === plan.clinicaId);
}
export function puedeEditarProcedimiento(perfil: PerfilDiagnosticos | null, plan: PlanProcedimientos, p: ProcedimientoTratamiento) {
  return puedeEscribirProcedimientos(perfil, plan) && p.planTratamientoId === plan.id && p.clinicaId === plan.clinicaId;
}

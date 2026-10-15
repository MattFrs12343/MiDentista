import { puedeCrearDiagnostico } from "./diagnosticoPermisos.ts";
import type { PerfilDiagnosticos, PlanTratamientoPaciente } from "./tipos.ts";

export const puedeCrearPlan = puedeCrearDiagnostico;
export function puedeEditarPlan(perfil: PerfilDiagnosticos | null, plan: PlanTratamientoPaciente) {
  return puedeCrearPlan(perfil) && perfil!.id.toLowerCase() === plan.odontologoId
    && perfil!.clinicaId!.toLowerCase() === plan.clinicaId;
}

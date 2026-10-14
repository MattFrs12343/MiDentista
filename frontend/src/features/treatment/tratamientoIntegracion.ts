import { esUuid } from "./diagnosticoMapper.ts";
import type { DiagnosticoPaciente, PlanTratamientoPaciente } from "./tipos.ts";

export function resolverPlanFicha(parametro: string | null, pacienteId: string, planes: readonly PlanTratamientoPaciente[]) {
  if (!parametro) return { estado: "sin_plan" as const, id: null };
  if (!esUuid(parametro)) return { estado: "invalido" as const, id: null };
  const plan = planes.find((p) => p.id === parametro.toLowerCase() && p.pacienteId === pacienteId.toLowerCase());
  return plan ? { estado: "visible" as const, id: plan.id } : { estado: "no_visible" as const, id: null };
}
export function parametrosPlanFicha(anteriores: URLSearchParams, planId: string | null): URLSearchParams {
  if (planId !== null && !esUuid(planId)) throw new Error("Plan de navegación no válido.");
  const siguientes = new URLSearchParams(anteriores);
  siguientes.set("tab", "tratamiento");
  if (planId === null) siguientes.delete("plan"); else siguientes.set("plan", planId.toLowerCase());
  return siguientes;
}
export function datosPertenecenFicha(pacienteId: string, diagnosticos: readonly DiagnosticoPaciente[], plan: PlanTratamientoPaciente | null, clinicaId?: string) {
  const pertenece = (dato: { pacienteId: string; clinicaId: string }) => dato.pacienteId === pacienteId.toLowerCase()
    && (!clinicaId || dato.clinicaId === clinicaId.toLowerCase());
  return diagnosticos.every(pertenece) && (!plan || pertenece(plan));
}
export function seleccionUrlResuelta(parametro: string | null, pacienteId: string, planes: readonly PlanTratamientoPaciente[], seleccionadoId: string | null) {
  const enlace = resolverPlanFicha(parametro, pacienteId, planes);
  return (enlace.estado === "visible" || enlace.estado === "sin_plan") && enlace.id === seleccionadoId;
}

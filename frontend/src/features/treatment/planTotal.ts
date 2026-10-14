export interface SincronizacionTotalPlan {
  estado: "mutando" | "loading" | "error";
  error: string | null;
  mutacionConfirmada?: boolean;
}
export interface OperacionTotalProcedimiento {
  confirmado: () => Promise<void>;
  fallido: () => void;
}
export type IniciarTotalProcedimiento = (planId: string) => OperacionTotalProcedimiento;

/** Ausencia de pendiente: fila obtenida de una lectura o escritura confirmada. */
export function totalPlanConfirmado(totales: Record<string, SincronizacionTotalPlan>, planId: string | null): boolean {
  return planId === null || !totales[planId];
}
export function formatearCostoTotal(costoTotal: number): string {
  return `Bs ${costoTotal.toFixed(2)}`;
}

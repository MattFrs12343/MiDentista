import { Button } from "@/components/ui/button";
import { formatearCostoTotal } from "./planTotal.ts";
import type { SincronizacionTotalPlan } from "./planTotal.ts";

export function PlanTotalSection({ costoTotal, sincronizacion, reintentar }: {
  costoTotal: number; sincronizacion?: SincronizacionTotalPlan; reintentar: () => Promise<void>;
}) {
  if (!sincronizacion) return <p>Costo total registrado: {formatearCostoTotal(costoTotal)}</p>;
  return <section aria-label="Sincronización del total del plan" aria-busy={sincronizacion.estado !== "error"} className="flex flex-col gap-2">
    {sincronizacion.estado === "error" ? <>
      <p role="alert">{sincronizacion.error}</p>
      <Button type="button" onClick={() => void reintentar().catch(() => {})}>Reintentar sincronización del total</Button>
    </> : <p role="status">{sincronizacion.estado === "mutando" ? "Confirmando procedimiento; total pendiente…" : "Actualizando total confirmado del plan…"}</p>}
  </section>;
}

import { Button } from "@/components/ui/button";
import { ACCIONES_ESTADO, transicionesPlan } from "./planEstado.ts";
import { puedeEditarPlan } from "./planTratamientoPermisos.ts";
import type { usePlanesTratamiento } from "./usePlanesTratamiento.ts";

export function PlanEstadoActions({ datos }: { datos: ReturnType<typeof usePlanesTratamiento> }) {
  const plan = datos.seleccionado;
  if (!plan || !puedeEditarPlan(datos.perfil, plan)) return null;
  const confirmacion = datos.confirmacionEstado;
  return <section aria-label="Cambiar estado del plan" aria-busy={datos.cambiandoEstado} className="flex flex-col gap-2">
    {datos.cambiandoEstado && <p role="status">Cambiando estado del plan…</p>}
    {datos.errorEstado && <><p role="alert">{datos.errorEstado}</p>
      <Button type="button" disabled={datos.guardando} onClick={() => void datos.recargar()}>Recargar planes</Button></>}
    {datos.exitoEstado && <p role="status">{datos.exitoEstado}</p>}
    {confirmacion && confirmacion.planId === plan.id ? <div role="group" aria-label="Confirmación del cambio de estado">
      <p>¿Confirmar {confirmacion.nuevo === "completado" ? "completar" : "cancelar"} el plan «{plan.titulo ?? "Sin título"}» ({plan.id})? Este estado es terminal.</p>
      <Button type="button" disabled={datos.guardando} onClick={() => void datos.confirmarCambioEstado().catch(() => {})}>
        {confirmacion.nuevo === "completado" ? "Confirmar completar plan" : "Confirmar cancelar plan"}</Button>
      <Button type="button" disabled={datos.guardando} onClick={datos.cancelarConfirmacionEstado}>Volver sin cambiar estado</Button>
    </div> : <div className="flex flex-wrap gap-2">{transicionesPlan(plan.estado).map((nuevo) =>
      <Button key={nuevo} type="button" disabled={datos.guardando}
        onClick={() => void datos.solicitarCambioEstado(nuevo).catch(() => {})}>{ACCIONES_ESTADO[nuevo]}</Button>)}</div>}
  </section>;
}

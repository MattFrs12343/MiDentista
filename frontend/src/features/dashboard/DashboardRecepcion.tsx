import { CalendarCheck } from "@phosphor-icons/react";
import { DashboardPlaceholder } from "./DashboardPlaceholder";

/**
 * Dashboard del recepcionista (rol `recepcionista`). Pendiente: T-13.3.
 * Mientras no exista, se muestra el andamiaje temporal.
 */
export function DashboardRecepcion() {
  return (
    <DashboardPlaceholder
      titulo="Panel de recepción"
      subtitulo="Agenda y deudas del día"
      icono={CalendarCheck}
      tono="blue"
      descripcion="Aquí verás las citas del día, los pacientes del día y los pagos pendientes. Pendiente de implementar (T-13.3)."
    />
  );
}

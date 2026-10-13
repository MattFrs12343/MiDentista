import { Hospital } from "@phosphor-icons/react";
import { DashboardPlaceholder } from "./DashboardPlaceholder";

/**
 * Dashboard del odontologo administrador (rol `odontologo_admin`). Pendiente
 * de implementar. Mientras no exista, se muestra el andamiaje temporal.
 */
export function DashboardAdmin() {
  return (
    <DashboardPlaceholder
      titulo="Panel de la clínica"
      subtitulo="Ocupación, ingresos y deuda"
      icono={Hospital}
      tono="green"
      descripcion="Aquí verás la clínica completa: ocupación, ingresos y deuda. Pendiente de implementar."
    />
  );
}

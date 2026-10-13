import { Buildings } from "@phosphor-icons/react";
import { DashboardPlaceholder } from "./DashboardPlaceholder";

/**
 * Dashboard del super-admin (rol `superadmin`). Pendiente: T-13.2.
 * Mientras no exista, se muestra el andamiaje temporal.
 */
export function DashboardSuperadmin() {
  return (
    <DashboardPlaceholder
      titulo="Panel del administrador"
      subtitulo="Salud del sistema"
      icono={Buildings}
      tono="violet"
      descripcion="Aquí verás el resumen general del sistema: clínicas y usuarios. Pendiente de implementar (T-13.2)."
    />
  );
}

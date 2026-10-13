import { User } from "@phosphor-icons/react";
import { DashboardPlaceholder } from "./DashboardPlaceholder";

/**
 * Dashboard del paciente (rol `paciente`). Pendiente: T-13.5.
 * Mientras no exista, se muestra el andamiaje temporal.
 */
export function DashboardPaciente() {
  return (
    <DashboardPlaceholder
      titulo="Panel del paciente"
      subtitulo="Tu tratamiento"
      icono={User}
      tono="yellow"
      descripcion="Aquí verás tu próxima cita, tu tratamiento y tus pagos. Pendiente de implementar (T-13.5)."
    />
  );
}

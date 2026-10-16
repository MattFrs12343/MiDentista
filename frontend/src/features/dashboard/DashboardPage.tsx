import type { ComponentType } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import type { Role } from "@/types";
import { DashboardOdontologo } from "./DashboardOdontologo";
import { DashboardPaciente } from "./DashboardPaciente";
import { DashboardRecepcion } from "./DashboardRecepcion";
import { DashboardSuperadmin } from "./DashboardSuperadmin";
import { DashboardPlaceholder } from "./DashboardPlaceholder";

/**
 * Selector del dashboard por rol (T-13.1).
 *
 * Cinco roles vigentes: superadmin, odontologo, odontologo_admin,
 * recepcionista y paciente. `odontologo_admin` había sido descartado del
 * proyecto y reactivado después (módulo 17): usa el mismo panel que
 * `odontologo` — es la misma vista clínica, con permisos administrativos de
 * más, no un dashboard distinto. El mapa sigue tipado con
 * `Partial<Record<Role, ...>>` por si en el futuro se agrega un rol sin
 * panel: cae en "rol no disponible" en vez de una pantalla en blanco.
 */
const DASHBOARDS: Partial<Record<Role, ComponentType>> = {
  superadmin: DashboardSuperadmin,
  recepcionista: DashboardRecepcion,
  odontologo: DashboardOdontologo,
  odontologo_admin: DashboardOdontologo,
  paciente: DashboardPaciente,
};

export function DashboardPage() {
  const { sesion } = useAuth();
  if (!sesion) return null;

  const Panel = DASHBOARDS[sesion.rol];
  if (!Panel) {
    return (
      <DashboardPlaceholder
        titulo="Panel no disponible"
        subtitulo="Rol sin dashboard asignado"
        tono="violet"
        descripcion="El rol de tu cuenta no tiene un panel asignado en esta versión de MiDentista."
      />
    );
  }
  return <Panel />;
}

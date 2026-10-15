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
 * Cuatro roles vigentes: superadmin, odontologo, recepcionista y paciente.
 * `odontologo_admin` fue descartado del proyecto, pero `Role` de `@/types`
 * todavia lo declara (archivo de integracion de Matias), asi que el mapa se
 * tipa con `Partial<Record<Role, ...>>` y un rol sin panel cae en un estado
 * "rol no disponible" en vez de una pantalla en blanco.
 */
const DASHBOARDS: Partial<Record<Role, ComponentType>> = {
  superadmin: DashboardSuperadmin,
  recepcionista: DashboardRecepcion,
  odontologo: DashboardOdontologo,
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

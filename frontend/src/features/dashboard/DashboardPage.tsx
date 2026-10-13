import type { ComponentType } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import type { RolConDashboard } from "./tipos";
import { DashboardAdmin } from "./DashboardAdmin";
import { DashboardOdontologo } from "./DashboardOdontologo";
import { DashboardPaciente } from "./DashboardPaciente";
import { DashboardRecepcion } from "./DashboardRecepcion";
import { DashboardSuperadmin } from "./DashboardSuperadmin";

/**
 * Selector del dashboard por rol (T-13.1).
 *
 * El modulo 13 es una matriz de roles: cada sesion ve un panel distinto segun
 * su `rol`. Este componente es solo el reparto; el panel real vive en cada
 * archivo de rol (`DashboardOdontologo`, `DashboardAdmin`, etc.). Los roles que
 * todavia no se implementaron apuntan a un andamiaje temporal.
 *
 * El registro se tipa con `RolConDashboard` (de `tipos.ts`), asi que TypeScript
 * obliga a cubrir los cinco roles y no se puede olvidar ninguno. No se toca
 * `App.tsx`: se conserva el mismo archivo y el mismo export `DashboardPage` que
 * importa su `lazy()`.
 */
const DASHBOARDS: Record<RolConDashboard, ComponentType> = {
  superadmin: DashboardSuperadmin,
  odontologo_admin: DashboardAdmin,
  recepcionista: DashboardRecepcion,
  odontologo: DashboardOdontologo,
  paciente: DashboardPaciente,
};

export function DashboardPage() {
  const { sesion } = useAuth();
  // `RequireAuth` ya garantiza una sesion, pero el tipo admite null.
  if (!sesion) return null;

  const Panel = DASHBOARDS[sesion.rol];
  return <Panel />;
}

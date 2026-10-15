import { Buildings, Hourglass } from "@phosphor-icons/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePageHeader } from "@/components/layout/PageHeaderContext";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { DashboardStatCard } from "./DashboardStatCard";
import { estadoDashboard } from "./dashboardCards";
import { estaVacioResumen, indicadoresSuperadmin } from "./superadminResumen";
import { useSuperadminResumen } from "./useSuperadminResumen";
import { SuperadminCharts } from "./SuperadminCharts";
import "./dashboard.css";

/** Contexto de cada tarjeta, por id de indicador. */
const HINTS: Record<string, string> = {
  "clinicas-totales": "Registradas en el sistema",
  "clinicas-activas": "Con servicio habilitado",
  "usuarios-activos": "Con acceso vigente",
  "usuarios-totales": "Incluye cuentas inactivas",
};

/**
 * Dashboard del superadministrador (rol `superadmin`, US-13.1 / T-13.2).
 *
 * Muestra el estado del sistema con datos reales de Supabase: clínicas
 * (totales y activas) y usuarios (activos y totales). El superadmin es el
 * único rol sin clínica (`clinica: null`): audita el sistema entero.
 *
 * La "actividad general" que pide US-13.1 no tiene métrica definida todavía, así
 * que se deja un bloque explícito de lo que falta confirmar: no se calcula ni se
 * inventa ninguna cifra.
 */
export function DashboardSuperadmin() {
  usePageHeader({
    title: "Panel del administrador",
    subtitle: "Salud del sistema",
    icon: Buildings,
    tone: "violet",
  });

  const datos = useSuperadminResumen();
  const estado = estadoDashboard(datos, estaVacioResumen);

  return (
    <div className="dashboard-page fade-in-up flex flex-col gap-6">
      {estado !== "listo" ? (
        <DashboardEmptyState
          datos={datos}
          estaVacio={estaVacioResumen}
          vacioTitle="Todavía no hay clínicas ni usuarios"
          vacioDescription="Cuando existan clínicas o usuarios registrados aparecerán aquí sus totales."
        />
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {indicadoresSuperadmin(datos.valor).map((indicador) => (
              <DashboardStatCard key={indicador.id} indicador={indicador} hint={HINTS[indicador.id]} />
            ))}
          </section>

          <SuperadminCharts resumen={datos.valor} />
          <ActividadGeneralPendiente />
        </>
      )}
    </div>
  );
}

/**
 * Bloque de "actividad general" (US-13.1) preparado pero sin cifras.
 *
 * No se define aquí ninguna métrica: US-13.1 nombra "actividad general" sin
 * precisar qué mide. Se listan las candidatas a confirmar con el equipo y se
 * deja constancia de que no se calcula nada hasta que la definición esté
 * aprobada.
 */
function ActividadGeneralPendiente() {
  return (
    <Card accent tone="yellow">
      <CardHeader>
        <CardTitle>Actividad general</CardTitle>
        <CardDescription>
          Sección prevista por US-13.1. Pendiente de confirmar qué mide; todavía no se muestra
          ninguna cifra.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-label">
          <Hourglass size={15} weight="duotone" aria-hidden />
          Falta definir la métrica
        </p>
        <p className="text-[13px] leading-relaxed text-label-2">
          "Actividad general" no está definida en la historia de usuario. Candidatas a confirmar con
          el Product Owner:
        </p>
        <ul className="list-disc pl-5 text-[13px] leading-relaxed text-label-2">
          <li>Citas de la última semana/mes (Módulo 07).</li>
          <li>Pacientes nuevos del mes (Módulo 02).</li>
          <li>Ingresos del mes (Módulo 09).</li>
        </ul>
      </CardContent>
    </Card>
  );
}

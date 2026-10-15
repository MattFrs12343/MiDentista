import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { Icon } from "@phosphor-icons/react";
import {
  ArrowRight,
  CalendarCheck,
  CurrencyCircleDollar,
  UsersThree,
} from "@phosphor-icons/react";
import type { Cita, Paciente } from "@/types";
import type { Pago } from "@/features/pagos/tipos";
import heroDashboard from "@/assets/banners/hero-dashboard.jpg";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HangingBanner } from "@/components/ui/hanging-banner";
import { usePageHeader } from "@/components/layout/PageHeaderContext";
import { useAuth } from "@/features/auth/AuthContext";
import { useClinicaData } from "@/data/store";
import { primerNombre } from "@/lib/nombre";
import { cn } from "@/lib/cn";
import {
  COLOR_ESTADO,
  ETIQUETA_ESTADO,
  formatoHora,
  hoyISO,
  rangoHorario,
} from "@/features/agenda/agenda";
import { formatearFecha, formatearMoneda } from "@/features/pagos/pagoFormato";
import { DashboardStatCard } from "./DashboardStatCard";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { usePagosPendientes } from "./usePagosPendientes";
import {
  citasDelDia,
  indicadoresRecepcion,
  pacientesDelDia,
  resumenDelDia,
  totalPendiente,
} from "./recepcionResumen";
import "./dashboard.css";

const ICONO_AGENDA: Icon = CalendarCheck;

function nombreCompleto(paciente: Paciente | undefined): string {
  if (!paciente) return "Paciente sin ficha";
  return `${paciente.nombres} ${paciente.apellidos}`.trim() || "Paciente sin ficha";
}

/** Píldora de estado de la cita, con los colores del módulo de agenda. */
function EstadoBadge({ estado }: { estado: Cita["estado"] }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        COLOR_ESTADO[estado],
      )}
    >
      {ETIQUETA_ESTADO[estado]}
    </span>
  );
}

/**
 * Dashboard del recepcionista (rol `recepcionista`, T-13.3 / US-13.2).
 *
 * Responde a las tres preguntas de recepción: quién viene hoy (agenda),
 * cuántos pacientes son (pacientes del día) y quién debe (pagos pendientes).
 *
 * Fuentes, todas de solo lectura:
 *   - Citas y pacientes: `useClinicaData` (el mismo store que la agenda del
 *     módulo 07). Los cálculos viven en `recepcionResumen.ts`, que delega en
 *     `agenda.ts` para no contar por su cuenta.
 *   - Pagos pendientes: `usePagosPendientes`, que lee `public.pagos` con la
 *     sesión normal (RLS decide qué clínica ve). No hay lectura transversal en
 *     el módulo 09, por eso el módulo 13 trae la suya (AGENTS.md §4).
 *
 * No inventa métricas: no hay fuente para ingresos del día ni ocupación, así
 * que no se muestran. El estado de cada bloque se distingue con
 * `DashboardEmptyState` (carga, error, permiso, vacío).
 */
export function DashboardRecepcion() {
  usePageHeader({
    title: "Panel de recepción",
    subtitle: "Agenda y deudas del día",
    icon: ICONO_AGENDA,
    tone: "blue",
  });
  const { sesion } = useAuth();
  const { pacientes, citas } = useClinicaData();
  const pagos = usePagosPendientes();

  const hoy = hoyISO();
  const primer = sesion ? primerNombre(sesion.nombre) : "";

  const { citasHoy, idsPacientesDia, pacientePorId, totalPorCobrar, indicadores } = useMemo(() => {
    const citasHoy_ = citasDelDia(citas, hoy);
    const ids = pacientesDelDia(citas, hoy);
    const resumen_ = resumenDelDia(citas, hoy);
    const porId = new Map(pacientes.map((p) => [p.id, p]));
    const total = totalPendiente(pagos.valor);
    return {
      citasHoy: citasHoy_,
      idsPacientesDia: ids,
      pacientePorId: porId,
      totalPorCobrar: total,
      indicadores: indicadoresRecepcion({
        resumen: resumen_,
        pacientes: ids.length,
        pagosPendientes: pagos.valor.length,
      }),
    };
  }, [citas, pacientes, pagos.valor, hoy]);

  const hintPagos = pagos.cargando
    ? "Cargando…"
    : pagos.sinPermiso
      ? "Sin acceso"
      : pagos.error
        ? "No disponible"
        : `Por cobrar ${formatearMoneda(totalPorCobrar)}`;

  const pistas: Record<string, string> = {
    "citas-hoy": "Sin contar las canceladas",
    "citas-confirmadas": "Ya confirmadas",
    "citas-por-confirmar": "Aún sin confirmar",
    "pacientes-hoy": "Con cita hoy",
    "pagos-pendientes": hintPagos,
  };

  return (
    <div className="dashboard-page">
      <HangingBanner className="max-w-3xl">
        <section className="dashboard-hero hanger-panel fade-in-up w-full sm:min-h-64 lg:min-h-72">
          <img src={heroDashboard} alt="" aria-hidden className="dashboard-hero-photo" />
          <div className="dashboard-hero-scrim" />

          <div className="dashboard-hero-content">
            <span className="dashboard-hero-label">
              HOY EN RECEPCIÓN{sesion?.clinica ? ` · ${sesion.clinica}` : ""}
            </span>
            <h2>Hola, {primer}.</h2>
            <span className="dashboard-hero-motto">Quién viene, quién falta y quién debe.</span>
            <p>Las citas del día, los pacientes citados y los pagos pendientes de tu clínica.</p>
          </div>

          <div className="dashboard-hero-decoration" aria-hidden>
            <div className="dashboard-hero-tools">
              <CalendarCheck size={30} weight="duotone" />
              <UsersThree size={28} weight="duotone" />
              <CurrencyCircleDollar size={28} weight="duotone" />
            </div>
            <div className="dashboard-tooth-decoration">
              <CalendarCheck size={120} weight="duotone" />
            </div>
          </div>
        </section>
      </HangingBanner>

      <section className="dashboard-stats">
        {indicadores.map((indicador) => (
          <DashboardStatCard
            key={indicador.id}
            indicador={indicador}
            hint={pistas[indicador.id]}
          />
        ))}
      </section>

      <section className="dashboard-blocks">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
          <Card className="fade-in-up">
            <CardHeader divided>
              <CardTitle>Agenda de hoy</CardTitle>
              <CardDescription>
                Citas del día en orden de hora. Toca una para ir a la ficha del paciente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {citasHoy.length === 0 ? (
                <DashboardEmptyState
                  datos={{ valor: citasHoy, cargando: false, sinPermiso: false, error: null }}
                  vacioTitle="No hay citas para hoy"
                  vacioDescription="Cuando se agende una cita para hoy aparecerá aquí."
                />
              ) : (
                <ol className="flex flex-col gap-2">
                  {citasHoy.map((cita) => (
                    <li key={cita.id}>
                      <Link
                        to={`/app/pacientes/${cita.pacienteId}`}
                        className="press flex items-center gap-3 rounded-tile border border-line px-3 py-2 transition-colors hover:bg-ink/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                      >
                        <span className="w-24 shrink-0 text-[12.5px] font-semibold tabular-nums text-label-2">
                          {rangoHorario(cita.horaInicio, cita.horaFin)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-medium text-label">
                            {nombreCompleto(pacientePorId.get(cita.pacienteId))}
                          </span>
                          <span className="block truncate text-[12px] text-label-2">
                            {cita.motivoConsulta}
                          </span>
                        </span>
                        <EstadoBadge estado={cita.estado} />
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card className="fade-in-up">
            <CardHeader divided>
              <CardTitle>Pacientes del día</CardTitle>
              <CardDescription>
                Personas con al menos una cita hoy, en el orden de su primera cita.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {idsPacientesDia.length === 0 ? (
                <DashboardEmptyState
                  datos={{
                    valor: idsPacientesDia,
                    cargando: false,
                    sinPermiso: false,
                    error: null,
                  }}
                  vacioTitle="Ningún paciente citado hoy"
                  vacioDescription="Cuando haya citas, aquí verás a quién recibir."
                />
              ) : (
                <ul className="flex flex-col gap-2">
                  {idsPacientesDia.map((id) => {
                    const primera = citasHoy.find((c) => c.pacienteId === id);
                    return (
                      <li key={id}>
                        <Link
                          to={`/app/pacientes/${id}`}
                          className="press flex items-center gap-3 rounded-tile border border-line px-3 py-2 transition-colors hover:bg-ink/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                        >
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
                            <UsersThree size={16} weight="duotone" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-label">
                            {nombreCompleto(pacientePorId.get(id))}
                          </span>
                          {primera && (
                            <span className="shrink-0 text-[12px] tabular-nums text-label-2">
                              {formatoHora(primera.horaInicio)}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="dashboard-blocks">
        <Card className="fade-in-up">
          <CardHeader divided className="flex-row items-start justify-between">
            <div>
              <CardTitle>Pagos pendientes</CardTitle>
              <CardDescription>
                Pagos registrados sin confirmar, del más antiguo al más reciente.
              </CardDescription>
            </div>
            <span className="text-[13px] font-semibold text-label">
              {formatearMoneda(totalPorCobrar)}
            </span>
          </CardHeader>
          <CardContent>
            <DashboardEmptyState
              datos={pagos}
              vacioTitle="Sin pagos pendientes"
              vacioDescription="Todos los pagos de la clínica están confirmados."
            />
            {pagos.valor.length > 0 && (
              <ul className="flex flex-col gap-2">
                {pagos.valor.map((pago: Pago) => (
                  <li
                    key={pago.id}
                    className="flex items-center gap-3 rounded-tile border border-line px-3 py-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-label">
                        {nombreCompleto(pacientePorId.get(pago.pacienteId))}
                      </span>
                      <span className="block truncate text-[12px] text-label-2">
                        {formatearFecha(pago.fechaPago)} · {pago.metodoPago}
                      </span>
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold tabular-nums text-label">
                      {formatearMoneda(pago.monto)}
                    </span>
                    <Link
                      to={`/app/pacientes/${pago.pacienteId}`}
                      aria-label="Ir a la ficha del paciente"
                      className="press grid h-8 w-8 shrink-0 place-items-center rounded-full text-label-2 hover:bg-ink/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                    >
                      <ArrowRight size={16} weight="bold" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Icon } from "@phosphor-icons/react";
import {
  ArrowRight,
  CalendarDots,
  FileText,
  Tooth,
  User,
  WarningCircle,
} from "@phosphor-icons/react";
import type { FichaPaciente } from "@/data/api";
import heroDashboard from "@/assets/banners/hero-dashboard.jpg";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HangingBanner } from "@/components/ui/hanging-banner";
import { usePageHeader } from "@/components/layout/PageHeaderContext";
import { useAuth } from "@/features/auth/AuthContext";
import { primerNombre } from "@/lib/nombre";
import { hoyISO } from "@/features/agenda/agenda";
import {
  etiquetaEstado,
  formatearFecha,
  formatearFechaCorta,
  formatearHora,
  formatearMoneda,
  tonoEstado,
} from "@/features/portal-paciente/portalFormato";
import { DashboardStatCard } from "./DashboardStatCard";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { estadoDashboard } from "./dashboardCards";
import { useFichaPaciente } from "./useFichaPaciente";
import {
  avancePlan,
  indicadoresPaciente,
  pagosPendientes,
  planActual,
  proximaCita,
} from "./pacienteResumen";
import "./dashboard.css";

const ICONO_PACIENTE: Icon = User;

/**
 * Reúne lo que el panel necesita de la ficha, sin consultar nada nuevo: la
 * ficha ya llegó acotada por RLS. Devuelve null si el paciente no tiene clínica
 * todavia (no hay tratamiento, agenda ni pagos que mostrar).
 */
function vistaDesdeFicha(ficha: FichaPaciente, hoy: string) {
  const proxima = proximaCita(ficha.citas, hoy);
  const plan = planActual(ficha.planes);
  const avance = plan ? avancePlan(plan) : null;
  const pendientes = pagosPendientes(ficha.pagos);
  const saldo = ficha.resumen.saldoPendiente;

  return {
    proxima,
    plan,
    avance,
    pendientes,
    saldo,
    indicadores: indicadoresPaciente({
      proximaFecha: proxima ? formatearFechaCorta(proxima.fechaCita) : "—",
      planPorcentaje: avance ? avance.porcentaje : null,
      saldoTexto: formatearMoneda(saldo),
      saldoPendiente: saldo,
    }),
  };
}

function BarraAvance({ porcentaje }: { porcentaje: number }) {
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={porcentaje}
      aria-label="Avance del tratamiento"
      className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken"
    >
      <div className="h-full rounded-full bg-brand-500" style={{ width: `${porcentaje}%` }} />
    </div>
  );
}

/**
 * Dashboard del paciente (rol `paciente`, T-13.5 / US-13.4).
 *
 * Muestra, solo de la propia ficha del paciente: próxima cita, tratamiento
 * actual, saldo/pagos pendientes y documentos.
 *
 * Fuente: `useFichaPaciente` → `paciente/mi-ficha` (Edge Function con RLS). No
 * se consulta ni se muestra nada de otros pacientes; sin sesión de paciente no
 * se toca la red y se muestra "sin permiso".
 *
 * Documentos: BLOQUEADO. El módulo 10 (archivos) todavía no expone una lectura
 * para el paciente ni su tabla está integrada, así que no se consulta y se deja
 * una sección informativa. No se inventan cifras ni listados.
 *
 * NOTA DE INTEGRACIÓN (no resuelta aquí): este componente cuelga de
 * `DashboardPage`, que vive bajo `/app`. Un paciente es redirigido de `/app` a
 * `/portal` (`RequireNoPaciente`/`RequireStaff` en `App.tsx`), y su portada real
 * —`PortalHomePage`— ya cubre US-13.4. Es decir, este panel está implementado
 * pero hoy NO es alcanzable para un paciente. Queda listo para que Matías lo
 * monte donde corresponda; no se editó `App.tsx` ni ninguna ruta compartida.
 */
export function DashboardPaciente() {
  usePageHeader({
    title: "Mi panel",
    subtitle: "Tu tratamiento",
    icon: ICONO_PACIENTE,
    tone: "yellow",
  });
  const { sesion } = useAuth();
  const ficha = useFichaPaciente();
  const [hoy] = useState(() => hoyISO());

  const estado = estadoDashboard(ficha);
  const datos = ficha.valor;
  const primer = sesion ? primerNombre(sesion.nombre) : "";

  const vista = useMemo(
    () => (datos && !datos.sinClinica ? vistaDesdeFicha(datos, hoy) : null),
    [datos, hoy],
  );

  const pistas: Record<string, string> = vista
    ? {
        "proxima-cita": vista.proxima
          ? `A las ${formatearHora(vista.proxima.horaInicio)}`
          : "Sin citas próximas",
        "tratamiento-actual": vista.avance
          ? `${vista.avance.completados} de ${vista.avance.total} procedimientos`
          : "Sin tratamiento activo",
        "pagos-pendientes": vista.saldo > 0 ? "Tenés saldo a pagar" : "Estás al día",
        documentos: "Próximamente",
      }
    : {};

  return (
    <div className="dashboard-page">
      <HangingBanner className="max-w-3xl">
        <section className="dashboard-hero hanger-panel fade-in-up w-full sm:min-h-64 lg:min-h-72">
          <img src={heroDashboard} alt="" aria-hidden className="dashboard-hero-photo" />
          <div className="dashboard-hero-scrim" />

          <div className="dashboard-hero-content">
            <span className="dashboard-hero-label">
              TU SALUD DENTAL{sesion?.clinica ? ` · ${sesion.clinica}` : ""}
            </span>
            <h2>Hola, {primer}.</h2>
            <span className="dashboard-hero-motto">Tu tratamiento, en un solo lugar.</span>
            <p>Tu próxima cita, tu tratamiento actual y tu saldo, de un vistazo.</p>
          </div>

          <div className="dashboard-hero-decoration" aria-hidden>
            <div className="dashboard-tooth-decoration">
              <Tooth size={124} weight="duotone" />
            </div>
          </div>
        </section>
      </HangingBanner>

      {estado !== "listo" || !datos ? (
        <DashboardEmptyState
          datos={ficha}
          vacioTitle="Todavía no podemos mostrar tu panel"
          vacioDescription="Vuelve a intentarlo en unos minutos."
        />
      ) : datos.sinClinica ? (
        <Card accent tone="yellow" className="fade-in-up">
          <CardHeader>
            <CardTitle>Elegí tu clínica</CardTitle>
            <CardDescription>
              Todavía no estás afiliado a una clínica, así que no hay citas, tratamientos ni pagos
              que mostrar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              to="/portal/buscar"
              className="press inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white transition-transform duration-200 ease-out hover:translate-x-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              Buscar clínica
              <ArrowRight size={14} weight="bold" aria-hidden />
            </Link>
          </CardContent>
        </Card>
      ) : vista ? (
        <>
          <section className="dashboard-stats">
            {vista.indicadores.map((indicador) => (
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
                  <CardTitle>Próxima cita</CardTitle>
                  <CardDescription>Tu siguiente atención en la clínica.</CardDescription>
                </CardHeader>
                <CardContent>
                  {vista.proxima ? (
                    <div className="flex items-center gap-3 rounded-tile border border-line px-3 py-3">
                      <span
                        aria-hidden
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700"
                      >
                        <CalendarDots size={18} weight="duotone" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-medium text-label">
                          {formatearFecha(vista.proxima.fechaCita)}
                        </p>
                        <p className="truncate text-[12px] text-label-2">
                          {formatearHora(vista.proxima.horaInicio)}
                          {vista.proxima.motivoConsulta
                            ? ` · ${vista.proxima.motivoConsulta}`
                            : ""}
                        </p>
                      </div>
                      <Badge tone={tonoEstado(vista.proxima.estado)}>
                        {etiquetaEstado(vista.proxima.estado)}
                      </Badge>
                    </div>
                  ) : (
                    <DashboardEmptyState
                      datos={{ valor: null, cargando: false, sinPermiso: false, error: null }}
                      vacioTitle="No tenés citas próximas"
                      vacioDescription="Cuando se agende una cita aparecerá aquí."
                      size="sm"
                    />
                  )}
                  <Link
                    to="/portal/citas"
                    className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-700 hover:underline"
                  >
                    Ver mis citas
                    <ArrowRight size={13} weight="bold" aria-hidden />
                  </Link>
                </CardContent>
              </Card>

              <Card className="fade-in-up">
                <CardHeader divided>
                  <CardTitle>Tratamiento actual</CardTitle>
                  <CardDescription>El plan en curso y su avance.</CardDescription>
                </CardHeader>
                <CardContent>
                  {vista.plan && vista.avance ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13.5px] font-medium text-label">
                          {vista.plan.titulo ?? "Plan de tratamiento"}
                        </p>
                        <Badge tone={tonoEstado(vista.plan.estado)}>
                          {etiquetaEstado(vista.plan.estado)}
                        </Badge>
                      </div>
                      <BarraAvance porcentaje={vista.avance.porcentaje} />
                      <p className="text-[12px] text-label-2">
                        {vista.avance.completados} de {vista.avance.total} procedimientos
                        completados
                      </p>
                      {vista.plan.items.length > 0 && (
                        <ul className="flex flex-col gap-1.5">
                          {vista.plan.items.map((item) => (
                            <li
                              key={item.id}
                              className="flex items-center justify-between gap-3 rounded-tile border border-line px-3 py-1.5"
                            >
                              <span className="min-w-0 flex-1 truncate text-[12.5px] text-label">
                                {item.descripcion}
                              </span>
                              <Badge tone={tonoEstado(item.estado)}>
                                {etiquetaEstado(item.estado)}
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <DashboardEmptyState
                      datos={{ valor: null, cargando: false, sinPermiso: false, error: null }}
                      vacioTitle="Sin tratamiento activo"
                      vacioDescription="Cuando tu odontólogo proponga un plan lo verás aquí."
                      size="sm"
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="dashboard-blocks">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
              <Card className="fade-in-up">
                <CardHeader divided className="flex-row items-start justify-between">
                  <div>
                    <CardTitle>Pagos pendientes</CardTitle>
                    <CardDescription>Tu saldo y los pagos por confirmar.</CardDescription>
                  </div>
                  <span className="text-[13px] font-semibold text-label">
                    {formatearMoneda(vista.saldo)}
                  </span>
                </CardHeader>
                <CardContent>
                  {vista.saldo <= 0 && vista.pendientes.length === 0 ? (
                    <DashboardEmptyState
                      datos={{ valor: null, cargando: false, sinPermiso: false, error: null }}
                      vacioTitle="Estás al día"
                      vacioDescription="No tenés saldo pendiente."
                      size="sm"
                    />
                  ) : (
                    <div className="flex flex-col gap-2">
                      {vista.pendientes.map((pago) => (
                        <div
                          key={pago.id}
                          className="flex items-center justify-between gap-3 rounded-tile border border-line px-3 py-2"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium text-label">
                              {formatearMoneda(pago.monto)}
                            </span>
                            <span className="block truncate text-[12px] text-label-2">
                              {formatearFecha(pago.fechaPago)} · {pago.metodoPago}
                            </span>
                          </span>
                          <Badge tone={tonoEstado(pago.estado)}>
                            {etiquetaEstado(pago.estado)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                  <Link
                    to="/portal/pagos"
                    className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-700 hover:underline"
                  >
                    Ver mis pagos
                    <ArrowRight size={13} weight="bold" aria-hidden />
                  </Link>
                </CardContent>
              </Card>

              <Card tone="yellow" accent className="fade-in-up">
                <CardHeader divided>
                  <CardTitle>Documentos disponibles</CardTitle>
                  <CardDescription>Radiografías, informes y archivos de tu clínica.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-3 rounded-tile border border-dashed border-line bg-surface-sunken/70 px-3 py-3">
                    <span
                      aria-hidden
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-ios bg-pastel-yellow-bg text-pastel-yellow-fg"
                    >
                      <WarningCircle size={18} weight="duotone" />
                    </span>
                    <div className="flex flex-col gap-1">
                      <p className="text-[13px] font-semibold text-ink">
                        Sección pendiente de integrar
                      </p>
                      <p className="text-[12.5px] leading-relaxed text-label-2">
                        El módulo de archivos todavía no expone una lectura para el paciente
                        (su tabla no está integrada). Cuando esté disponible verás aquí tus
                        documentos. No mostramos datos hasta que la fuente sea real.
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 inline-flex items-center gap-1 text-[12px] text-label-2">
                    <FileText size={13} weight="duotone" aria-hidden />
                    Bloqueado por el Módulo 10 (Archivos).
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

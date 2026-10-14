import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Tooth,
  ArrowRight,
  Sparkle,
  Syringe,
  Scissors,
  Pill,
  Thermometer,
} from "@phosphor-icons/react";
import heroDashboard from "@/assets/banners/hero-dashboard.jpg";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HangingBanner } from "@/components/ui/hanging-banner";
import { DashboardStatCard } from "./DashboardStatCard";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { estadoDashboard } from "./dashboardCards";
import { usePageHeader } from "@/components/layout/PageHeaderContext";
import { useAuth } from "@/features/auth/AuthContext";
import { useClinicaData } from "@/data/store";
import { primerNombre as obtenerPrimerNombre } from "@/lib/nombre";
import { CalendarioAgenda } from "@/features/agenda/CalendarioAgenda";
import { AtendidosHoy } from "@/features/agenda/AtendidosHoy";
import {
  ETIQUETA_ESTADO,
  etiquetaLarga,
  formatoHora,
  hoyISO,
} from "@/features/agenda/agenda";
import { ClinicalFindingsChart } from "./ClinicalFindingsChart";
import { contarHallazgos } from "./odontologoGraficos";
import { resumenDelDia } from "./recepcionResumen";
import { proximaActividad } from "./odontologoResumen";
import { useTratamientosClinica } from "./useTratamientosClinica";
import type { Cita } from "@/types";
import "./dashboard.css";

/** Tono de la píldora por estado de cita; los del `Badge` compartido. */
const TONO_ESTADO: Record<Cita["estado"], "blue" | "green" | "neutral" | "red"> = {
  reservada: "blue",
  confirmada: "green",
  atendida: "neutral",
  cancelada: "red",
};

/** Sin datos cargados: estado vacío legítimo, no error ni falta de permiso. */
const SIN_DATOS = { valor: null, cargando: false, sinPermiso: false, error: null } as const;

/**
 * Dashboard del odontólogo (rol `odontologo`, T-13.4 / US-13.3).
 *
 * Responde a lo que el odontólogo abre la pantalla a ver: la agenda de la
 * semana, quién fue atendido hoy, dónde se concentra la patología, **cuántas
 * citas hay hoy**, **cuántos tratamientos están activos y pendientes** y **cuál
 * es su próxima actividad**. El contenido previo se conserva tal cual (agenda,
 * atendidos, hallazgos y "Siguiente paso").
 *
 * Fuentes, todas de solo lectura:
 *   - Citas y odontogramas: `useClinicaData` (store del módulo 07).
 *   - Citas del día y próxima actividad: funciones de agenda/recepción, sin
 *     recontar por su cuenta.
 *   - Tratamientos por estado: servicio propio del módulo
 *     (`useTratamientosClinica`), porque el store NO expone el `estado` de los
 *     planes (ver `dashboardOdontologoService.ts`).
 *
 * DEUDA DE RLS (documentada, no resuelta aquí): las políticas actuales dejan a
 * cualquier odontólogo ver los pacientes y planes de toda la clínica, aunque la
 * entrevista pide "cada odontólogo solo ve sus propios pacientes". No se recorta
 * en la UI —eso escondería el problema de permisos—: lo corrige Matías en
 * Supabase. Este panel solo agrega lo que ya llegó autorizado.
 */
export function DashboardOdontologo() {
  usePageHeader({
    title: "Panel general",
    subtitle: "Salud de tu clínica",
    icon: Tooth,
    tone: "blue",
  });
  const { sesion } = useAuth();
  const { pacientes, odontogramaDe, planDe, citas, horarios } = useClinicaData();
  const navigate = useNavigate();

  const primerNombre = sesion ? obtenerPrimerNombre(sesion.nombre) : "";
  const hoy = hoyISO();

  const porId = useMemo(() => new Map(pacientes.map((p) => [p.id, p])), [pacientes]);

  /**
   * El store expone los datos por paciente, asi que el panel tiene que
   * destructurarlos antes de poder agregar. Con 14 pacientes es lo bastante
   * chico para hacerlo en render y no necesita un indice en el store.
   */
  const { planes, piezasConHallazgos, hallazgos } = useMemo(() => {
    const planes_: Record<string, ReturnType<typeof planDe>> = {};
    const odontogramas: Record<string, ReturnType<typeof odontogramaDe>> = {};
    let piezas = 0;

    for (const p of pacientes) {
      const odontograma = odontogramaDe(p.id);
      odontogramas[p.id] = odontograma;
      planes_[p.id] = planDe(p.id);
      // Cada pieza con condición distinta de `sano`. NO son filas de la tabla
      // `diagnosticos`: es el mismo tipo de conteo que el gráfico de hallazgos.
      piezas += odontograma.filter((c) => c.condicion !== "sano").length;
    }
    return {
      planes: planes_,
      piezasConHallazgos: piezas,
      // Mismo criterio que las tarjetas (piezas por condicion, sin `sano`),
      // reutilizado por el grafico de hallazgos.
      hallazgos: contarHallazgos(odontogramas),
    };
  }, [pacientes, odontogramaDe, planDe]);

  const itemsDePlanes = useMemo(
    () => Object.values(planes).reduce((acc, plan) => acc + plan.items.length, 0),
    [planes],
  );

  // Resumen del día: la cifra la decide la agenda (módulo 07), no este panel.
  const resumenHoy = useMemo(() => resumenDelDia(citas, hoy), [citas, hoy]);
  const proxima = useMemo(() => proximaActividad(citas, hoy), [citas, hoy]);

  const tratamientos = useTratamientosClinica();
  const estadoTrat = estadoDashboard(tratamientos, (t) => t.total === 0);
  const tratamientosBloqueados = estadoTrat === "error" || estadoTrat === "sinPermiso";
  const valorTratamiento = (n: number) =>
    tratamientosBloqueados ? "—" : estadoTrat === "cargando" ? "…" : String(n);

  return (
    <div className="dashboard-page">
      <HangingBanner className="max-w-3xl">
        <section className="dashboard-hero hanger-panel fade-in-up w-full sm:min-h-64 lg:min-h-72">
          <img src={heroDashboard} alt="" aria-hidden className="dashboard-hero-photo" />
          <div className="dashboard-hero-scrim" />

          <div className="dashboard-hero-content">
            <span className="dashboard-hero-label">
              BIENVENIDO, DOCTOR{sesion?.clinica ? ` · ${sesion.clinica}` : ""}
            </span>
            <h2>Hola, {primerNombre}.</h2>
            <span className="dashboard-hero-motto">Tu trabajo transforma sonrisas.</span>
            <p>Dónde se concentra la patología de tu clínica y qué quedó pendiente de planear.</p>
          </div>

          <div className="dashboard-hero-decoration" aria-hidden>
            <div className="dashboard-hero-tools">
              <Syringe size={30} weight="duotone" />
              <Scissors size={26} weight="duotone" />
              <Pill size={28} weight="duotone" />
              <Thermometer size={26} weight="duotone" />
            </div>
            <div className="dashboard-tooth-decoration">
              <Tooth size={132} weight="duotone" />
            </div>
          </div>
        </section>
      </HangingBanner>

      <section className="dashboard-stats">
        {/* Cada metrica es un destino: el `Link` aporta el foco y el rol, el
            `interactive` del tile aporta la elevacion y la presion al tocar. */}
        <Link
          to="/app/pacientes"
          className="block h-full rounded-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          aria-label="Ver los pacientes registrados"
        >
          <DashboardStatCard
            interactive
            className="h-full"
            indicador={{
              id: "pacientes-registrados",
              etiqueta: "Pacientes registrados",
              valor: String(pacientes.length),
              icono: "UsersThree",
              tono: "blue",
            }}
            hint="Fichas clínicas abiertas"
          />
        </Link>

        <Link
          to="/app/pacientes"
          className="block h-full rounded-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          aria-label="Ver las piezas con hallazgos en los odontogramas"
        >
          <DashboardStatCard
            interactive
            className="h-full"
            indicador={{
              id: "piezas-con-hallazgos",
              etiqueta: "Piezas con hallazgos",
              valor: String(piezasConHallazgos),
              icono: "ClipboardText",
              tono: "violet",
            }}
            hint="Piezas del odontograma con condición distinta de sana"
          />
        </Link>

        <Link
          to="/app/pacientes"
          className="block h-full rounded-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          aria-label="Ver los ítems en planes de tratamiento"
        >
          <DashboardStatCard
            interactive
            className="h-full"
            indicador={{
              id: "planes-tratamiento",
              etiqueta: "Ítems en planes de tratamiento",
              valor: String(itemsDePlanes),
              icono: "Tooth",
              tono: "green",
            }}
            hint="Procedimientos propuestos"
          />
        </Link>

        {/* Única tarjeta con degradado de la fila: el mismo lenguaje de la
            tarjeta "destacada" del portal del paciente (`CardAcceso`), para
            que el panel del profesional tenga su propia acción principal en
            vez de otra tarjeta blanca más. */}
        <Link
          to="/app/pacientes"
          className="press group relative isolate flex h-full flex-col justify-between gap-3 overflow-hidden rounded-panel bg-gradient-to-br from-brand-700 to-brand-800 p-4 text-left shadow-e2 transition-shadow duration-200 ease-out hover:shadow-e3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          <Tooth
            weight="duotone"
            aria-hidden
            className="pointer-events-none absolute -bottom-4 -right-4 text-white/10"
            style={{ width: 104, height: 104, transform: "rotate(-12deg)" }}
          />
          <span className="relative flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white/75">
            <Sparkle size={13} weight="fill" aria-hidden />
            Siguiente paso
          </span>
          <p className="relative text-[13px] leading-relaxed text-white/90">
            Registra un paciente nuevo para abrir su historia clínica y odontograma.
          </p>
          <span className="relative inline-flex items-center gap-2 self-start rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-brand-700 transition-transform duration-200 ease-out group-hover:translate-x-0.5">
            Ir a pacientes
            <ArrowRight size={14} weight="bold" aria-hidden />
          </span>
        </Link>
      </section>

      {/* Flujo del día y carga de tratamiento: dos cifras del día (citas) más
          los tratamientos vivos por estado real. Las citas salen de la agenda;
          los tratamientos, del servicio del módulo (el store no trae estado). */}
      <section className="dashboard-blocks">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardStatCard
            indicador={{
              id: "citas-hoy",
              etiqueta: "Citas de hoy",
              valor: String(resumenHoy.total),
              icono: "CalendarDots",
              tono: "blue",
            }}
            hint="En tu agenda de hoy"
          />
          <DashboardStatCard
            indicador={{
              id: "por-atender-hoy",
              etiqueta: "Por atender hoy",
              valor: String(resumenHoy.reservada + resumenHoy.confirmada),
              icono: "CalendarCheck",
              tono: "green",
            }}
            hint={`${resumenHoy.confirmada} confirmadas · ${resumenHoy.reservada} reservadas`}
          />

          {tratamientosBloqueados ? (
            <div className="sm:col-span-2">
              <DashboardEmptyState
                datos={tratamientos}
                size="sm"
                className="h-full"
              />
            </div>
          ) : (
            <>
              <DashboardStatCard
                indicador={{
                  id: "tratamientos-activos",
                  etiqueta: "Tratamientos activos",
                  valor: valorTratamiento(tratamientos.valor.activos),
                  icono: "Tooth",
                  tono: "violet",
                }}
                hint="Planes aceptados o en proceso"
              />
              <DashboardStatCard
                indicador={{
                  id: "tratamientos-pendientes",
                  etiqueta: "Tratamientos pendientes",
                  valor: valorTratamiento(tratamientos.valor.pendientes),
                  icono: "ClipboardText",
                  tono: "yellow",
                }}
                hint="Planes propuestos sin aceptar"
              />
            </>
          )}
        </div>
      </section>

      {/* Próxima actividad: la siguiente cita viva de la agenda. Si no hay,
          se muestra un vacío claro en vez de inventar una cita. */}
      <section className="dashboard-blocks">
        <Card className="fade-in-up">
          <CardHeader divided>
            <CardTitle>Próxima actividad</CardTitle>
            <CardDescription>Tu siguiente cita reservada o confirmada.</CardDescription>
          </CardHeader>
          <CardContent>
            {proxima ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
                    <Tooth size={18} weight="duotone" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium text-ink">
                      {nombreDePaciente(porId.get(proxima.pacienteId))}
                    </p>
                    <p className="truncate text-[12px] text-ink-muted">
                      {etiquetaLarga(proxima.fechaCita)} · {formatoHora(proxima.horaInicio)}
                      {proxima.motivoConsulta ? ` · ${proxima.motivoConsulta}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={TONO_ESTADO[proxima.estado]}>{ETIQUETA_ESTADO[proxima.estado]}</Badge>
                  <Link
                    to={`/app/pacientes/${proxima.pacienteId}`}
                    className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-700 hover:underline"
                  >
                    Ver ficha
                    <ArrowRight size={13} weight="bold" aria-hidden />
                  </Link>
                </div>
              </div>
            ) : (
              <DashboardEmptyState
                datos={SIN_DATOS}
                size="sm"
                vacioTitle="No tenés citas próximas"
                vacioDescription="Cuando se agende una cita reservada o confirmada aparecerá aquí."
              />
            )}
          </CardContent>
        </Card>
      </section>

      {/* Agenda primero: es lo que el odontologo mira al abrir la pantalla para
          saber a quien tiene que atender ahora, junto con quien ya fue atendido. */}
      <section className="dashboard-blocks">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
          <Card className="fade-in-up">
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>Agenda de la semana</CardTitle>
                <CardDescription>
                  Citas agendadas por día y hora. Toca una cita para ir a la ficha del paciente.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <CalendarioAgenda citas={citas} horarios={horarios} pacientes={pacientes} />
            </CardContent>
          </Card>

          <AtendidosHoy
            citas={citas}
            pacientes={pacientes}
            onIr={(id) => navigate(`/app/pacientes/${id}`)}
          />
        </div>
      </section>

      {/* Hallazgos clínicos: donde se concentra la patologia de la clinica.
          El grafico reutiliza `ClinicalFindingsChart` y los conteos salen de
          los odontogramas reales de los pacientes (sin `sano`). */}
      <section className="dashboard-blocks">
        <ClinicalFindingsChart conteos={hallazgos} />
      </section>
    </div>
  );
}

/** Nombre completo del paciente o un texto de relleno si no está en el store. */
function nombreDePaciente(paciente: { nombres: string; apellidos: string } | undefined): string {
  if (!paciente) return "Paciente sin ficha";
  return `${paciente.nombres} ${paciente.apellidos}`.trim() || "Paciente sin ficha";
}

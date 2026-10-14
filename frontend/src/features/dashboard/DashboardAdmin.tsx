import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Hospital, Hourglass, Tooth, UsersThree } from "@phosphor-icons/react";
import heroDashboard from "@/assets/banners/hero-dashboard.jpg";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePageHeader } from "@/components/layout/PageHeaderContext";
import { useAuth } from "@/features/auth/AuthContext";
import { useClinicaData } from "@/data/store";
import { primerNombre } from "@/lib/nombre";
import { ETIQUETA_ESTADO, formatoHora, hoyISO } from "@/features/agenda/agenda";
import { HangingBanner } from "@/components/ui/hanging-banner";
import { DashboardStatCard } from "./DashboardStatCard";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { estadoDashboard } from "./dashboardCards";
import { ClinicalFindingsChart } from "./ClinicalFindingsChart";
import { contarHallazgos } from "./odontologoGraficos";
import { useTratamientosClinica } from "./useTratamientosClinica";
import {
  SECCIONES_PENDIENTES,
  indicadoresActividadAdmin,
  indicadoresTratamientos,
  resumenActividadAdmin,
  type EstadoCifra,
} from "./adminResumen";
import type { Cita, Paciente } from "@/types";
import "./dashboard.css";

/** Tono de la píldora por estado de cita; los del `Badge` compartido. */
const TONO_ESTADO: Record<Cita["estado"], "blue" | "green" | "neutral" | "red"> = {
  reservada: "blue",
  confirmada: "green",
  atendida: "neutral",
  cancelada: "red",
};

/** Contexto de cada tarjeta, por id de indicador. */
const PISTAS: Record<string, string> = {
  "pacientes-registrados": "Fichas clínicas abiertas de la clínica",
  "citas-hoy": "En la agenda de hoy",
  "tratamientos-activos": "Planes aceptados o en proceso",
  "tratamientos-pendientes": "Planes propuestos sin aceptar",
};

function nombreCompleto(paciente: Paciente | undefined): string {
  if (!paciente) return "Paciente sin ficha";
  return `${paciente.nombres} ${paciente.apellidos}`.trim() || "Paciente sin ficha";
}

/**
 * Dashboard del odontólogo administrador (rol `odontologo_admin`).
 *
 * DIFFERENTE al del superadmin (US-13.1): el superadmin no tiene clínica y
 * audita el sistema **entero** (cuántas clínicas y usuarios hay). Este panel
 * gestiona **una sola clínica** —la del usuario— y resume su operación:
 * pacientes, agenda del día, tratamientos y actividad clínica. Nunca muestra
 * datos de otras clínicas.
 *
 * Fuentes, todas de solo lectura y acotadas a la clínica por RLS:
 *   - Pacientes, citas y odontogramas: `useClinicaData` (store de los módulos
 *     02 y 07).
 *   - Actividad del día: `resumenActividadAdmin`, que delega en la agenda.
 *   - Tratamientos por estado: `useTratamientosClinica` (el store no expone
 *     `estado`; ver `dashboardOdontologoService.ts`).
 *
 * Ocupación, ingresos y deuda NO se muestran: no hay todavía una lectura
 * acotada a la clínica (ver `SECCIONES_PENDIENTES`). No se inventan cifras ni se
 * simula en la interfaz una restricción que la base aún no aplica.
 *
 * BLOQUEO DE INTEGRACIÓN (documentado, no resuelto aquí): el rol
 * `odontologo_admin` existe en `@/types` pero NO está en la restricción
 * `perfiles_rol_check` de `bd_5clinicas_midentista.sql` (solo admite
 * odontologo, recepcionista, paciente y superadmin) ni en `ROLES_INVITABLES` de
 * `AdminPage.tsx`. Por eso hoy no se puede crear un usuario con este rol y este
 * panel queda inalcanzable: requiere que Matías sume el rol a la base y al
 * flujo de invitaciones. El panel se deja listo para cuando exista.
 *
 * Además, la política `citas_select` acota las citas a `odontologo_id =
 * mi_perfil_id()`, así que un administrador vería solo sus propias citas, no las
 * de toda la clínica; la agenda por clínica completa queda pendiente de esa
 * política.
 */
export function DashboardAdmin() {
  usePageHeader({
    title: "Panel de la clínica",
    subtitle: "Salud de tu clínica",
    icon: Hospital,
    tone: "green",
  });
  const { sesion } = useAuth();
  const { pacientes, odontogramaDe, citas } = useClinicaData();

  const primer = sesion ? primerNombre(sesion.nombre) : "";
  const hoy = hoyISO();

  const pacientePorId = useMemo(() => new Map(pacientes.map((p) => [p.id, p])), [pacientes]);

  // Actividad del día: la cifra la decide la agenda (módulo 07), no este panel.
  const actividad = useMemo(() => resumenActividadAdmin(citas, hoy), [citas, hoy]);

  // Hallazgos clínicos de la clínica: mismas piezas que ve el odontólogo, sin
  // `sano`, agregadas por condición para el gráfico compartido.
  const hallazgos = useMemo(() => {
    const odontogramas: Record<string, ReturnType<typeof odontogramaDe>> = {};
    for (const p of pacientes) odontogramas[p.id] = odontogramaDe(p.id);
    return contarHallazgos(odontogramas);
  }, [pacientes, odontogramaDe]);

  const tratamientos = useTratamientosClinica();
  const estadoTrat = estadoDashboard(tratamientos, (t) => t.total === 0);
  const tratamientosBloqueados = estadoTrat === "error" || estadoTrat === "sinPermiso";
  const estadoCifra: EstadoCifra = tratamientosBloqueados
    ? "bloqueado"
    : estadoTrat === "cargando"
      ? "cargando"
      : "listo";

  const indicadores = [
    ...indicadoresActividadAdmin({
      pacientes: pacientes.length,
      citasHoy: actividad.resumen.total,
    }),
    ...(tratamientosBloqueados
      ? []
      : indicadoresTratamientos(
          tratamientos.valor.activos,
          tratamientos.valor.pendientes,
          estadoCifra,
        )),
  ];

  return (
    <div className="dashboard-page">
      <HangingBanner className="max-w-3xl">
        <section className="dashboard-hero hanger-panel fade-in-up w-full sm:min-h-64 lg:min-h-72">
          <img src={heroDashboard} alt="" aria-hidden className="dashboard-hero-photo" />
          <div className="dashboard-hero-scrim" />

          <div className="dashboard-hero-content">
            <span className="dashboard-hero-label">
              PANEL DE LA CLÍNICA{sesion?.clinica ? ` · ${sesion.clinica}` : ""}
            </span>
            <h2>Hola, {primer}.</h2>
            <span className="dashboard-hero-motto">La salud de tu clínica, de un vistazo.</span>
            <p>Pacientes, agenda, tratamientos y hallazgos clínicos de tu clínica.</p>
          </div>

          <div className="dashboard-hero-decoration" aria-hidden>
            <div className="dashboard-hero-tools">
              <UsersThree size={28} weight="duotone" />
              <Tooth size={28} weight="duotone" />
              <Hourglass size={26} weight="duotone" />
            </div>
            <div className="dashboard-tooth-decoration">
              <Hospital size={124} weight="duotone" />
            </div>
          </div>
        </section>
      </HangingBanner>

      <section className="dashboard-stats">
        {indicadores.map((indicador) => (
          <DashboardStatCard
            key={indicador.id}
            indicador={indicador}
            hint={PISTAS[indicador.id]}
          />
        ))}

        {tratamientosBloqueados && (
          <div className="sm:col-span-2">
            <DashboardEmptyState datos={tratamientos} size="sm" className="h-full" />
          </div>
        )}
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
              {actividad.citasHoy.length === 0 ? (
                <DashboardEmptyState
                  datos={{
                    valor: actividad.citasHoy,
                    cargando: false,
                    sinPermiso: false,
                    error: null,
                  }}
                  vacioTitle="No hay citas para hoy"
                  vacioDescription="Cuando se agende una cita para hoy aparecerá aquí."
                />
              ) : (
                <ol className="flex flex-col gap-2">
                  {actividad.citasHoy.map((cita) => (
                    <li key={cita.id}>
                      <Link
                        to={`/app/pacientes/${cita.pacienteId}`}
                        className="press flex items-center gap-3 rounded-tile border border-line px-3 py-2 transition-colors hover:bg-ink/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                      >
                        <span className="w-16 shrink-0 text-[12.5px] font-semibold tabular-nums text-label-2">
                          {formatoHora(cita.horaInicio)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-label">
                          {nombreCompleto(pacientePorId.get(cita.pacienteId))}
                        </span>
                        <Badge tone={TONO_ESTADO[cita.estado]}>
                          {ETIQUETA_ESTADO[cita.estado]}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <ClinicalFindingsChart conteos={hallazgos} />
        </div>
      </section>

      {/* Ocupación, ingresos y deuda: el placeholder los prometía, pero no hay
          todavía una fuente acotada a la clínica. Se documenta el bloqueo en vez
          de mostrar cifras inventadas. */}
      <section className="dashboard-blocks">
        <Card accent tone="yellow" className="fade-in-up">
          <CardHeader>
            <CardTitle>Ocupación, ingresos y deuda</CardTitle>
            <CardDescription>
              Sección prevista para la gestión de la clínica. Pendiente de una fuente acotada a
              tu clínica; todavía no se muestra ninguna cifra.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-label">
              <Hourglass size={15} weight="duotone" aria-hidden />
              Falta una lectura por clínica
            </p>
            <ul className="flex flex-col gap-3">
              {SECCIONES_PENDIENTES.map((seccion) => (
                <li key={seccion.id} className="flex flex-col gap-0.5">
                  <span className="text-[13.5px] font-medium text-label">{seccion.titulo}</span>
                  <span className="text-[13px] leading-relaxed text-label-2">
                    {seccion.detalle}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Tooth,
  ArrowRight,
  UsersThree,
  ClipboardText,
  Warning,
  FirstAid,
  Clock,
  Sparkle,
  Syringe,
  Scissors,
  Pill,
  Thermometer,
  Notebook,
} from "@phosphor-icons/react";
import heroDashboard from "@/assets/banners/hero-dashboard.jpg";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { usePageHeader } from "@/components/layout/PageHeaderContext";
import { useAuth } from "@/features/auth/AuthContext";
import { useClinicaData } from "@/data/store";
import { primerNombre as obtenerPrimerNombre } from "@/lib/nombre";
import { cn } from "@/lib/cn";
import { MapaCalor } from "@/features/dashboard/mapa-calor";
import { CalendarioAgenda } from "@/features/agenda/CalendarioAgenda";
import { AtendidosHoy } from "@/features/agenda/AtendidosHoy";
import { detectaAlertas, type Alerta } from "@/features/dashboard/clinica-calor";
import "./dashboard.css";

type StatTone = "patients" | "diagnosis" | "treatment";

const STAT_TONE_CLASS: Record<StatTone, string> = {
  patients: "dashboard-stat-patients",
  diagnosis: "dashboard-stat-diagnosis",
  treatment: "dashboard-stat-treatment",
};

function iniciales(nombre: string) {
  return (
    nombre
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "—"
  );
}

export function DashboardPage() {
  usePageHeader({
    title: "Panel general",
    subtitle: "Salud de tu clínica",
    icon: Tooth,
    tone: "blue",
  });
  const { sesion } = useAuth();
  const { pacientes, odontogramaDe, planDe, historiaDe, citas, horarios } = useClinicaData();
  const navigate = useNavigate();

  const primerNombre = sesion ? obtenerPrimerNombre(sesion.nombre) : "";

  /**
   * El store expone los datos por paciente, asi que el panel tiene que
   * destructurarlos antes de poder agregar. Con 14 pacientes es lo bastante
   * chico para hacerlo en render y no necesita un indice en el store.
   */
  const { odontogramas, planes, alergiasPorPaciente, nombresPorId, diagnosticosActivos } =
    useMemo(() => {
      const odont: Record<string, ReturnType<typeof odontogramaDe>> = {};
      const planes_: Record<string, ReturnType<typeof planDe>> = {};
      const alergias: Record<string, { sustancia: string; severidad: string }[]> = {};
      const nombres: Record<string, string> = {};
      let diagnosticos = 0;

      for (const p of pacientes) {
        const odontograma = odontogramaDe(p.id);
        odont[p.id] = odontograma;
        planes_[p.id] = planDe(p.id);
        alergias[p.id] = historiaDe(p.id).alergias.map((a) => ({
          sustancia: a.sustancia,
          severidad: a.severidad,
        }));
        nombres[p.id] = `${p.nombres} ${p.apellidos}`;
        // Un diagnostico registrado es una pieza con condicion distinta de sano.
        diagnosticos += odontograma.filter((c) => c.condicion !== "sano").length;
      }
      return {
        odontogramas: odont,
        planes: planes_,
        alergiasPorPaciente: alergias,
        nombresPorId: nombres,
        diagnosticosActivos: diagnosticos,
      };
    }, [pacientes, odontogramaDe, planDe, historiaDe]);

  const tratamientosPropuestos = useMemo(
    () => Object.values(planes).reduce((acc, plan) => acc + plan.items.length, 0),
    [planes],
  );

  const alertas = useMemo(
    () => detectaAlertas({ pacientes, odontogramas, planes, alergiasPorPaciente }),
    [pacientes, odontogramas, planes, alergiasPorPaciente],
  );

  const recientes = pacientes.slice(0, 4);
  const irAPacientes = () => navigate("/app/pacientes");

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <img src={heroDashboard} alt="" aria-hidden className="dashboard-hero-photo" />
        <div className="dashboard-hero-scrim" />

        <div className="dashboard-hero-content">
          <span className="dashboard-hero-label">BIENVENIDO, DOCTOR</span>
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

      <section className="dashboard-stats">
        <StatCard
          icon={UsersThree}
          label="Pacientes registrados"
          value={pacientes.length}
          tone="patients"
          to="/app/pacientes"
        />
        <StatCard
          icon={ClipboardText}
          label="Diagnósticos registrados"
          value={diagnosticosActivos}
          tone="diagnosis"
          to="/app/pacientes"
        />
        <StatCard
          icon={Tooth}
          label="Ítems en planes de tratamiento"
          value={tratamientosPropuestos}
          tone="treatment"
          to="/app/pacientes"
        />

        <article className="dashboard-next-card">
          <span className="dashboard-next-label">
            <Sparkle size={13} weight="fill" />
            SIGUIENTE PASO
          </span>
          <p>Registra un paciente nuevo para abrir su historia clínica y odontograma.</p>
          <button className="dashboard-primary-button" type="button" onClick={irAPacientes}>
            Ir a pacientes
            <ArrowRight size={14} />
          </button>
        </article>
      </section>

      {/* Agenda primero: es lo que el odontologo mira al abrir la pantalla para
          saber a quien tiene que atender ahora. El mapa y los pendientes clinicos
          van debajo, que es donde se entra cuando el dia ya esta en marcha. */}
      <section className="dashboard-blocks">
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

        {/* el mapa ocupa la fila completa: son 32 siluetas y en una columna angosta
            se_scroll_. alertas y recientes van debajo, en dos columnas, porque son
            listas y no necesitan ancho. */}
        <Card className="fade-in-up" style={{ animationDelay: "80ms" }}>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Mapa de la clínica</CardTitle>
              <CardDescription>
                Las 32 piezas permanentes, teñidas por la condición más urgente entre tus
                pacientes
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <MapaCalor odontogramas={odontogramas} nombresPorId={nombresPorId} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
          <AlertasClinicas
            alertas={alertas}
            nombresPorId={nombresPorId}
            onIr={(id) => navigate(`/app/pacientes/${id}`)}
          />

          <article className="dashboard-recent-card">
            <header className="dashboard-card-header">
              <div className="dashboard-card-title">
                <div className="dashboard-card-icon">
                  <UsersThree size={17} weight="bold" />
                </div>
                <div>
                  <h3>Pacientes recientes</h3>
                  <p>Los últimos ingresados al sistema</p>
                </div>
              </div>
              <button className="dashboard-view-all" type="button" onClick={irAPacientes}>
                Ver todos
                <ArrowRight size={12} />
              </button>
            </header>

            <div className="dashboard-patient-list">
              {recientes.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="dashboard-patient-row"
                  onClick={() => navigate(`/app/pacientes/${p.id}`)}
                >
                  <div className="dashboard-patient-avatar">
                    {iniciales(`${p.nombres} ${p.apellidos}`)}
                  </div>
                  <div className="dashboard-patient-info">
                    <strong>
                      {p.nombres} {p.apellidos}
                    </strong>
                    <span>CI {p.ci}</span>
                  </div>
                  <ArrowRight size={17} className="dashboard-patient-arrow" />
                </button>
              ))}
            </div>
          </article>
        </div>

        <article className="dashboard-record-card">
          <div className="dashboard-record-decoration" aria-hidden>
            <Notebook size={112} weight="duotone" />
          </div>
          <div className="dashboard-record-content">
            <span className="dashboard-record-label">EXPEDIENTE COMPLETO</span>
            <p>
              Cada paciente queda documentado de principio a fin: registro, historia clínica,
              odontograma y plan de tratamiento en un solo lugar.
            </p>
            <button className="dashboard-record-button" type="button" onClick={irAPacientes}>
              Ver detalles
              <ArrowRight size={12} />
            </button>
          </div>
        </article>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
  to,
}: {
  icon: typeof UsersThree;
  label: string;
  value: number;
  tone: StatTone;
  to: string;
}) {
  return (
    <Link
      to={to}
      className={`dashboard-stat-card ${STAT_TONE_CLASS[tone]}`}
      aria-label={`Ver ${label.toLowerCase()}`}
    >
      <div className="dashboard-stat-icon">
        <Icon size={18} weight="bold" />
      </div>
      <div className="dashboard-stat-content">
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </Link>
  );
}

function AlertasClinicas({
  alertas,
  nombresPorId,
  onIr,
}: {
  alertas: Alerta[];
  nombresPorId: Record<string, string>;
  onIr: (pacienteId: string) => void;
}) {
  const graves = alertas.filter((a) => a.severidad === "grave").length;
  const atencion = alertas.filter((a) => a.severidad === "atencion").length;

  return (
    <Card className="fade-in-up" style={{ animationDelay: "60ms" }}>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Pendientes clínicos</CardTitle>
          <CardDescription>
            {alertas.length === 0
              ? "Nada esperando acción"
              : `${graves} de alarma · ${atencion} por planear`}
          </CardDescription>
        </div>
        <FirstAid size={20} className={alertas.length ? "text-ios-orange" : "text-ios-green"} />
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {alertas.length === 0 ? (
          <p className="flex items-center gap-2 rounded-ios-lg bg-[#eaf6ee] px-4 py-3 text-[13px] text-[#2f6b48]">
            Toda la patología registrada tiene un tratamiento planeado.
          </p>
        ) : (
          alertas.slice(0, 6).map((a) => (
            <AlertaFila key={a.id} alerta={a} nombre={nombresPorId[a.pacienteId]} onIr={onIr} />
          ))
        )}
        {alertas.length > 6 ? (
          <p className="pt-1 text-[11px] text-label-3">+{alertas.length - 6} más</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AlertaFila({
  alerta,
  nombre,
  onIr,
}: {
  alerta: Alerta;
  nombre?: string;
  onIr: (pacienteId: string) => void;
}) {
  const grave = alerta.severidad === "grave";
  return (
    <button
      type="button"
      onClick={() => onIr(alerta.pacienteId)}
      className={cn(
        "press-row flex items-start gap-2.5 rounded-ios-lg px-3 py-2.5 text-left",
        "hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-blue/45",
        grave ? "bg-[#fde7e5]" : "bg-[#fdf4e3]",
      )}
    >
      <span className={cn("mt-0.5 shrink-0", grave ? "text-[#b3261e]" : "text-[#956400]")}>
        {grave ? <Warning size={15} weight="fill" /> : <Clock size={15} weight="fill" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-label">{alerta.titulo}</span>
        <span className="block text-[12px] leading-snug text-label-2">{alerta.detalle}</span>
        {nombre ? (
          <span className="mt-0.5 block truncate text-[11px] text-label-3">{nombre}</span>
        ) : null}
      </span>
    </button>
  );
}
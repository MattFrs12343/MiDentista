import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Tooth,
  ArrowRight,
  UsersThree,
  ClipboardText,
  Sparkle,
  Syringe,
  Scissors,
  Pill,
  Thermometer,
} from "@phosphor-icons/react";
import heroDashboard from "@/assets/banners/hero-dashboard.jpg";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { HangingBanner } from "@/components/ui/hanging-banner";
import { usePageHeader } from "@/components/layout/PageHeaderContext";
import { useAuth } from "@/features/auth/AuthContext";
import { useClinicaData } from "@/data/store";
import { primerNombre as obtenerPrimerNombre } from "@/lib/nombre";
import { CalendarioAgenda } from "@/features/agenda/CalendarioAgenda";
import { AtendidosHoy } from "@/features/agenda/AtendidosHoy";
import "./dashboard.css";

type StatTone = "patients" | "diagnosis" | "treatment";

const STAT_TONE_CLASS: Record<StatTone, string> = {
  patients: "dashboard-stat-patients",
  diagnosis: "dashboard-stat-diagnosis",
  treatment: "dashboard-stat-treatment",
};

export function DashboardPage() {
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

  /**
   * El store expone los datos por paciente, asi que el panel tiene que
   * destructurarlos antes de poder agregar. Con 14 pacientes es lo bastante
   * chico para hacerlo en render y no necesita un indice en el store.
   */
  const { planes, diagnosticosActivos } = useMemo(() => {
    const planes_: Record<string, ReturnType<typeof planDe>> = {};
    let diagnosticos = 0;

    for (const p of pacientes) {
      const odontograma = odontogramaDe(p.id);
      planes_[p.id] = planDe(p.id);
      // Un diagnostico registrado es una pieza con condicion distinta de sano.
      diagnosticos += odontograma.filter((c) => c.condicion !== "sano").length;
    }
    return {
      planes: planes_,
      diagnosticosActivos: diagnosticos,
    };
  }, [pacientes, odontogramaDe, planDe]);

  const tratamientosPropuestos = useMemo(
    () => Object.values(planes).reduce((acc, plan) => acc + plan.items.length, 0),
    [planes],
  );

  const irAPacientes = () => navigate("/app/pacientes");

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
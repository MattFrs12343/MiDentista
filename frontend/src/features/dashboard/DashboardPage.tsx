import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  SquaresFour,
  UsersThree,
  Tooth,
  ClipboardText,
  ArrowRight,
  Sparkle,
  Syringe,
  Scissors,
  Pill,
  Thermometer,
  Notebook,
} from "@phosphor-icons/react";
import { usePageHeader } from "@/components/layout/PageHeaderContext";
import { useAuth } from "@/features/auth/AuthContext";
import { useClinicaData } from "@/data/store";
import heroDashboard from "@/assets/banners/hero-dashboard.jpg";
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
    subtitle: "Vista general de tu clínica",
    icon: SquaresFour,
    tone: "blue",
  });
  const { sesion } = useAuth();
  const { pacientes, diagnosticosDe, planDe } = useClinicaData();
  const navigate = useNavigate();

  const primerNombre = sesion?.nombre.split(" ")[0] ?? "";

  const stats = useMemo(() => {
    const diagnosticosActivos = pacientes.reduce(
      (acc, p) => acc + diagnosticosDe(p.id).length,
      0,
    );
    const tratamientosPropuestos = pacientes.reduce(
      (acc, p) => acc + planDe(p.id).items.length,
      0,
    );
    return { diagnosticosActivos, tratamientosPropuestos };
  }, [pacientes, diagnosticosDe, planDe]);

  const recientes = pacientes.slice(0, 4);
  const irAPacientes = () => navigate("/app/pacientes");

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <img
          src={heroDashboard}
          alt=""
          aria-hidden
          className="dashboard-hero-photo"
        />
        <div className="dashboard-hero-scrim" />

        <div className="dashboard-hero-content">
          <span className="dashboard-hero-label">BIENVENIDO, DOCTOR</span>
          <h2>Hola, {primerNombre}.</h2>
          <span className="dashboard-hero-motto">Tu trabajo transforma sonrisas.</span>
          <p>Aquí tienes un resumen rápido de lo más importante de hoy en tu clínica.</p>
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
          value={stats.diagnosticosActivos}
          tone="diagnosis"
          to="/app/pacientes"
        />
        <StatCard
          icon={Tooth}
          label="Ítems en planes de tratamiento"
          value={stats.tratamientosPropuestos}
          tone="treatment"
          to="/app/pacientes"
        />

        <article className="dashboard-next-card">
          <span className="dashboard-next-label">
            <Sparkle size={13} weight="fill" />
            SIGUIENTE PASO
          </span>
          <p>
            Registra un paciente nuevo para abrir su historia clínica y odontograma.
          </p>
          <button className="dashboard-primary-button" type="button" onClick={irAPacientes}>
            Ir a pacientes
            <ArrowRight size={14} />
          </button>
        </article>
      </section>

      <section className="dashboard-bottom">
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

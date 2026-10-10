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
import { StatTile } from "@/components/ui/stat-tile";
import { usePageHeader } from "@/components/layout/PageHeaderContext";
import { useAuth } from "@/features/auth/AuthContext";
import { useClinicaData } from "@/data/store";
import { primerNombre as obtenerPrimerNombre } from "@/lib/nombre";
import { CalendarioAgenda } from "@/features/agenda/CalendarioAgenda";
import { AtendidosHoy } from "@/features/agenda/AtendidosHoy";
import "./dashboard.css";

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
          <StatTile
            interactive
            className="h-full"
            icon={UsersThree}
            iconTone="blue"
            label="Pacientes registrados"
            value={pacientes.length}
            hint="Fichas clínicas abiertas"
          />
        </Link>

        <Link
          to="/app/pacientes"
          className="block h-full rounded-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          aria-label="Ver los diagnósticos registrados"
        >
          <StatTile
            interactive
            className="h-full"
            icon={ClipboardText}
            iconTone="violet"
            label="Diagnósticos registrados"
            value={diagnosticosActivos}
            hint="Piezas con condición distinta de sano"
          />
        </Link>

        <Link
          to="/app/pacientes"
          className="block h-full rounded-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          aria-label="Ver los ítems en planes de tratamiento"
        >
          <StatTile
            interactive
            className="h-full"
            icon={Tooth}
            iconTone="green"
            label="Ítems en planes de tratamiento"
            value={tratamientosPropuestos}
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

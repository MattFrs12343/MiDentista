import { useEffect, useMemo, useRef, useState } from "react";
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
  SpinnerGap,
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

  // El `#173456` de fondo de `.dashboard-hero` ya hace de esqueleto: la foto
  // entra con fade en vez de un flash cuando termina de bajar (es un JPG
  // aparte del bundle, no algo que ya esté en memoria), y el spinner chico
  // confirma que está cargando mientras tanto.
  const [heroCargado, setHeroCargado] = useState(false);
  const heroImgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    setHeroCargado(Boolean(heroImgRef.current?.complete));
  }, []);

  return (
    <div className="dashboard-page">
      <HangingBanner className="max-w-3xl">
        {/* `min-h-56` y no el `min-h-[9.5rem]` (152px) de los banners sin texto:
            este hero carga kicker + saludo + frase + párrafo, bastante más
            contenido que una foto decorativa sola, y 152px lo dejaba todo
            amontonado. El párrafo y la decoración se ocultan aparte en mobile
            (ver dashboard.css, `@media (max-width: 560px)`) para que no
            compita con el texto en el espacio que sí hay. */}
        <section className="dashboard-hero hanger-panel fade-in-up w-full min-h-56 sm:min-h-64 lg:min-h-72">
          {!heroCargado ? (
            <div aria-hidden className="absolute inset-0 z-[1] flex items-center justify-center">
              <SpinnerGap size={22} weight="bold" className="animate-spin text-white/70" />
            </div>
          ) : null}
          <img
            ref={heroImgRef}
            src={heroDashboard}
            alt=""
            aria-hidden
            loading="lazy"
            onLoad={() => setHeroCargado(true)}
            className="dashboard-hero-photo"
            style={{
              opacity: heroCargado ? 1 : 0,
              transition: "opacity 300ms ease-out",
            }}
          />
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
            compact
            className="h-full"
            icon={UsersThree}
            iconTone="blue"
            label="Pacientes"
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
            compact
            className="h-full"
            icon={ClipboardText}
            iconTone="violet"
            label="Diagnósticos"
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
            compact
            className="h-full"
            icon={Tooth}
            iconTone="green"
            label="Tratamientos"
            value={tratamientosPropuestos}
            hint="Procedimientos propuestos"
          />
        </Link>
      </section>

      {/* Orden de lectura: métricas primero (de un vistazo), agenda después
          (a quién hay que atender hoy y cuándo), lo ya atendido debajo de la
          agenda, y "Siguiente paso" al final — es una invitación a actuar,
          no un dato que el Dr necesite antes que el resto. */}
      <section className="dashboard-blocks">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
          <Card className="fade-in-up">
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>Agenda de la semana</CardTitle>
                <CardDescription>
                  Citas agendadas por día y hora. Toca una cita para ver los datos del paciente y el
                  motivo de la consulta.
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

      {/* Única tarjeta con degradado de la página: el mismo lenguaje de la
          tarjeta "destacada" del portal del paciente (`CardAcceso`). Va al
          final a propósito: es una invitación a la próxima acción, no una
          métrica que el Dr necesite leer antes que la agenda. */}
      <Link
        to="/app/pacientes"
        className="press group relative isolate flex flex-col justify-between gap-3 overflow-hidden rounded-panel bg-gradient-to-br from-brand-700 to-brand-800 p-5 text-left shadow-e2 transition-shadow duration-200 ease-out hover:shadow-e3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
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
        <p className="relative max-w-md text-[13px] leading-relaxed text-white/90">
          Registra un paciente nuevo para abrir su historia clínica y odontograma.
        </p>
        <span className="relative inline-flex items-center gap-2 self-start rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-brand-700 transition-transform duration-200 ease-out group-hover:translate-x-0.5">
          Ir a pacientes
          <ArrowRight size={14} weight="bold" aria-hidden />
        </span>
      </Link>
    </div>
  );
}

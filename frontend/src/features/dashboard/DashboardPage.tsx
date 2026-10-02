import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Tooth,
  ArrowRight,
  Warning,
  FirstAid,
  Clock,
} from "@phosphor-icons/react";
import heroDashboard from "@/assets/banners/hero-dashboard.jpg";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHero } from "@/components/ui/section-hero";
import { HangingBanner } from "@/components/ui/hanging-banner";
import { usePageHeader } from "@/components/layout/PageHeaderContext";
import { useAuth } from "@/features/auth/AuthContext";
import { useClinicaData } from "@/data/store";
import { primerNombre as obtenerPrimerNombre } from "@/lib/nombre";
import { cn } from "@/lib/cn";
import { MapaCalor } from "@/features/dashboard/mapa-calor";
import { CalendarioAgenda } from "@/features/agenda/CalendarioAgenda";
import { AtendidosHoy } from "@/features/agenda/AtendidosHoy";
import { detectaAlertas, type Alerta } from "@/features/dashboard/clinica-calor";

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
   *estructorizarlos antes de poder agregar. Con 14 pacientes es lo bastante
   * chico para hacerlo en render y no necesita un indice en el store.
   */
  const { odontogramas, planes, alergiasPorPaciente, nombresPorId } = useMemo(() => {
    const odont: Record<string, ReturnType<typeof odontogramaDe>> = {};
    const planes_: Record<string, ReturnType<typeof planDe>> = {};
    const alergias: Record<string, { sustancia: string; severidad: string }[]> = {};
    const nombres: Record<string, string> = {};

    for (const p of pacientes) {
      odont[p.id] = odontogramaDe(p.id);
      planes_[p.id] = planDe(p.id);
      alergias[p.id] = historiaDe(p.id).alergias.map((a) => ({
        sustancia: a.sustancia,
        severidad: a.severidad,
      }));
      nombres[p.id] = `${p.nombres} ${p.apellidos}`;
    }
    return {
      odontogramas: odont,
      planes: planes_,
      alergiasPorPaciente: alergias,
      nombresPorId: nombres,
    };
  }, [pacientes, odontogramaDe, planDe, historiaDe]);

  const alertas = useMemo(
    () => detectaAlertas({ pacientes, odontogramas, planes, alergiasPorPaciente }),
    [pacientes, odontogramas, planes, alergiasPorPaciente],
  );

  const recientes = pacientes.slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <HangingBanner>
        <SectionHero
          icon={Tooth}
          tone="blue"
          kicker={sesion?.clinica ?? "Mi clínica"}
          heading={primerNombre ? `Hola, ${primerNombre}.` : "Hola."}
          description="Dónde se concentra la patología de tu clínica y qué quedó pendiente de planear."
          photo={heroDashboard}
          photoPosition="60% center"
          className="hanger-panel fade-in-up"
        />
      </HangingBanner>

      {/* Agenda primero: es lo que el odontologo mira al abrir la pantalla para
          saber a quien tiene que atender ahora. El mapa y los pendientes clinicos
          van debajo, que es donde se entra cuando el dia ya esta en marcha. */}
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
          <CalendarioAgenda
            citas={citas}
            horarios={horarios}
            pacientes={pacientes}
          />
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

      <Card className="fade-in-up" style={{ animationDelay: "120ms" }}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Pacientes recientes</CardTitle>
              <CardDescription>Los últimos ingresados</CardDescription>
            </div>
            <Button size="sm" variant="ghost" onClick={() => navigate("/app/pacientes")}>
              Ver todos
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-line">
            {recientes.map((p, i) => {
              const tieneAlergiaGrave = (alergiasPorPaciente[p.id] ?? []).some(
                (a) => a.severidad === "grave",
              );
              return (
                <button
                  key={p.id}
                  onClick={() => navigate(`/app/pacientes/${p.id}`)}
                  style={{ animationDelay: `${180 + i * 40}ms` }}
                  className={cn(
                    "press-row fade-in-up flex items-center justify-between gap-2 py-3 text-left",
                    "hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-blue/45 -mx-2 px-2 rounded-lg",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-medium text-label">
                      {p.nombres} {p.apellidos}
                    </p>
                    <p className="truncate text-[13px] text-label-2">CI {p.ci}</p>
                  </div>
                  {tieneAlergiaGrave ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#fde7e5] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#b3261e]">
                      <Warning size={11} weight="fill" />
                      Alergia
                    </span>
                  ) : (
                    <ArrowRight size={15} className="shrink-0 text-label-3" />
                  )}
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
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
        <FirstAid
          size={20}
          className={alertas.length ? "text-ios-orange" : "text-ios-green"}
        />
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

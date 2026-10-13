import { useMemo } from "react";
import { CheckCircle, ArrowUpRight, Clock, XCircle, CalendarBlank } from "@phosphor-icons/react";
import type { Cita, Paciente } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { SectionStatStrip } from "@/components/ui/section-board";
import { cn } from "@/lib/cn";
import {
  atendidasDe,
  citasDeFecha,
  estadisticasDelDia,
  formatoHora,
  hoyISO,
  rangoHorario,
} from "@/features/agenda/agenda";

/**
 * Pacientes atendidos hoy, como tarjetas en lugar de una lista.
 *
 * Cada tarjeta es un paciente, no una cita: si alguien tiene dos Procedures en
 * el mismo dia, ocupa una sola tarjeta y se ven las dos, porque partirlo en dos
 * filas hace creer que son dos personas distintas.
 */
export function AtendidosHoy({
  citas,
  pacientes,
  onIr,
}: {
  citas: Cita[];
  pacientes: Paciente[];
  onIr: (pacienteId: string) => void;
}) {
  const hoy = hoyISO();

  const porId = useMemo(() => new Map(pacientes.map((p) => [p.id, p])), [pacientes]);

  const { tarjetas, stats, siguiente } = useMemo(() => {
    const delDia = citasDeFecha(citas, hoy);
    const atendidas = atendidasDe(citas, hoy);

    // una tarjeta por paciente, conservando el orden de la primera cita del dia
    const porPaciente = new Map<string, Cita[]>();
    for (const cita of atendidas) {
      const lista = porPaciente.get(cita.pacienteId);
      if (lista) lista.push(cita);
      else porPaciente.set(cita.pacienteId, [cita]);
    }

    const pendientes = delDia.filter(
      (c) => c.estado === "reservada" || c.estado === "confirmada",
    );

    return {
      tarjetas: [...porPaciente.entries()].map(([pacienteId, cs]) => ({
        pacienteId,
        citas: cs,
        nombre: porId.get(pacienteId),
      })),
      stats: estadisticasDelDia(citas, hoy),
      siguiente: pendientes[0],
    };
  }, [citas, hoy, porId]);

  return (
    <Card className="fade-in-up">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Atendidos hoy</CardTitle>
          <CardDescription>
            {stats.atendida === 0
              ? "Todavía no hay consultas marcadas como atendidas"
              : `${stats.atendida} de ${stats.total} cita${stats.total === 1 ? "" : "s"} del día`}
          </CardDescription>
        </div>
        <CheckCircle
          size={20}
          weight="fill"
          className={stats.atendida ? "text-ios-green" : "text-label-3"}
        />
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {/* Fila de métricas del día: antes "Atendidos hoy" solo contaba lo
            atendido, sin decir cuánto quedaba ni si hubo cancelaciones. */}
        <SectionStatStrip
          metrics={[
            { label: "Atendidas", value: stats.atendida, icon: CheckCircle, tone: "green" },
            {
              label: "Pendientes",
              value: stats.reservada + stats.confirmada,
              icon: Clock,
              tone: "orange",
            },
            { label: "Canceladas", value: stats.cancelada, icon: XCircle, tone: "red" },
            {
              label: "Total del día",
              value: stats.total,
              icon: CalendarBlank,
              tone: "brand",
              destacado: true,
            },
          ]}
        />

        {tarjetas.length === 0 ? (
          <p className="rounded-ios-lg bg-black/[0.03] px-4 py-6 text-center text-[13px] text-label-2">
            Ningún paciente ha sido atendido hoy.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {tarjetas.map((t, i) => (
              <li key={t.pacienteId} style={{ animationDelay: `${i * 40}ms` }}>
                <TarjetaAtendido
                  nombre={t.nombre ? `${t.nombre.nombres} ${t.nombre.apellidos}` : "Paciente"}
                  ci={t.nombre?.ci ?? ""}
                  citas={t.citas}
                  onIr={() => onIr(t.pacienteId)}
                />
              </li>
            ))}
          </ul>
        )}

        {siguiente ? (
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-ios bg-brand-50 px-3 py-2 text-[12px] text-brand-700">
            <ArrowUpRight size={13} weight="bold" className="shrink-0" />
            <span className="font-semibold">Sigue:</span>
            <span className="tabular-nums">{formatoHora(siguiente.horaInicio)}</span>
            <span className="truncate">{siguiente.motivoConsulta}</span>
          </p>
        ) : stats.atendida > 0 ? (
          <p className="rounded-ios bg-pastel-green-bg px-3 py-2 text-[12px] text-pastel-green-fg">
            No quedan citas pendientes para hoy.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function TarjetaAtendido({
  nombre,
  ci,
  citas,
  onIr,
}: {
  nombre: string;
  ci: string;
  citas: Cita[];
  onIr: () => void;
}) {
  const primera = citas[0];
  const rango = rangoHorario(primera.horaInicio, ultima(citas).horaFin);

  return (
    <button
      type="button"
      onClick={onIr}
      className={cn(
        "press lift-hover flex h-full w-full flex-col gap-2 rounded-ios-lg border border-pastel-green-fg/20 bg-pastel-green-bg px-3 py-2.5 text-left transition-[filter,box-shadow] duration-150 ease-out",
        "hover:brightness-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar nombre={nombre} className="size-7 bg-white/70 text-[10px] text-pastel-green-fg" />
          <span className="truncate text-[14px] font-semibold text-pastel-green-fg">{nombre}</span>
        </div>
        <span className="shrink-0 text-[11px] font-semibold tabular-nums text-pastel-green-fg/70">
          {formatoHora(primera.horaInicio)}
        </span>
      </div>
      <span className="text-[12px] leading-snug text-pastel-green-fg/85">{primera.motivoConsulta}</span>
      <span className="flex items-center gap-1.5 text-[11px] text-pastel-green-fg/60">
        {ci ? `CI ${ci} · ` : ""}
        {rango}
        {citas.length > 1 ? (
          <span className="shrink-0 rounded-full bg-white/60 px-1.5 py-0.5 text-[10px] font-bold text-pastel-green-fg">
            {citas.length} citas
          </span>
        ) : null}
      </span>
    </button>
  );
}

/** La cita que termina mas tarde: para el rango no hace falta la lista. */
function ultima(citas: Cita[]): Cita {
  return citas.reduce((a, b) => (a.horaFin >= b.horaFin ? a : b));
}

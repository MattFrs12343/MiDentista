import { useMemo } from "react";
import { CheckCircle, ArrowUpRight } from "@phosphor-icons/react";
import type { Cita, Paciente } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-ios bg-pastel-blue-bg px-3 py-2 text-[12px] text-pastel-blue-fg">
            <ArrowUpRight size={13} weight="bold" className="shrink-0" />
            <span className="font-semibold">Sigue:</span>
            <span className="tabular-nums">{formatoHora(siguiente.horaInicio)}</span>
            <span className="truncate">{siguiente.motivoConsulta}</span>
          </p>
        ) : stats.atendida > 0 ? (
          <p className="rounded-ios bg-[#eaf6ee] px-3 py-2 text-[12px] text-[#2f6b48]">
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
        "press flex h-full w-full flex-col gap-1 rounded-ios-lg border border-[#bfe0ca] bg-[#e6f4ea] px-3 py-2.5 text-left",
        "hover:bg-[#dceee2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-blue/45",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-[14px] font-semibold text-[#2f6b48]">{nombre}</span>
        <span className="shrink-0 text-[11px] font-semibold tabular-nums text-[#2f6b48]/70">
          {formatoHora(primera.horaInicio)}
        </span>
      </div>
      <span className="text-[12px] leading-snug text-[#2f6b48]/85">{primera.motivoConsulta}</span>
      <span className="text-[11px] text-[#2f6b48]/60">
        {ci ? `CI ${ci} · ` : ""}
        {rango}
        {citas.length > 1 ? ` · ${citas.length} citas` : ""}
      </span>
    </button>
  );
}

/** La cita que termina mas tarde: para el rango no hace falta la lista. */
function ultima(citas: Cita[]): Cita {
  return citas.reduce((a, b) => (a.horaFin >= b.horaFin ? a : b));
}

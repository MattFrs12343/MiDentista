import { useMemo, useState } from "react";
import { CaretLeft, CaretRight, Warning } from "@phosphor-icons/react";
import type { Cita, Horario, Paciente } from "@/types";
import { cn } from "@/lib/cn";
import {
  COLOR_ESTADO,
  DIAS_CORTO,
  ETIQUETA_ESTADO,
  citasDeFecha,
  diasLaborables,
  ejeDelDia,
  estadisticasDelDia,
  esHoy,
  etiquetaCorta,
  formatoHora,
  hoyISO,
  inicioDeSemana,
  lineasDeRejilla,
  rangoHorario,
  solapes,
  sumaDias,
  ubicaEnEje,
  type Franja,
} from "@/features/agenda/agenda";

/** Alto de la rejilla por hora de jornada, en px. */
const ALTO_POR_HORA = 15;

/** Separacion en px entre franjas que se pisan, para que se vean separadas. */
const CANAL = 2;

export function CalendarioAgenda({
  citas,
  horarios,
  pacientes,
}: {
  citas: Cita[];
  horarios: Horario[];
  pacientes: Paciente[];
}) {
  const hoy = hoyISO();
  const semanaActual = inicioDeSemana(hoy);
  const [semana, setSemana] = useState(semanaActual);
  const [diaElegido, setDiaElegido] = useState<string | null>(null);

  const dias = useMemo(() => diasLaborables(semana), [semana]);
  const porId = useMemo(() => new Map(pacientes.map((p) => [p.id, p])), [pacientes]);

  /**
   * Un solo eje para toda la semana, no uno por dia. Si cada columna calculara
   * su eje, una cita de 09:00 se dibujaria en el mismo sitio que una de 15:00
   * en un dia de turno corto y las horas dejarian de ser comparables entre
   * columnas, que es justo lo que sirve para leer la semana de un vistazo.
   */
  const eje = useMemo(() => {
    const ejes = dias.map((d) => ejeDelDia(horarios, diaDe(d)));
    return {
      inicio: Math.min(...ejes.map((e) => e.inicio)),
      fin: Math.max(...ejes.map((e) => e.fin)),
    };
  }, [dias, horarios]);

  const citasSemana = useMemo(
    () => dias.flatMap((d) => citasDeFecha(citas, d)),
    [citas, dias],
  );

  const conflictos = useMemo(() => solapes(citasSemana), [citasSemana]);
  const enConflicto = useMemo(
    () => new Set(conflictos.flatMap(([a, b]) => [a.id, b.id])),
    [conflictos],
  );

  const totalSemana = useMemo(
    () => dias.reduce((n, d) => n + estadisticasDelDia(citas, d).total, 0),
    [citas, dias],
  );

  const altoRejilla = ((eje.fin - eje.inicio) / 60) * ALTO_POR_HORA;

  /**
   * Si al cambiar de semana `diaElegido` ya no existe en los dias mostrados, se
   * cae a hoy o al primer dia. Sin esto, al navegar a otra semana la lista movil
   * se queda en una fecha vieja y aparece vacia.
   */
  const diaActivo = dias.includes(diaElegido ?? "")
    ? (diaElegido as string)
    : dias.includes(hoy)
      ? hoy
      : dias[0];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <BotonSemana
            onClick={() => setSemana(sumaDias(semana, -7))}
            etiqueta="Semana anterior"
          >
            <CaretLeft size={15} weight="bold" />
          </BotonSemana>
          <BotonSemana onClick={() => setSemana(sumaDias(semana, 7))} etiqueta="Semana siguiente">
            <CaretRight size={15} weight="bold" />
          </BotonSemana>
          {semana !== semanaActual ? (
            <button
              type="button"
              onClick={() => setSemana(semanaActual)}
              className="press ml-1 rounded-full px-3 py-1 text-[12px] font-semibold text-ios-blue hover:bg-black/[0.04]"
            >
              Hoy
            </button>
          ) : null}
        </div>
        <p className="text-[12px] text-label-2">
          {totalSemana === 0
            ? "Sin citas esta semana"
            : `${totalSemana} cita${totalSemana === 1 ? "" : "s"} · ${etiquetaCorta(dias[0])} – ${etiquetaCorta(dias[dias.length - 1])}`}
        </p>
      </div>

      {conflictos.length > 0 ? (
        <p className="flex items-center gap-1.5 rounded-ios bg-pastel-yellow-bg px-3 py-1.5 text-[12px] text-pastel-yellow-fg">
          <Warning size={13} weight="fill" className="shrink-0" />
          {conflictos.length === 1
            ? "Hay 1 cita superpuesta con otra"
            : `Hay ${conflictos.length} citas superpuestas entre sí`}
        </p>
      ) : null}

      {/* escritorio: rejilla horaria, una columna por dia */}
      <div className="hidden lg:block">
        <div className="flex gap-px">
          <div className="w-10 shrink-0" />
          {dias.map((d) => (
            <EncabezadoDia
              key={d}
              fecha={d}
              total={estadisticasDelDia(citas, d).total}
            />
          ))}
        </div>
        <div className="relative flex gap-px" style={{ height: altoRejilla }}>
          <EjeHoras eje={eje} altoPorHora={ALTO_POR_HORA} />
          {dias.map((d) => (
            <ColumnaDia
              key={d}
              fecha={d}
              citas={citasDeFecha(citas, d)}
              eje={eje}
              porId={porId}
              enConflicto={enConflicto}
              altoPorHora={ALTO_POR_HORA}
            />
          ))}
        </div>
      </div>

      {/* movil: un dia a la vez, que es como se consulta la agenda en el celular */}
      <div className="lg:hidden">
        <div className="mb-3 flex gap-1.5">
          {dias.map((d) => {
            const total = estadisticasDelDia(citas, d).total;
            const activo = d === diaActivo;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDiaElegido(d)}
                aria-pressed={activo}
                className={cn(
                  "press flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-ios px-1 py-2",
                  activo
                    ? "bg-ios-blue text-white shadow-[0_1px_3px_rgba(0,0,0,0.15)]"
                    : "bg-black/[0.03] text-label-2",
                  esHoy(d, hoy) && !activo && "ring-1 ring-ios-blue/40",
                )}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide">
                  {DIAS_CORTO[diaDe(d)]}
                </span>
                <span className="text-[15px] font-semibold tabular-nums">
                  {Number(d.slice(-2))}
                </span>
                <span className="text-[9px] tabular-nums">{total || "—"}</span>
              </button>
            );
          })}
        </div>
        <ListaDia
          fecha={diaActivo}
          citas={citas}
          porId={porId}
          enConflicto={enConflicto}
        />
      </div>
    </div>
  );
}

/** Dia de la semana en el rango que usa el resto del modulo: 0 domingo .. 6 sabado. */
function diaDe(iso: string): number {
  return new Date(iso + "T12:00:00").getDay();
}

function BotonSemana({
  onClick,
  etiqueta,
  children,
}: {
  onClick: () => void;
  etiqueta: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      className="press flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-label-2 hover:bg-black/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-blue/45"
    >
      {children}
    </button>
  );
}

function EncabezadoDia({ fecha, total }: { fecha: string; total: number }) {
  const hoy = esHoy(fecha);
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1.5">
      <span
        className={cn(
          "text-[10px] font-semibold uppercase tracking-[0.08em]",
          hoy ? "text-ios-blue" : "text-label-3",
        )}
      >
        {DIAS_CORTO[diaDe(fecha)]}
      </span>
      <span
        className={cn(
          "flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[13px] font-semibold tabular-nums",
          hoy ? "bg-ios-blue text-white" : "text-label",
        )}
      >
        {Number(fecha.slice(-2))}
      </span>
      <span className="truncate text-[10px] text-label-3">
        {total ? `${total}` : "libre"}
      </span>
    </div>
  );
}

function EjeHoras({
  eje,
  altoPorHora,
}: {
  eje: { inicio: number; fin: number };
  altoPorHora: number;
}) {
  return (
    <div className="relative w-10 shrink-0" aria-hidden="true">
      {lineasDeRejilla(eje).map((min) => (
        <span
          key={min}
          className="absolute right-1.5 -translate-y-1/2 text-[10px] tabular-nums text-label-3"
          style={{ top: ((min - eje.inicio) / 60) * altoPorHora }}
        >
          {formatoHora(`${String(Math.floor(min / 60)).padStart(2, "0")}:00`)}
        </span>
      ))}
    </div>
  );
}

function ColumnaDia({
  fecha,
  citas,
  eje,
  porId,
  enConflicto,
  altoPorHora,
}: {
  fecha: string;
  citas: Cita[];
  eje: { inicio: number; fin: number };
  porId: Map<string, Paciente>;
  enConflicto: Set<string>;
  altoPorHora: number;
}) {
  const franjas = useMemo(() => ubicaEnEje(citas, eje), [citas, eje]);
  const domingo = diaDe(fecha) === 0;

  return (
    <div
      className={cn(
        "relative min-w-0 flex-1 border-l border-line",
        esHoy(fecha) && "bg-ios-blue/[0.03]",
        domingo && "bg-black/[0.02]",
      )}
    >
      {lineasDeRejilla(eje).map((min) => (
        <div
          key={min}
          className="absolute inset-x-0 border-t border-line/70"
          style={{ top: ((min - eje.inicio) / 60) * altoPorHora }}
        />
      ))}

      {franjas.map(({ cita, franja }) => (
        <FranjaCita
          key={cita.id}
          cita={cita}
          franja={franja}
          porId={porId}
          conflicto={enConflicto.has(cita.id)}
        />
      ))}

      {citas.length === 0 ? (
        <span className="absolute inset-x-0 top-8 text-center text-[10px] text-label-3/80">
          {domingo ? "cerrado" : "sin citas"}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Una cita dentro de la rejilla. La geometria viene de `ubicaEnEje`, que ya
 * repartio el ancho entre las que se pisan, asi que aqui solo se traduce a
 * estilos: el ancho es la fraccion que le toca y el `left` el desplazamiento.
 * El inset se hace con `calc` para que las columnas contiguas no se toquen.
 */
function FranjaCita({
  cita,
  franja,
  porId,
  conflicto,
}: {
  cita: Cita;
  franja: Franja;
  porId: Map<string, Paciente>;
  conflicto: boolean;
}) {
  const paciente = porId.get(cita.pacienteId);
  const nombre = paciente ? `${paciente.nombres} ${paciente.apellidos}` : "Paciente";
  const ancho = 100 / franja.columnas;

  return (
    <div
      className={cn(
        "absolute overflow-hidden rounded-md border px-1.5 py-1",
        COLOR_ESTADO[cita.estado],
        conflicto && "ring-1 ring-ios-red",
      )}
      style={{
        top: `${franja.top}%`,
        height: `${franja.height}%`,
        left: `calc(${franja.columna * ancho}% + ${CANAL}px)`,
        width: `calc(${ancho}% - ${CANAL * 2}px)`,
      }}
      data-cita={cita.id}
      data-inicio={cita.horaInicio}
      title={`${nombre} · ${rangoHorario(cita.horaInicio, cita.horaFin)} · ${cita.motivoConsulta}`}
    >
      <p className="truncate text-[11px] font-semibold leading-tight">{nombre}</p>
      <p className="truncate text-[10px] leading-tight opacity-80">
        {formatoHora(cita.horaInicio)}
      </p>
    </div>
  );
}

function ListaDia({
  fecha,
  citas,
  porId,
  enConflicto,
}: {
  fecha: string;
  citas: Cita[];
  porId: Map<string, Paciente>;
  enConflicto: Set<string>;
}) {
  const delDia = citasDeFecha(citas, fecha);
  const cerradas = delDia.filter((c) => c.estado === "cancelada");

  if (!delDia.length) {
    return (
      <p className="rounded-ios bg-black/[0.03] px-4 py-8 text-center text-[13px] text-label-2">
        No hay citas para este día.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {delDia.map((cita) => {
        const paciente = porId.get(cita.pacienteId);
        const nombre = paciente ? `${paciente.nombres} ${paciente.apellidos}` : "Paciente";
        return (
          <li
            key={cita.id}
            className={cn(
              "rounded-ios border px-3 py-2.5",
              COLOR_ESTADO[cita.estado],
              enConflicto.has(cita.id) && "ring-1 ring-ios-red",
            )}
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate text-[14px] font-semibold">{nombre}</p>
              <span className="shrink-0 text-[12px] font-semibold tabular-nums">
                {formatoHora(cita.horaInicio)}
              </span>
            </div>
            <p className="mt-0.5 text-[12px] leading-snug opacity-85">{cita.motivoConsulta}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide opacity-70">
              {ETIQUETA_ESTADO[cita.estado]}
              {cita.estado === "cancelada"
                ? ""
                : ` · ${rangoHorario(cita.horaInicio, cita.horaFin)}`}
            </p>
          </li>
        );
      })}
      {cerradas.length > 0 ? (
        <li className="px-1 pt-0.5 text-[11px] text-label-3">
          {cerradas.length === 1
            ? "1 cita cancelada no ocupa el turno"
            : `${cerradas.length} citas canceladas no ocupan el turno`}
        </li>
      ) : null}
    </ul>
  );
}

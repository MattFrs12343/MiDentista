import { useMemo } from "react";
import { CalendarDots } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { COLOR_ESTADO, ETIQUETA_ESTADO, minutosDe, rangoHorario } from "@/features/agenda/agenda";
import { COLOR_TIPO } from "@/features/planta/plantaLayout";
import type { CitaDePlanta, Zona } from "@/features/planta/tipos";

/**
 * Agenda minima para acompanar a la planta.
 *
 * No es un reemplazo de la agenda del modulo 07: son las citas del dia con la
 * zona donde se atienden, para poder saltar de "consultorio lleno" a "quien
 * esta ahi" sin cambiar de pantalla. Reutiliza `minutosDe` y `rangoHorario` de
 * `agenda.ts` en vez de volver a formatear horas: dos formateadores de hora
 * siempre se diferencian en la coma.
 *
 * Vive en `features/agenda/` y no en `features/planta/` porque es una lectura de
 * la agenda; la usa la planta, pero no es codigo de la planta.
 */

/** Cuantas citas se muestran como maximo. */
const LIMITE = 8;

export function AgendaPlantaMini({
  citas,
  zonasPorId,
  ahora,
  onElegirZona,
}: {
  citas: ReadonlyArray<CitaDePlanta>;
  zonasPorId: Map<string, Zona>;
  /** Minutos desde medianoche, para marcar la que esta en curso. */
  ahora: number;
  /** Al tocar una cita con zona, se selecciona esa zona en el plano. */
  onElegirZona?: (zonaId: string) => void;
}) {
  /**
   * Se filtran las canceladas antes de ordenar.
   *
   * Una cita cancelada no ocupa el consultorio: listarla al principio de la
   * columna haria creer que la sala esta ocupada por un turno que ya no existe.
   */
  const delDia = useMemo(
    () =>
      citas
        .filter((c) => c.estado !== "cancelada")
        .sort((a, b) => minutosDe(a.horaInicio) - minutosDe(b.horaInicio)),
    [citas],
  );

  if (!delDia.length) {
    return (
      <section className="rounded-ios-lg border border-line bg-surface px-4 py-4">
        <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
          <CalendarDots size={13} weight="bold" /> Citas de hoy
        </h2>
        <p className="mt-2 text-[13px] text-ink-muted">Sin citas para hoy.</p>
      </section>
    );
  }

  return (
    <section className="rounded-ios-lg border border-line bg-surface px-4 py-4">
      <h2 className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
        <span className="flex items-center gap-1.5">
          <CalendarDots size={13} weight="bold" /> Citas de hoy
        </span>
        <span className="tabular-nums">{delDia.length}</span>
      </h2>

      <ul className="mt-2 flex flex-col gap-1.5">
        {delDia.slice(0, LIMITE).map((cita) => {
          const zona = cita.zonaId ? zonasPorId.get(cita.zonaId) : undefined;
          const enCurso = minutosDe(cita.horaInicio) <= ahora && ahora < minutosDe(cita.horaFin);
          const cuerpo = (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-[12px] font-semibold">
                  {cita.motivoConsulta || "Consulta"}
                </p>
                <span className="shrink-0 text-[11px] font-semibold tabular-nums">
                  {rangoHorario(cita.horaInicio, cita.horaFin)}
                </span>
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <span className="truncate text-[10px] font-semibold uppercase tracking-wide opacity-75">
                  {enCurso ? "En curso" : ETIQUETA_ESTADO[cita.estado]}
                </span>
                {zona ? (
                  <span
                    className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-ink-muted"
                    style={{ color: COLOR_TIPO[zona.tipo] }}
                  >
                    <span
                      aria-hidden="true"
                      className="inline-block size-1.5 rounded-full"
                      style={{ backgroundColor: COLOR_TIPO[zona.tipo] }}
                    />
                    {zona.nombre}
                  </span>
                ) : (
                  <span className="shrink-0 text-[10px] text-ink-muted">sin zona</span>
                )}
              </div>
            </>
          );

          return (
            <li key={cita.id}>
              {zona && onElegirZona ? (
                <button
                  type="button"
                  onClick={() => onElegirZona(zona.id)}
                  className={cn(
                    "press w-full rounded-ios border px-2.5 py-1.5 text-left",
                    COLOR_ESTADO[cita.estado],
                    enCurso && "ring-1 ring-ios-blue/50",
                  )}
                >
                  {cuerpo}
                </button>
              ) : (
                <div
                  className={cn(
                    "rounded-ios border px-2.5 py-1.5",
                    COLOR_ESTADO[cita.estado],
                    enCurso && "ring-1 ring-ios-blue/50",
                  )}
                >
                  {cuerpo}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {delDia.length > LIMITE ? (
        <p className="mt-2 px-1 text-[11px] text-ink-muted">
          y {delDia.length - LIMITE} cita{delDia.length - LIMITE === 1 ? "" : "s"} más en la agenda.
        </p>
      ) : null}
    </section>
  );
}

import { CalendarBlank, MapPin, UserCircle } from "@phosphor-icons/react";
import { ETIQUETA_ESTADO, COLOR_ESTADO, rangoHorario } from "@/features/agenda/agenda";
import { cn } from "@/lib/cn";
import { area } from "@/features/planta/plantaLayout";
import { type OcupacionZona } from "@/features/planta/plantaAgenda";
import { textoDeOcupacion } from "@/features/planta/OverlayAgenda";
import { ETIQUETA_TIPO, type Zona } from "./tipos";

/**
 * Ficha de la zona seleccionada: medidas, capacidad y agenda del dia.
 *
 * Es la mitad "datos" de la planta. El plano 3D no la trae: el 3D sirve para
 * entender donde esta cada cosa, y para leer la agenda el 2D es mejor. Por eso
 * la zona seleccionada muestra siempre esta ficha, se este en 2D o en 3D.
 */
export function DetalleZona({ zona, dato }: { zona: Zona | null; dato: OcupacionZona }) {
  if (!zona) {
    return (
      <div className="rounded-ios-lg border border-dashed border-line bg-surface px-4 py-6 text-center">
        <MapPin size={20} className="mx-auto text-ink-muted" />
        <p className="mt-2 text-[13px] text-ink-muted">
          Toca una zona del plano para ver su detalle y la agenda que tiene.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-ios-lg bg-black/[0.03] px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[15px] font-semibold text-ink">{zona.nombre}</p>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
          {ETIQUETA_TIPO[zona.tipo]}
        </p>
      </div>

      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px] text-ink-soft">
        <div className="flex items-baseline justify-between gap-2">
          <dt>Superficie</dt>
          <dd className="font-medium tabular-nums text-ink">{area(zona)} m²</dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt>Capacidad</dt>
          <dd className="font-medium tabular-nums text-ink">
            {zona.capacidad} {zona.capacidad === 1 ? "profesional" : "profesionales"}
          </dd>
        </div>
      </dl>

      {zona.notas ? <p className="mt-2 text-[12px] leading-snug text-ink-muted">{zona.notas}</p> : null}

      <AgendaDeZona zona={zona} dato={dato} />
    </div>
  );
}

function AgendaDeZona({ zona, dato }: { zona: Zona; dato: OcupacionZona }) {
  return (
    <section className="mt-3 border-t border-line pt-2.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
          <CalendarBlank size={13} weight="bold" /> Agenda de hoy
        </h3>
        <p className="text-[11px] tabular-nums text-ink-muted">{textoDeOcupacion(dato)}</p>
      </div>

      {!dato.citas.length ? (
        <p className="mt-2 text-[13px] text-ink-muted">
          {zona.tipo === "consultorio"
            ? "Sin citas para esta zona."
            : `Sin citas asignadas a ${ETIQUETA_TIPO[zona.tipo].toLowerCase()}.`}
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {dato.citas.map((cita) => (
            <li
              key={cita.id}
              className={cn(
                "rounded-ios border px-2.5 py-1.5",
                COLOR_ESTADO[cita.estado],
                cita.id === dato.enCurso?.id && "ring-1 ring-ios-blue/60",
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-[12px] font-semibold">
                  {cita.motivoConsulta || "Consulta"}
                </p>
                <span className="shrink-0 text-[11px] font-semibold tabular-nums">
                  {rangoHorario(cita.horaInicio, cita.horaFin)}
                </span>
              </div>
              <p className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide opacity-75">
                {cita.id === dato.enCurso?.id ? (
                  <>
                    <UserCircle size={11} weight="fill" /> En curso
                  </>
                ) : (
                  ETIQUETA_ESTADO[cita.estado]
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
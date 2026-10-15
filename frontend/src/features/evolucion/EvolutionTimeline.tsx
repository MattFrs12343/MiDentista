import { useState, type ReactNode } from "react";
import { CalendarBlank, CaretDown, ClipboardText, PencilSimpleLine, Tooth } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { tieneProximaAtencion } from "./evolucionMapper.ts";
import { formatearFechaLarga, trozosDeFecha } from "./fechasEvolucion.ts";
import { NextVisitPicker } from "./NextVisitPicker";
import type { EvolucionClinica } from "./tipos.ts";

/** Bloque de texto con salto de línea conservado, o el texto que falte. */
function Parrafo({ valor, vacio }: { valor: string; vacio: string }) {
  const hay = valor.trim() !== "";
  return (
    <p className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${hay ? "text-ink" : "text-ink-muted"}`}>
      {hay ? valor.trim() : vacio}
    </p>
  );
}

/** Fecha en formato local, partida en día / mes / año para el hito. */
function HitoFecha({ fecha }: { fecha: string }) {
  const trozos = trozosDeFecha(fecha);
  if (!trozos) {
    // Una fecha ilegible se muestra tal cual: no se inventa un día para que la
    // línea de tiempo parezca completa.
    return <span className="text-sm font-semibold text-ink">{fecha}</span>;
  }
  return (
    <time
      dateTime={fecha}
      title={trozos.etiqueta}
      className="flex w-[4.25rem] shrink-0 flex-col items-center rounded-xl bg-surface-sunken px-1.5 py-1.5 text-center"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
        {trozos.mes}
      </span>
      <span className="text-lg font-semibold leading-tight text-ink">{trozos.dia}</span>
      <span className="text-[10px] text-ink-muted">{trozos.anio}</span>
    </time>
  );
}

/**
 * Una atención dentro de la línea de tiempo.
 *
 * Resumen siempre visible (fecha, procedimiento y motivo) y detalle bajo demanda
 * (observaciones, indicaciones, pieza y próxima atención). El botón de cabecera
 * lleva `aria-expanded` y `aria-controls` para que el estado sea legible sin
 * ver el detalle desplegado.
 */
function Entrada({
  evolucion,
  tituloPlan,
  abierta,
  onAlternar,
  onEditar,
  onProximaAtencion,
  guardando,
}: {
  evolucion: EvolucionClinica;
  /** Título del plan vinculado, o `null` si no se pudo resolver (T-6.6). */
  tituloPlan?: string;
  abierta: boolean;
  onAlternar: () => void;
  onEditar?: (evolucion: EvolucionClinica) => void;
  onProximaAtencion?: (evolucion: EvolucionClinica, fecha: string | null) => void;
  guardando?: boolean;
}) {
  const panelId = `evolucion-detalle-${evolucion.id}`;
  const pendiente = tieneProximaAtencion(evolucion);
  const vinculado = evolucion.planTratamientoId !== null;
  // El plan vinculado solo se rotula si su título se pudo resolver. Si el plan se
  // borró o el rol no puede leerlo, no se inventa un nombre: la atención se sigue
  // viendo igual, sin la insignia.
  const planResuelto = vinculado && tituloPlan?.trim() ? tituloPlan.trim() : null;
  const hayDetalle = Boolean(
    evolucion.observaciones.trim()
    || evolucion.indicaciones.trim()
    || evolucion.numeroPieza !== null
    || planResuelto
    || pendiente,
  );

  return (
    <li className="relative min-w-0 pl-10">
      {/* Nodo del hilo. El círculo interior se enciende cuando la atención pide
          una próxima atención pendiente de agendar. */}
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="absolute left-0 top-3 h-7 w-7"
      >
        <circle cx="12" cy="12" r="7.25" className="fill-canvas stroke-line-strong" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="3.25" className={pendiente ? "fill-ios-orange" : "fill-brand-400"} />
      </svg>

      <div className="min-w-0 rounded-xl border border-line bg-white/70">
        <button
          type="button"
          aria-expanded={abierta}
          aria-controls={panelId}
          onClick={onAlternar}
          className="flex min-w-0 w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors duration-150 hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          <HitoFecha fecha={evolucion.fechaConsulta} />
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-sm font-semibold leading-snug break-words text-ink">
              {evolucion.procedimientoRealizado.trim() || "Sin procedimiento registrado"}
            </span>
            <span className="text-[13px] leading-relaxed break-words text-ink-muted">
              {evolucion.motivoConsulta.trim() || "Sin motivo de consulta registrado"}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-2">
              {planResuelto ? (
                <Badge tone="blue" className="gap-1 normal-case tracking-normal">
                  <ClipboardText size={11} aria-hidden />
                  Plan: {planResuelto}
                </Badge>
              ) : null}
              {pendiente ? (
                <Badge tone="yellow" className="gap-1">
                  <CalendarBlank size={11} weight="fill" aria-hidden />
                  Próxima atención
                </Badge>
              ) : null}
              {evolucion.numeroPieza !== null ? (
                <Badge tone="neutral" className="gap-1 normal-case tracking-normal">
                  <Tooth size={11} aria-hidden />
                  Pieza {evolucion.numeroPieza}
                </Badge>
              ) : null}
              {hayDetalle ? null : (
                <span className="text-xs text-ink-muted">Sin notas adicionales</span>
              )}
            </span>
          </span>
          <CaretDown
            size={18}
            aria-hidden
            className={`mt-1 shrink-0 text-ink-muted transition-transform duration-200 ${abierta ? "rotate-180" : ""}`}
          />
        </button>

        {abierta ? (
          <div
            id={panelId}
            className="flex flex-col gap-4 border-t border-line px-3 py-4 sm:px-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
              <div className="min-w-0 flex-1">
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Observaciones
                </h4>
                <Parrafo valor={evolucion.observaciones} vacio="Sin observaciones." />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Indicaciones
                </h4>
                <Parrafo valor={evolucion.indicaciones} vacio="Sin indicaciones." />
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Número de pieza
                </dt>
                <dd className="mt-1 break-words text-sm text-ink">
                  {evolucion.numeroPieza !== null ? `Pieza ${evolucion.numeroPieza}` : "No aplica"}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Fecha de la atención
                </dt>
                <dd className="mt-1 break-words text-sm text-ink">
                  {formatearFechaLarga(evolucion.fechaConsulta)}
                </dd>
              </div>
              {/* El plan se nombra solo si su título se pudo resolver. Con el id
                  pero sin título —plan borrado o sin permiso de lectura— se dice
                  que está vinculado sin inventar el nombre. */}
              {vinculado ? (
                <div className="min-w-0">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Plan de tratamiento
                  </dt>
                  <dd className="mt-1 break-words text-sm text-ink">
                    {planResuelto ?? "Vinculado a un plan no disponible"}
                  </dd>
                </div>
              ) : null}
            </dl>

            {onProximaAtencion ? (
              <NextVisitPicker
                value={evolucion.proximaAtencion}
                disabled={guardando}
                onChange={(fecha) => onProximaAtencion(evolucion, fecha)}
              />
            ) : (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Próxima atención
                </p>
                <p className="text-sm text-ink">
                  {pendiente
                    ? formatearFechaLarga(evolucion.proximaAtencion)
                    : "No se acordó una próxima atención."}
                </p>
              </div>
            )}

            {onEditar ? (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={guardando}
                  onClick={() => onEditar(evolucion)}
                >
                  <PencilSimpleLine size={15} aria-hidden /> Editar
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}

/**
 * Vista cronológica de las evoluciones del paciente (T-6.4).
 *
 * SVG puro para el hilo y los nodos: nada de 3D en este módulo. La lista llega
 * ordenada por el servicio (fecha descendente) y el orden no se reordena aquí,
 * para que lo que ve el odontólogo sea exactamente lo que devolvió la consulta.
 */
export function EvolutionTimeline({
  evoluciones,
  titulosDePlan,
  vacio,
  onEditar,
  onProximaAtencion,
  guardando,
}: {
  evoluciones: EvolucionClinica[];
  /**
   * Títulos de plan indexados por id (T-6.6). Lo construye `usePlanesTratamiento`
   * una sola vez, para no pedir el plan por evolución.
   */
  titulosDePlan?: ReadonlyMap<string, string>;
  /** Contenido a mostrar cuando no hay nada que listar. */
  vacio?: ReactNode;
  onEditar?: (evolucion: EvolucionClinica) => void;
  onProximaAtencion?: (evolucion: EvolucionClinica, fecha: string | null) => void;
  guardando?: boolean;
}) {
  const [abiertas, setAbiertas] = useState<ReadonlySet<string>>(() => new Set());

  if (evoluciones.length === 0) {
    return (
      <>
        {vacio ?? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-sm text-ink-muted">
                Este paciente aún no tiene evoluciones registradas.
              </p>
            </CardContent>
          </Card>
        )}
      </>
    );
  }

  function alternar(id: string) {
    setAbiertas((previas) => {
      const siguiente = new Set(previas);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  }

  const pendientes = evoluciones.filter((evolucion) => tieneProximaAtencion(evolucion)).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de atenciones</CardTitle>
        <CardDescription>
          {evoluciones.length === 1
            ? "1 atención registrada, de la más reciente a la más antigua"
            : `${evoluciones.length} atenciones registradas, de la más reciente a la más antigua`}
          {pendientes > 0
            ? ` · ${pendientes === 1 ? "1 pide" : `${pendientes} piden`} próxima atención`
            : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Hilo vertical. `preserveAspectRatio="none"` estira la línea a lo
              alto del bloque y `non-scaling-stroke` mantiene el grosor real. */}
          <svg
            viewBox="0 0 2 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="pointer-events-none absolute bottom-4 left-[13px] top-4 h-auto w-[2px] text-line"
          >
            <line
              x1="1"
              y1="0"
              x2="1"
              y2="100"
              stroke="currentColor"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <ol className="flex min-w-0 flex-col gap-3">
            {evoluciones.map((evolucion) => (
              <Entrada
                key={evolucion.id}
                evolucion={evolucion}
                tituloPlan={
                  evolucion.planTratamientoId === null
                    ? undefined
                    : titulosDePlan?.get(evolucion.planTratamientoId)
                }
                abierta={abiertas.has(evolucion.id)}
                onAlternar={() => alternar(evolucion.id)}
                onEditar={onEditar}
                onProximaAtencion={onProximaAtencion}
                guardando={guardando}
              />
            ))}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}

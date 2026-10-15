import { useEffect, useMemo, useState } from "react";
import { CalendarBlank, CaretDown, CaretUp, Notebook, WarningCircle } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionLoader } from "@/components/ui/section-loader";
import { useClinicaData } from "@/data/store";
import { formatearFechaCorta } from "@/features/evolucion/fechasEvolucion";
import { useEvolucionSupabase } from "@/features/evolucion/useEvolucionSupabase";
import {
  construirHistorialAtenciones,
  contarAtenciones,
  type AtencionHistorial,
  type TipoAtencion,
} from "@/features/patients/historialAtenciones";

type Tono = "neutral" | "blue" | "green" | "red" | "yellow" | "violet";

const ICONO_TIPO: Record<TipoAtencion, Icon> = {
  cita: CalendarBlank,
  evolucion: Notebook,
};

const ETIQUETA_TIPO: Record<TipoAtencion, string> = {
  cita: "Cita",
  evolucion: "Evolución",
};

/** El color del punto y de la etiqueta cuenta el estado sin tener que leerlo. */
function tonoDe(atencion: AtencionHistorial): Tono {
  if (atencion.tipo === "evolucion") return "violet";
  switch (atencion.estado) {
    case "atendida":
      return "green";
    case "cancelada":
      return "red";
    case "confirmada":
      return "blue";
    default:
      return "neutral";
  }
}

const PUNTO: Record<Tono, string> = {
  neutral: "bg-ink-muted",
  blue: "bg-brand-500",
  green: "bg-pastel-green-fg",
  red: "bg-pastel-red-fg",
  yellow: "bg-pastel-yellow-fg",
  violet: "bg-brand-500",
};

/**
 * Historial de atenciones del paciente (US-2.7).
 *
 * Vista de solo lectura: junta las citas (módulo 07, ya en el store) y las
 * evoluciones (módulo 06) en una línea de tiempo. No escribe nada. La pestaña la
 * registra Matías en `tabValue.ts` / `PatientProfilePage.tsx`, que son suyos;
 * ver el README del módulo 02.
 */
export function HistorialAtenciones({ pacienteId }: { pacienteId: string }) {
  const { citasDe } = useClinicaData();
  const { evoluciones, cargando, error, lecturaSinFilas, cargar } = useEvolucionSupabase();
  const [abierta, setAbierta] = useState<string | null>(null);

  useEffect(() => {
    if (!pacienteId) return;
    void cargar(pacienteId);
  }, [pacienteId, cargar]);

  const citas = citasDe(pacienteId);
  const historial = useMemo(
    () => construirHistorialAtenciones(citas, evoluciones),
    [citas, evoluciones],
  );
  const conteo = contarAtenciones(historial);

  const encabezado =
    cargando && historial.length === 0
      ? "Cargando atenciones…"
      : conteo.total === 1
        ? "1 atención en el historial"
        : `${conteo.total} atenciones en el historial`;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <h3 className="title-ios text-[17px] font-semibold text-label">Historial de atenciones</h3>
          <p className="mt-0.5 text-[13px] text-label-2">{encabezado}</p>
        </div>
        {conteo.total > 0 ? (
          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
            <Badge tone="blue">{conteo.citas} citas</Badge>
            <Badge tone="violet">{conteo.evoluciones} evoluciones</Badge>
          </div>
        ) : null}
      </div>

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-pastel-red-fg/15 bg-pastel-red-bg/65 p-4"
        >
          <WarningCircle size={18} weight="fill" aria-hidden className="mt-0.5 shrink-0 text-pastel-red-fg" />
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm text-pastel-red-fg">{error}</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => void cargar(pacienteId)}
              disabled={cargando}
            >
              Reintentar
            </Button>
          </div>
        </div>
      ) : null}

      {cargando && historial.length === 0 ? (
        <SectionLoader label="Cargando historial de atenciones" className="min-h-[40vh]" />
      ) : historial.length === 0 ? (
        <EmptyState
          icon={CalendarBlank}
          iconTone="brand"
          title="Todavía no hay atenciones registradas"
          description={
            <>
              Cuando se agende una cita o se registre una evolución, acá aparece la línea de
              tiempo de la trayectoria clínica del paciente.
              {lecturaSinFilas ? (
                <>
                  {" "}
                  Si esperabas ver atenciones y no aparecen, tu rol puede no tener permiso de
                  lectura: las políticas de seguridad ocultan las filas en lugar de mostrar un
                  error.
                </>
              ) : null}
            </>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ol className="relative flex flex-col">
              {historial.map((atencion, indice) => {
                const Icono = ICONO_TIPO[atencion.tipo];
                const tono = tonoDe(atencion);
                const expandida = abierta === atencion.id;
                const tieneDetalles = atencion.detalles.length > 0;
                return (
                  <li
                    key={atencion.id}
                    className="relative flex gap-3 px-4 py-3 pl-10 not-last:border-b not-last:border-line"
                  >
                    {/* Punto y línea de la línea de tiempo. El último no dibuja
                        línea para que no quede colgando. */}
                    <span
                      aria-hidden
                      className={`absolute left-4 top-5 size-2.5 -translate-x-1/2 rounded-full ${PUNTO[tono]}`}
                    />
                    {indice < historial.length - 1 ? (
                      <span
                        aria-hidden
                        className="absolute left-4 top-6 bottom-0 w-px -translate-x-1/2 bg-line"
                      />
                    ) : null}

                    <span className="mt-0.5 shrink-0 text-ink-muted">
                      <Icono size={18} weight="duotone" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="min-w-0 truncate text-sm font-medium text-ink">
                          {atencion.titulo}
                        </p>
                        <Badge tone={tono}>{ETIQUETA_TIPO[atencion.tipo]}</Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {formatearFechaCorta(atencion.fecha)}
                        {atencion.hora ? ` · ${atencion.hora}` : ""}
                        {atencion.tipo === "cita" ? ` · ${atencion.resumen}` : ""}
                      </p>

                      {expandida ? (
                        <dl className="mt-2 flex flex-col gap-1.5">
                          {tieneDetalles ? (
                            atencion.detalles.map((detalle) => (
                              <div key={detalle.etiqueta} className="flex gap-2 text-[13px]">
                                <dt className="shrink-0 text-ink-muted">{detalle.etiqueta}:</dt>
                                <dd className="min-w-0 whitespace-pre-wrap text-ink-soft">
                                  {detalle.valor}
                                </dd>
                              </div>
                            ))
                          ) : (
                            <p className="text-[13px] text-ink-muted">Sin detalles adicionales.</p>
                          )}
                        </dl>
                      ) : null}

                      {tieneDetalles ? (
                        <button
                          type="button"
                          onClick={() => setAbierta(expandida ? null : atencion.id)}
                          aria-expanded={expandida}
                          className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-brand-600 transition-colors duration-150 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                        >
                          {expandida ? (
                            <>
                              <CaretUp size={12} weight="bold" aria-hidden /> Ocultar detalle
                            </>
                          ) : (
                            <>
                              <CaretDown size={12} weight="bold" aria-hidden /> Ver detalle
                            </>
                          )}
                        </button>
                      ) : (
                        <p className="mt-1 text-xs text-ink-muted">{atencion.resumen}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

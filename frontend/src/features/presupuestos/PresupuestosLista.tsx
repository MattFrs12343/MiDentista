import { PencilSimple, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { EstadoPresupuestoBadge } from "./EstadoPresupuestoBadge.tsx";
import { formatearFecha, formatearMoneda, transicionesDisponibles } from "./presupuestoFormato.ts";
import type { EstadoPresupuesto, Presupuesto } from "./tipos.ts";

export interface PresupuestosListaProps {
  presupuestos: Presupuesto[];
  nombrePaciente: (pacienteId: string) => string;
  onEditar: (presupuesto: Presupuesto) => void;
  onCambiarEstado: (presupuesto: Presupuesto, hacia: EstadoPresupuesto) => void;
  onEliminar: (presupuesto: Presupuesto) => void;
  guardando?: boolean;
}

/**
 * Tabla de presupuestos de la clínica (T-8.6, T-8.8).
 *
 * Es de solo presentación: no consulta ni calcula nada. Las acciones que ofrece
 * salen del ciclo de vida (`transicionesDisponibles`) y de si el presupuesto es
 * editable, de modo que la fila nunca muestra un botón que el servicio vaya a
 * rechazar. Un presupuesto `aceptado` o `rechazado` ya no se edita.
 */
export function PresupuestosLista({
  presupuestos,
  nombrePaciente,
  onEditar,
  onCambiarEstado,
  onEliminar,
  guardando = false,
}: PresupuestosListaProps) {
  return (
    <div className="overflow-x-auto rounded-panel border border-line bg-surface">
      <table className="w-full min-w-[52rem] text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-surface-sunken text-[11px] uppercase tracking-wide text-ink-muted">
            <th scope="col" className="px-4 py-2.5 font-semibold">Título</th>
            <th scope="col" className="px-4 py-2.5 font-semibold">Paciente</th>
            <th scope="col" className="px-4 py-2.5 font-semibold">Creado</th>
            <th scope="col" className="px-4 py-2.5 font-semibold">Válido hasta</th>
            <th scope="col" className="px-4 py-2.5 text-right font-semibold">Total</th>
            <th scope="col" className="px-4 py-2.5 font-semibold">Estado</th>
            <th scope="col" className="px-4 py-2.5 text-right font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {presupuestos.map((presupuesto) => {
            const editable = presupuesto.estado === "borrador" || presupuesto.estado === "enviado";
            const eliminable = presupuesto.estado === "borrador";
            const transiciones = transicionesDisponibles(presupuesto.estado);

            return (
              <tr key={presupuesto.id} className="align-middle">
                <td className="px-4 py-2.5 font-medium text-ink">
                  {presupuesto.titulo || "Presupuesto"}
                </td>
                <td className="px-4 py-2.5 text-ink-soft">{nombrePaciente(presupuesto.pacienteId)}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-ink-muted">
                  {formatearFecha(presupuesto.creadoEl.slice(0, 10))}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-ink-muted">
                  {formatearFecha(presupuesto.validoHasta)}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums text-ink">
                  {formatearMoneda(presupuesto.total)}
                </td>
                <td className="px-4 py-2.5">
                  <EstadoPresupuestoBadge estado={presupuesto.estado} />
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {transiciones.map((accion) => (
                      <Button
                        key={accion.hacia}
                        type="button"
                        variant={accion.tone}
                        size="sm"
                        disabled={guardando}
                        onClick={() => onCambiarEstado(presupuesto, accion.hacia)}
                      >
                        {accion.etiqueta}
                      </Button>
                    ))}

                    {editable ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={guardando}
                        onClick={() => onEditar(presupuesto)}
                      >
                        <PencilSimple size={14} weight="bold" aria-hidden="true" />
                        Editar
                      </Button>
                    ) : null}

                    {eliminable ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={guardando}
                        onClick={() => onEliminar(presupuesto)}
                        className="text-ink-muted hover:text-ios-red"
                        aria-label={`Eliminar ${presupuesto.titulo || "presupuesto"}`}
                      >
                        <Trash size={14} aria-hidden="true" />
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

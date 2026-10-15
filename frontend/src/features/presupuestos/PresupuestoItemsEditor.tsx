import { useState } from "react";
import { Plus, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { aNumero, subtotalItem } from "./calculoTotal.ts";
import { formatearMoneda } from "./presupuestoFormato.ts";
import type { Servicio } from "./servicioCatalogo.ts";
import type { ItemPresupuestoNuevo } from "./tipos.ts";

/**
 * Borrador de partida: los campos numéricos viven como texto mientras se
 * escriben. Convertirlos a número en cada tecla impediría teclear "10,5" o
 * borrar el campo; la conversión ocurre al notificar al formulario.
 */
interface Borrador {
  clave: string;
  servicioId: string | null;
  descripcion: string;
  numeroPieza: string;
  cantidad: string;
  precioUnitario: string;
}

let contador = 0;
function siguienteClave(): string {
  contador += 1;
  return `partida-${contador}`;
}

function borradorVacio(): Borrador {
  return {
    clave: siguienteClave(),
    servicioId: null,
    descripcion: "",
    numeroPieza: "",
    cantidad: "1",
    precioUnitario: "",
  };
}

function desdeItem(item: ItemPresupuestoNuevo): Borrador {
  return {
    clave: siguienteClave(),
    servicioId: item.servicioId,
    descripcion: item.descripcion,
    numeroPieza: item.numeroPieza === null ? "" : String(item.numeroPieza),
    cantidad: String(item.cantidad),
    precioUnitario: String(aNumero(item.precioUnitario)),
  };
}

function aItem(borrador: Borrador, clinicaId: string, presupuestoId: string): ItemPresupuestoNuevo {
  const pieza = borrador.numeroPieza.trim();
  const piezaNumero = pieza === "" ? null : Number(pieza);
  const cantidad = Math.trunc(aNumero(borrador.cantidad));

  return {
    clinicaId,
    presupuestoId,
    servicioId: borrador.servicioId,
    descripcion: borrador.descripcion.trim(),
    numeroPieza: piezaNumero !== null && Number.isFinite(piezaNumero) ? piezaNumero : null,
    cantidad: cantidad > 0 ? cantidad : 1,
    precioUnitario: aNumero(borrador.precioUnitario),
  };
}

export interface PresupuestoItemsEditorProps {
  /** Cambia cuando hay que re-sembrar el editor (id del presupuesto o "nuevo"). */
  clave: string;
  /** Partidas con las que arranca la edición. */
  iniciales?: readonly ItemPresupuestoNuevo[];
  servicios: Servicio[];
  clinicaId: string;
  /** UUID del presupuesto; en un alta todavía no existe, así que va vacío. */
  presupuestoId: string;
  disabled?: boolean;
  onCambiar: (items: ItemPresupuestoNuevo[]) => void;
}

/**
 * Editor de partidas de un presupuesto (T-8.2, T-8.3, T-8.7).
 *
 * Agrupa las tres piezas del alta y la edición: agregar una partida libre,
 * traerla del catálogo de servicios (`T-8.7`) y ver el subtotal de cada línea.
 * El subtotal lo calcula `calculoTotal.ts`, no este componente, para que el
 * formulario y el servicio nunca discrepen.
 */
export function PresupuestoItemsEditor({
  clave,
  iniciales,
  servicios,
  clinicaId,
  presupuestoId,
  disabled = false,
  onCambiar,
}: PresupuestoItemsEditorProps) {
  const [borradores, setBorradores] = useState<Borrador[]>(() =>
    (iniciales ?? []).map(desdeItem),
  );
  const [seleccion, setSeleccion] = useState("");
  const [claveVista, setClaveVista] = useState(clave);

  // Re-siembra al abrir otro presupuesto (o al pasar de edición a alta). Se
  // ajusta durante el render, no en un efecto, para no pintar un frame con las
  // partidas del presupuesto anterior.
  if (clave !== claveVista) {
    setClaveVista(clave);
    setBorradores((iniciales ?? []).map(desdeItem));
  }

  const aplicar = (nuevos: Borrador[]) => {
    setBorradores(nuevos);
    onCambiar(nuevos.map((borrador) => aItem(borrador, clinicaId, presupuestoId)));
  };

  const editar = (partidaClave: string, cambios: Partial<Borrador>) => {
    aplicar(borradores.map((b) => (b.clave === partidaClave ? { ...b, ...cambios } : b)));
  };

  const agregarVacio = () => aplicar([...borradores, borradorVacio()]);

  const agregarServicio = (servicioId: string) => {
    const servicio = servicios.find((s) => s.id === servicioId);
    if (!servicio) return;
    aplicar([
      ...borradores,
      {
        ...borradorVacio(),
        servicioId: servicio.id,
        descripcion: servicio.nombre,
        precioUnitario: String(aNumero(servicio.precioPorDefecto)),
      },
    ]);
  };

  const quitar = (partidaClave: string) => {
    aplicar(borradores.filter((b) => b.clave !== partidaClave));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {servicios.length > 0 ? (
          <div className="min-w-56 flex-1">
            <Select
              value={seleccion}
              onValueChange={(valor) => {
                setSeleccion("");
                agregarServicio(valor);
              }}
              disabled={disabled}
            >
              <SelectTrigger aria-label="Agregar un servicio del catálogo">
                <SelectValue placeholder="Agregar del catálogo de servicios…" />
              </SelectTrigger>
              <SelectContent>
                {servicios.map((servicio) => (
                  <SelectItem key={servicio.id} value={servicio.id}>
                    {servicio.nombre} · {formatearMoneda(servicio.precioPorDefecto)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <p className="flex-1 text-[12px] leading-snug text-ink-muted">
            El catálogo de servicios de la clínica está vacío. Agregá partidas libres y cargá los
            precios a mano.
          </p>
        )}

        <Button type="button" variant="secondary" size="sm" onClick={agregarVacio} disabled={disabled}>
          <Plus size={14} weight="bold" aria-hidden="true" />
          Partida libre
        </Button>
      </div>

      {borradores.length === 0 ? (
        <div className="rounded-tile border border-dashed border-line px-4 py-8 text-center text-[13px] text-ink-muted">
          Sin partidas todavía. Agregá una del catálogo o una libre.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-tile border border-line">
          <table className="w-full min-w-[42rem] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-sunken text-[11px] uppercase tracking-wide text-ink-muted">
                <th scope="col" className="px-3 py-2 font-semibold">Descripción</th>
                <th scope="col" className="w-20 px-3 py-2 font-semibold">Pieza</th>
                <th scope="col" className="w-20 px-3 py-2 font-semibold">Cant.</th>
                <th scope="col" className="w-32 px-3 py-2 font-semibold">Precio unit.</th>
                <th scope="col" className="w-32 px-3 py-2 text-right font-semibold">Subtotal</th>
                <th scope="col" className="w-12 px-3 py-2">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {borradores.map((borrador) => (
                <tr key={borrador.clave}>
                  <td className="px-3 py-2">
                    <Input
                      type="text"
                      value={borrador.descripcion}
                      onChange={(e) => editar(borrador.clave, { descripcion: e.target.value })}
                      placeholder="Procedimiento o servicio"
                      aria-label="Descripción de la partida"
                      disabled={disabled}
                      className="h-9 text-[13px]"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={borrador.numeroPieza}
                      onChange={(e) => editar(borrador.clave, { numeroPieza: e.target.value })}
                      placeholder="—"
                      aria-label="Número de pieza"
                      disabled={disabled}
                      className="h-9 text-[13px]"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      step="1"
                      value={borrador.cantidad}
                      onChange={(e) => editar(borrador.clave, { cantidad: e.target.value })}
                      aria-label="Cantidad"
                      disabled={disabled}
                      className="h-9 text-[13px]"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={borrador.precioUnitario}
                      onChange={(e) => editar(borrador.clave, { precioUnitario: e.target.value })}
                      placeholder="0,00"
                      aria-label="Precio unitario"
                      disabled={disabled}
                      className="h-9 text-[13px]"
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums text-ink">
                    {formatearMoneda(
                      subtotalItem({
                        cantidad: Math.max(1, Math.trunc(aNumero(borrador.cantidad))),
                        precioUnitario: borrador.precioUnitario,
                      }),
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => quitar(borrador.clave)}
                      disabled={disabled}
                      aria-label={`Quitar ${borrador.descripcion || "partida"}`}
                      className="text-ink-muted hover:text-ios-red"
                    >
                      <Trash size={16} aria-hidden="true" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

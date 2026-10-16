import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormActions, FormAlert, FormGroup, FormShell } from "@/components/ui/form-parts";
import { aNumero, subtotalPartidas, totalPresupuesto } from "./calculoTotal.ts";
import { formatearMoneda } from "./presupuestoFormato.ts";
import { PresupuestoItemsEditor } from "./PresupuestoItemsEditor.tsx";
import type { Servicio } from "./servicioCatalogo.ts";
import type {
  ItemPresupuestoNuevo,
  PresupuestoCompleto,
  PresupuestoNuevo,
} from "./tipos.ts";

/** Opción del selector de paciente: solo lo que la vista necesita mostrar. */
export interface PacienteOpcion {
  id: string;
  nombre: string;
}

export interface PresupuestoFormProps {
  clinicaId: string;
  odontologoId: string;
  pacientes: PacienteOpcion[];
  servicios: Servicio[];
  /** `true` cuando el catálogo de servicios no se pudo cargar (distinto de estar vacío). */
  catalogoError?: boolean;
  /** Presupuesto a editar. Sin esto, el formulario es un alta. */
  inicial?: PresupuestoCompleto;
  /** Paciente fijado desde el contexto; si llega, no se puede cambiar. */
  pacienteFijado?: string;
  guardando: boolean;
  /** Error de la última escritura, para no duplicarlo en la lista. */
  error?: string | null;
  onGuardar: (presupuesto: PresupuestoNuevo, items: ItemPresupuestoNuevo[]) => void;
  onCancelar?: () => void;
}

/** Una fila de `items_presupuesto` sin `id`/`subtotal`, como la espera el alta. */
function itemInicial(presupuesto: PresupuestoCompleto): ItemPresupuestoNuevo[] {
  return presupuesto.items.map((item) => ({
    clinicaId: item.clinicaId,
    presupuestoId: item.presupuestoId,
    servicioId: item.servicioId,
    descripcion: item.descripcion,
    numeroPieza: item.numeroPieza,
    cantidad: item.cantidad,
    precioUnitario: item.precioUnitario,
  }));
}

/**
 * Alta y edición de un presupuesto (US-8.1, US-8.2, US-8.4).
 *
 * El total se calcula en vivo con `calculoTotal.ts` y se vuelve a calcular en el
 * servicio antes de guardar: el número que se ve y el que queda en la base salen
 * de la misma fórmula. El formulario no persiste nada por su cuenta; avisa con
 * `onGuardar` y quien lo monta decide si es alta o edición.
 */
export function PresupuestoForm({
  clinicaId,
  odontologoId,
  pacientes,
  servicios,
  catalogoError,
  inicial,
  pacienteFijado,
  guardando,
  error,
  onGuardar,
  onCancelar,
}: PresupuestoFormProps) {
  const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
  const [pacienteId, setPacienteId] = useState(pacienteFijado ?? inicial?.pacienteId ?? "");
  const [descuento, setDescuento] = useState(
    inicial ? String(aNumero(inicial.descuento)) : "",
  );
  const [validoHasta, setValidoHasta] = useState(inicial?.validoHasta ?? "");
  const [notas, setNotas] = useState(inicial?.notas ?? "");
  const [items, setItems] = useState<ItemPresupuestoNuevo[]>(() =>
    inicial ? itemInicial(inicial) : [],
  );
  const [fallo, setFallo] = useState<string | null>(null);

  const descuentoNumero = aNumero(descuento);
  const subtotal = subtotalPartidas(items);
  const total = totalPresupuesto(items, descuento);

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    if (!pacienteId) {
      setFallo("Elegí el paciente del presupuesto.");
      return;
    }
    const sinDescripcion = items.filter((item) => item.descripcion.trim() === "");
    if (items.length === 0) {
      setFallo("Agregá al menos una partida al presupuesto.");
      return;
    }
    if (sinDescripcion.length > 0) {
      setFallo("Hay partidas sin descripción. Completalas o quitalas antes de guardar.");
      return;
    }
    if (descuentoNumero < 0) {
      setFallo("El descuento no puede ser negativo.");
      return;
    }
    setFallo(null);
    onGuardar(
      {
        clinicaId,
        pacienteId,
        odontologoId,
        titulo: titulo.trim() || "Presupuesto",
        descuento: descuentoNumero,
        validoHasta: validoHasta ? validoHasta : null,
        notas: notas.trim(),
      },
      items,
    );
  };

  const bloqueado = pacienteFijado !== undefined && pacienteFijado !== "";

  return (
    <form onSubmit={enviar}>
      <FormShell section="presupuestos">
        <FormGroup titulo="Datos del presupuesto">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Título" htmlFor="pres-titulo" className="sm:col-span-2">
              <Input
                id="pres-titulo"
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej. Tratamiento de ortodoncia"
                disabled={guardando}
              />
            </Field>

            <Field
              label="Paciente"
              htmlFor="pres-paciente"
              hint={bloqueado ? "Fijado desde la ficha del paciente." : undefined}
            >
              <Select
                value={pacienteId}
                onValueChange={setPacienteId}
                disabled={guardando || bloqueado}
              >
                <SelectTrigger id="pres-paciente" aria-label="Paciente del presupuesto">
                  <SelectValue placeholder="Elegí un paciente…" />
                </SelectTrigger>
                <SelectContent>
                  {pacientes.map((paciente) => (
                    <SelectItem key={paciente.id} value={paciente.id}>
                      {paciente.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Válido hasta"
              htmlFor="pres-valido"
              hint="Opcional. Hasta cuándo se respetan estos precios."
            >
              <Input
                id="pres-valido"
                type="date"
                value={validoHasta}
                onChange={(e) => setValidoHasta(e.target.value)}
                disabled={guardando}
              />
            </Field>
          </div>
        </FormGroup>

        <FormGroup titulo="Partidas" descripcion="Detalle de procedimientos y sus precios.">
          <PresupuestoItemsEditor
            clave={inicial?.id ?? "nuevo"}
            iniciales={inicial ? itemInicial(inicial) : []}
            servicios={servicios}
            catalogoError={catalogoError}
            clinicaId={clinicaId}
            presupuestoId={inicial?.id ?? ""}
            disabled={guardando}
            onCambiar={setItems}
          />
        </FormGroup>

        <FormGroup titulo="Descuento y total">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Descuento (Bs)"
              htmlFor="pres-descuento"
              hint="Se resta del subtotal. El total nunca baja de cero."
            >
              <Input
                id="pres-descuento"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={descuento}
                onChange={(e) => setDescuento(e.target.value)}
                disabled={guardando}
              />
            </Field>

            <dl className="flex flex-col justify-center gap-1 rounded-tile bg-surface-sunken px-4 py-3 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-muted">Subtotal</dt>
                <dd className="tabular-nums text-ink-soft">{formatearMoneda(subtotal)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-muted">Descuento</dt>
                <dd className="tabular-nums text-pastel-red-fg">
                  − {formatearMoneda(descuentoNumero)}
                </dd>
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-line pt-2">
                <dt className="font-semibold text-ink">Total</dt>
                <dd className="text-[17px] font-semibold tabular-nums text-ink">
                  {formatearMoneda(total)}
                </dd>
              </div>
            </dl>
          </div>
        </FormGroup>

        <Field label="Notas" htmlFor="pres-notas" hint="Opcional.">
          <Textarea
            id="pres-notas"
            rows={3}
            placeholder="Condiciones, observaciones o aclaratorias"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            disabled={guardando}
          />
        </Field>

        {fallo || error ? <FormAlert>{fallo ?? error}</FormAlert> : null}

        <FormActions>
          <Button type="submit" disabled={guardando}>
            {guardando ? "Guardando…" : inicial ? "Guardar cambios" : "Crear presupuesto"}
          </Button>
          {onCancelar ? (
            <Button type="button" variant="ghost" size="md" onClick={onCancelar} disabled={guardando}>
              Cancelar
            </Button>
          ) : null}
        </FormActions>
      </FormShell>
    </form>
  );
}

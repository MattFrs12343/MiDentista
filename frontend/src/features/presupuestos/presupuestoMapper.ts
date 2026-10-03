import type {
  Decimal,
  EstadoPresupuesto,
  ItemPresupuesto,
  Presupuesto,
  PresupuestoCompleto,
  PresupuestoNuevo,
} from "./tipos.ts";
import { ESTADOS_PRESUPUESTO } from "./tipos.ts";

/** Fila de `public.presupuestos`. */
export interface PresupuestoFila {
  id: string;
  clinica_id: string;
  paciente_id: string;
  odontologo_id: string;
  titulo: string | null;
  descuento: Decimal;
  total: Decimal;
  estado: string | null;
  valido_hasta: string | null;
  notas: string | null;
  creado_en: string | null;
  actualizado_en: string | null;
}

/** Fila de `public.items_presupuesto`. */
export interface ItemPresupuestoFila {
  id: string;
  clinica_id: string;
  presupuesto_id: string;
  servicio_id: string | null;
  descripcion: string;
  numero_pieza: number | null;
  cantidad: number | null;
  precio_unitario: Decimal;
  subtotal: Decimal;
  creado_en: string | null;
}

/**
 * Solo los campos que la UI escribe. `id`, `creado_en` y `actualizado_en` los
 * pone la base: mandarlos como null anularía sus valores por defecto.
 */
export type PresupuestoPayload = Omit<
  PresupuestoFila,
  "id" | "creado_en" | "actualizado_en"
>;

export function esUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);
}

/**
 * El `check` de la base limita los estados, pero una fila puede venir de una
 * versión anterior del esquema. Un estado desconocido se degrada a `borrador` en
 * lugar de propagarse a la UI y romper los comparadores de color.
 */
function estadoDesdeTexto(valor: string | null): EstadoPresupuesto {
  const encontrado = ESTADOS_PRESUPUESTO.find((e) => e === valor);
  return encontrado ?? "borrador";
}

function texto(valor: string | null): string {
  return valor ?? "";
}

export function presupuestoDesdeFila(fila: PresupuestoFila): Presupuesto {
  return {
    id: fila.id,
    clinicaId: fila.clinica_id,
    pacienteId: fila.paciente_id,
    odontologoId: fila.odontologo_id,
    titulo: texto(fila.titulo),
    descuento: fila.descuento,
    total: fila.total,
    estado: estadoDesdeTexto(fila.estado),
    validoHasta: fila.valido_hasta,
    notas: texto(fila.notas),
    creadoEl: fila.creado_en ?? "",
    actualizadoEn: fila.actualizado_en ?? "",
  };
}

export function itemDesdeFila(fila: ItemPresupuestoFila): ItemPresupuesto {
  return {
    id: fila.id,
    clinicaId: fila.clinica_id,
    presupuestoId: fila.presupuesto_id,
    servicioId: fila.servicio_id,
    descripcion: fila.descripcion,
    numeroPieza: fila.numero_pieza,
    cantidad: fila.cantidad ?? 1,
    precioUnitario: fila.precio_unitario,
    subtotal: fila.subtotal,
  };
}

/** Fila a insertar para un presupuesto nuevo. No se manda `total` sin calcular. */
export function presupuestoParaGuardar(nuevo: PresupuestoNuevo, total: Decimal): PresupuestoPayload {
  return {
    clinica_id: nuevo.clinicaId,
    paciente_id: nuevo.pacienteId,
    odontologo_id: nuevo.odontologoId,
    titulo: nuevo.titulo,
    descuento: nuevo.descuento,
    total,
    estado: "borrador",
    valido_hasta: nuevo.validoHasta,
    notas: nuevo.notas,
  };
}

/** Fila completa para el UPDATE, sin `id` ni las columnas de la base. */
export function presupuestoParaActualizar(presupuesto: Presupuesto): PresupuestoPayload {
  return {
    clinica_id: presupuesto.clinicaId,
    paciente_id: presupuesto.pacienteId,
    odontologo_id: presupuesto.odontologoId,
    titulo: presupuesto.titulo,
    descuento: presupuesto.descuento,
    total: presupuesto.total,
    estado: presupuesto.estado,
    valido_hasta: presupuesto.validoHasta,
    notas: presupuesto.notas,
  };
}

export function completarPresupuesto(
  presupuesto: Presupuesto,
  items: ItemPresupuesto[],
): PresupuestoCompleto {
  return { ...presupuesto, items };
}

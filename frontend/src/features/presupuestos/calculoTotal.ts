import type {
  Decimal,
  ItemPresupuesto,
  ItemPresupuestoNuevo,
} from "./tipos.ts";

/** Una partida ya calculada, lista para insertar (todavia sin `id`). */
export type ItemConSubtotal = Omit<ItemPresupuesto, "id">;

/**
 * Aritmetica de presupuestos.
 *
 * Es la UNICA fuente de verdad de los totales, y existe por una razón concreta:
 * el módulo 09 (Pagos, de Carlos) necesita calcular el saldo pendiente de un
 * presupuesto sin reimplementar esta cuenta. Importa estas funciones, no las
 * copies. Si cada uno multiplica por su lado, los dos muestran cifras distintas
 * para el mismo presupuesto.
 */

/** Los NUMERIC(10,2) de Postgres llegan como número o como texto según el driver. */
export function aNumero(valor: Decimal): number {
  if (valor === null || valor === undefined || valor === "") return 0;
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) ? n : 0;
}

/** Redondeo a dos decimales, el NUMERIC(10,2) de la base. */
export function redondear(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function subtotalItem(item: Pick<ItemPresupuesto, "cantidad" | "precioUnitario">): number {
  return redondear(aNumero(item.precioUnitario) * (item.cantidad || 0));
}

/** Subtotal de las partidas antes del descuento. */
export function subtotalPartidas(items: readonly Pick<ItemPresupuesto, "cantidad" | "precioUnitario">[]): number {
  return redondear(items.reduce((acc, item) => acc + subtotalItem(item), 0));
}

/**
 * Total del presupuesto: partidas menos descuento. Nunca negativo: si el
 * descuento supera el subtotal, el total se recorta a 0 para no "$"-negativo.
 */
export function totalPresupuesto(
  items: readonly Pick<ItemPresupuesto, "cantidad" | "precioUnitario">[],
  descuento: Decimal,
): number {
  return Math.max(0, redondear(subtotalPartidas(items) - aNumero(descuento)));
}

/** Calcula el subtotal de cada partida antes de mandarla a la base. */
export function itemsConSubtotal(items: readonly ItemPresupuestoNuevo[]): ItemConSubtotal[] {
  return items.map((item) => ({ ...item, subtotal: subtotalItem(item) }));
}

/**
 * Saldo pendiente de un presupuesto. Lo consume el módulo 09 para el estado de
 * cuenta del paciente.
 */
export function saldoPresupuesto(total: Decimal, pagado: Decimal): number {
  return Math.max(0, redondear(aNumero(total) - aNumero(pagado)));
}

/** `US-8.x`: el presupuesto se puede enviar al paciente solo si tiene partidas. */
export function esPresupuestoEnviable(items: readonly ItemPresupuesto[]): boolean {
  return items.length > 0 && items.every((item) => item.descripcion.trim() !== "");
}

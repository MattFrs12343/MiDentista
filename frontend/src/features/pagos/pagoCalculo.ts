import type { Decimal } from "./tipos.ts";

/**
 * Aritmetica de pagos.
 *
 * Estas funciones reciben NUMEROS, no objetos de otros modulos. Es deliberado:
 * el modulo 09 se integra despues del 08 (`T-9.7` necesita los totales del
 * presupuesto), y si este archivo importara tipos de `features/presupuestos/`,
 * el modulo 09 no compilaria hasta que el 08 estuviera mergeado.
 *
 * Los dos modulos pueden avanzar en paralelo porque aqui no hay ningun import
 * hacia `features/presupuestos/`. Cuando ambos esten integrados, el modulo 09
 * recibe los totales como numeros desde la capa de UI.
 */

/** Redondeo a dos decimales, el NUMERIC(10,2) de la base. */
export function redondear(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function aNumero(valor: Decimal): number {
  if (valor === null || valor === undefined || valor === "") return 0;
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Saldo pendiente de un presupuesto.
 *
 * Solo cuenta los pagos `confirmado`: un pago `pendiente` todavía no es dinero
 * recibido y un `rechazado` nunca lo fue. Contarlos todos daria saldos
 * falsos, que es el error clasico de este modulo.
 */
export function saldoPresupuesto(
  total: Decimal,
  pagos: readonly { monto: Decimal; estado: string }[],
): number {
  const pagado = redondear(
    pagos
      .filter((p) => p.estado === "confirmado")
      .reduce((acc, p) => acc + aNumero(p.monto), 0),
  );
  return Math.max(0, redondear(aNumero(total) - pagado));
}

/** Suma de los pagos confirmados, para el total pagado del paciente. */
export function totalConfirmado(pagos: readonly { monto: Decimal; estado: string }[]): number {
  return redondear(
    pagos
      .filter((p) => p.estado === "confirmado")
      .reduce((acc, p) => acc + aNumero(p.monto), 0),
  );
}

/**
 * Un pago parcial no puede superar lo que falta por pagar. Devuelve el monto
 * aceptable para que la UI no tenga que recalcularlo.
 */
export function montoAceptable(
  saldoPendiente: number,
  montoPropuesto: Decimal,
): number {
  const propuesto = aNumero(montoPropuesto);
  if (propuesto <= 0) return 0;
  return redondear(Math.min(propuesto, Math.max(0, saldoPendiente)));
}

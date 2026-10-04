/**
 * Presentacion de pagos: moneda y fechas.
 *
 * Vive aparte de `pagoCalculo.ts` porque alli solo hay aritmetica y aqui hay
 * formato de pantalla. Existe para que `AccountStatement`, `PaymentHistory` y
 * `PaymentForm` muestren las cifras igual: tres copias del `toLocaleString` es
 * la forma rapida de que el total y el historial terminen distintos.
 */

import { aNumero, redondear } from "./pagoCalculo.ts";
import type { Decimal } from "./tipos.ts";

/** Los montos son NUMERIC(10,2): siempre dos decimales. */
const MONEDA = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `Bs 1.234,50`. Es el mismo criterio que usa el plan de tratamiento. */
export function formatearMoneda(valor: Decimal): string {
  return `Bs ${MONEDA.format(redondear(aNumero(valor)))}`;
}

/**
 * `YYYY-MM-DD` a `DD/MM/AAAA`.
 *
 * Se parte el texto en vez de usar `new Date(iso)`: ese constructor interpreta
 * la fecha como UTC y enVenezuela (UTC-4) un pago del 01/10 se veria el 30/09.
 */
export function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-");
  if (!anio || !mes || !dia) return fecha;
  return `${dia}/${mes}/${anio}`;
}

/** Hoy en hora local, para el `default` del campo de fecha. */
export function hoyIso(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}
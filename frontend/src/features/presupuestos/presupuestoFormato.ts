/**
 * Presentación de presupuestos: moneda y fechas.
 *
 * Vive aparte de `calculoTotal.ts` porque allí solo hay aritmética y aquí hay
 * formato de pantalla. Existe para que el formulario, la lista y el resumen
 * muestren las cifras igual: tres copias del `toLocaleString` es la forma rápida
 * de que el subtotal y el total terminen distintos.
 */

import { aNumero, redondear } from "./calculoTotal.ts";
import type { Decimal, EstadoPresupuesto } from "./tipos.ts";

/** Los montos son NUMERIC(10,2): siempre dos decimales. */
const MONEDA = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `Bs 1.234,50`. Mismo criterio que el plan de tratamiento y el módulo 09. */
export function formatearMoneda(valor: Decimal): string {
  return `Bs ${MONEDA.format(redondear(aNumero(valor)))}`;
}

/**
 * `YYYY-MM-DD` a `DD/MM/AAAA`. Devuelve `—` si no hay fecha.
 *
 * Se parte el texto en vez de usar `new Date(iso)`: ese constructor interpreta
 * la fecha como UTC y en Venezuela (UTC-4) un presupuesto del 01/10 se vería el
 * 30/09.
 */
export function formatearFecha(fecha: string | null): string {
  if (!fecha) return "—";
  const [anio, mes, dia] = fecha.split("-");
  if (!anio || !mes || !dia) return fecha;
  return `${dia}/${mes}/${anio}`;
}

/** Hoy en hora local, para el `default` del campo `válido hasta`. */
export function hoyIso(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

/** Etiqueta legible de cada estado, para tablas y encabezados. */
export const ETIQUETA_ESTADO: Record<EstadoPresupuesto, string> = {
  borrador: "Borrador",
  enviado: "Enviado",
  aceptado: "Aceptado",
  rechazado: "Rechazado",
};

/** Acción de avance del ciclo de vida, con el peso visual que le corresponde. */
export interface AccionEstado {
  hacia: EstadoPresupuesto;
  etiqueta: string;
  tone: "primary" | "secondary" | "danger";
}

/**
 * Avances permitidos desde un estado, para que la tabla pinte los botones.
 *
 * Se apoya en la misma regla que valida el servicio (`transicionValida`): los
 * estados no retroceden. Por eso la UI nunca ofrece un botón que el servicio
 * rechazaría; el ciclo de vida se vive igual en pantalla y en la base. Un
 * `rechazado` es terminal.
 */
export function transicionesDisponibles(estado: EstadoPresupuesto): AccionEstado[] {
  if (estado === "borrador") {
    return [{ hacia: "enviado", etiqueta: "Enviar", tone: "secondary" }];
  }
  if (estado === "enviado") {
    return [
      { hacia: "aceptado", etiqueta: "Aceptar", tone: "primary" },
      { hacia: "rechazado", etiqueta: "Rechazar", tone: "danger" },
    ];
  }
  return [];
}

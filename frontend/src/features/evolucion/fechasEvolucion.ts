/**
 * Fechas del módulo 06 Evolución Clínica.
 *
 * `fecha_consulta` y `proxima_atencion` son columnas DATE: Supabase las
 * devuelve como `YYYY-MM-DD`, sin zona horaria. `new Date("2026-10-03")` lo
 * interpreta como medianoche *UTC*, que en buena parte de América es la tarde
 * anterior: la línea de tiempo acabaría mostrando el día equivocado. Aquí el
 * texto se descompone a mano y se construye una fecha en hora local.
 *
 * Solo lógica pura: se puede probar con `node --test` sin React ni navegador.
 */

import type { EvolucionClinica } from "./tipos.ts";

const ISO_CORTA = /^(\d{4})-(\d{2})-(\d{2})$/;

const OPCIONES_CORTA: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
};

const OPCIONES_LARGA: Intl.DateTimeFormatOptions = {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
};

/** Partes de una fecha ya partida en hora local, listas para pintar. */
export interface TrozosFecha {
  /** Día de dos dígitos, tal como aparece en la columna. */
  dia: string;
  /** Mes abreviado en español ("ene", "feb"…). */
  mes: string;
  /** Año de cuatro dígitos. */
  anio: string;
  /** Fecha larga en español, para el `title` y los lectores de pantalla. */
  etiqueta: string;
  /** `true` si la fecha es el día de hoy en la zona horaria del navegador. */
  hoy: boolean;
}

/** `YYYY-MM-DD` del día local actual. Es lo que se envía como `fechaConsulta`. */
export function hoyEnIso(ahora: Date = new Date()): string {
  const anio = `${ahora.getFullYear()}`.padStart(4, "0");
  const mes = `${ahora.getMonth() + 1}`.padStart(2, "0");
  const dia = `${ahora.getDate()}`.padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

/**
 * `YYYY-MM-DD` -> `Date` en hora local.
 * Devuelve `null` si el texto no es una fecha del calendario (mes 13, 31 de
 * febrero, formato `03/10/2026`…). Nunca devuelve una `Date` inválida.
 */
export function fechaDesdeIso(valor: string): Date | null {
  const partes = ISO_CORTA.exec(valor.trim());
  if (!partes) return null;
  const anio = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const fecha = new Date(anio, mes - 1, dia);
  // `new Date(2026, 1, 31)` desborda al 3 de marzo. Si los tres números no
  // sobreviven a la construcción, la fecha no existía.
  if (
    fecha.getFullYear() !== anio ||
    fecha.getMonth() !== mes - 1 ||
    fecha.getDate() !== dia
  ) {
    return null;
  }
  return fecha;
}

/** `true` solo si el texto es un `YYYY-MM-DD` que existe en el calendario. */
export function esFechaIso(valor: string): boolean {
  return fechaDesdeIso(valor) !== null;
}

/** Piezas sueltas de la fecha, o `null` si el texto no se puede interpretar. */
export function trozosDeFecha(valor: string | null): TrozosFecha | null {
  if (!valor) return null;
  const fecha = fechaDesdeIso(valor);
  if (!fecha) return null;
  const dia = `${fecha.getDate()}`.padStart(2, "0");
  const anio = `${fecha.getFullYear()}`.padStart(4, "0");
  return {
    dia,
    mes: fecha.toLocaleDateString("es", { month: "short" }).replace(".", ""),
    anio,
    etiqueta: fecha.toLocaleDateString("es", OPCIONES_LARGA),
    hoy: fecha.getFullYear() === new Date().getFullYear()
      && fecha.getMonth() === new Date().getMonth()
      && fecha.getDate() === new Date().getDate(),
  };
}

/**
 * Fecha corta en español ("3 oct 2026"). Si el texto no se puede interpretar
 * se devuelve tal cual: es preferible mostrar `2026-13-40` a inventar una fecha
 * o a imprimir "Invalid Date" en la historia clínica de un paciente.
 */
export function formatearFechaCorta(valor: string | null): string {
  if (!valor) return "Sin fecha";
  const fecha = fechaDesdeIso(valor);
  if (!fecha) return valor.trim();
  return fecha.toLocaleDateString("es", OPCIONES_CORTA);
}

/** Fecha larga en español ("viernes, 3 de octubre de 2026"). */
export function formatearFechaLarga(valor: string | null): string {
  if (!valor) return "Sin fecha";
  const fecha = fechaDesdeIso(valor);
  if (!fecha) return valor.trim();
  return fecha.toLocaleDateString("es", OPCIONES_LARGA);
}

/** `true` si la fecha indicada es hoy en hora local. */
export function esHoy(valor: string | null): boolean {
  return trozosDeFecha(valor)?.hoy === true;
}

/**
 * Orden cronológico descendente: la atención más reciente primero.
 *
 * `YYYY-MM-DD` se compara como texto de forma válida porque los dígitos van en
 * orden de magnitud. El desempate por `creado_en` mantiene un orden estable
 * entre dos evoluciones del mismo día, y el id evita que la lista reordene sin
 * motivo al guardar otra fila.
 */
export function compararEvoluciones(a: EvolucionClinica, b: EvolucionClinica): number {
  if (a.fechaConsulta !== b.fechaConsulta) return a.fechaConsulta < b.fechaConsulta ? 1 : -1;
  if (a.creadoEn !== b.creadoEn) return a.creadoEn < b.creadoEn ? 1 : -1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? 1 : -1;
}

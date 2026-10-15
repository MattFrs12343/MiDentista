/**
 * Cálculos del panel de recepción (T-13.3, US-13.2).
 *
 * Lógica pura, sin React ni Supabase, para poder probarla con `node --test`.
 *
 * Reutiliza la aritmética de los módulos de los que depende T-13.3 en vez de
 * reimplementarla:
 *   - Módulo 07 (Agenda): `citasDeFecha` y `estadisticasDelDia` deciden qué es
 *     una cita del día y cuál es el total. Si el panel contara por su cuenta,
 *     mostraría cifras distintas a las de la agenda.
 *   - Módulo 09 (Pagos): `aNumero`/`redondear` normalizan los NUMERIC(10,2).
 *
 * Alcance por rol (README del módulo): el recepcionista ve la agenda y las
 * deudas de su clínica, no la historia clínica. El recorte real lo aplica RLS;
 * aquí solo se agrega lo que ya llegó autorizado, sin filtrar por UI.
 */

import type { Cita, EstadoCita } from "@/types";
import { citasDeFecha, estadisticasDelDia } from "../agenda/agenda.ts";
import { aNumero, redondear } from "../pagos/pagoCalculo.ts";
import type { Decimal } from "../pagos/tipos.ts";
import type { Indicador } from "./tipos";

/** Conteo por estado del día más el total que cuenta ocupación (sin canceladas). */
export type ConteoEstadosDia = Record<EstadoCita, number> & { total: number };

/** Citas de un día, ordenadas por hora. Delega en la agenda del módulo 07. */
export function citasDelDia(citas: readonly Cita[], fecha: string): Cita[] {
  return citasDeFecha([...citas], fecha);
}

/** Conteo por estado del día. `total` excluye canceladas (ver módulo 07). */
export function resumenDelDia(citas: readonly Cita[], fecha: string): ConteoEstadosDia {
  return estadisticasDelDia([...citas], fecha);
}

/**
 * Pacientes con al menos una cita no cancelada ese día, sin repetir y en el
 * orden de su primera cita. Una cita cancelada no cuenta: ese paciente no viene.
 */
export function pacientesDelDia(citas: readonly Cita[], fecha: string): string[] {
  const vistos = new Set<string>();
  const ids: string[] = [];
  for (const cita of citasDelDia(citas, fecha)) {
    if (cita.estado === "cancelada") continue;
    if (vistos.has(cita.pacienteId)) continue;
    vistos.add(cita.pacienteId);
    ids.push(cita.pacienteId);
  }
  return ids;
}

/** Suma de los montos pendientes. Reutiliza la aritmética del módulo 09. */
export function totalPendiente(pagos: readonly { monto: Decimal }[]): number {
  return redondear(pagos.reduce((acc, pago) => acc + aNumero(pago.monto), 0));
}

/**
 * Tarjetas de flujo del día para el recepcionista.
 *
 * Solo incluye métricas con fuente real: las citas y los pacientes salen del
 * store (agenda ya cargada) y los pagos pendientes del servicio del módulo.
 * No inventa ingresos ni ocupación: no hay fuente para esas cifras todavía.
 */
export function indicadoresRecepcion({
  resumen,
  pacientes,
  pagosPendientes,
}: {
  resumen: ConteoEstadosDia;
  pacientes: number;
  pagosPendientes: number;
}): Indicador[] {
  return [
    {
      id: "citas-hoy",
      etiqueta: "Citas de hoy",
      valor: String(resumen.total),
      icono: "CalendarDots",
      tono: "blue",
    },
    {
      id: "citas-confirmadas",
      etiqueta: "Confirmadas",
      valor: String(resumen.confirmada),
      icono: "CalendarCheck",
      tono: "green",
    },
    {
      id: "citas-por-confirmar",
      etiqueta: "Por confirmar",
      valor: String(resumen.reservada),
      icono: "ClipboardText",
      tono: "yellow",
    },
    {
      id: "pacientes-hoy",
      etiqueta: "Pacientes del día",
      valor: String(pacientes),
      icono: "UsersThree",
      tono: "violet",
    },
    {
      id: "pagos-pendientes",
      etiqueta: "Pagos pendientes",
      valor: String(pagosPendientes),
      icono: "CurrencyCircleDollar",
      tono: "red",
    },
  ];
}

/**
 * Cálculos del panel del odontólogo administrador (rol `odontologo_admin`).
 *
 * Lógica pura, sin React ni Supabase, para poder probarla con `node --test`.
 *
 * Este panel es DISTINTO al del superadmin (US-13.1). El superadmin (rol
 * `superadmin`, sin clínica) audita el sistema ENTERO: cuántas clínicas y
 * usuarios hay. El `odontologo_admin` gestiona UNA sola clínica —la suya— y su
 * panel resume pacientes, agenda, tratamientos y actividad clínica de esa
 * clínica. No debe mostrar datos de otras clínicas ni repetir la vista global
 * del superadmin.
 *
 * No reimplementa la aritmética del día: delega en `recepcionResumen.ts`, que a
 * su vez usa la agenda del módulo 07 (`citasDeFecha`, `estadisticasDelDia`). Si
 * el panel contara por su cuenta, mostraría cifras distintas a las de la agenda.
 */

import type { Cita } from "@/types";
import type { Indicador } from "./tipos";
import {
  citasDelDia,
  pacientesDelDia,
  resumenDelDia,
  type ConteoEstadosDia,
} from "./recepcionResumen.ts";

/** Actividad del día de la clínica, ya resumida por el módulo de agenda. */
export interface ActividadAdmin {
  /** Citas del día, ordenadas por hora. */
  citasHoy: Cita[];
  /** Conteo por estado; `total` excluye canceladas (criterio del módulo 07). */
  resumen: ConteoEstadosDia;
  /** Pacientes distintos con al menos una cita no cancelada hoy. */
  pacientes: number;
}

/** Resumen del día para el panel: citas, conteo por estado y pacientes únicos. */
export function resumenActividadAdmin(citas: readonly Cita[], fecha: string): ActividadAdmin {
  return {
    citasHoy: citasDelDia(citas, fecha),
    resumen: resumenDelDia(citas, fecha),
    pacientes: pacientesDelDia(citas, fecha).length,
  };
}

/**
 * Estado de la cifra de un indicador de tratamiento.
 *
 * `bloqueado` cubre tanto error como falta de permiso: en los dos casos no hay
 * un número que mostrar y no se inventa un cero. La distinción fina entre error
 * y `sinPermiso` la resuelve `DashboardEmptyState` en el propio panel.
 */
export type EstadoCifra = "listo" | "cargando" | "bloqueado";

/** Formatea una cifra según su estado de carga, sin convertir un fallo en cero. */
function cifra(n: number, estado: EstadoCifra): string {
  if (estado === "cargando") return "…";
  if (estado === "bloqueado") return "—";
  return String(n);
}

/**
 * Tarjetas de la clínica con fuente real: pacientes y citas del día salen del
 * store (ya cargado bajo RLS por clínica). No incluye ingresos ni ocupación:
 * esas cifras no tienen fuente autorizada todavía (ver `SECCIONES_PENDIENTES`).
 */
export function indicadoresActividadAdmin({
  pacientes,
  citasHoy,
}: {
  pacientes: number;
  citasHoy: number;
}): Indicador[] {
  return [
    {
      id: "pacientes-registrados",
      etiqueta: "Pacientes registrados",
      valor: String(pacientes),
      icono: "UsersThree",
      tono: "blue",
    },
    {
      id: "citas-hoy",
      etiqueta: "Citas de hoy",
      valor: String(citasHoy),
      icono: "CalendarDots",
      tono: "green",
    },
  ];
}

/**
 * Tarjetas de tratamientos activos y pendientes de la clínica.
 *
 * Cuenta planes por su estado REAL (el store no expone `estado`, así que la
 * cifra viene de `useTratamientosClinica`). Mientras carga o si no hay permiso,
 * el valor se muestra como `…` o `—` en vez de un cero engañoso.
 */
export function indicadoresTratamientos(
  activos: number,
  pendientes: number,
  estado: EstadoCifra,
): Indicador[] {
  return [
    {
      id: "tratamientos-activos",
      etiqueta: "Tratamientos activos",
      valor: cifra(activos, estado),
      icono: "Tooth",
      tono: "violet",
    },
    {
      id: "tratamientos-pendientes",
      etiqueta: "Tratamientos pendientes",
      valor: cifra(pendientes, estado),
      icono: "ClipboardText",
      tono: "yellow",
    },
  ];
}

/** Una métrica del panel que todavía no tiene fuente autorizada. */
export interface SeccionPendiente {
  id: string;
  titulo: string;
  detalle: string;
}

/**
 * Métricas que el placeholder prometía (ocupación, ingresos y deuda) y que NO se
 * muestran porque hoy no hay una lectura acotada a la clínica.
 *
 * No se calculan ni se estiman: un número inventado en un panel de gestión es
 * peor que la ausencia del número. Esto no es una restricción de seguridad
 * simulada en la interfaz: es que la fuente de datos para acotarla no existe
 * todavía (lo corrige Matías en la base).
 */
export const SECCIONES_PENDIENTES: readonly SeccionPendiente[] = [
  {
    id: "ocupacion",
    titulo: "Ocupación",
    detalle:
      "Falta cruzar la capacidad de la agenda con las citas reservadas de la clínica. Los horarios se guardan por profesional y las citas están acotadas a cada odontólogo, así que todavía no hay una lectura de ocupación por clínica.",
  },
  {
    id: "ingresos",
    titulo: "Ingresos",
    detalle:
      "El módulo 09 (Pagos) todavía no expone una lectura acotada a la clínica: la tabla de pagos no está protegida por RLS, así que leerla podría mezclar clínicas. Pendiente de las políticas de Matías.",
  },
  {
    id: "deuda",
    titulo: "Deuda pendiente",
    detalle:
      "Igual que ingresos: el saldo por cobrar depende de pagos y presupuestos, que aún no tienen RLS por clínica, así que aún no se puede leer acotado a la clínica.",
  },
];

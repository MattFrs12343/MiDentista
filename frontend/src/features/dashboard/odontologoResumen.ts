/**
 * Cálculos del panel del odontólogo (T-13.4, US-13.3).
 *
 * Lógica pura, sin React ni Supabase, para poder probarla con `node --test`.
 *
 * Qué agrega:
 *   - La próxima actividad del odontólogo, a partir de las citas ya cargadas
 *     (store del módulo 07). Reutiliza `minutosDe` de la agenda para ordenar por
 *     hora; no reimplementa el parseo de "HH:MM".
 *   - El conteo de tratamientos por su estado REAL. El store (`useClinicaData`)
 *     NO expone `estado` de los planes ni de los procedimientos: su mapper
 *     `mapItemTratamiento` lo descarta y `PlanTratamiento`/`ItemTratamiento`
 *     (types) no lo tienen. Por eso el odontólogo lee el estado desde un
 *     servicio propio (`dashboardOdontologoService.ts`) y aquí solo se clasifica.
 *
 * Estados válidos (de `bd_5clinicas_midentista.sql`, tablas `planes_tratamiento`
 * y `procedimientos_tratamiento`), NO inventados:
 *   - plan:  propuesto | aceptado | en_proceso | completado | cancelado
 *   - ítem:  pendiente | en_proceso | completado | cancelado
 *
 * Se clasifica por el estado del PLAN ("tratamiento" = plan), no por el total de
 * sus ítems: contar ítems como "tratamientos activos" es justo el error a evitar.
 * El reparto cubre todos los estados no terminales, de modo que ningún
 * tratamiento vivo queda fuera de las dos tarjetas:
 *   - activos   = aceptado + en_proceso
 *   - pendientes = propuesto
 *   - (completado y cancelado son terminales y no se cuentan)
 *
 * Alcance por rol: el odontólogo debería ver solo SUS pacientes, pero RLS hoy
 * deja a cualquier odontólogo ver los de toda la clínica (README del módulo).
 * Esta lógica NO recorta en la UI: agrega lo que ya llegó autorizado; la deuda
 * de RLS la corrige Matías en la base, no el cliente.
 */

import type { Cita } from "@/types";
import { minutosDe } from "../agenda/agenda.ts";

/** Estados reales del plan de tratamiento (`planes_tratamiento.estado`). */
export type EstadoTratamiento =
  | "propuesto"
  | "aceptado"
  | "en_proceso"
  | "completado"
  | "cancelado";

/** Un plan está activo si fue aceptado o está en proceso. */
export const TRATAMIENTOS_ACTIVOS: readonly EstadoTratamiento[] = ["aceptado", "en_proceso"];

/** Un plan está pendiente mientras siga propuesto, sin aceptar. */
export const TRATAMIENTOS_PENDIENTES: readonly EstadoTratamiento[] = ["propuesto"];

/** Fila mínima de `planes_tratamiento` que necesita el resumen. */
export interface PlanFila {
  id: string;
  estado: string;
}

/** Fila mínima de `procedimientos_tratamiento` que necesita el resumen. */
export interface ProcedimientoFila {
  planTratamientoId: string;
}

export interface ResumenTratamientos {
  activos: number;
  pendientes: number;
  /** activos + pendientes: planes con al menos un procedimiento y estado vivo. */
  total: number;
}

/** Resumen en ceros, con referencias propias (no compartidas). */
export function crearResumenTratamientosVacio(): ResumenTratamientos {
  return { activos: 0, pendientes: 0, total: 0 };
}

/**
 * Clasifica los planes por su estado real.
 *
 * Un plan sin ningún procedimiento NO cuenta: `obtenerOCrearPlanRow` crea una
 * fila de plan (con estado `propuesto` por defecto) apenas se abre la ficha, así
 * que contar planes vacíos inflaría los "pendientes" con tratamientos que no
 * existen. Solo entran los planes que tienen al menos un procedimiento.
 */
export function resumirTratamientos(
  planes: readonly PlanFila[],
  procedimientos: readonly ProcedimientoFila[],
): ResumenTratamientos {
  const conProcedimientos = new Set(procedimientos.map((p) => p.planTratamientoId));
  const resumen = crearResumenTratamientosVacio();

  for (const plan of planes) {
    if (!conProcedimientos.has(plan.id)) continue;
    const estado = plan.estado as EstadoTratamiento;
    if (TRATAMIENTOS_ACTIVOS.includes(estado)) resumen.activos++;
    else if (TRATAMIENTOS_PENDIENTES.includes(estado)) resumen.pendientes++;
  }

  resumen.total = resumen.activos + resumen.pendientes;
  return resumen;
}

/**
 * Próxima actividad: la primera cita viva (reservada o confirmada) que aún no
 * ocurrió, ordenada por fecha y, a igual día, por hora.
 *
 * `hora` es opcional y permite descartar la de hoy ya pasada cuando se conoce el
 * reloj (p. ej. "14:30"): una cita de hoy a las 09:00 deja de ser "próxima". Sin
 * `hora` se trabaja a nivel de día. Las citas `atendida` y `cancelada` no son
 * actividades futuras. Devuelve `null` si no hay ninguna.
 */
export function proximaActividad(
  citas: readonly Cita[],
  hoy: string,
  hora?: string,
): Cita | null {
  const ahora = hora ? minutosDe(hora) : null;

  const candidatas = citas
    .filter((c) => {
      if (c.estado !== "reservada" && c.estado !== "confirmada") return false;
      if (c.fechaCita < hoy) return false;
      if (c.fechaCita === hoy && ahora !== null && !Number.isNaN(ahora)) {
        if (minutosDe(c.horaInicio) < ahora) return false;
      }
      return true;
    })
    .sort(
      (a, b) =>
        a.fechaCita.localeCompare(b.fechaCita) ||
        minutosDe(a.horaInicio) - minutosDe(b.horaInicio) ||
        a.id.localeCompare(b.id),
    );

  return candidatas[0] ?? null;
}

/**
 * Lectura de tratamientos por estado para el panel del odontólogo (T-13.4).
 *
 * Por qué un servicio propio y no el store: `useClinicaData().planDe()` devuelve
 * `PlanTratamiento` (types), y ni ese tipo ni su mapper `mapItemTratamiento`
 * incluyen `estado`. AGENTS.md §4 pide que cada módulo traiga sus datos; el store
 * es archivo de integración (solo Matías). Por eso el módulo 13 lee el estado
 * directamente con su propio servicio, igual que `dashboardSuperadminService.ts`
 * (T-13.2) y `dashboardRecepcionService.ts` (T-13.3).
 *
 * No usa credenciales privilegiadas ni elude RLS: lee `public.planes_tratamiento`
 * y `public.procedimientos_tratamiento` con el cliente normal (`anon` + sesión).
 * El filtro por clínica lo aplica RLS. Un SELECT vacío puede deberse a RLS, no a
 * que no haya filas: por eso el error se propaga y el hook lo distingue de cero.
 *
 * DEUDA DE RLS (documentada, no corregida aquí): las políticas actuales dejan a
 * CUALQUIER odontólogo ver los planes de toda la clínica, aunque la entrevista
 * pide "cada odontólogo solo ve sus propios pacientes". No se recorta en la UI:
 * recortar en el cliente esconde el problema de permisos en vez de arreglarlo.
 * Lo corrige Matías en las políticas de Supabase.
 *
 * Las importaciones de runtime usan rutas relativas con extensión `.ts`, igual
 * que los otros servicios del módulo, para poder probarlas con `node --test`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { obtenerSupabase } from "../../lib/supabase.ts";
import {
  resumirTratamientos,
  type ResumenTratamientos,
} from "./odontologoResumen.ts";

interface PlanRow {
  id: string;
  estado: string;
}

interface ProcedimientoRow {
  plan_tratamiento_id: string;
}

/**
 * Resumen de tratamientos de la clínica por estado real del plan. Acepta un
 * cliente ya configurado para poder probarlo con un mock.
 *
 * Son dos lecturas necesarias para una sola respuesta (planes + qué planes
 * tienen procedimientos); no duplica lo que el store ya trae, porque el store no
 * expone el estado que estas tarjetas necesitan.
 */
export async function cargarTratamientosClinica(
  cliente?: SupabaseClient,
): Promise<ResumenTratamientos> {
  const supabase = cliente ?? obtenerSupabase();

  const planes = await supabase.schema("public").from("planes_tratamiento").select("id,estado");
  if (planes.error) {
    throw new Error(`No se pudieron consultar los planes de tratamiento: ${planes.error.message}`);
  }
  if (!planes.data) {
    throw new Error("Supabase no devolvió un resultado de planes válido.");
  }

  const procedimientos = await supabase
    .schema("public")
    .from("procedimientos_tratamiento")
    .select("plan_tratamiento_id");
  if (procedimientos.error) {
    throw new Error(
      `No se pudieron consultar los procedimientos de tratamiento: ${procedimientos.error.message}`,
    );
  }
  if (!procedimientos.data) {
    throw new Error("Supabase no devolvió un resultado de procedimientos válido.");
  }

  const planesFilas = planes.data as PlanRow[];
  const procedimientosFilas = procedimientos.data as ProcedimientoRow[];

  return resumirTratamientos(
    planesFilas.map((fila) => ({ id: fila.id, estado: fila.estado })),
    procedimientosFilas.map((fila) => ({ planTratamientoId: fila.plan_tratamiento_id })),
  );
}

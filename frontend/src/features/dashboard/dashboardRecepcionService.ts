/**
 * Lectura de pagos pendientes para el panel de recepción (T-13.3).
 *
 * El módulo 09 (Pagos) solo expone `cargarPagos(pacienteId)` (historial de un
 * paciente). El recepcionista necesita la lista transversal de su clínica, que
 * ningún servicio existente ofrece; por eso el módulo 13 usa su propio servicio
 * de solo lectura, igual que `dashboardSuperadminService.ts` (T-13.2) y como
 * pide AGENTS.md §4.
 *
 * No usa credenciales privilegiadas ni elude RLS: lee `public.pagos` con el
 * cliente normal (`anon` + sesión). El filtro por clínica lo aplica RLS; aquí
 * solo se piden los pagos en estado `pendiente`. Un SELECT vacío puede deberse
 * a RLS, no a que no existan pagos: por eso el error se propaga y el hook lo
 * distingue de un cero real.
 *
 * Reutiliza el tipo `Pago` y el mapper `pagoDesdeFila` del módulo 09 en vez de
 * duplicar la traducción de la fila.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { obtenerSupabase } from "../../lib/supabase.ts";
import { pagoDesdeFila, type PagoFila } from "../pagos/pagoMapper.ts";
import type { Pago } from "../pagos/tipos.ts";

const COLUMNAS =
  "id,clinica_id,paciente_id,presupuesto_id,monto,metodo_pago,fecha_pago,codigo_referencia,notas,estado,registrado_por,creado_en";

/**
 * Pagos en estado `pendiente` de la clínica del usuario, del más antiguo al más
 * reciente (lo viejo es lo que primero hay que cobrar). Acepta un cliente ya
 * configurado para poder probarlo con un mock.
 */
export async function cargarPagosPendientes(cliente?: SupabaseClient): Promise<Pago[]> {
  const supabase = cliente ?? obtenerSupabase();

  const { data, error } = await supabase
    .schema("public")
    .from("pagos")
    .select(COLUMNAS)
    .eq("estado", "pendiente")
    .order("fecha_pago", { ascending: true });

  if (error) {
    throw new Error(`No se pudieron cargar los pagos pendientes: ${error.message}`);
  }
  if (!data) {
    throw new Error("Supabase no devolvió un resultado de pagos válido.");
  }
  return data.map((fila) => pagoDesdeFila(fila as PagoFila));
}

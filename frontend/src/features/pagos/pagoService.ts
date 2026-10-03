import type { SupabaseClient } from "@supabase/supabase-js";
import { obtenerSupabase } from "../../lib/supabase.ts";
import { totalConfirmado } from "./pagoCalculo.ts";
import {
  esUuid,
  pagoDesdeFila,
  pagoParaCambiarEstado,
  pagoParaGuardar,
  type PagoFila,
} from "./pagoMapper.ts";
import type { Decimal, EstadoCuenta, EstadoPago, Pago } from "./tipos.ts";

const COLUMNAS =
  "id,clinica_id,paciente_id,presupuesto_id,monto,metodo_pago,fecha_pago,codigo_referencia,notas,estado,registrado_por,creado_en";

function exigirUuid(valor: string, campo: string) {
  if (!esUuid(valor)) {
    throw new Error(`${campo} debe ser un UUID real de Supabase; no se admiten IDs de demo.`);
  }
}

function tabla(cliente: SupabaseClient) {
  return cliente.schema("public").from("pagos");
}

/**
 * Historial de pagos de un paciente (US-9.5).
 *
 * Un array vacio puede deberse a RLS, no a que el paciente no haya pagado.
 */
export async function cargarPagos(
  pacienteId: string,
  cliente?: SupabaseClient,
): Promise<Pago[]> {
  exigirUuid(pacienteId, "pacienteId");
  const { data, error } = await tabla(cliente ?? obtenerSupabase())
    .select(COLUMNAS)
    .eq("paciente_id", pacienteId)
    .order("fecha_pago", { ascending: false });

  if (error) throw new Error(`No se pudieron cargar los pagos: ${error.message}`);
  if (!data) throw new Error("Supabase no devolvio un resultado de consulta valido.");
  return data.map((fila) => pagoDesdeFila(fila as PagoFila));
}

/**
 * Registra un pago (US-9.4). Lo hace recepción, no el odontólogo, y por eso
 * `registradoPor` es obligatorio: queda quien cobró.
 */
export async function registrarPago(pago: Pago, cliente?: SupabaseClient): Promise<Pago> {
  exigirUuid(pago.clinicaId, "clinicaId");
  exigirUuid(pago.pacienteId, "pacienteId");
  if (!pago.registradoPor) {
    throw new Error("Un pago necesita registrar quien lo cobro (registradoPor).");
  }
  exigirUuid(pago.registradoPor, "registradoPor");

  const { data, error } = await tabla(cliente ?? obtenerSupabase())
    .insert(pagoParaGuardar(pago))
    .select(COLUMNAS)
    .single();

  if (error) throw new Error(`No se pudo registrar el pago: ${error.message}`);
  if (!data) throw new Error("El pago no devolvio la fila guardada.");
  return pagoDesdeFila(data as PagoFila);
}

/** Confirma o rechaza un pago ya registrado (US-9.6). */
export async function cambiarEstadoPago(
  pago: Pago,
  estado: EstadoPago,
  cliente?: SupabaseClient,
): Promise<Pago | null> {
  exigirUuid(pago.id, "id");
  exigirUuid(pago.clinicaId, "clinicaId");

  const { data, error } = await tabla(cliente ?? obtenerSupabase())
    .update(pagoParaCambiarEstado(estado))
    .eq("id", pago.id)
    .eq("clinica_id", pago.clinicaId)
    .select(COLUMNAS)
    .maybeSingle();

  if (error) throw new Error(`No se pudo actualizar el pago: ${error.message}`);
  if (!data) return null;
  return pagoDesdeFila(data as PagoFila);
}

/**
 * Estado de cuenta del paciente (US-9.7, T-9.7).
 *
 * `totalPresupuestado` lo calcula quien tenga el presupuesto (modulo 08) y se
 * pasa como numero. Este modulo no importa nada de `features/presupuestos/`
 * para que 08 y 09 puedan avanzar en paralelo sin bloquearse.
 *
 * `saldoPendiente` usa solo los pagos `confirmado`: un pago `pendiente` no es
 * dinero recibido y uno `rechazado` nunca lo fue.
 */
export function calcularEstadoCuenta(
  pacienteId: string,
  pagos: readonly Pago[],
  totalPresupuestado: Decimal,
): EstadoCuenta {
  const totalPagado = totalConfirmado(pagos);
  const presupuestado = Number(totalPresupuestado ?? 0) || 0;
  return {
    pacienteId,
    totalPagado,
    totalPresupuestado: presupuestado,
    saldoPendiente: Math.max(0, Math.round((presupuestado - totalPagado) * 100) / 100),
    pagos: [...pagos],
  };
}

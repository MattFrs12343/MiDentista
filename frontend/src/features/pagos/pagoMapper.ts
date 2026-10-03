import type { Decimal, EstadoPago, MetodoPago, Pago } from "./tipos.ts";
import { ESTADOS_PAGO, METODOS_PAGO } from "./tipos.ts";

/** Fila de `public.pagos`. */
export interface PagoFila {
  id: string;
  clinica_id: string;
  paciente_id: string;
  presupuesto_id: string | null;
  monto: Decimal;
  metodo_pago: string | null;
  fecha_pago: string | null;
  codigo_referencia: string | null;
  notas: string | null;
  estado: string | null;
  registrado_por: string | null;
  creado_en: string | null;
}

/**
 * Solo lo que la UI escribe. `id` y `creado_en` los pone la base: mandarlos
 * como null anularía sus valores por defecto.
 */
export type PagoPayload = Omit<PagoFila, "id" | "creado_en">;

export function esUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);
}

/** Un valor fuera del `check` se degrada a `confirmado`, que es el default. */
function metodoDesdeTexto(valor: string | null): MetodoPago {
  return METODOS_PAGO.find((m) => m === valor) ?? "efectivo";
}

function estadoDesdeTexto(valor: string | null): EstadoPago {
  return ESTADOS_PAGO.find((e) => e === valor) ?? "confirmado";
}

export function pagoDesdeFila(fila: PagoFila): Pago {
  return {
    id: fila.id,
    clinicaId: fila.clinica_id,
    pacienteId: fila.paciente_id,
    presupuestoId: fila.presupuesto_id,
    monto: fila.monto,
    metodoPago: metodoDesdeTexto(fila.metodo_pago),
    fechaPago: fila.fecha_pago ?? new Date().toISOString().slice(0, 10),
    codigoReferencia: fila.codigo_referencia,
    notas: fila.notas ?? "",
    estado: estadoDesdeTexto(fila.estado),
    registradoPor: fila.registrado_por,
    creadoEl: fila.creado_en ?? "",
  };
}

export function pagoParaGuardar(pago: Pago): PagoPayload {
  return {
    clinica_id: pago.clinicaId,
    paciente_id: pago.pacienteId,
    presupuesto_id: pago.presupuestoId,
    monto: pago.monto,
    metodo_pago: pago.metodoPago,
    fecha_pago: pago.fechaPago,
    codigo_referencia: pago.codigoReferencia,
    notas: pago.notas,
    estado: pago.estado,
    registrado_por: pago.registradoPor,
  };
}

/** Solo el estado, para confirmar o rechazar un pago ya registrado. */
export function pagoParaCambiarEstado(estado: EstadoPago): Pick<PagoPayload, "estado"> {
  return { estado };
}

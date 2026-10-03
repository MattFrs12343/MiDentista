import type { EvolucionClinica, EvolucionNueva } from "./tipos.ts";

/** Fila de `public.evoluciones_clinicas` tal como la devuelve Supabase. */
export interface EvolucionClinicaFila {
  id: string;
  clinica_id: string;
  paciente_id: string;
  odontologo_id: string;
  plan_tratamiento_id: string | null;
  procedimiento_id: string | null;
  numero_pieza: number | null;
  fecha_consulta: string | null;
  motivo_consulta: string | null;
  procedimiento_realizado: string | null;
  observaciones: string | null;
  indicaciones: string | null;
  proxima_atencion: string | null;
  creado_en: string | null;
}

/** Solo los campos que la UI escribe. El resto los pone la BD. */
export type EvolucionPayload = Omit<
  EvolucionClinicaFila,
  "id" | "creado_en"
>;

/**
 * Los ids de la demo (`p1`, `p_...`) no son UUIDs. Si se dejaran pasar, la
 * consulta fallaria en red por una causa que no es un bug de permisos, y el
 * error seria muy dificil de leer.
 */
export function esUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);
}

function texto(valor: string | null): string {
  return valor ?? "";
}

/** `fecha_consulta` tiene default CURRENT_DATE, pero una fila vieja puede venir null. */
function fecha(valor: string | null): string {
  return valor ?? new Date().toISOString().slice(0, 10);
}

export function evolucionDesdeFila(fila: EvolucionClinicaFila): EvolucionClinica {
  return {
    id: fila.id,
    clinicaId: fila.clinica_id,
    pacienteId: fila.paciente_id,
    odontologoId: fila.odontologo_id,
    planTratamientoId: fila.plan_tratamiento_id,
    procedimientoId: fila.procedimiento_id,
    numeroPieza: fila.numero_pieza,
    fechaConsulta: fecha(fila.fecha_consulta),
    motivoConsulta: texto(fila.motivo_consulta),
    procedimientoRealizado: texto(fila.procedimiento_realizado),
    observaciones: texto(fila.observaciones),
    indicaciones: texto(fila.indicaciones),
    proximaAtencion: fila.proxima_atencion,
    creadoEn: fila.creado_en ?? "",
  };
}

/** Fila a insertar para una evolucion que aun no existe (T-6.3). */
export function evolucionParaGuardar(
  nueva: EvolucionNueva,
  clinicaId: string,
): EvolucionPayload {
  return {
    clinica_id: clinicaId,
    paciente_id: nueva.pacienteId,
    odontologo_id: nueva.odontologoId,
    plan_tratamiento_id: nueva.planTratamientoId ?? null,
    procedimiento_id: nueva.procedimientoId ?? null,
    numero_pieza: nueva.numeroPieza ?? null,
    fecha_consulta: nueva.fechaConsulta,
    motivo_consulta: nueva.motivoConsulta,
    procedimiento_realizado: nueva.procedimientoRealizado,
    observaciones: nueva.observaciones,
    indicaciones: nueva.indicaciones,
    proxima_atencion: nueva.proximaAtencion ?? null,
  };
}

/** Fila completa para el UPDATE. No se envia `id` ni `creado_en`. */
export function evolucionParaActualizar(
  evolucion: EvolucionClinica,
): EvolucionPayload {
  return {
    clinica_id: evolucion.clinicaId,
    paciente_id: evolucion.pacienteId,
    odontologo_id: evolucion.odontologoId,
    plan_tratamiento_id: evolucion.planTratamientoId,
    procedimiento_id: evolucion.procedimientoId,
    numero_pieza: evolucion.numeroPieza,
    fecha_consulta: evolucion.fechaConsulta,
    motivo_consulta: evolucion.motivoConsulta,
    procedimiento_realizado: evolucion.procedimientoRealizado,
    observaciones: evolucion.observaciones,
    indicaciones: evolucion.indicaciones,
    proxima_atencion: evolucion.proximaAtencion,
  };
}

/** Indica si la evolucion pide una proxima atencion pendiente de agendar (T-6.5). */
export function tieneProximaAtencion(evolucion: EvolucionClinica): boolean {
  return evolucion.proximaAtencion !== null && evolucion.proximaAtencion !== "";
}

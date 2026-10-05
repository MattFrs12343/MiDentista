import type {
  EstadoPlan,
  EstadoProcedimiento,
  PlanTratamiento,
  ProcedimientoTratamiento,
} from "./tipos.ts";

/**
 * Mapper de solo lectura de las tablas del modulo 05.
 *
 * Este módulo no escribe en `planes_tratamiento` ni en
 * `procedimientos_tratamiento`: las administra el modulo 05 (ver `README.md`).
 * Aquí solo se leen, para poder vincular una evolución a su plan (T-6.6).
 */

/** Fila de `public.planes_tratamiento` tal como la devuelve Supabase. */
export interface PlanTratamientoFila {
  id: string;
  clinica_id: string;
  paciente_id: string;
  odontologo_id: string;
  titulo: string | null;
  estado: string | null;
  /** `numeric` llega como texto en PostgREST; se acepta number por si cambia. */
  costo_total: number | string | null;
  notas: string | null;
  creado_en: string | null;
  actualizado_en: string | null;
}

/** Fila de `public.procedimientos_tratamiento`. */
export interface ProcedimientoTratamientoFila {
  id: string;
  clinica_id: string;
  plan_tratamiento_id: string;
  servicio_id: string | null;
  numero_pieza: number | null;
  descripcion: string;
  prioridad: string | null;
  costo: number | string | null;
  estado: string | null;
  creado_en: string | null;
}

const ESTADOS_PLAN: ReadonlySet<string> = new Set<EstadoPlan>([
  "propuesto",
  "aceptado",
  "en_proceso",
  "completado",
  "cancelado",
]);

const ESTADOS_PROCEDIMIENTO: ReadonlySet<string> = new Set<EstadoProcedimiento>([
  "pendiente",
  "en_proceso",
  "completado",
  "cancelado",
]);

/**
 * Un `estado` desconocido se devuelve como `null` en vez de inventarse uno.
 *
 * Las columnas tienen `check`, así que hoy el caso es `null` por DEFAULT ausente.
 * Si mañana alguien agrega un estado al `check`, la UI muestra "sin estado"
 * —que es cierto— en lugar de mentir con un valor equivocado.
 */
function estadoPlan(valor: string | null): EstadoPlan | null {
  return valor !== null && ESTADOS_PLAN.has(valor) ? (valor as EstadoPlan) : null;
}

function estadoProcedimiento(valor: string | null): EstadoProcedimiento | null {
  return valor !== null && ESTADOS_PROCEDIMIENTO.has(valor)
    ? (valor as EstadoProcedimiento)
    : null;
}

/** `numeric` puede venir como texto o como número; un valor ilegible es `null`. */
function numero(valor: number | string | null): number | null {
  if (valor === null) return null;
  const parsed = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(parsed) ? parsed : null;
}

export function planDesdeFila(fila: PlanTratamientoFila): PlanTratamiento {
  return {
    id: fila.id,
    clinicaId: fila.clinica_id,
    pacienteId: fila.paciente_id,
    odontologoId: fila.odontologo_id,
    titulo: fila.titulo,
    estado: estadoPlan(fila.estado),
    costoTotal: numero(fila.costo_total),
    notas: fila.notas,
    creadoEn: fila.creado_en,
    actualizadoEn: fila.actualizado_en,
  };
}

export function procedimientoDesdeFila(
  fila: ProcedimientoTratamientoFila,
): ProcedimientoTratamiento {
  return {
    id: fila.id,
    clinicaId: fila.clinica_id,
    planTratamientoId: fila.plan_tratamiento_id,
    servicioId: fila.servicio_id,
    numeroPieza: fila.numero_pieza,
    descripcion: fila.descripcion,
    prioridad:
      fila.prioridad === "urgente" || fila.prioridad === "alta" || fila.prioridad === "normal" || fila.prioridad === "baja"
        ? fila.prioridad
        : null,
    costo: numero(fila.costo),
    estado: estadoProcedimiento(fila.estado),
    creadoEn: fila.creado_en,
  };
}

/** Texto de un plan en la lista desplegable. `titulo` es nullable en la tabla. */
export function tituloDePlan(plan: PlanTratamiento): string {
  const titulo = plan.titulo?.trim() ?? "";
  return titulo !== "" ? titulo : "Plan sin título";
}

/** Etiqueta de un procedimiento: descripción y pieza, si la tiene. */
export function etiquetaDeProcedimiento(procedimiento: ProcedimientoTratamiento): string {
  const descripcion = procedimiento.descripcion.trim();
  const base = descripcion !== "" ? descripcion : "Procedimiento sin descripción";
  return procedimiento.numeroPieza !== null ? `${base} · pieza ${procedimiento.numeroPieza}` : base;
}

/**
 * Valor del desplegable cuando la atención no se imputa a ningún plan.
 *
 * Radix Select reserva la cadena vacía: pasarla lanzaría el error
 * "A <Select.Item /> must have a value prop that is not an empty string". Por eso
 * "sin plan" viaja como un centinela que se traduce a `null` al guardar.
 */
export const SIN_PLAN = "ninguno";

/** Traduce el valor del desplegable al id nullable de la columna. */
export function referenciaDesdeSeleccion(valor: string): string | null {
  return valor === SIN_PLAN ? null : valor;
}

/** Traduce el id nullable de la columna al valor del desplegable. */
export function seleccionDesdeReferencia(id: string | null): string {
  return id ?? SIN_PLAN;
}
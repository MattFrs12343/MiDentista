/**
 * Tipos propios del módulo 06 Evolución Clínica.
 *
 * NO van a `@/types`. Ese archivo es de integración y solo lo edita Matías
 * (ver AGENTS.md). Mantener los tipos aquí evita colisiones de merge.
 *
 * Tabla: `evoluciones_clinicas` (docs/DATABASE.md seccion 11).
 * Los nombres de columna se replican 1:1 para no traducir al hablar con la BD.
 */

/** Una evolucion clinica registrada en una consulta. */
export interface EvolucionClinica {
  id: string;
  clinicaId: string;
  pacienteId: string;
  odontologoId: string;
  /** Referencia opcional al item del plan de tratamiento (modulo 05). */
  planTratamientoId: string | null;
  /** Referencia opcional al procedimiento realizado (modulo 05). */
  procedimientoId: string | null;
  numeroPieza: number | null;
  /** `YYYY-MM-DD`, igual que la columna `fecha_consulta`. */
  fechaConsulta: string;
  motivoConsulta: string;
  procedimientoRealizado: string;
  observaciones: string;
  indicaciones: string;
  /** `YYYY-MM-DD`, igual que la columna `proxima_atencion`. */
  proximaAtencion: string | null;
  creadoEn: string;
}

/**
 * Contenido editable de una evolucion. Lo que la UI envia al guardar.
 * Los ids de la BD nunca se inventan: los aporta el flujo de integracion.
 */
export type EvolucionContenido = Omit<
  EvolucionClinica,
  "id" | "clinicaId" | "creadoEn"
>;

/** Una evolucion sin persistir todavia. */
export interface EvolucionNueva {
  clinicaId: string;
  pacienteId: string;
  odontologoId: string;
  planTratamientoId?: string | null;
  procedimientoId?: string | null;
  numeroPieza?: number | null;
  fechaConsulta: string;
  motivoConsulta: string;
  procedimientoRealizado: string;
  observaciones: string;
  indicaciones: string;
  proximaAtencion?: string | null;
}

/**
 * Estado del formulario de evolucion. Se separa del contenido para que la UI
 * pueda trabajar sobre un borrador sin tocar lo que ya esta guardado.
 */
export interface BorradorEvolucion {
  motivoConsulta: string;
  procedimientoRealizado: string;
  observaciones: string;
  indicaciones: string;
  proximaAtencion: string | null;
  numeroPieza: number | null;
  /**
   * Plan al que se atribuye esta atención (modulo 05). `null` cuando la consulta
   * no se imputa a ningún plan, que es el caso normal de una urgencia.
   */
  planTratamientoId: string | null;
  /** Procedimiento concreto del plan que se ejecutó, si se identificó cuál. */
  procedimientoId: string | null;
}

/**
 * Estados de `planes_tratamiento.estado`.
 *
 * La columna admite `null` (es nullable, tiene DEFAULT pero no NOT NULL), así
 * que el tipo de la fila incluye ese caso y la UI no inventa un estado.
 */
export type EstadoPlan = "propuesto" | "aceptado" | "en_proceso" | "completado" | "cancelado";

/** Estados de `procedimientos_tratamiento.estado`. Mismo criterio que arriba. */
export type EstadoProcedimiento = "pendiente" | "en_proceso" | "completado" | "cancelado";

/**
 * Plan de tratamiento del modulo 05, en solo lectura.
 *
 * Este módulo no escribe en `planes_tratamiento`: la propone y administra el
 * modulo 05 (ver `README.md`). Aquí solo se leen para vincular la evolución.
 */
export interface PlanTratamiento {
  id: string;
  clinicaId: string;
  pacienteId: string;
  odontologoId: string;
  titulo: string | null;
  estado: EstadoPlan | null;
  costoTotal: number | null;
  notas: string | null;
  creadoEn: string | null;
  actualizadoEn: string | null;
}

/** Procedimiento dentro de un plan, en solo lectura. */
export interface ProcedimientoTratamiento {
  id: string;
  clinicaId: string;
  planTratamientoId: string;
  servicioId: string | null;
  numeroPieza: number | null;
  descripcion: string;
  prioridad: "urgente" | "alta" | "normal" | "baja" | null;
  costo: number | null;
  estado: EstadoProcedimiento | null;
  creadoEn: string | null;
}

/** Filtros de la vista cronologica (T-6.4). */
export interface FiltroEvolucion {
  desde: string | null;
  hasta: string | null;
  soloPendientes: boolean;
}

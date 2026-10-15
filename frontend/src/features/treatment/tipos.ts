export type EstadoDiagnostico = "activo" | "inactivo" | "resuelto";

export interface DiagnosticoPaciente {
  id: string;
  pacienteId: string;
  clinicaId: string;
  odontologoId: string;
  numeroPieza: number | null;
  descripcion: string;
  observaciones: string;
  estado: EstadoDiagnostico;
  fechaDiagnostico: string | null;
  creadoEn: string | null;
  actualizadoEn: string | null;
}

export interface ContenidoDiagnostico {
  descripcion: string;
  numeroPieza: number | null;
  observaciones: string;
}

export interface DestinoDiagnostico {
  pacienteId: string;
  clinicaId: string;
  odontologoId: string;
}

export interface PerfilDiagnosticos {
  id: string;
  clinicaId: string | null;
  rol: string;
  activo: boolean;
}

export type EstadoPlanTratamiento = "propuesto" | "aceptado" | "en_proceso" | "completado" | "cancelado";

export interface PlanTratamientoPaciente {
  id: string;
  clinicaId: string;
  pacienteId: string;
  odontologoId: string;
  titulo: string | null;
  estado: EstadoPlanTratamiento;
  costoTotal: number;
  notas: string;
  creadoEn: string | null;
  actualizadoEn: string | null;
}

export interface ContenidoPlanTratamiento { titulo: string; notas: string }
export type DestinoPlanTratamiento = DestinoDiagnostico;

export type PrioridadProcedimiento = "urgente" | "alta" | "normal" | "baja";
export type EstadoProcedimiento = "pendiente" | "en_proceso" | "completado" | "cancelado";
export interface ProcedimientoTratamiento {
  id: string;
  clinicaId: string;
  planTratamientoId: string;
  servicioId: string | null;
  numeroPieza: number | null;
  descripcion: string;
  prioridad: PrioridadProcedimiento;
  costo: number;
  estado: EstadoProcedimiento;
  creadoEn: string | null;
  actualizadoEn: string | null;
}
export interface ContenidoProcedimiento {
  descripcion: string;
  numeroPieza: number | null;
  prioridad: PrioridadProcedimiento;
  costo: number;
  estado: EstadoProcedimiento;
}
export interface NuevoProcedimiento extends Omit<ContenidoProcedimiento, "estado"> { servicioId?: string | null }
export interface DestinoProcedimiento { planTratamientoId: string; clinicaId: string }

export type Role = "odontologo" | "odontologo_admin" | "recepcionista" | "paciente" | "superadmin";

export interface Sesion {
  nombre: string;
  rol: Role;
  /** null para superadmin: no pertenece a ninguna clínica, solo audita el sistema. */
  clinica: string | null;
  clinicaSlug?: string | null;
  ciudad?: string | null;
  email?: string;
  especialidad?: string | null;
}

export type Sexo = "femenino" | "masculino" | "otro";

export interface Paciente {
  id: string;
  nombres: string;
  apellidos: string;
  ci: string;
  fechaNacimiento: string;
  sexo: Sexo;
  telefono: string;
  email: string;
  direccion: string;
  /** Contacto de emergencia (US-2.5). Columnas `contacto_emergencia_*`. */
  contactoEmergenciaNombre?: string;
  contactoEmergenciaTelefono?: string;
  contactoEmergenciaParentesco?: string;
  creadoEl: string;
}

export interface Alergia {
  id: string;
  sustancia: string;
  severidad: "leve" | "moderada" | "grave";
}

export interface HistoriaClinica {
  pacienteId: string;
  motivoConsulta: string;
  antecedentesPersonales: string;
  antecedentesFamiliares: string;
  antecedentesOdontologicos: string;
  enfermedadesBase: string[];
  medicamentosActuales: string[];
  alergias: Alergia[];
  habitos: string[];
  observacionesGenerales: string;
  actualizadoEl?: string;
  actualizadoPor?: string;
}

export type CondicionDiente =
  | "sano"
  | "caries"
  | "obturado"
  | "corona"
  | "endodoncia"
  | "ausente"
  | "extraccion_indicada"
  | "implante";

export interface CondicionPieza {
  pieza: number;
  condicion: CondicionDiente;
  nota?: string;
  actualizadoEl: string;
}

export interface Diagnostico {
  id: string;
  descripcion: string;
  pieza?: number;
  registradoEl: string;
}

export type PrioridadTratamiento = "alta" | "media" | "baja";

export interface ItemTratamiento {
  id: string;
  procedimiento: string;
  pieza?: number;
  costoEstimado: number;
  prioridad: PrioridadTratamiento;
}

export interface PlanTratamiento {
  pacienteId: string;
  items: ItemTratamiento[];
  observaciones: string;
}

/**
 * Agenda. Estos tipos replican 1:1 las tablas `citas` y `horarios` de
 * `bd_5clinicas_midentista.sql` (lineas 219-246), incluidos los cuatro estados
 * del `check`, para que la vista no tenga que traducir nombres al hablar con la
 * base de datos.
 *
 * El ciclo de vida documentado en `docs/figuras_monografia/estado_cita.puml` es:
 * reservada -> confirmada -> atendida, con salida a cancelada desde reservada o
 * confirmada. Ningun estado vuelve hacia atras.
 */
export type EstadoCita = "reservada" | "confirmada" | "atendida" | "cancelada";

export interface Cita {
  id: string;
  pacienteId: string;
  /** fecha local en formato YYYY-MM-DD, igual que la columna `fecha_cita` */
  fechaCita: string;
  /** HH:MM en formato de 24 h, igual que `hora_inicio` */
  horaInicio: string;
  /** HH:MM en formato de 24 h, igual que `hora_fin` */
  horaFin: string;
  estado: EstadoCita;
  motivoConsulta: string;
  notas?: string;
}

/**
 * Disponibilidad semanal del odontologo. `diaSemana` usa la convencion de
 * `Date.getDay()` (0 domingo, 6 sabado), que es la misma que el `check
 * (dia_semana between 0 and 6)` de la tabla `horarios`.
 */
export interface Horario {
  id: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  activo: boolean;
}

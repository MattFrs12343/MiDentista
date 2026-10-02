export type Role = "odontologo" | "recepcionista" | "paciente";

export interface Sesion {
  nombre: string;
  rol: Role;
  clinica: string;
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

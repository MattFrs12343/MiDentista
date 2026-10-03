/**
 * Tipos propios del módulo 13 Dashboard.
 *
 * NO van a `@/types`: ese archivo es de integración y solo lo edita Matías
 * (ver AGENTS.md).
 *
 * Este módulo es el unico que es una matriz de roles: hay un dashboard distinto
 * para cada rol, y los indicadores de cada uno son distintos. Un dashboard
 * unico con todo mezclado no sirve para nadie.
 */

/** Roles que tienen dashboard propio (T-13.2 a T-13.5). */
export const ROLES_CON_DASHBOARD = [
  "superadmin",
  "odontologo_admin",
  "recepcionista",
  "odontologo",
  "paciente",
] as const;

export type RolConDashboard = (typeof ROLES_CON_DASHBOARD)[number];

/**
 * Tarjeta de indicador: el bloque con cifra grande que se repite en todos los
 * dashboards. `tono` decide el color, y se limita a los tonos que ya existen en
 * `components/ui/badge.tsx`: no inventes colores nuevos ni edites `index.css`.
 */
export type TonoIndicador = "neutral" | "blue" | "green" | "yellow" | "violet" | "red";

export interface Indicador {
  id: string;
  etiqueta: string;
  valor: string;
  /** Variación respecto al periodo anterior, si aplica. */
  delta?: string;
  deltaPositivo?: boolean;
  tono?: TonoIndicador;
  /** Icono de `@phosphor-icons/react`. Opcional: el bloque funciona sin él. */
  icono?: string;
}

/** Serie para un gráfico SVG simple. Puntos, no timestamps. */
export interface PuntoSerie {
  etiqueta: string;
  valor: number;
}

export interface SerieGrafica {
  id: string;
  titulo: string;
  puntos: readonly PuntoSerie[];
  unidad?: string;
}

/** Agenda del día (T-13.3 y T-13.4). */
export interface ResumenAgenda {
  total: number;
  reservadas: number;
  confirmadas: number;
  atendidas: number;
  canceladas: number;
  proximaCita: { horaInicio: string; pacienteId: string } | null;
}

/** Ingresos (T-13.2). Viene del módulo 09; aqui solo se presenta. */
export interface ResumenIngresos {
  total: number;
  porMetodo: readonly { metodo: string; monto: number }[];
}

/** Deuda de pacientes (T-13.3): lo que reception necesita ver. */
export interface PacienteConDeuda {
  pacienteId: string;
  saldoPendiente: number;
}

/**
 * Salud de la clínica (T-13.2). Los porcentajes van de 0 a 100 y se calculan
 * en el módulo que trae los datos, no aquí: este módulo presenta, no decide.
 */
export interface IndicadoresClinica {
  ocupacionPorcentaje: number;
  cancelacionPorcentaje: number;
  pacientesAtendidosMes: number;
}

/**
 * Qué dashboard ve cada rol.
 *
 * Es el contrato del módulo: cada entrada apunta a un componente distinto. Los
 * componentes los escribes tú en esta misma carpeta.
 */
export const DASHBOARD_POR_ROL: Record<RolConDashboard, string> = {
  superadmin: "DashboardSuperadmin",
  odontologo_admin: "DashboardAdmin",
  recepcionista: "DashboardRecepcion",
  odontologo: "DashboardOdontologo",
  paciente: "DashboardPaciente",
};

/** Un `SELECT` vacío puede deberse a RLS. La UI debe distinguirlo de "cero". */
export interface DatosDashboard<T> {
  valor: T;
  cargando: boolean;
  /** Relleno cuando el SELECT no devolvio filas y puede ser RLS. */
  sinPermiso: boolean;
  error: string | null;
}

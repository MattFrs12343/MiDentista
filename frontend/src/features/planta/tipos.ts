/**
 * Tipos propios de Planta de la clinica.
 *
 * NO van a `@/types`. Ese archivo es de integracion y solo lo edita Matias
 * (ver AGENTS.md seccion 2). Mantener los tipos aqui evita colisiones de merge.
 *
 * Tablas: `zonas_clinica` y la columna `citas.zona_id`, propuestas en
 * `docs/modules/planta-3d/sql.sql`.
 */

/**
 * Uso de una zona de la planta. El `check` de la columna `tipo` replica esta
 * lista: si se agrega un valor aqui, hay que agregarlo tambien alla.
 */
export type TipoZona =
  | "consultorio"
  | "esterilizacion"
  | "recepcion"
  | "sala_espera"
  | "laboratorio"
  | "almacen"
  | "administracion"
  | "pasillo"
  | "bano";

export const TIPOS_ZONA: readonly TipoZona[] = [
  "consultorio",
  "esterilizacion",
  "recepcion",
  "sala_espera",
  "laboratorio",
  "almacen",
  "administracion",
  "pasillo",
  "bano",
];

/** Etiqueta en el vocabulario del consultorio, no del codigo. */
export const ETIQUETA_TIPO: Record<TipoZona, string> = {
  consultorio: "Consultorio",
  esterilizacion: "Esterilización",
  recepcion: "Recepción",
  sala_espera: "Sala de espera",
  laboratorio: "Laboratorio",
  almacen: "Almacén",
  administracion: "Administración",
  pasillo: "Pasillo",
  bano: "Baño",
};

/**
 * Una zona de la planta, con su rectangulo en metros.
 *
 * El sistema de coordenadas es el de un plano visto desde arriba: `x` crece a
 * la derecha e `y` hacia abajo, con el origen en la esquina superior izquierda.
 * Se elige asi para que el rectangulo de la zona sea el mismo numero que el
 * `x`/`y`/`width`/`height` del SVG, sin invertir ningun eje al dibujar.
 *
 * La unidad es el metro porque la superficie de un consultorio se mide en
 * metros cuadrados y no en pixeles: un consultorio de 3.2 x 4.5 m son 14.4 m2.
 */
export interface Zona {
  id: string;
  clinicaId: string;
  nombre: string;
  tipo: TipoZona;
  /** Nivel de la planta. 0 es planta baja; util cuando la clinica tiene dos pisos. */
  piso: number;
  /** Metros desde el borde izquierdo del plano. */
  x: number;
  /** Metros desde el borde superior del plano. */
  y: number;
  ancho: number;
  alto: number;
  /** Cuantos profesionales pueden atender a la vez en la zona. */
  capacidad: number;
  /** Odontologo asignado a la zona, si la zona es un consultorio propio. */
  odontologoId: string | null;
  activa: boolean;
  /** Orden de lectura en planta y leyenda. */
  orden: number;
  notas: string;
  creadoEn?: string;
}

/** Contenido editable de una zona: lo que la UI envia al guardar. */
export type ZonaContenido = Omit<Zona, "id" | "clinicaId" | "creadoEn">;

/** Una zona todavia sin persistir. Los UUIDs los aporta el flujo de integracion. */
export interface ZonaNueva extends Omit<ZonaContenido, "odontologoId"> {
  odontologoId?: string | null;
}

/**
 * Como se ve la planta. El 2D es SVG puro y funciona siempre; el 3D es una
 * mejora opcional. Por eso no hay un tercer valor ni un estado intermedio:
 * si WebGL falla, se vuelve al 2D.
 */
export type ModoVista = "2d" | "3d";

/**
 * Ocupacion de una zona en el dia mostrado. Se calcula en `plantaAgenda.ts`;
 * aqui solo se declara la forma para que la vista no dependa de la agenda.
 */
export type NivelOcupacion = "libre" | "ocupada" | "llena";

/**
 * Cita tal como la necesita el plano.
 *
 * Es la `Cita` de `@/types` mas las dos columnas que dicen **en que zona se
 * atiende**: `odontologo_id` (de la tabla `citas`) y `zona_id` (columna nueva
 * propuesta en `docs/modules/planta-3d/sql.sql`). Sin ellas el plano no puede
 * saber que consultorio esta ocupado, y no se inventa el vinculo: la cita
 * queda como `sinZona` y la vista lo dice.
 */
export interface CitaDePlanta {
  id: string;
  pacienteId: string;
  odontologoId: string | null;
  zonaId: string | null;
  fechaCita: string;
  horaInicio: string;
  horaFin: string;
  estado: "reservada" | "confirmada" | "atendida" | "cancelada";
  motivoConsulta: string;
}
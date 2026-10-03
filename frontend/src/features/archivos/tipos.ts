/**
 * Tipos propios del módulo 10 Archivos e Imágenes.
 *
 * NO van a `@/types`: ese archivo es de integración y solo lo edita Matías
 * (ver AGENTS.md).
 *
 * Tabla: `archivos`. Estaba en la lista de tablas ELIMINADAS del MVP
 * (`docs/DATABASE.md`) y se ha reactivado para este sprint, asi que el DDL va
 * en `docs/modules/10-archivos/sql.sql`. NO edites
 * `bd_5clinicas_midentista.sql`: lo integra Matías.
 */

/** Formatos que se pueden previsualizar en la galería sin descargar. */
export const TIPOS_VISUALIZABLES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export type TipoVisualizable = (typeof TIPOS_VISUALIZABLES)[number];

/**
 * Categoría del archivo. Determina quién lo sube y quién lo ve:
 * `clinico` lo sube el odontólogo y lo ve el equipo médico; `administrativo` lo
 * sube recepción; `portal` lo sube el paciente y lo ve su clínica.
 */
export type CategoriaArchivo = "clinico" | "administrativo" | "portal";

export interface Archivo {
  id: string;
  clinicaId: string;
  pacienteId: string;
  /** Nombre original, solo para mostrar. La clave real del bucket es `ruta`. */
  nombre: string;
  /** Clave del objeto dentro del bucket de Storage. */
  ruta: string;
  mime: string;
  /** Bytes. */
  tamano: number;
  categoria: CategoriaArchivo;
  descripcion: string;
  subidoPor: string | null;
  creadoEl: string;
}

export type ArchivoNuevo = Omit<Archivo, "id" | "creadoEl" | "ruta">;

/** Una imagen ya resuelta para pintar en la galería. */
export interface ArchivoVisualizable extends Archivo {
  /** URL firmada o pública. Se genera al cargar la galería, no se guarda. */
  url: string;
}

export function esVisualizable(mime: string): mime is TipoVisualizable {
  return TIPOS_VISUALIZABLES.some((tipo) => tipo === mime);
}

/**
 * `US-10.x`: la galería ordena por fecha, más reciente primero. El DDL ya tiene
 * `creado_en`, pero el índice ayuda porque la consulta siempre viene filtrada
 * por paciente.
 */
export const ORDEN_GALERIA = "creado_el desc";

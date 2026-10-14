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
 * Ámbito/origen del archivo. Los permisos efectivos los determina la RLS,
 * no esta etiqueta por sí sola.
 */
export type CategoriaArchivo = "clinico" | "administrativo" | "portal";

export type TipoArchivo = "fotografia" | "radiografia" | "documento";
export type TipoImagen = "fotografia" | "radiografia";

export type AsociacionArchivo =
  | { tipo: "general" }
  | { tipo: "evolucion"; evolucionClinicaId: string }
  | { tipo: "plan"; planTratamientoId: string };

export interface SubidaImagen {
  archivo: File;
  pacienteId: string;
  clinicaId: string;
  subidoPor: string;
  tipoArchivo: TipoImagen;
  descripcion?: string;
  asociacion?: AsociacionArchivo;
}

/** Entrada PDF: categoría y clasificación las determina el servicio. */
export type SubidaDocumento = {
  archivo: File;
  pacienteId: string;
  clinicaId: string;
  subidoPor: string;
  descripcion?: string;
  asociacion?: AsociacionArchivo;
};

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
  tipoArchivo: TipoArchivo;
  descripcion: string;
  subidoPor: string;
  creadoEl: string;
  evolucionClinicaId: string | null;
  planTratamientoId: string | null;
}

export type ArchivoNuevo = Omit<Archivo, "id" | "creadoEl" | "ruta">;

/** Estado temporal de una miniatura; nunca forma parte de la fila persistida. */
export type EstadoMiniatura =
  | { estado: "pendiente" }
  | { estado: "disponible"; url: string; venceEn: number }
  | { estado: "fallida" };

export type UrlsPorId = Record<string, EstadoMiniatura>;

export function esVisualizable(mime: string): mime is TipoVisualizable {
  return TIPOS_VISUALIZABLES.some((tipo) => tipo === mime);
}

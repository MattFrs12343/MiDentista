import { subirArchivo } from "./archivoService.ts";
import { useSubidaArchivo, type ContextoSubidaArchivo, type EstadoSubidaArchivo } from "./useSubidaArchivo.ts";
import type { ObservadorSubida } from "./patientFilesSection.ts";

export type EstadoSubidaImagen = EstadoSubidaArchivo;
export type ContextoSubidaImagen = ContextoSubidaArchivo;

/** Wrapper compatible de T-10.4; el servicio conserva sus reglas de imágenes. */
export function useSubidaImagen(contexto: ContextoSubidaImagen, onEstado?: ObservadorSubida) {
  return useSubidaArchivo(contexto, subirArchivo, onEstado);
}

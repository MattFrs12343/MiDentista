import { subirDocumento } from "./archivoService.ts";
import { useSubidaArchivo, type ContextoSubidaArchivo } from "./useSubidaArchivo.ts";
import type { ObservadorSubida } from "./patientFilesSection.ts";

/** T-10.5 comparte concurrencia y protección de contexto, no clasificación. */
export function useSubidaDocumento(contexto: ContextoSubidaArchivo, onEstado?: ObservadorSubida) {
  return useSubidaArchivo(contexto, subirDocumento, onEstado);
}

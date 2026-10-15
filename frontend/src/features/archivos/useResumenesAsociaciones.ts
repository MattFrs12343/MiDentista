import { useEffect, useState } from "react";
import { cargarResumenesAsociaciones } from "./archivoAsociacionService.ts";
import type { Archivo } from "./tipos.ts";

/** Estado de presentación separado de los metadatos y URLs de Storage. */
export function useResumenesAsociaciones(archivos: Archivo[]) {
  const [resultado, setResultado] = useState<{ archivos: Archivo[]; resumenes: Record<string, string> } | null>(null);
  useEffect(() => {
    let activo = true;
    void cargarResumenesAsociaciones(archivos).then((resumenes) => {
      if (activo) setResultado({ archivos, resumenes });
    });
    return () => { activo = false; };
  }, [archivos]);
  return resultado?.archivos === archivos ? resultado.resumenes : {};
}

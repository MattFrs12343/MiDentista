import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { descargarArchivo } from "./archivoService.ts";
import { crearGestorDescargas, entregarBlob, type DescargasPorId } from "./archivoDescarga.ts";
import type { Archivo } from "./tipos.ts";

/** Una instancia compartida por tarjetas y visor; nunca persiste Blob ni URL. */
export function useDescargaArchivo(pacienteId: string, archivos: Archivo[], habilitado: boolean) {
  const clave = pacienteId.toLowerCase();
  const contexto = useMemo(() => ({ clave, archivos, habilitado }), [clave, archivos, habilitado]);
  const [resultado, setResultado] = useState<{
    contexto: typeof contexto; estados: DescargasPorId;
  }>({ contexto, estados: {} });
  const gestorRef = useRef<{
    contexto: typeof contexto; gestor: ReturnType<typeof crearGestorDescargas>;
  } | null>(null);

  useLayoutEffect(() => {
    if (!contexto.habilitado) return;
    const gestor = crearGestorDescargas(contexto.clave, contexto.archivos,
      (id, paciente, signal) => descargarArchivo(id, paciente, undefined, signal),
      entregarBlob,
      (estados) => setResultado({ contexto, estados }));
    gestorRef.current = { contexto, gestor };
    return () => { gestor.invalidar(); gestorRef.current = null; };
  }, [contexto]);

  const descargar = useCallback((id: string) => {
    const actual = gestorRef.current;
    return contexto.habilitado && actual?.contexto === contexto
      ? actual.gestor.descargar(id) : Promise.resolve();
  }, [contexto]);

  return {
    descargar,
    estadosPorId: contexto.habilitado && resultado.contexto === contexto ? resultado.estados : {},
  };
}

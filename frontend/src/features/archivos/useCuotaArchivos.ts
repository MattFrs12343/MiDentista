import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { cargarCuotaArchivos, type CuotaArchivos } from "./archivoCuotaService.ts";

export function useCuotaArchivos(clinicaId: string | null) {
  const [resultado, setResultado] = useState<{ clinica: string | null; cuota: CuotaArchivos | null; cargando: boolean; error: boolean }>({
    clinica: null, cuota: null, cargando: false, error: false,
  });
  const cargar = useRef<() => Promise<void>>(async () => {});
  useLayoutEffect(() => {
    let activo = true;
    let generacion = 0;
    const recargar = async () => {
      if (!clinicaId) return;
      const version = ++generacion;
      setResultado((previo) => ({ clinica: clinicaId, cuota: previo.clinica === clinicaId ? previo.cuota : null, cargando: true, error: false }));
      try {
        const cuota = await cargarCuotaArchivos(clinicaId);
        if (activo && version === generacion) setResultado({ clinica: clinicaId, cuota, cargando: false, error: false });
      } catch {
        if (activo && version === generacion) setResultado({ clinica: clinicaId, cuota: null, cargando: false, error: true });
      }
    };
    cargar.current = recargar;
    void recargar();
    return () => { activo = false; generacion++; cargar.current = async () => {}; };
  }, [clinicaId]);
  const recargar = useCallback(() => cargar.current(), []);
  const actual = resultado.clinica === clinicaId ? resultado : { cuota: null, cargando: clinicaId !== null, error: false };
  return { cuota: actual.cuota, cargando: actual.cargando, error: actual.error, recargar };
}

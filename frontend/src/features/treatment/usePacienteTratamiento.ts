import { useLayoutEffect, useMemo, useSyncExternalStore } from "react";
import { crearContextoPacienteTratamiento } from "./pacienteTratamientoControlador.ts";
import { obtenerPacienteTratamiento } from "./pacienteTratamientoService.ts";
import { obtenerPerfilDiagnosticos } from "./diagnosticoService.ts";

export function usePacienteTratamiento(pacienteId: string, sesion: { email?: string; rol: string; clinicaSlug?: string | null } | null, habilitado: boolean) {
  const email = sesion?.email ?? "", rol = sesion?.rol ?? "", clinica = sesion?.clinicaSlug ?? "";
  const controlador = useMemo(() => crearContextoPacienteTratamiento({ pacienteId, email, rol, habilitado, clinicaSesion: clinica }, {
    perfil: obtenerPerfilDiagnosticos, paciente: obtenerPacienteTratamiento,
  }), [pacienteId, email, rol, clinica, habilitado]);
  const resultado = useSyncExternalStore(controlador.suscribir, controlador.obtener, controlador.obtener);
  useLayoutEffect(() => { controlador.activar(); void controlador.cargar(); return () => controlador.desactivar(); }, [controlador]);
  return { ...resultado, recargar: controlador.cargar };
}

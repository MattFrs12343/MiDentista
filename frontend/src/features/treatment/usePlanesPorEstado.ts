import { useLayoutEffect, useMemo, useSyncExternalStore } from "react";
import { crearVistaPlanesEstado } from "./planesPorEstadoControlador.ts";
import { listarPlanesPorEstado } from "./planesPorEstadoService.ts";
import type { PerfilDiagnosticos, PlanTratamientoPaciente } from "./tipos.ts";

export function usePlanesPorEstado(perfil: PerfilDiagnosticos | null, planesConfirmados: readonly PlanTratamientoPaciente[], clinicaExplicita?: string) {
  const controlador = useMemo(() => crearVistaPlanesEstado(perfil, listarPlanesPorEstado, clinicaExplicita),
    [perfil, clinicaExplicita]);
  const vista = useSyncExternalStore(controlador.suscribir, controlador.obtener, controlador.obtener);
  useLayoutEffect(() => {
    controlador.activar(); void controlador.actualizar();
    return () => controlador.desactivar();
  }, [controlador, planesConfirmados]);
  return { ...vista, filtrar: controlador.filtrar, paginar: controlador.paginar, recargar: controlador.cargar };
}

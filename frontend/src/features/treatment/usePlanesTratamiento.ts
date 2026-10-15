import { useLayoutEffect, useMemo, useSyncExternalStore } from "react";
import { obtenerPerfilDiagnosticos } from "./diagnosticoService.ts";
import { actualizarNotasPlan, actualizarTituloPlan, cambiarEstadoPlan, crearPlanTratamiento, listarPlanesPaciente, obtenerPlanPorId } from "./planTratamientoService.ts";
import { crearControladorPlanes } from "./planesTratamientoControlador.ts";

export function usePlanesTratamiento(pacienteId: string, sesion: { email?: string; rol: string } | null) {
  const email = sesion?.email ?? "";
  const rol = sesion?.rol ?? "";
  const controlador = useMemo(() => crearControladorPlanes({ pacienteId, email, rol }, {
    perfil: obtenerPerfilDiagnosticos, listar: listarPlanesPaciente, crear: crearPlanTratamiento,
    notas: actualizarNotasPlan, titulo: actualizarTituloPlan, cambiarEstado: cambiarEstadoPlan, obtener: obtenerPlanPorId,
  }), [pacienteId, email, rol]);
  const resultado = useSyncExternalStore(controlador.suscribir, controlador.obtener, controlador.obtener);
  useLayoutEffect(() => {
    controlador.activar();
    void controlador.cargar();
    return () => controlador.desactivar();
  }, [controlador]);
  return { ...resultado, seleccionado: resultado.estado === "success"
    ? resultado.planes.find((p) => p.id === resultado.seleccionadoId) ?? null : null,
    recargar: controlador.cargar, seleccionar: controlador.seleccionar, crear: controlador.crear,
    guardarNotas: controlador.guardarNotas, guardarTitulo: controlador.guardarTitulo,
    solicitarCambioEstado: controlador.solicitarCambioEstado, confirmarCambioEstado: controlador.confirmarCambioEstado,
    cancelarConfirmacionEstado: controlador.cancelarConfirmacionEstado,
    iniciarTotalProcedimiento: controlador.iniciarTotalProcedimiento, sincronizarTotalPlan: controlador.sincronizarTotalPlan };
}

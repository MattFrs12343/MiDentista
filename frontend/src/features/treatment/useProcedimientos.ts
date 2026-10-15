import { useLayoutEffect, useMemo, useSyncExternalStore } from "react";
import { crearControladorProcedimientos } from "./procedimientosControlador.ts";
import { actualizarProcedimiento, crearProcedimiento, eliminarProcedimiento, listarProcedimientosPlan } from "./procedimientoService.ts";
import { puedeEscribirProcedimientos, type PlanProcedimientos } from "./procedimientoPermisos.ts";
import type { PerfilDiagnosticos } from "./tipos.ts";
import type { IniciarTotalProcedimiento } from "./planTotal.ts";

export function useProcedimientos(plan: PlanProcedimientos | null, perfil: PerfilDiagnosticos | null, iniciarTotal?: IniciarTotalProcedimiento) {
  const id = plan?.id, clinicaId = plan?.clinicaId, odontologoId = plan?.odontologoId, pacienteId = plan?.pacienteId;
  const perfilId = perfil?.id, clinicaPerfil = perfil?.clinicaId, rol = perfil?.rol, activo = perfil?.activo;
  const controlador = useMemo(() => crearControladorProcedimientos(id ? { id, clinicaId: clinicaId!, odontologoId: odontologoId!, pacienteId: pacienteId! } : null,
    perfilId ? { id: perfilId, clinicaId: clinicaPerfil ?? null, rol: rol!, activo: activo! } : null,
    { listar: listarProcedimientosPlan, crear: crearProcedimiento, actualizar: actualizarProcedimiento, eliminar: eliminarProcedimiento }, iniciarTotal),
  [id, clinicaId, odontologoId, pacienteId, perfilId, clinicaPerfil, rol, activo, iniciarTotal]);
  const resultado = useSyncExternalStore(controlador.suscribir, controlador.obtener, controlador.obtener);
  useLayoutEffect(() => {
    controlador.activar(); void controlador.cargar();
    return () => controlador.desactivar();
  }, [controlador]);
  return { ...resultado, editable: puedeEscribirProcedimientos(perfil, plan), recargar: controlador.cargar,
    crear: controlador.crear, actualizar: controlador.actualizar, eliminar: controlador.eliminar,
    solicitarEliminar: controlador.solicitarEliminar, cancelarEliminar: controlador.cancelarEliminar };
}

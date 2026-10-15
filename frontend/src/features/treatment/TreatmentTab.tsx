import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import type { Paciente } from "@/types";
import { TreatmentPrint } from "./TreatmentPrint.tsx";
import { useDiagnosticos } from "./useDiagnosticos.ts";
import { usePlanesTratamiento } from "./usePlanesTratamiento.ts";
import { usePlanesPorEstado } from "./usePlanesPorEstado.ts";
import { TratamientoFichaSections } from "./TratamientoFichaSections.tsx";
import { datosPertenecenFicha, parametrosPlanFicha, resolverPlanFicha, seleccionUrlResuelta } from "./tratamientoIntegracion.ts";
import { totalPlanConfirmado } from "./planTotal.ts";

export function TreatmentTab({ pacienteId, paciente, clinicaId }: { pacienteId: string; paciente: Paciente; clinicaId?: string }) {
  const { sesion } = useAuth();
  const datosDiagnosticos = useDiagnosticos(pacienteId, sesion);
  const datosPlanes = usePlanesTratamiento(pacienteId, sesion);
  const planesPorEstado = usePlanesPorEstado(datosPlanes.perfil, datosPlanes.planes,
    datosPlanes.perfil?.rol === "superadmin" ? clinicaId : undefined);
  const [searchParams, setSearchParams] = useSearchParams();
  const planParam = searchParams.get("plan");
  const enlaceConsumido = useRef("");
  const { estado: estadoPlanes, guardando, planes, seleccionar, seleccionadoId, crear } = datosPlanes;
  const enlace = resolverPlanFicha(planParam, pacienteId, planes);
  const seleccionConfirmada = seleccionUrlResuelta(planParam, pacienteId, planes, seleccionadoId);
  const cargado = datosDiagnosticos.estado === "success" && datosPlanes.estado === "success";
  const listoImprimir = cargado && !guardando && !datosDiagnosticos.guardando && paciente.id === pacienteId.toLowerCase()
    && datosPertenecenFicha(pacienteId, datosDiagnosticos.diagnosticos, datosPlanes.seleccionado, clinicaId)
    && seleccionConfirmada && totalPlanConfirmado(datosPlanes.totales, seleccionadoId);
  const seleccionarPlan = useCallback((id: string | null) => {
    seleccionar(id);
    setSearchParams((anteriores) => parametrosPlanFicha(anteriores, id), { replace: true });
  }, [seleccionar, setSearchParams]);
  const crearPlan: typeof crear = async (contenido) => {
    const confirmado = await crear(contenido);
    setSearchParams((anteriores) => parametrosPlanFicha(anteriores, confirmado.id), { replace: true });
    return confirmado;
  };

  // Resolver cada cambio de URL, incluida su eliminación y Atrás/Adelante.
  useEffect(() => {
    const clave = JSON.stringify([planParam, enlace.estado, enlace.id]);
    if (enlaceConsumido.current === clave || estadoPlanes !== "success" || guardando) return;
    enlaceConsumido.current = clave;
    if (seleccionadoId !== enlace.id) seleccionar(enlace.id);
  }, [planParam, enlace.estado, enlace.id, estadoPlanes, guardando, seleccionadoId, seleccionar]);

  // La impresión espera ambas lecturas; nunca obtiene ni crea un plan implícito.
  useEffect(() => {
    if (searchParams.get("print") !== "1" || !listoImprimir) return;
    const id = setTimeout(() => {
      window.print();
      setSearchParams((anteriores) => {
        const siguientes = new URLSearchParams(anteriores);
        siguientes.delete("print");
        return siguientes;
      }, { replace: true });
    }, 600);
    return () => clearTimeout(id);
  }, [listoImprimir, searchParams, setSearchParams, pacienteId, datosPlanes.seleccionado, datosDiagnosticos.diagnosticos]);

  return (
    <>
      <TratamientoFichaSections paciente={paciente} diagnosticos={datosDiagnosticos}
        planes={{ ...datosPlanes, seleccionado: seleccionConfirmada ? datosPlanes.seleccionado : null,
          seleccionadoId: seleccionConfirmada ? seleccionadoId : null, seleccionar: seleccionarPlan, crear: crearPlan }} vista={planesPorEstado}
        enlaceInvalido={estadoPlanes === "success" && (enlace.estado === "invalido" || enlace.estado === "no_visible")}
        limpiarEnlace={() => seleccionarPlan(null)} listoImprimir={listoImprimir} imprimir={() => window.print()}
        abrirPlan={(id) => {
          const visible = resolverPlanFicha(id, pacienteId, planes);
          if (visible.estado === "visible") seleccionarPlan(visible.id);
          else { setSearchParams((anteriores) => parametrosPlanFicha(anteriores, id)); void datosPlanes.recargar(); }
        }} />
      {listoImprimir ? <TreatmentPrint paciente={paciente} diagnosticos={datosDiagnosticos.diagnosticos}
        plan={datosPlanes.seleccionado} clinica={sesion?.clinica} /> : null}
    </>
  );
}

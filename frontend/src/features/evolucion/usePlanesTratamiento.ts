import { useCallback, useRef, useState } from "react";
import { cargarPlanes, cargarProcedimientos } from "./planesTratamientoService.ts";
import type { PlanTratamiento, ProcedimientoTratamiento } from "./tipos.ts";

/** Texto legible de un rechazo, sin inventar la causa. */
function mensajeDe(causa: unknown, porDefecto: string): string {
  if (causa instanceof Error && causa.message.trim()) return causa.message;
  return porDefecto;
}

/**
 * Lectura de los planes de tratamiento para vincular una evolución (T-6.6).
 *
 * Solo lectura: este módulo no escribe en `planes_tratamiento` ni en
 * `procedimientos_tratamiento`, que administra el modulo 05. No hay efectos
 * automáticos a propósito — el flujo integrado pasa el UUID real del paciente,
 * y los ids de demo (`p1`, `p_...`) se rechazan en el servicio, antes de la red.
 */
export function usePlanesTratamiento() {
  const [planes, setPlanes] = useState<PlanTratamiento[]>([]);
  const [procedimientos, setProcedimientos] = useState<ProcedimientoTratamiento[]>([]);
  const [cargandoPlanes, setCargandoPlanes] = useState(false);
  const [cargandoProcedimientos, setCargandoProcedimientos] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // En un ref, no en estado: `cargar` tiene que mantener la misma identidad
  // entre renders o el `useEffect` que la llama se realimenta en bucle.
  const pacienteCargado = useRef<string | null>(null);

  // Contadores en refs: el estado de React llega tarde para impedir una segunda
  // carga que se dispara en el mismo clic o en el mismo tick.
  const lecturas = useRef(0);
  const ultimaCargaPlanes = useRef(0);
  const ultimaCargaProcedimientos = useRef(0);

  const cargar = useCallback(async (pacienteId: string) => {
    const operacion = ++ultimaCargaPlanes.current;
    const cambiaDePaciente =
      pacienteCargado.current !== null && pacienteCargado.current !== pacienteId;
    pacienteCargado.current = pacienteId;
    if (cambiaDePaciente) {
      // Son datos de otra ficha: mantenerlos visibles mientras carga expondría
      // planes de otro paciente.
      setPlanes([]);
      setProcedimientos([]);
    }
    lecturas.current++;
    setCargandoPlanes(true);
    setError(null);
    try {
      const resultado = await cargarPlanes(pacienteId);
      // Una respuesta vieja no pisa una lectura más nueva ya en curso.
      if (operacion !== ultimaCargaPlanes.current) return null;
      setPlanes(resultado);
      return resultado;
    } catch (causa) {
      // La lista anterior se conserva: un fallo de red no borra lo ya mostrado.
      if (operacion === ultimaCargaPlanes.current) {
        setError(mensajeDe(causa, "No se pudieron cargar los planes de tratamiento."));
      }
      return null;
    } finally {
      lecturas.current--;
      if (operacion === ultimaCargaPlanes.current) setCargandoPlanes(lecturas.current > 0);
    }
  }, []);

  /**
   * Procedimientos del plan elegido en el desplegable.
   *
   * Cuando el plan cambia, la lista anterior se descarta: sus procedimientos
   * pertenecen a otro plan y no pueden quedar seleccionados por error.
   */
  const cargarItems = useCallback(async (planTratamientoId: string | null) => {
    const operacion = ++ultimaCargaProcedimientos.current;
    if (!planTratamientoId) {
      setProcedimientos([]);
      return null;
    }
    lecturas.current++;
    setCargandoProcedimientos(true);
    setError(null);
    try {
      const resultado = await cargarProcedimientos(planTratamientoId);
      if (operacion !== ultimaCargaProcedimientos.current) return null;
      setProcedimientos(resultado);
      return resultado;
    } catch (causa) {
      if (operacion === ultimaCargaProcedimientos.current) {
        setProcedimientos([]);
        setError(mensajeDe(causa, "No se pudieron cargar los procedimientos del plan."));
      }
      return null;
    } finally {
      lecturas.current--;
      if (operacion === ultimaCargaProcedimientos.current) {
        setCargandoProcedimientos(lecturas.current > 0);
      }
    }
  }, []);

  /** Título de un plan por id, para mostrarlo en la línea de tiempo. */
  const titulos = useCallback(() => {
    const mapa = new Map<string, string>();
    for (const plan of planes) mapa.set(plan.id, plan.titulo ?? "");
    return mapa;
  }, [planes]);

  return {
    planes,
    procedimientos,
    cargandoPlanes,
    cargandoProcedimientos,
    error,
    cargar,
    cargarItems,
    titulos,
  };
}
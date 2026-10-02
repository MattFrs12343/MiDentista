import { useRef, useState } from "react";
import type { HistoriaClinica } from "@/types";
import { cargarHistoriaClinica, guardarHistoriaClinica } from "./clinicalHistoryService";

/** Sin efectos ni consultas automáticas: el flujo integrado debe pasar los UUIDs reales. */
export function useClinicalHistorySupabase() {
  const [historia, setHistoria] = useState<HistoriaClinica | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cargas = useRef(0);
  const guardados = useRef(0);
  const ultimaOperacion = useRef(0);

  const cargar = async (pacienteId: string) => {
    const operacion = ++ultimaOperacion.current;
    cargas.current++;
    setCargando(true);
    setError(null);
    try {
      const resultado = await cargarHistoriaClinica(pacienteId);
      if (operacion === ultimaOperacion.current) setHistoria(resultado);
      return resultado;
    } catch (causa) {
      if (operacion === ultimaOperacion.current) {
        setError(causa instanceof Error ? causa.message : "No se pudo cargar Historia clínica.");
      }
      return null;
    } finally {
      cargas.current--;
      setCargando(cargas.current > 0);
    }
  };

  const guardar = async (pacienteId: string, clinicaId: string, cambios: HistoriaClinica) => {
    // No enviar escrituras concurrentes del mismo hook en orden indeterminado.
    if (guardados.current > 0) {
      setError("Hay un guardado en curso. Reintenta cuando termine.");
      return null;
    }
    const operacion = ++ultimaOperacion.current;
    guardados.current++;
    setGuardando(true);
    setError(null);
    try {
      const resultado = await guardarHistoriaClinica(pacienteId, clinicaId, cambios);
      if (operacion === ultimaOperacion.current) setHistoria(resultado);
      return resultado;
    } catch (causa) {
      if (operacion === ultimaOperacion.current) {
        setError(causa instanceof Error ? causa.message : "No se pudo guardar Historia clínica.");
      }
      return null;
    } finally {
      guardados.current--;
      setGuardando(false);
    }
  };

  return { historia, cargando, guardando, error, cargar, guardar };
}

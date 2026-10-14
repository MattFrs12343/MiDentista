import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { miFichaPacienteApi, type FichaPaciente } from "@/data/api";
import type { DatosDashboard } from "./tipos";

/**
 * Carga la ficha del paciente autenticado para el panel del paciente (T-13.5).
 *
 * Reutiliza `miFichaPacienteApi()`, la misma puerta que usa el portal: la Edge
 * Function `paciente/mi-ficha` resuelve al paciente desde su propio token y RLS
 * acota las lecturas a su fila. No se pide ni se muestra información de otro
 * paciente, ni se consulta la red si la sesión no es de tipo `paciente`.
 *
 * El contrato `DatosDashboard` distingue carga, error, falta de permiso y vacío
 * sin convertir un fallo en "cero". Las respuestas de una carga anterior no
 * pisan a las de una más reciente.
 */
export function useFichaPaciente(): DatosDashboard<FichaPaciente | null> {
  const { sesion } = useAuth();
  const esPaciente = sesion?.rol === "paciente";

  const [valor, setValor] = useState<FichaPaciente | null>(null);
  const [cargando, setCargando] = useState(esPaciente);
  const [sinPermiso, setSinPermiso] = useState(!esPaciente);
  const [error, setError] = useState<string | null>(null);
  const operacion = useRef(0);

  useEffect(() => {
    if (!esPaciente) {
      setCargando(false);
      setSinPermiso(true);
      setError(null);
      return;
    }

    const actual = ++operacion.current;
    setCargando(true);
    setSinPermiso(false);
    setError(null);

    miFichaPacienteApi()
      .then((ficha) => {
        if (actual !== operacion.current) return;
        setValor(ficha);
      })
      .catch((causa: unknown) => {
        if (actual !== operacion.current) return;
        setError(
          causa instanceof Error ? causa.message : "No se pudo cargar tu información",
        );
      })
      .finally(() => {
        if (actual === operacion.current) setCargando(false);
      });
  }, [esPaciente]);

  return { valor, cargando, sinPermiso, error };
}

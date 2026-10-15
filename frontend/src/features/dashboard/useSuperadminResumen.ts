import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import type { DatosDashboard } from "./tipos";
import { cargarResumenSuperadmin } from "./dashboardSuperadminService";
import { crearResumenVacio, type ResumenSuperadmin } from "./superadminResumen";

/**
 * Carga el resumen del sistema para el panel del superadmin (T-13.2).
 *
 * Devuelve el contrato `DatosDashboard<ResumenSuperadmin>` para que el panel
 * distinga carga, error, falta de permiso y vacío sin convertir un fallo en un
 * cero. Solo consulta si la sesión es de `superadmin`; para cualquier otro rol
 * marca `sinPermiso` sin tocar la red.
 *
 * Las respuestas de una carga anterior no pisan a las de una más reciente
 * (número de operación), igual que `useClinicalHistorySupabase`.
 */
export function useSuperadminResumen(): DatosDashboard<ResumenSuperadmin> {
  const { sesion } = useAuth();
  const esSuperadmin = sesion?.rol === "superadmin";

  const [valor, setValor] = useState<ResumenSuperadmin>(() => crearResumenVacio());
  const [cargando, setCargando] = useState(esSuperadmin);
  const [sinPermiso, setSinPermiso] = useState(!esSuperadmin);
  const [error, setError] = useState<string | null>(null);
  const operacion = useRef(0);

  useEffect(() => {
    if (!esSuperadmin) {
      setCargando(false);
      setSinPermiso(true);
      setError(null);
      return;
    }

    const actual = ++operacion.current;
    setCargando(true);
    setSinPermiso(false);
    setError(null);

    cargarResumenSuperadmin()
      .then((resumen) => {
        if (actual !== operacion.current) return;
        setValor(resumen);
      })
      .catch((causa: unknown) => {
        if (actual !== operacion.current) return;
        setError(
          causa instanceof Error ? causa.message : "No se pudo cargar el resumen del sistema.",
        );
      })
      .finally(() => {
        if (actual === operacion.current) setCargando(false);
      });
  }, [esSuperadmin]);

  return { valor, cargando, sinPermiso, error };
}

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import type { DatosDashboard } from "./tipos";
import { cargarTratamientosClinica } from "./dashboardOdontologoService";
import { crearResumenTratamientosVacio, type ResumenTratamientos } from "./odontologoResumen";

/**
 * Roles que pueden ver los tratamientos de la clínica: el odontólogo.
 * Cualquier otro rol queda en `sinPermiso` sin tocar la red.
 */
const ROLES_CON_TRATAMIENTOS: readonly string[] = ["odontologo", "odontologo_admin"];

/**
 * Carga el resumen de tratamientos por estado para el panel del odontólogo
 * (T-13.4).
 *
 * Devuelve el contrato `DatosDashboard<ResumenTratamientos>` para distinguir
 * carga, error, falta de permiso y vacío sin convertir un fallo en un cero. Un
 * resumen en ceros es válido (la clínica puede no tener tratamientos vivos);
 * solo el error de red/permisos se expone en `error`.
 *
 * Las respuestas de una carga anterior no pisan a las de una más reciente
 * (número de operación), igual que `useSuperadminResumen`/`usePagosPendientes`.
 */
export function useTratamientosClinica(): DatosDashboard<ResumenTratamientos> {
  const { sesion } = useAuth();
  const puedeVer = !!sesion && ROLES_CON_TRATAMIENTOS.includes(sesion.rol);

  const [valor, setValor] = useState<ResumenTratamientos>(() => crearResumenTratamientosVacio());
  const [cargando, setCargando] = useState(puedeVer);
  const [sinPermiso, setSinPermiso] = useState(!puedeVer);
  const [error, setError] = useState<string | null>(null);
  const operacion = useRef(0);

  useEffect(() => {
    if (!puedeVer) {
      setCargando(false);
      setSinPermiso(true);
      setError(null);
      return;
    }

    const actual = ++operacion.current;
    setCargando(true);
    setSinPermiso(false);
    setError(null);

    cargarTratamientosClinica()
      .then((resumen) => {
        if (actual !== operacion.current) return;
        setValor(resumen);
      })
      .catch((causa: unknown) => {
        if (actual !== operacion.current) return;
        setError(
          causa instanceof Error ? causa.message : "No se pudieron cargar los tratamientos.",
        );
      })
      .finally(() => {
        if (actual === operacion.current) setCargando(false);
      });
  }, [puedeVer]);

  return { valor, cargando, sinPermiso, error };
}

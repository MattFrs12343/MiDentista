import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import type { Pago } from "../pagos/tipos";
import type { DatosDashboard } from "./tipos";
import { cargarPagosPendientes } from "./dashboardRecepcionService";

/**
 * Roles que pueden ver las deudas de la clínica (README del módulo 13):
 * recepción cobra.
 * Cualquier otro rol queda en `sinPermiso` sin tocar la red.
 */
const ROLES_CON_DEUDAS: readonly string[] = ["recepcionista"];

/**
 * Carga los pagos pendientes de la clínica para el panel de recepción (T-13.3).
 *
 * Devuelve el contrato `DatosDashboard<Pago[]>` para que el panel distinga
 * carga, error, falta de permiso y vacío sin convertir un fallo en un cero. Un
 * arreglo vacío es un resultado válido (la clínica puede no deber nada); solo
 * el error de red/permisos se expone en `error`.
 *
 * Las respuestas de una carga anterior no pisan a las de una más reciente
 * (número de operación), igual que `useSuperadminResumen`.
 */
export function usePagosPendientes(): DatosDashboard<Pago[]> {
  const { sesion } = useAuth();
  const puedeVer = !!sesion && ROLES_CON_DEUDAS.includes(sesion.rol);

  const [valor, setValor] = useState<Pago[]>([]);
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

    cargarPagosPendientes()
      .then((pagos) => {
        if (actual !== operacion.current) return;
        setValor(pagos);
      })
      .catch((causa: unknown) => {
        if (actual !== operacion.current) return;
        setError(
          causa instanceof Error ? causa.message : "No se pudieron cargar los pagos pendientes.",
        );
      })
      .finally(() => {
        if (actual === operacion.current) setCargando(false);
      });
  }, [puedeVer]);

  return { valor, cargando, sinPermiso, error };
}

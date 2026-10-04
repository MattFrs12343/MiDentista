import { useCallback, useRef, useState } from "react";
import { cargarPagos, cambiarEstadoPago, registrarPago } from "./pagoService.ts";
import type { EstadoPago, Pago } from "./tipos.ts";

/** Mismo criterio de orden que usa `cargarPagos`: `fecha_pago` descendente. */
function ordenarPorFechaDescendente(pagos: readonly Pago[]): Pago[] {
  return [...pagos].sort((a, b) => b.fechaPago.localeCompare(a.fechaPago));
}

function mensaje(causa: unknown, porDefecto: string): string {
  return causa instanceof Error ? causa.message : porDefecto;
}

/**
 * Estado de la pestaña de pagos de un paciente.
 *
 * Sin consultas automáticas: quien la usa pasa el UUID real. Sin esto, el
 * gancho pediría pagos de un `p1` de demo y el servicio lo rechazaría.
 *
 * Dos reglas que no se negocian:
 *
 * - Un `SELECT` vacío **no es un error** (puede deberse a RLS); lo que sí se
 *   expone en `error` es el fallo de red o de permisos devuelto por Supabase.
 * - Las escrituras concurrentes del mismo gancho se rechazan, no se encolan:
 *   dos `registrar` a la vez dejarían el historial en un estado indeterminado.
 */
export function usePagosSupabase() {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargas = useRef(0);
  const escrituras = useRef(0);
  const ultimaLectura = useRef(0);
  const ultimaEscritura = useRef(0);

  const cargar = useCallback(async (pacienteId: string): Promise<Pago[] | null> => {
    const operacion = ++ultimaLectura.current;
    cargas.current++;
    setCargando(true);
    setError(null);
    try {
      const resultado = await cargarPagos(pacienteId);
      // Una lista vacía es una respuesta válida: se muestra como "sin pagos".
      if (operacion === ultimaLectura.current) setPagos(resultado);
      return resultado;
    } catch (causa) {
      if (operacion === ultimaLectura.current) {
        setError(mensaje(causa, "No se pudieron cargar los pagos."));
      }
      return null;
    } finally {
      cargas.current--;
      setCargando(cargas.current > 0);
    }
  }, []);

  const registrar = useCallback(async (pago: Pago): Promise<Pago | null> => {
    if (escrituras.current > 0) {
      setError("Hay un pago en curso. Espera a que termine antes de registrar otro.");
      return null;
    }
    const operacion = ++ultimaEscritura.current;
    escrituras.current++;
    setGuardando(true);
    setError(null);
    try {
      const guardado = await registrarPago(pago);
      // Se refleja la fila real que devolvió la base, no la que se envió: la
      // base pone `id` y `creado_en`, y puede normalizar el monto.
      if (operacion === ultimaEscritura.current) {
        setPagos((previos) => ordenarPorFechaDescendente([guardado, ...previos.filter((p) => p.id !== guardado.id)]));
      }
      return guardado;
    } catch (causa) {
      // No se pisa la lista: un pago fallido deja el historial como estaba.
      if (operacion === ultimaEscritura.current) {
        setError(mensaje(causa, "No se pudo registrar el pago."));
      }
      return null;
    } finally {
      escrituras.current--;
      setGuardando(false);
    }
  }, []);

  const cambiarEstado = useCallback(async (pago: Pago, estado: EstadoPago): Promise<Pago | null> => {
    if (escrituras.current > 0) {
      setError("Hay un pago en curso. Espera a que termine antes de cambiar otro estado.");
      return null;
    }
    const operacion = ++ultimaEscritura.current;
    escrituras.current++;
    setGuardando(true);
    setError(null);
    try {
      const actualizado = await cambiarEstadoPago(pago, estado);
      // `null` aquí no es éxito: el servicio devuelve null cuando la fila ya no
      // existe o la clínica no coincide. No se puede anunciar como guardado.
      if (!actualizado) {
        if (operacion === ultimaEscritura.current) {
          setError("No se encontró el pago a actualizar. Puede haber sido eliminado.");
        }
        return null;
      }
      if (operacion === ultimaEscritura.current) {
        setPagos((previos) => previos.map((p) => (p.id === actualizado.id ? actualizado : p)));
      }
      return actualizado;
    } catch (causa) {
      if (operacion === ultimaEscritura.current) {
        setError(mensaje(causa, "No se pudo actualizar el pago."));
      }
      return null;
    } finally {
      escrituras.current--;
      setGuardando(false);
    }
  }, []);

  return { pagos, cargando, guardando, error, cargar, registrar, cambiarEstado };
}
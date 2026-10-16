import { useCallback, useRef, useState } from "react";
import {
  actualizarPresupuesto,
  cambiarEstadoPresupuesto,
  cargarPresupuesto,
  cargarPresupuestosClinica,
  eliminarPresupuesto,
  guardarPresupuesto,
} from "./presupuestoService.ts";
import type {
  EstadoPresupuesto,
  ItemPresupuestoNuevo,
  Presupuesto,
  PresupuestoCompleto,
  PresupuestoNuevo,
} from "./tipos.ts";

/** Mismo criterio de orden que usa el servicio: `creado_en` descendente. */
function ordenarPorFechaDescendente(presupuestos: readonly Presupuesto[]): Presupuesto[] {
  return [...presupuestos].sort((a, b) => b.creadoEl.localeCompare(a.creadoEl));
}

function mensaje(causa: unknown, porDefecto: string): string {
  return causa instanceof Error ? causa.message : porDefecto;
}

/**
 * Estado de la lista transversal de presupuestos (recepción, `/app/presupuestos`).
 *
 * Sin consultas automáticas: quien la usa pasa el UUID real de la clínica. Sin
 * esto, el gancho pediría presupuestos de una clínica demo y el servicio lo
 * rechazaría.
 *
 * Dos reglas que se heredan del patrón de `features/clinical/` y de
 * `usePagosSupabase`:
 *
 * - Un `SELECT` vacío **no es un error** (puede deberse a RLS); lo que sí se
 *   expone en `error` es el fallo de red o de permisos devuelto por Supabase.
 * - Las escrituras concurrentes del mismo gancho se rechazan, no se encolan:
 *   dos altas a la vez dejarían la lista en un estado indeterminado.
 */
export function usePresupuestoSupabase() {
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargas = useRef(0);
  const escrituras = useRef(0);
  const ultimaLectura = useRef(0);
  const ultimaEscritura = useRef(0);

  const cargarClinica = useCallback(async (clinicaId: string): Promise<Presupuesto[] | null> => {
    const operacion = ++ultimaLectura.current;
    cargas.current++;
    setCargando(true);
    setError(null);
    try {
      const resultado = await cargarPresupuestosClinica(clinicaId);
      // Una lista vacía es una respuesta válida: se muestra como "sin presupuestos".
      if (operacion === ultimaLectura.current) setPresupuestos(resultado);
      return resultado;
    } catch (causa) {
      if (operacion === ultimaLectura.current) {
        setError(mensaje(causa, "No se pudieron cargar los presupuestos."));
      }
      return null;
    } finally {
      cargas.current--;
      setCargando(cargas.current > 0);
    }
  }, []);

  /** Rechaza una escritura si ya hay otra en curso. Devuelve `false` si se rechazó. */
  const reclamarEscritura = useCallback((mensajeOcupado: string): boolean => {
    if (escrituras.current > 0) {
      setError(mensajeOcupado);
      return false;
    }
    return true;
  }, []);

  const crear = useCallback(
    async (
      nuevo: PresupuestoNuevo,
      items: readonly ItemPresupuestoNuevo[],
    ): Promise<PresupuestoCompleto | null> => {
      if (!reclamarEscritura("Hay una operación en curso. Espera a que termine antes de guardar otro presupuesto.")) {
        return null;
      }
      const operacion = ++ultimaEscritura.current;
      escrituras.current++;
      setGuardando(true);
      setError(null);
      try {
        const guardado = await guardarPresupuesto(nuevo, items);
        // Se refleja la fila real que devolvió la base, no la que se envió.
        if (operacion === ultimaEscritura.current) {
          // Una lectura encolada antes del alta no debe pisar la fila recién creada.
          ultimaLectura.current += 1;
          setPresupuestos((previos) => ordenarPorFechaDescendente([guardado, ...previos]));
        }
        return guardado;
      } catch (causa) {
        // No se pisa la lista: un alta fallida deja la lista como estaba.
        if (operacion === ultimaEscritura.current) {
          setError(mensaje(causa, "No se pudo guardar el presupuesto."));
        }
        return null;
      } finally {
        escrituras.current--;
        setGuardando(false);
      }
    },
    [reclamarEscritura],
  );

  const actualizar = useCallback(
    async (
      presupuesto: Presupuesto,
      items: readonly ItemPresupuestoNuevo[],
    ): Promise<PresupuestoCompleto | null> => {
      if (!reclamarEscritura("Hay una operación en curso. Espera a que termine antes de editar otro presupuesto.")) {
        return null;
      }
      const operacion = ++ultimaEscritura.current;
      escrituras.current++;
      setGuardando(true);
      setError(null);
      try {
        const actualizado = await actualizarPresupuesto(presupuesto, items);
        // `null` aquí no es éxito: la fila ya no existe o RLS no la deja tocar.
        if (!actualizado) {
          if (operacion === ultimaEscritura.current) {
            setError("No se encontró el presupuesto a modificar. Puede haber sido eliminado.");
          }
          return null;
        }
        if (operacion === ultimaEscritura.current) {
          // Una lectura encolada antes de la edición no debe pisarla.
          ultimaLectura.current += 1;
          setPresupuestos((previos) =>
            previos.map((p) => (p.id === actualizado.id ? actualizado : p)),
          );
        }
        return actualizado;
      } catch (causa) {
        if (operacion === ultimaEscritura.current) {
          setError(mensaje(causa, "No se pudo modificar el presupuesto."));
        }
        return null;
      } finally {
        escrituras.current--;
        setGuardando(false);
      }
    },
    [reclamarEscritura],
  );

  const cambiarEstado = useCallback(
    async (presupuesto: Presupuesto, hacia: EstadoPresupuesto): Promise<Presupuesto | null> => {
      if (!reclamarEscritura("Hay una operación en curso. Espera a que termine antes de cambiar otro estado.")) {
        return null;
      }
      const operacion = ++ultimaEscritura.current;
      escrituras.current++;
      setGuardando(true);
      setError(null);
      try {
        const actualizado = await cambiarEstadoPresupuesto(presupuesto, hacia);
        if (!actualizado) {
          if (operacion === ultimaEscritura.current) {
            setError("No se encontró el presupuesto a actualizar. Puede haber sido eliminado.");
          }
          return null;
        }
        if (operacion === ultimaEscritura.current) {
          // Una lectura encolada antes del cambio de estado no debe pisarlo.
          ultimaLectura.current += 1;
          setPresupuestos((previos) =>
            previos.map((p) => (p.id === actualizado.id ? actualizado : p)),
          );
        }
        return actualizado;
      } catch (causa) {
        if (operacion === ultimaEscritura.current) {
          setError(mensaje(causa, "No se pudo actualizar el presupuesto."));
        }
        return null;
      } finally {
        escrituras.current--;
        setGuardando(false);
      }
    },
    [reclamarEscritura],
  );

  const eliminar = useCallback(
    async (presupuesto: Presupuesto): Promise<boolean> => {
      if (!reclamarEscritura("Hay una operación en curso. Espera a que termine antes de eliminar otro presupuesto.")) {
        return false;
      }
      const operacion = ++ultimaEscritura.current;
      escrituras.current++;
      setGuardando(true);
      setError(null);
      try {
        const borrado = await eliminarPresupuesto(presupuesto);
        if (!borrado) {
          if (operacion === ultimaEscritura.current) {
            setError("No se encontró el presupuesto a eliminar. Puede haber sido eliminado ya.");
          }
          return false;
        }
        if (operacion === ultimaEscritura.current) {
          // Una lectura encolada antes del borrado no debe reincorporar la fila.
          ultimaLectura.current += 1;
          setPresupuestos((previos) => previos.filter((p) => p.id !== presupuesto.id));
        }
        return true;
      } catch (causa) {
        if (operacion === ultimaEscritura.current) {
          setError(mensaje(causa, "No se pudo eliminar el presupuesto."));
        }
        return false;
      } finally {
        escrituras.current--;
        setGuardando(false);
      }
    },
    [reclamarEscritura],
  );

  /** Carga un presupuesto con sus partidas, para abrir el formulario de edición. */
  const cargarUno = useCallback(async (presupuestoId: string): Promise<PresupuestoCompleto | null> => {
    setError(null);
    try {
      const completo = await cargarPresupuesto(presupuestoId);
      // `null` no es éxito: la fila ya no existe o RLS no la deja leer.
      if (!completo) {
        setError("No se pudo abrir el presupuesto. Puede haber sido eliminado o no tenés permiso para verlo.");
      }
      return completo;
    } catch (causa) {
      setError(mensaje(causa, "No se pudo cargar el presupuesto."));
      return null;
    }
  }, []);

  return {
    presupuestos,
    cargando,
    guardando,
    error,
    cargarClinica,
    cargarUno,
    crear,
    actualizar,
    cambiarEstado,
    eliminar,
  };
}

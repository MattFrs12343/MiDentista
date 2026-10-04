import { useCallback, useRef, useState } from "react";
import { compararEvoluciones } from "./fechasEvolucion.ts";
import {
  actualizarEvolucion,
  cargarEvoluciones,
  guardarEvolucion,
  registrarProximaAtencion,
} from "./evolucionService.ts";
import type { EvolucionClinica, EvolucionNueva } from "./tipos.ts";

/** Texto legible de un rechazo, sin inventar la causa. */
function mensajeDe(causa: unknown, porDefecto: string): string {
  if (causa instanceof Error && causa.message.trim()) return causa.message;
  return porDefecto;
}

/**
 * Estado y operaciones de la evolución clínica del módulo 06.
 *
 * No hay efectos automáticos ni consultas por su cuenta: el flujo integrado
 * tiene que pasar los UUIDs reales de paciente, clínica y odontólogo. Los ids de
 * demo (`p1`, `p_...`) se rechazan en el servicio, antes de tocar la red.
 */
export function useEvolucionSupabase() {
  const [evoluciones, setEvoluciones] = useState<EvolucionClinica[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * `true` cuando la última carga terminó sin error y devolvió cero filas.
   *
   * Con RLS activo un `SELECT` filtrado devuelve `[]` igual que un paciente sin
   * evoluciones, así que la lista vacía NO prueba que el paciente no tenga
   * historial. La UI tiene que decirlo como "no hay evoluciones visibles" y no
   * como "este paciente no tiene evoluciones".
   */
  const [lecturaSinFilas, setLecturaSinFilas] = useState(false);

  // Contadores en refs: el estado de React llega tarde para impedir una segunda
  // escritura que se dispara en el mismo clic o en el mismo tick.
  const lecturas = useRef(0);
  const escrituras = useRef(0);
  const ultimaLectura = useRef(0);
  const pacienteCargado = useRef<string | null>(null);

  const cargar = useCallback(async (pacienteId: string) => {
    const operacion = ++ultimaLectura.current;
    // Al cambiar de paciente se descarta la lista anterior: son datos de otra
    // ficha y mantenerlos visibles mientras carga sería historia clínica ajena.
    const cambiaDePaciente = pacienteCargado.current !== null
      && pacienteCargado.current !== pacienteId;
    pacienteCargado.current = pacienteId;
    if (cambiaDePaciente) {
      setEvoluciones([]);
      setLecturaSinFilas(false);
    }
    lecturas.current++;
    setCargando(true);
    setError(null);
    try {
      const resultado = await cargarEvoluciones(pacienteId);
      // Una respuesta vieja no pisa una lectura más nueva ya en curso.
      if (operacion !== ultimaLectura.current) return null;
      setEvoluciones([...resultado].sort(compararEvoluciones));
      setLecturaSinFilas(resultado.length === 0);
      return resultado;
    } catch (causa) {
      // La lista anterior se conserva: un fallo de red no borra historial ya
      // mostrado, solo deja de poder refrescarlo.
      if (operacion === ultimaLectura.current) {
        setError(mensajeDe(causa, "No se pudieron cargar las evoluciones."));
      }
      return null;
    } finally {
      lecturas.current--;
      if (operacion === ultimaLectura.current) setCargando(lecturas.current > 0);
    }
  }, []);

  /** Repite la última carga. No hace nada si todavía no se cargó un paciente. */
  const recargar = useCallback(async () => {
    if (!pacienteCargado.current) return null;
    return cargar(pacienteCargado.current);
  }, [cargar]);

  /**
   * Escribe y refleja en la lista local la fila que devolvió la base de datos,
   * que es la única fuente de verdad: los valores por defecto de la tabla, los
   * `null` reales y el `id` generado no se inventan en el cliente.
   */
  const escribir = useCallback(
    async (
      operacion: () => Promise<EvolucionClinica | null>,
      reflejar: (fila: EvolucionClinica) => void,
      mensajeError: string,
      mensajeSinConfirmar: string,
    ): Promise<EvolucionClinica | null> => {
      // Escrituras concurrentes del mismo hook se rechazan, no se encolan: dos
      // UPDATE del mismohook llegarían a la base en orden indeterminado.
      if (escrituras.current > 0) {
        setError("Ya hay una escritura en curso. Espera a que termine antes de volver a guardar.");
        return null;
      }
      escrituras.current++;
      setGuardando(true);
      setError(null);
      try {
        const fila = await operacion();
        if (!fila) {
          // `null` = el UPDATE no afectó a ninguna fila. Con RLS eso es
          // indistinguible de un fallo silencioso, así que no se anuncia como
          // éxito ni como "no había nada que cambiar".
          setError(mensajeSinConfirmar);
          return null;
        }
        reflejar(fila);
        return fila;
      } catch (causa) {
        setError(mensajeDe(causa, mensajeError));
        return null;
      } finally {
        escrituras.current--;
        setGuardando(false);
      }
    },
    [],
  );

  const guardar = useCallback(
    (nueva: EvolucionNueva) =>
      escribir(
        () => guardarEvolucion(nueva),
        (fila) => {
          setEvoluciones((previas) => [...previas, fila].sort(compararEvoluciones));
          setLecturaSinFilas(false);
        },
        "No se pudo guardar la evolución.",
        "La evolución se guardó pero no devolvió la fila: no se puede confirmar el registro.",
      ),
    [escribir],
  );

  const reemplazar = useCallback((fila: EvolucionClinica) => {
    setEvoluciones((previas) =>
      previas.map((evolucion) => (evolucion.id === fila.id ? fila : evolucion)),
    );
  }, []);

  const actualizar = useCallback(
    (evolucion: EvolucionClinica) =>
      escribir(
        () => actualizarEvolucion(evolucion),
        reemplazar,
        "No se pudo actualizar la evolución.",
        "No se confirmó la actualización: la operación no afectó a ninguna fila. Revisa tus permisos y recarga la lista.",
      ),
    [escribir, reemplazar],
  );

  const marcarProximaAtencion = useCallback(
    (evolucion: EvolucionClinica, fecha: string | null) =>
      escribir(
        () => registrarProximaAtencion(evolucion, fecha),
        reemplazar,
        "No se pudo registrar la próxima atención.",
        "No se confirmó la próxima atención: la operación no afectó a ninguna fila. Revisa tus permisos y recarga la lista.",
      ),
    [escribir, reemplazar],
  );

  return {
    evoluciones,
    cargando,
    guardando,
    error,
    lecturaSinFilas,
    cargar,
    recargar,
    guardar,
    actualizar,
    marcarProximaAtencion,
  };
}

/**
 * Historial de atenciones del paciente (US-2.7).
 *
 * Une dos fuentes que ya existen y viven en módulos distintos —las citas del
 * módulo 07 (que el store ya tiene en memoria) y las evoluciones del módulo 06—
 * en una sola línea de tiempo ordenada y expandible.
 *
 * Es lógica pura: recibe las listas ya cargadas y no toca red, React ni el
 * store. Así la vista `HistorialAtenciones.tsx` y este agregador se pueden probar
 * por separado con `node --test` (ver `historialAtenciones.test.ts`), y el cruce
 * entre las dos formas de dato queda cubierto sin depender de Supabase.
 */

import type { Cita, EstadoCita } from "@/types";
import type { EvolucionClinica } from "@/features/evolucion/tipos";

export type TipoAtencion = "cita" | "evolucion";

/** Un dato con su etiqueta, listo para pintar en el detalle de la atención. */
export interface DetalleAtencion {
  etiqueta: string;
  valor: string;
}

/** Una atención ya normalizada para la línea de tiempo. */
export interface AtencionHistorial {
  id: string;
  tipo: TipoAtencion;
  /** `YYYY-MM-DD`; se compara como texto, que para ISO equivale a fecha. */
  fecha: string;
  /** `HH:MM` para las citas; `null` en las evoluciones. */
  hora: string | null;
  titulo: string;
  resumen: string;
  /** Estado de la cita, para el color del punto en la línea de tiempo. */
  estado: EstadoCita | null;
  detalles: DetalleAtencion[];
}

const ETIQUETA_ESTADO_CITA: Record<EstadoCita, string> = {
  reservada: "Reservada",
  confirmada: "Confirmada",
  atendida: "Atendida",
  cancelada: "Cancelada",
};

/** Quita los detalles sin valor para no dejar renglones con la etiqueta sola. */
function detallesConValor(detalles: DetalleAtencion[]): DetalleAtencion[] {
  return detalles.filter((detalle) => detalle.valor.trim().length > 0);
}

/** Normaliza una cita (módulo 07) a una atención del historial. */
export function atencionDesdeCita(cita: Cita): AtencionHistorial {
  const motivo = cita.motivoConsulta.trim();
  return {
    id: `cita-${cita.id}`,
    tipo: "cita",
    fecha: cita.fechaCita,
    hora: cita.horaInicio || null,
    titulo: motivo || "Cita odontológica",
    resumen: ETIQUETA_ESTADO_CITA[cita.estado] ?? cita.estado,
    estado: cita.estado,
    detalles: detallesConValor([
      { etiqueta: "Horario", valor: `${cita.horaInicio} – ${cita.horaFin}` },
      { etiqueta: "Estado", valor: ETIQUETA_ESTADO_CITA[cita.estado] ?? cita.estado },
      { etiqueta: "Notas", valor: cita.notas ?? "" },
    ]),
  };
}

/** Normaliza una evolución (módulo 06) a una atención del historial. */
export function atencionDesdeEvolucion(evolucion: EvolucionClinica): AtencionHistorial {
  const procedimiento = evolucion.procedimientoRealizado.trim();
  return {
    id: `evolucion-${evolucion.id}`,
    tipo: "evolucion",
    fecha: evolucion.fechaConsulta,
    hora: null,
    titulo: procedimiento || "Evolución clínica",
    resumen: evolucion.motivoConsulta.trim() || "Consulta registrada",
    estado: null,
    detalles: detallesConValor([
      {
        etiqueta: "Pieza",
        valor: evolucion.numeroPieza === null ? "" : `Pieza ${evolucion.numeroPieza}`,
      },
      { etiqueta: "Observaciones", valor: evolucion.observaciones },
      { etiqueta: "Indicaciones", valor: evolucion.indicaciones },
      {
        etiqueta: "Próxima atención",
        valor: evolucion.proximaAtencion ?? "",
      },
    ]),
  };
}

/**
 * Orden descendente: la atención más reciente primero.
 *
 * `YYYY-MM-DD` se compara como texto de forma válida. El desempate por hora deja
 * las citas de la tarde antes que las de la mañana del mismo día; el id final
 * mantiene el orden estable entre dos atenciones idénticas en fecha y hora.
 */
function compararAtenciones(a: AtencionHistorial, b: AtencionHistorial): number {
  if (a.fecha !== b.fecha) return a.fecha < b.fecha ? 1 : -1;
  const horaA = a.hora ?? "";
  const horaB = b.hora ?? "";
  if (horaA !== horaB) return horaA < horaB ? 1 : -1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? 1 : -1;
}

/** Une citas y evoluciones en una sola línea de tiempo ordenada. */
export function construirHistorialAtenciones(
  citas: readonly Cita[],
  evoluciones: readonly EvolucionClinica[],
): AtencionHistorial[] {
  return [
    ...citas.map(atencionDesdeCita),
    ...evoluciones.map(atencionDesdeEvolucion),
  ].sort(compararAtenciones);
}

/** Conteo por tipo, para el encabezado de la vista. */
export function contarAtenciones(atenciones: readonly AtencionHistorial[]): {
  total: number;
  citas: number;
  evoluciones: number;
} {
  let citas = 0;
  let evoluciones = 0;
  for (const atencion of atenciones) {
    if (atencion.tipo === "cita") citas++;
    else evoluciones++;
  }
  return { total: atenciones.length, citas, evoluciones };
}

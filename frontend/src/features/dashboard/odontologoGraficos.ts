/**
 * Agregación de hallazgos clínicos para el panel del odontólogo (T-13.7).
 *
 * Lógica pura (sin React ni Supabase) para poder probarla con `node --test`.
 *
 * Cuenta piezas del odontograma por condición, NO registros de la tabla
 * `diagnosticos`: cada condición registrada en la ficha de un paciente cuenta
 * una vez. `sano` no es un hallazgo (es la ausencia de problema), así que se
 * excluye. El resultado alimenta directamente `ClinicalFindingsChart`.
 */

import type { CondicionDiente, CondicionPieza } from "@/types";

/**
 * Cuenta, por condición, cuántas piezas registradas (de todos los pacientes)
 * tienen esa condición. Excluye `sano`.
 */
export function contarHallazgos(
  odontogramas: Record<string, readonly CondicionPieza[]>,
): Partial<Record<CondicionDiente, number>> {
  const conteos: Partial<Record<CondicionDiente, number>> = {};

  for (const condiciones of Object.values(odontogramas)) {
    for (const { condicion } of condiciones) {
      if (condicion === "sano") continue;
      conteos[condicion] = (conteos[condicion] ?? 0) + 1;
    }
  }

  return conteos;
}

/** Total de hallazgos (todas las condiciones distintas de `sano`). */
export function totalHallazgos(conteos: Partial<Record<CondicionDiente, number>>): number {
  return Object.values(conteos).reduce((acc, n) => acc + (n ?? 0), 0);
}

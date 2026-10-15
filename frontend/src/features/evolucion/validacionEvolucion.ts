/**
 * Validación pura del número de pieza dental (notación FDI).
 *
 * Separado de `EvolutionForm.tsx` para poder probarlo con `node --test` sin
 * React. Solo cubre piezas permanentes (11–48): el odontograma actual no
 * maneja deciduos (51–85), así que validarlos aquí sería aceptar un valor que
 * el resto del sistema no sabe representar.
 */

/** Pieza FDI más baja posible: 1.1 (incisivo central superior derecho). */
export const PIEZA_FDI_MINIMA = 11;

/** Pieza FDI más alta posible: 4.8 (tercer molar inferior izquierdo). */
export const PIEZA_FDI_MAXIMA = 48;

/**
 * La notación FDI usa dos dígitos: el primero es el cuadrante (1–4) y el
 * segundo la posición dentro del cuadrante (1–8). Un rango min/max simple
 * (11–48) no basta: aceptaría 19, 20, 29, 30, 39 o 40, que no son piezas
 * reales porque ningún cuadrante tiene más de 8 posiciones.
 */
export function esPiezaFdiValida(pieza: number): boolean {
  if (!Number.isInteger(pieza)) return false;
  if (pieza < PIEZA_FDI_MINIMA || pieza > PIEZA_FDI_MAXIMA) return false;
  const posicion = pieza % 10;
  return posicion >= 1 && posicion <= 8;
}

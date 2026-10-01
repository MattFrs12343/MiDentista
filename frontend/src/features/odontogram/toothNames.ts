const NOMBRE_POSICION: Record<number, string> = {
  1: "Incisivo central",
  2: "Incisivo lateral",
  3: "Canino",
  4: "Primer premolar",
  5: "Segundo premolar",
  6: "Primer molar",
  7: "Segundo molar",
  8: "Tercer molar",
};

const DESCRIPTOR_CUADRANTE: Record<number, string> = {
  1: "superior derecho",
  2: "superior izquierdo",
  3: "inferior izquierdo",
  4: "inferior derecho",
};

export function nombrePieza(pieza: number): string {
  const cuadrante = Math.floor(pieza / 10);
  const posicion = pieza % 10;
  const nombre = NOMBRE_POSICION[posicion] ?? "Pieza dental";
  const descriptor = DESCRIPTOR_CUADRANTE[cuadrante] ?? "";
  return descriptor ? `${nombre} ${descriptor}` : nombre;
}

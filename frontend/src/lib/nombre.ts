/**
 * Los nombres de personal vienen de la BD como `nombre_completo`, que incluye
 * el tratamiento ("Dr. Ayrthon Rojas Orellana"). Para saludar y para las
 * iniciales del avatar hay que saltarse ese tratamiento.
 */

const TRATAMIENTOS = new Set([
  "dr",
  "dra",
  "drs",
  "sr",
  "sra",
  "srta",
  "od",
  "lic",
  "ing",
]);

function esTratamiento(pieza: string) {
  return TRATAMIENTOS.has(pieza.toLowerCase().replace(/\./g, ""));
}

export function partesNombre(nombre: string): string[] {
  const partes = nombre.split(" ").filter(Boolean);
  while (partes.length > 1 && esTratamiento(partes[0])) partes.shift();
  return partes;
}

export function primerNombre(nombre: string): string {
  const partes = partesNombre(nombre);
  const primero = partes[0] ?? "";
  return esTratamiento(primero) ? "" : primero;
}

export function iniciales(nombre: string): string {
  const partes = partesNombre(nombre);
  const dos = partes.length >= 2 ? [partes[0], partes[1]] : partes;
  return dos.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

/**
 * Export CSV — módulo 17, pieza C. Sin `papaparse`: con el volumen de datos
 * de estos reportes (listas de pacientes/personal), armar el string a mano
 * alcanza (ver docs/modules/17-asistente-ia/README.md, decisión C2/C3).
 */

/** RFC 4180 básico: entrecomilla si el campo trae coma, comilla o salto de línea. */
function escaparCampoCsv(valor: string): string {
  if (/[",\n]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

export function construirCsv(
  columnas: readonly string[],
  filas: readonly (readonly (string | number)[])[],
): string {
  const lineas = [columnas, ...filas].map((fila) =>
    fila.map((valor) => escaparCampoCsv(String(valor))).join(","),
  );
  return lineas.join("\r\n");
}

/** Dispara la descarga del navegador. No es lógica pura: no se testea acá
 * (igual que el resto de las llamadas a APIs del navegador en este repo). */
export function descargarCsv(nombreArchivo: string, contenidoCsv: string): void {
  // BOM UTF-8 al principio: sin él, Excel en Windows muestra mal tildes/ñ.
  const blob = new Blob(["﻿", contenidoCsv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}

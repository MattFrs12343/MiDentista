import { clavesDe, distanciaEdicion } from "./interprete.ts";

/**
 * Lógica pura del flujo de preguntas antes de armar un reporte (formato →
 * alcance) — ver docs/modules/17-asistente-ia/README.md. Separado de
 * `AsistenteFlotante.tsx` para poder testearlo bajo `node --test` plano,
 * igual que `interprete.ts`/`conversacion.ts`.
 */

export type TipoReporteAsistente = "reporte" | "reporte_personal";
export type PasoReporte = "formato" | "fechas" | "paciente" | "area" | "clinica";

/**
 * "pacientes" tiene fecha de alta y un paciente puntual; "personal" no
 * tiene fecha de alta registrada, así que en su lugar se pregunta
 * especialidad y clínica.
 */
export const PASOS_REPORTE: Record<TipoReporteAsistente, readonly PasoReporte[]> = {
  reporte: ["formato", "fechas", "paciente"],
  reporte_personal: ["formato", "area", "clinica"],
};

export interface EstadoReporte {
  tipo: TipoReporteAsistente;
  indicePaso: number;
  formato?: "pdf" | "csv";
  rangoDias?: number | null;
  especialidad?: string | null;
}

export function preguntaDelPaso(paso: PasoReporte): string {
  switch (paso) {
    case "formato":
      return "Antes de armarlo: ¿en qué formato lo querés, PDF o CSV?";
    case "fechas":
      return "¿De qué rango de fechas? Decime \"todos\" o algo como \"últimos 30 días\".";
    case "paciente":
      return "¿Es de un paciente en específico, o de todos?";
    case "area":
      return "¿De una especialidad en específico, o de todas? (El personal no tiene fecha de alta registrada, así que no te pregunto por fechas acá.)";
    case "clinica":
      return "¿De una clínica en específico, o de todas?";
  }
}

/** "últimos 30 días", "última semana", etc. `null` = sin filtro (incluye
 * "todos" y cualquier frase que no reconozca — nunca traba el flujo por no
 * entender una fecha). */
export function interpretarRangoFechas(texto: string): number | null {
  const normalizado = clavesDe(texto);
  const dias = normalizado.match(/ultimos?\s+(\d+)\s+dias?/);
  if (dias) return Number(dias[1]);
  const semanas = normalizado.match(/ultimas?\s+(\d+)\s+semanas?/);
  if (semanas) return Number(semanas[1]) * 7;
  const meses = normalizado.match(/ultimos?\s+(\d+)\s+mes(?:es)?/);
  if (meses) return Number(meses[1]) * 30;
  if (/ultima semana|una semana/.test(normalizado)) return 7;
  if (/ultimo mes|un mes/.test(normalizado)) return 30;
  return null;
}

export function dentroDeRango(fechaIso: string | null | undefined, dias: number): boolean {
  if (!fechaIso) return false;
  const fecha = new Date(fechaIso).getTime();
  if (Number.isNaN(fecha)) return false;
  return fecha >= Date.now() - dias * 24 * 60 * 60 * 1000;
}

export function esRespuestaTodos(texto: string): boolean {
  return /\btod[oa]s?\b|cualquiera|\blista\b|\btodo el\b/.test(clavesDe(texto));
}

/**
 * "CSV" dicho en voz alta se deletrea letra por letra, y el reconocimiento
 * de voz lo transcribe mal seguido ("ccb", "ssb", "ssv"...). `clavesDe` ya
 * dobla v→b, así que esas tres variantes quedan a distancia 1 de "csv"
 * normalizado ("csb") — se reutiliza la misma tolerancia difusa del motor
 * en vez de exigir una coincidencia exacta.
 */
export function detectarFormato(texto: string): "pdf" | "csv" | null {
  const csvClave = clavesDe("csv");
  const pdfClave = clavesDe("pdf");
  const palabras = clavesDe(texto).split(" ").filter(Boolean);
  for (const palabra of palabras) {
    if (palabra === csvClave || distanciaEdicion(palabra, csvClave) <= 1) return "csv";
    if (palabra === pdfClave || distanciaEdicion(palabra, pdfClave) <= 1) return "pdf";
  }
  return null;
}

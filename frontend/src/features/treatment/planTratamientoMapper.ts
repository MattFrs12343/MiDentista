import { exigirUuid } from "./diagnosticoMapper.ts";
import type { ContenidoPlanTratamiento, EstadoPlanTratamiento, PlanTratamientoPaciente } from "./tipos.ts";

export const ESTADOS_PLAN: readonly EstadoPlanTratamiento[] = ["propuesto", "aceptado", "en_proceso", "completado", "cancelado"];

/** Mismo orden que PostgreSQL, incluidos microsegundos y fechas legadas NULL. */
export function compararPlanes(a: PlanTratamientoPaciente, b: PlanTratamientoPaciente): number {
  if (a.creadoEn === null && b.creadoEn !== null) return 1;
  if (b.creadoEn === null && a.creadoEn !== null) return -1;
  if (a.creadoEn && b.creadoEn) {
    const diferencia = Date.parse(b.creadoEn) - Date.parse(a.creadoEn);
    if (diferencia !== 0) return diferencia;
    const fraccion = (f: string) => Number((f.match(/\.(\d+)/)?.[1] ?? "").padEnd(6, "0").slice(3, 6));
    const micros = fraccion(b.creadoEn) - fraccion(a.creadoEn);
    if (micros !== 0) return micros;
  }
  return a.id === b.id ? 0 : a.id < b.id ? 1 : -1;
}

export function tituloParaGuardar(titulo: string): string {
  if (typeof titulo !== "string" || !titulo.trim()) throw new Error("El título del plan es obligatorio.");
  return titulo.trim();
}

export function notasParaGuardar(notas: string): string {
  if (typeof notas !== "string") throw new Error("Las notas deben ser texto.");
  return notas;
}

export function planParaGuardar(datos: ContenidoPlanTratamiento) {
  return { titulo: tituloParaGuardar(datos.titulo), notas: notasParaGuardar(datos.notas) };
}

function fecha(valor: unknown): string | null {
  if (valor === null) return null;
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(valor) || !Number.isFinite(Date.parse(valor))) {
    throw new Error("El plan recibido tiene una fecha inválida.");
  }
  return valor;
}

export function planDesdeFila(valor: unknown): PlanTratamientoPaciente {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new Error("No se confirmó una fila de plan válida.");
  const f = valor as Record<string, unknown>;
  for (const campo of ["id", "clinica_id", "paciente_id", "odontologo_id"]) exigirUuid(f[campo], campo);
  if (!(f.titulo === null || (typeof f.titulo === "string" && f.titulo.trim()))
      || !(f.notas === null || typeof f.notas === "string") || !ESTADOS_PLAN.includes(f.estado as EstadoPlanTratamiento)) {
    throw new Error("El plan recibido tiene título, notas o estado inválidos.");
  }
  const costo = typeof f.costo_total === "number" ? f.costo_total
    : typeof f.costo_total === "string" && /^\d+(\.\d{1,2})?$/.test(f.costo_total) ? Number(f.costo_total) : NaN;
  if (!Number.isFinite(costo) || costo < 0 || costo > 99999999.99) throw new Error("El costo total recibido es inválido.");
  return { id: (f.id as string).toLowerCase(), clinicaId: (f.clinica_id as string).toLowerCase(),
    pacienteId: (f.paciente_id as string).toLowerCase(), odontologoId: (f.odontologo_id as string).toLowerCase(),
    titulo: f.titulo as string | null, notas: (f.notas as string | null) ?? "", estado: f.estado as EstadoPlanTratamiento,
    costoTotal: costo, creadoEn: fecha(f.creado_en), actualizadoEn: fecha(f.actualizado_en) };
}

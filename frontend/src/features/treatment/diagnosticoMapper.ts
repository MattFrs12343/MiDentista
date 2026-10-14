import { esUuid } from "../clinical/clinicalHistoryMapper.ts";
import type { ContenidoDiagnostico, DiagnosticoPaciente, EstadoDiagnostico } from "./tipos.ts";
export { esUuid };

export const ESTADOS_DIAGNOSTICO: readonly EstadoDiagnostico[] = ["activo", "inactivo", "resuelto"];

export function exigirUuid(valor: unknown, campo: string): asserts valor is string {
  if (typeof valor !== "string" || !esUuid(valor)) throw new Error(`${campo} debe ser un UUID real de Supabase.`);
}

export function esEstadoDiagnostico(valor: unknown): valor is EstadoDiagnostico {
  return ESTADOS_DIAGNOSTICO.some((estado) => estado === valor);
}

/** Mismos rangos FDI permanentes/temporales que T-5.1; NULL es opcional. */
export function esPiezaDiagnostico(valor: unknown): valor is number | null {
  if (valor === null) return true;
  if (typeof valor !== "number" || !Number.isInteger(valor)) return false;
  const cuadrante = Math.floor(valor / 10);
  const pieza = valor % 10;
  return (cuadrante >= 1 && cuadrante <= 4 && pieza >= 1 && pieza <= 8)
    || (cuadrante >= 5 && cuadrante <= 8 && pieza >= 1 && pieza <= 5);
}

export function piezaDesdeTexto(texto: string): number | null {
  const limpio = texto.trim();
  if (limpio === "") return null;
  if (!/^\d{2}$/.test(limpio) || !esPiezaDiagnostico(Number(limpio))) {
    throw new Error("La pieza debe ser un número FDI válido: 11–18, 21–28, 31–38, 41–48, 51–55, 61–65, 71–75 u 81–85.");
  }
  return Number(limpio);
}

export function diagnosticoParaGuardar(datos: ContenidoDiagnostico) {
  if (typeof datos.descripcion !== "string" || !datos.descripcion.trim()) throw new Error("La descripción es obligatoria.");
  if (!esPiezaDiagnostico(datos.numeroPieza)) throw new Error("La pieza dental no es válida.");
  if (typeof datos.observaciones !== "string") throw new Error("Las observaciones deben ser texto.");
  // Lista blanca: nunca propagar identificadores, autor, estado ni timestamps.
  return { descripcion: datos.descripcion.trim(), numero_pieza: datos.numeroPieza, observaciones: datos.observaciones };
}

function fechaNullable(valor: unknown, campo: string): string | null {
  if (valor === null) return null; // El esquema permite fechas legadas NULL.
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(valor) || !Number.isFinite(Date.parse(valor))) {
    throw new Error(`Supabase devolvió ${campo} inválido.`);
  }
  return valor;
}

export function diagnosticoDesdeFila(valor: unknown): DiagnosticoPaciente {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new Error("Supabase no devolvió un diagnóstico válido.");
  const fila = valor as Record<string, unknown>;
  for (const campo of ["id", "paciente_id", "clinica_id", "odontologo_id"]) exigirUuid(fila[campo], campo);
  if (typeof fila.descripcion !== "string" || !fila.descripcion.trim()
      || !(fila.observaciones === null || typeof fila.observaciones === "string")
      || !esPiezaDiagnostico(fila.numero_pieza) || !esEstadoDiagnostico(fila.estado)) {
    throw new Error("El diagnóstico recibido tiene descripción, pieza, observaciones o estado inválidos.");
  }
  return {
    id: (fila.id as string).toLowerCase(), pacienteId: (fila.paciente_id as string).toLowerCase(),
    clinicaId: (fila.clinica_id as string).toLowerCase(), odontologoId: (fila.odontologo_id as string).toLowerCase(),
    descripcion: fila.descripcion, numeroPieza: fila.numero_pieza, observaciones: fila.observaciones ?? "",
    estado: fila.estado, fechaDiagnostico: fechaNullable(fila.fecha_diagnostico, "fecha_diagnostico"),
    creadoEn: fechaNullable(fila.creado_en, "creado_en"), actualizadoEn: fechaNullable(fila.actualizado_en, "actualizado_en"),
  };
}

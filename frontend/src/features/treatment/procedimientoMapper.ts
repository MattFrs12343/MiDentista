import { exigirUuid, esPiezaDiagnostico } from "./diagnosticoMapper.ts";
import type { ContenidoProcedimiento, EstadoProcedimiento, PrioridadProcedimiento, ProcedimientoTratamiento } from "./tipos.ts";

export const PRIORIDADES_PROCEDIMIENTO: readonly PrioridadProcedimiento[] = ["urgente", "alta", "normal", "baja"];
export const ESTADOS_PROCEDIMIENTO: readonly EstadoProcedimiento[] = ["pendiente", "en_proceso", "completado", "cancelado"];

export function validarCostoProcedimiento(costo: number) {
  if (typeof costo !== "number" || !Number.isFinite(costo) || costo < 0 || costo > 99999999.99
      || costo !== Number(costo.toFixed(2))) {
    throw new Error("El costo debe ser finito, entre 0 y 99999999.99, con hasta dos decimales.");
  }
  return costo;
}

export function procedimientoParaGuardar(datos: ContenidoProcedimiento) {
  if (typeof datos.descripcion !== "string" || !datos.descripcion.trim()) throw new Error("La descripción es obligatoria.");
  if (!esPiezaDiagnostico(datos.numeroPieza)) throw new Error("La pieza debe ser FDI válida o estar vacía.");
  if (!PRIORIDADES_PROCEDIMIENTO.includes(datos.prioridad)) throw new Error("La prioridad no es válida.");
  if (!ESTADOS_PROCEDIMIENTO.includes(datos.estado)) throw new Error("El estado del procedimiento no es válido.");
  return { descripcion: datos.descripcion.trim(), numero_pieza: datos.numeroPieza, prioridad: datos.prioridad,
    costo: validarCostoProcedimiento(datos.costo), estado: datos.estado };
}

function fecha(valor: unknown) {
  if (valor === null) return null;
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(valor) || !Number.isFinite(Date.parse(valor))) {
    throw new Error("El procedimiento recibido tiene una fecha inválida.");
  }
  return valor;
}

export function procedimientoDesdeFila(valor: unknown): ProcedimientoTratamiento {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new Error("No se confirmó una fila de procedimiento válida.");
  const f = valor as Record<string, unknown>;
  for (const campo of ["id", "clinica_id", "plan_tratamiento_id"]) exigirUuid(f[campo], campo);
  if (f.servicio_id !== null) exigirUuid(f.servicio_id, "servicio_id");
  const costo = typeof f.costo === "number" ? f.costo
    : typeof f.costo === "string" && /^\d+(\.\d{1,2})?$/.test(f.costo) ? Number(f.costo) : NaN;
  const contenido = procedimientoParaGuardar({ descripcion: f.descripcion as string, numeroPieza: f.numero_pieza as number | null,
    costo, prioridad: f.prioridad as PrioridadProcedimiento, estado: f.estado as EstadoProcedimiento });
  return { id: (f.id as string).toLowerCase(), clinicaId: (f.clinica_id as string).toLowerCase(),
    planTratamientoId: (f.plan_tratamiento_id as string).toLowerCase(), servicioId: (f.servicio_id as string | null)?.toLowerCase() ?? null,
    descripcion: f.descripcion as string, numeroPieza: contenido.numero_pieza, prioridad: contenido.prioridad,
    costo: contenido.costo, estado: contenido.estado, creadoEn: fecha(f.creado_en), actualizadoEn: fecha(f.actualizado_en) };
}

export function compararProcedimientos(a: ProcedimientoTratamiento, b: ProcedimientoTratamiento) {
  if (a.creadoEn === null && b.creadoEn !== null) return 1;
  if (b.creadoEn === null && a.creadoEn !== null) return -1;
  if (a.creadoEn && b.creadoEn) {
    const diferencia = Date.parse(a.creadoEn) - Date.parse(b.creadoEn);
    if (diferencia) return diferencia;
    const fraccion = (f: string) => Number((f.match(/\.(\d+)/)?.[1] ?? "").padEnd(6, "0").slice(3, 6));
    const micros = fraccion(a.creadoEn) - fraccion(b.creadoEn);
    if (micros) return micros;
  }
  return a.id === b.id ? 0 : a.id < b.id ? -1 : 1;
}

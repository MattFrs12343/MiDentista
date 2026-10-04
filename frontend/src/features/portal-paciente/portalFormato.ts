/** Utilidades de formato del portal del paciente. */

/** fecha ISO (YYYY-MM-DD) -> "3 de octubre de 2026". */
export function formatearFecha(fecha: string | null | undefined): string {
  if (!fecha) return "—";
  const [anio, mes, dia] = fecha.slice(0, 10).split("-").map(Number);
  if (!anio || !mes || !dia) return fecha;
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-BO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** fecha ISO -> "03/10/2026". */
export function formatearFechaCorta(fecha: string | null | undefined): string {
  if (!fecha) return "—";
  const [anio, mes, dia] = fecha.slice(0, 10).split("-").map(Number);
  if (!anio || !mes || !dia) return fecha;
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-BO");
}

export function formatearMoneda(monto: number, simbolo = "Bs"): string {
  return `${simbolo} ${monto.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "HH:MM:SS" -> "HH:MM". */
export function formatearHora(hora: string | null | undefined): string {
  if (!hora) return "—";
  return hora.slice(0, 5);
}

const ETIQUETAS_ESTADO: Record<string, string> = {
  reservada: "Reservada",
  confirmada: "Confirmada",
  atendida: "Atendida",
  cancelada: "Cancelada",
  propuesto: "Propuesto",
  aceptado: "Aceptado",
  en_proceso: "En proceso",
  completado: "Completado",
  pendiente: "Pendiente",
  borrador: "Borrador",
  enviado: "Enviado",
  rechazado: "Rechazado",
  activo: "Activo",
  inactivo: "Inactivo",
  resuelto: "Resuelto",
  confirmado: "Confirmado",
};

export function etiquetaEstado(estado: string | null | undefined): string {
  if (!estado) return "—";
  return ETIQUETAS_ESTADO[estado] ?? estado;
}

export type TonoEstado = "neutral" | "blue" | "red" | "green" | "yellow" | "violet";

export function tonoEstado(estado: string | null | undefined): TonoEstado {
  switch (estado) {
    case "confirmada":
    case "confirmado":
    case "aceptado":
    case "completado":
    case "resuelto":
      return "green";
    case "reservada":
    case "enviado":
    case "en_proceso":
    case "activo":
      return "blue";
    case "cancelada":
    case "rechazado":
      return "red";
    case "propuesto":
      return "violet";
    case "pendiente":
    case "borrador":
      return "yellow";
    default:
      return "neutral";
  }
}

/** Grado de una pieza (1..n) al estilo FDI: 1=cuadrante sup. derecho, etc.
 * Solo se usa para numerar la grilla de lectura del odontograma. */
export function etiquetaPieza(pieza: number): string {
  return String(pieza).padStart(2, "0");
}

import { puedeEditarDiagnostico } from "./diagnosticoPermisos.ts";
import type { DiagnosticoPaciente, EstadoDiagnostico, PerfilDiagnosticos } from "./tipos.ts";

export const DIAGNOSTICOS_POR_PAGINA = 20;
export interface ResultadoListaDiagnosticos {
  clave: string;
  estado: "loading" | "success" | "error";
  diagnosticos: DiagnosticoPaciente[];
  perfil: PerfilDiagnosticos | null;
  error: string | null;
}

export const ETIQUETAS_ESTADO_DIAGNOSTICO: Record<EstadoDiagnostico, string> = {
  activo: "Activo", inactivo: "Inactivo", resuelto: "Resuelto",
};

/** DESC, NULLS LAST y UUID DESC. Conservar microsegundos de PostgreSQL cuando
 * Date.parse redondea dos instantes distintos al mismo milisegundo. */
export function compararDiagnosticos(a: DiagnosticoPaciente, b: DiagnosticoPaciente): number {
  if (a.creadoEn === null && b.creadoEn !== null) return 1;
  if (b.creadoEn === null && a.creadoEn !== null) return -1;
  if (a.creadoEn && b.creadoEn) {
    const milisegundos = Date.parse(b.creadoEn) - Date.parse(a.creadoEn);
    if (milisegundos !== 0) return milisegundos;
    const fraccion = (fecha: string) => Number((fecha.match(/\.(\d+)/)?.[1] ?? "").padEnd(6, "0").slice(3, 6));
    const microsegundos = fraccion(b.creadoEn) - fraccion(a.creadoEn);
    if (microsegundos !== 0) return microsegundos;
  }
  return a.id === b.id ? 0 : a.id < b.id ? 1 : -1;
}

export function incorporarDiagnosticoConfirmado(lista: DiagnosticoPaciente[], confirmado: DiagnosticoPaciente) {
  return [...lista.filter((d) => d.id !== confirmado.id), confirmado].sort(compararDiagnosticos);
}

export function presentarDiagnostico(d: DiagnosticoPaciente, perfil: PerfilDiagnosticos | null) {
  // DATE no debe pasar por UTC: en Bolivia podría mostrarse el día anterior.
  const fecha = d.fechaDiagnostico ? d.fechaDiagnostico.slice(0, 10).split("-").reverse().join("/") : "Sin fecha registrada";
  return {
    diagnostico: d,
    pieza: d.numeroPieza !== null ? `Pieza ${d.numeroPieza}` : null,
    observaciones: d.observaciones.trim() ? d.observaciones : null,
    estado: ETIQUETAS_ESTADO_DIAGNOSTICO[d.estado],
    fecha,
    actualizado: d.actualizadoEn ? new Date(d.actualizadoEn).toLocaleString("es-BO") : "Sin fecha de actualización registrada",
    editable: puedeEditarDiagnostico(perfil, d),
  };
}

/** Cuatro ramas excluyentes: nunca presentar un error como una lista vacía. */
export function presentarListaDiagnosticos(datos: ResultadoListaDiagnosticos, paginaSolicitada: number) {
  if (datos.estado === "loading") return { tipo: "loading" as const, mensaje: "Cargando diagnósticos y permisos…" };
  if (datos.estado === "error") return { tipo: "error" as const,
    mensaje: "No se pudieron cargar los diagnósticos. Reintenta la carga; si continúa el problema, revisa tu sesión y conexión.",
    detalle: datos.error ?? "No se confirmó una respuesta válida." };
  if (datos.diagnosticos.length === 0) return { tipo: "vacio" as const, mensaje: "No hay diagnósticos visibles para este paciente." };
  const ordenados = [...datos.diagnosticos].sort(compararDiagnosticos);
  const totalPaginas = Math.ceil(ordenados.length / DIAGNOSTICOS_POR_PAGINA);
  const pagina = Math.min(totalPaginas, Math.max(1, Number.isFinite(paginaSolicitada) ? Math.floor(paginaSolicitada) : 1));
  const inicio = (pagina - 1) * DIAGNOSTICOS_POR_PAGINA;
  return { tipo: "resultados" as const, pagina, totalPaginas, total: ordenados.length,
    desde: inicio + 1, hasta: Math.min(inicio + DIAGNOSTICOS_POR_PAGINA, ordenados.length),
    filas: ordenados.slice(inicio, inicio + DIAGNOSTICOS_POR_PAGINA).map((d) => presentarDiagnostico(d, datos.perfil)) };
}

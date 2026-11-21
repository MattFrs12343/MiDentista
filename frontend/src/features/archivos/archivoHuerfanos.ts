export type CandidatoHuerfano = { ruta: string; clinicaId: string; tipo: "A" | "B" | "indeterminado"; fecha: string | null; motivo: string | null };
export type ReporteHuerfanos = { estado: "completo" | "indeterminado"; fecha: string; fuente: "catalogo_storage"; totalCandidatos: number; candidatos: CandidatoHuerfano[] };
export type ObjetoInventario = { bucket_id: string; name: string; archived_at: string | null; created_at: string | null };
export type RegistroInventario = { ruta: string; clinica_id: string; creado_en: string };

/** Comparación pura, sin cliente Storage ni capacidad de eliminar. Equivale al
 * cruce SQL administrativo. Un inventario incompleto nunca demuestra ausencia. */
export function compararInventario(objetos: readonly ObjetoInventario[], filas: readonly RegistroInventario[], opciones: {
  completo: boolean; ahora: number; pendientes?: readonly string[]; clinicaId?: string;
}): ReporteHuerfanos {
  const reporte: ReporteHuerfanos = { estado: opciones.completo ? "completo" : "indeterminado",
    fecha: new Date(opciones.ahora).toISOString(), fuente: "catalogo_storage", totalCandidatos: 0, candidatos: [] };
  if (!opciones.completo) return reporte;
  const activos = objetos.filter((o) => o.bucket_id === "archivos-clinica" && o.archived_at === null);
  const rutas = new Set(activos.map((o) => o.name));
  const registradas = new Set(filas.map((f) => f.ruta));
  for (const objeto of activos) {
    if (registradas.has(objeto.name)) continue;
    const motivo = opciones.pendientes?.includes(objeto.name) ? "operacion_pendiente"
      : !objeto.created_at || !Number.isFinite(Date.parse(objeto.created_at)) ? "fecha_desconocida"
      : Date.parse(objeto.created_at) > opciones.ahora - 86_400_000 ? "periodo_gracia" : null;
    reporte.candidatos.push({ ruta: objeto.name, clinicaId: objeto.name.split("/")[0], fecha: objeto.created_at,
      tipo: motivo ? "indeterminado" : "A", motivo });
  }
  for (const fila of filas) if (!rutas.has(fila.ruta)) reporte.candidatos.push({ ruta: fila.ruta,
    clinicaId: fila.clinica_id, fecha: fila.creado_en, tipo: "B", motivo: null });
  reporte.candidatos = reporte.candidatos.filter((c) => !opciones.clinicaId || c.clinicaId === opciones.clinicaId)
    .sort((a,b) => a.ruta.localeCompare(b.ruta));
  reporte.totalCandidatos = reporte.candidatos.length;
  return reporte;
}

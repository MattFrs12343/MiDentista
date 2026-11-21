import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cargarAuditoriaArchivos } from "./archivoAuditoriaService.ts";
import type { ReporteHuerfanos } from "./archivoHuerfanos.ts";

/** Preparado para AdminPage por Matías. El rol visual NO autoriza el backend. */
export function ArchivosAuditoriaPanel({ rol, clinicaId }: { rol: string | null; clinicaId?: string }) {
  // Remontar por clínica desde el integrador para aislar resultados anteriores.
  return rol === "superadmin" ? <Panel key={clinicaId ?? "global"} clinicaId={clinicaId} /> : null;
}
function Panel({ clinicaId }: { clinicaId?: string }) {
  const [reporte, setReporte] = useState<ReporteHuerfanos | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);
  const bloqueo = useRef(false);
  async function consultar() {
    if (bloqueo.current) return;
    bloqueo.current = true; setCargando(true); setError(false); setReporte(null);
    try { setReporte(await cargarAuditoriaArchivos(clinicaId)); }
    catch { setError(true); }
    finally { bloqueo.current = false; setCargando(false); }
  }
  return <section aria-label="Auditoría de archivos" className="flex min-w-0 flex-col gap-3 rounded-xl border border-line p-4">
    <h2 className="font-semibold text-ink">Auditoría de Archivos e Imágenes</h2>
    <p className="text-sm text-ink-muted">Solo detección en el catálogo de Storage. No verifica los bytes físicos ni elimina objetos o registros. Gracia de 24 horas para subidas recientes.</p>
    <Button type="button" disabled={cargando} onClick={() => { void consultar(); }}>{cargando ? "Consultando…" : "Detectar candidatos"}</Button>
    {error || reporte?.estado === "indeterminado" ? <p role="alert">Resultado indeterminado. No se pudo completar el inventario; no implica que falten archivos.</p> : null}
    {reporte?.estado === "completo" ? <>
      <p role="status">Reporte: {new Date(reporte.fecha).toLocaleString("es")} · {reporte.candidatos.length} candidatos.</p>
      <ul className="flex flex-col gap-2 text-sm">{reporte.candidatos.map((c) => <li key={`${c.tipo}:${c.ruta}`} className="min-w-0 break-all rounded-lg bg-surface-sunken p-3">
        <p>{c.tipo === "A" ? "A: objeto sin registro" : c.tipo === "B" ? "B: registro sin objeto vigente" : "Indeterminado: subida pendiente o reciente"}</p>
        <p>Clínica: {c.clinicaId} · Ruta: {c.ruta}</p>
        {c.fecha ? <p>Fecha: {c.fecha}</p> : null}
        {c.motivo ? <p>Motivo: {c.motivo}</p> : null}
      </li>)}</ul>
    </> : null}
  </section>;
}

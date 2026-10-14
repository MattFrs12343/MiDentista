import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ETIQUETAS_PLAN, FILTROS_PLANES, enlacePlan, TAMANO_PLANES_ESTADO } from "./planesPorEstado.ts";
import { ESTADOS_PLAN } from "./planTratamientoMapper.ts";
import type { EstadoPlanTratamiento } from "./tipos.ts";
import type { usePlanesPorEstado } from "./usePlanesPorEstado.ts";
import { formatearCostoTotal } from "./planTotal.ts";
import type { SincronizacionTotalPlan } from "./planTotal.ts";

export function PlanesPorEstadoSection({ datos, navegable = true, pacienteActualId, abrirEnFichaActual, bloqueado = false, totalesPendientes = {} }: {
  datos: ReturnType<typeof usePlanesPorEstado>; navegable?: boolean; pacienteActualId?: string;
  abrirEnFichaActual?: (id: string) => void; bloqueado?: boolean;
  totalesPendientes?: Record<string, SincronizacionTotalPlan>;
}) {
  const paginas = Math.max(1, Math.ceil(datos.total / TAMANO_PLANES_ESTADO));
  return <Card aria-busy={datos.estado === "loading"}>
    <CardHeader><CardTitle>Planes de la clínica por estado</CardTitle></CardHeader>
    <CardContent className="flex min-w-0 flex-col gap-4">
      <label htmlFor="estado-planes-clinica">Estado de los planes</label>
      <select id="estado-planes-clinica" value={datos.filtro} onChange={(e) => void datos.filtrar(e.target.value as EstadoPlanTratamiento)}
        className="w-full rounded-md border border-line p-2 sm:max-w-xs">
        {ESTADOS_PLAN.map((estado) => <option key={estado} value={estado}>{FILTROS_PLANES[estado]}</option>)}
      </select>
      {datos.estado === "loading" ? <p role="status">Cargando planes por estado…</p>
        : datos.estado === "error" ? <><p role="alert">{datos.error}</p><Button type="button" onClick={() => void datos.recargar()}>Reintentar consulta de planes</Button></>
        : <>
          <Button type="button" onClick={() => void datos.recargar()}>Actualizar consulta</Button>
          {datos.total === 0 ? <p>No hay planes en estado {ETIQUETAS_PLAN[datos.filtro]}.</p> : <>
            <p role="status">{datos.total} planes · Página {datos.pagina} de {paginas}</p>
            <ul className="grid min-w-0 gap-3 md:grid-cols-2">{datos.planes.map((p) => <li key={p.id} className="min-w-0 break-words rounded-md border border-line p-3">
              <h3 className="font-semibold">{p.titulo ?? "Sin título (plan histórico)"}</h3>
              <p>Paciente: {p.pacienteNombre ?? "Paciente no visible"}</p>
              <p>Estado: {ETIQUETAS_PLAN[p.estado]}</p>
              <p>Autor: {p.autorNombre ?? "Autor no visible"}</p>
              <p>Creado: {p.creadoEn ? <time dateTime={p.creadoEn}>{new Date(p.creadoEn).toLocaleString("es-BO")}</time> : "Sin fecha"}</p>
              <p>{totalesPendientes[p.id] ? "Total pendiente de sincronización en la ficha." : `Costo total registrado: ${formatearCostoTotal(p.costoTotal)}`}</p>
              {navegable && <Link className="font-medium underline" to={enlacePlan(p)}
                aria-disabled={bloqueado && p.pacienteId === pacienteActualId ? true : undefined}
                onClick={(e) => {
                  if (p.pacienteId !== pacienteActualId || !abrirEnFichaActual || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
                  e.preventDefault(); if (!bloqueado) abrirEnFichaActual(p.id);
                }} aria-label={`Abrir plan ${p.titulo ?? "sin título"} de ${p.pacienteNombre ?? "paciente no visible"}`}>Abrir plan en la ficha</Link>}
            </li>)}</ul>
            <nav aria-label="Paginación de planes por estado" className="flex flex-wrap gap-2">
              <Button type="button" disabled={datos.pagina <= 1} onClick={() => void datos.paginar(datos.pagina - 1)}>Anterior</Button>
              <Button type="button" disabled={datos.pagina >= paginas} onClick={() => void datos.paginar(datos.pagina + 1)}>Siguiente</Button>
            </nav>
          </>}
        </>}
    </CardContent>
  </Card>;
}

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlanTratamientoForm } from "./PlanTratamientoForm.tsx";
import { puedeCrearPlan, puedeEditarPlan } from "./planTratamientoPermisos.ts";
import { ETIQUETAS_PLAN } from "./planesPorEstado.ts";
import type { usePlanesTratamiento } from "./usePlanesTratamiento.ts";
import { ProcedimientosDelPlan } from "./ProcedimientosSection.tsx";
import { PlanEstadoActions } from "./PlanEstadoActions.tsx";
import { PlanTotalSection } from "./PlanTotalSection.tsx";

/** Fecha corta "es-BO", o "Sin fecha" si no llegó una real (planes históricos). */
function fechaCorta(iso: string | null): string {
  if (!iso) return "Sin fecha";
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? "Sin fecha" : fecha.toLocaleDateString("es-BO");
}

/** Fecha y hora "es-BO", o "Sin fecha" — mismo criterio que `fechaCorta`. */
function fechaHora(iso: string | null): string {
  if (!iso) return "Sin fecha";
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? "Sin fecha" : fecha.toLocaleString("es-BO");
}

export function PlanesTratamientoSection({ datos }: { datos: ReturnType<typeof usePlanesTratamiento> }) {
  const [nuevo, setNuevo] = useState(false);
  const plan = datos.seleccionado;
  const total = plan ? datos.totales[plan.id] : undefined;
  const bloqueado = datos.guardando || !!total;
  return (
    <Card aria-busy={datos.estado === "loading"}>
      <CardHeader><CardTitle>Planes del paciente</CardTitle></CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4">
        {datos.estado === "loading" ? <p role="status">Cargando planes de tratamiento…</p>
          : datos.estado === "error" ? <><p role="alert">{datos.error}</p><Button type="button" onClick={() => void datos.recargar()}>Reintentar carga de planes</Button></>
          : <>
            {datos.planes.length === 0 ? <p>No hay planes visibles para este paciente. La lectura vacía no crea un plan.</p> : <>
              <label htmlFor="seleccion-plan">Seleccionar plan de tratamiento ({datos.planes.length})</label>
              <select id="seleccion-plan" value={datos.seleccionadoId ?? ""} disabled={datos.guardando}
                onChange={(e) => { datos.seleccionar(e.target.value || null); setNuevo(false); }} className="w-full min-w-0 rounded-md border border-line p-2">
                <option value="">Selecciona un plan existente</option>
                {datos.planes.map((p) => <option key={p.id} value={p.id}>{p.titulo ?? "Sin título (plan histórico)"} — {ETIQUETAS_PLAN[p.estado]} — {fechaCorta(p.creadoEn)}</option>)}
              </select>
            </>}
            {puedeCrearPlan(datos.perfil) && <Button type="button" disabled={bloqueado} onClick={() => setNuevo(!nuevo)}>{nuevo ? "Cerrar formulario nuevo" : "Nuevo plan"}</Button>}
            {nuevo && puedeCrearPlan(datos.perfil) && <PlanTratamientoForm bloqueado={bloqueado} crear={datos.crear}
              motivoBloqueo={total ? "Confirma la sincronización del total antes de otra operación." : undefined}
              guardarTitulo={datos.guardarTitulo} guardarNotas={datos.guardarNotas} />}
            {plan && <section aria-label="Plan seleccionado" className="flex flex-col gap-3">
              <h3>{plan.titulo ?? "Sin título (plan histórico)"}</h3>
              <p>Estado: {ETIQUETAS_PLAN[plan.estado]}</p>
              <PlanEstadoActions datos={{ ...datos, guardando: bloqueado }} />
              <PlanTotalSection costoTotal={plan.costoTotal} sincronizacion={total} reintentar={() => datos.sincronizarTotalPlan(plan.id)} />
              <p>Creado: {fechaHora(plan.creadoEn)}</p><p>Actualizado: {fechaHora(plan.actualizadoEn)}</p>
              {puedeEditarPlan(datos.perfil, plan) ? <PlanTratamientoForm key={plan.id} plan={plan} bloqueado={bloqueado}
                motivoBloqueo={total ? "Confirma la sincronización del total antes de otra operación." : undefined}
                crear={datos.crear} guardarTitulo={datos.guardarTitulo} guardarNotas={datos.guardarNotas} />
                : <><p>Solo lectura</p><p className="whitespace-pre-wrap">{plan.notas || "Sin notas registradas."}</p></>}
              <ProcedimientosDelPlan key={JSON.stringify([plan.id, datos.clave])} plan={plan} perfil={datos.perfil}
                iniciarTotal={datos.iniciarTotalProcedimiento} bloqueado={!!total} />
            </section>}
            {!plan && <p>Selecciona un plan para consultar o registrar procedimientos.</p>}
            {!puedeCrearPlan(datos.perfil) && !plan && <p>Solo lectura</p>}
          </>}
      </CardContent>
    </Card>
  );
}

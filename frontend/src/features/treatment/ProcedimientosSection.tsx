import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ProcedimientoForm } from "./ProcedimientoForm.tsx";
import { useProcedimientos } from "./useProcedimientos.ts";
import type { PlanProcedimientos } from "./procedimientoPermisos.ts";
import type { PerfilDiagnosticos } from "./tipos.ts";
import type { IniciarTotalProcedimiento } from "./planTotal.ts";

/** Montado únicamente con un plan real; key de contexto descarta borradores previos. */
export function ProcedimientosDelPlan({ plan, perfil, iniciarTotal, bloqueado = false }: {
  plan: PlanProcedimientos; perfil: PerfilDiagnosticos | null; iniciarTotal?: IniciarTotalProcedimiento; bloqueado?: boolean;
}) {
  const datos = useProcedimientos(plan, perfil, iniciarTotal);
  return <ProcedimientosSection key={datos.clave} datos={datos} bloqueadoTotal={bloqueado} />;
}

export function ProcedimientosSection({ datos, bloqueadoTotal = false }: { datos: ReturnType<typeof useProcedimientos>; bloqueadoTotal?: boolean }) {
  const bloqueado = datos.guardando || bloqueadoTotal;
  const [editarId, setEditarId] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);
  const paginas = Math.max(1, Math.ceil(datos.procedimientos.length / 20));
  const paginaActual = Math.min(pagina, paginas);
  const editar = datos.procedimientos.find((p) => p.id === editarId);
  const confirmar = datos.procedimientos.find((p) => p.id === datos.confirmacionId);
  return <section aria-label="Procedimientos del plan seleccionado" className="flex flex-col gap-4" aria-busy={datos.estado === "loading" || datos.guardando}>
    <h4>Procedimientos del plan seleccionado</h4>
    {datos.estado === "idle" ? <p>Selecciona un plan para consultar sus procedimientos.</p>
      : datos.estado === "loading" ? <p role="status">Cargando procedimientos…</p>
      : datos.estado === "error" ? <><p role="alert">{datos.error}</p><Button type="button" onClick={() => void datos.recargar()}>Reintentar carga de procedimientos</Button></>
      : <>
        {datos.error && <p role="alert">{datos.error}</p>}
        {datos.mensaje && <p role="status">{datos.mensaje}</p>}
        {datos.procedimientos.length === 0 ? <p>No hay procedimientos visibles en este plan.</p> : <>
          <ul aria-label="Lista de procedimientos" className="flex flex-col gap-3">
            {datos.procedimientos.slice((paginaActual - 1) * 20, paginaActual * 20).map((p) => <li key={p.id} className="rounded-md border border-line p-3">
              <p className="whitespace-pre-wrap">{p.descripcion}</p>
              {p.numeroPieza !== null && <p>Pieza FDI: {p.numeroPieza}</p>}
              <p>Prioridad: {p.prioridad}</p><p>Estado del procedimiento: {p.estado}</p><p>Costo: Bs {p.costo.toFixed(2)}</p>
              {p.servicioId && <p>Servicio: {p.servicioId}</p>}
              {datos.editable && <div className="flex flex-wrap gap-2">
                <Button type="button" disabled={bloqueado} onClick={() => setEditarId(p.id)} aria-label={`Editar procedimiento: ${p.descripcion}`}>Editar</Button>
                <Button type="button" disabled={bloqueado} onClick={() => datos.solicitarEliminar(p.id)} aria-label={`Eliminar procedimiento: ${p.descripcion}`}>Eliminar</Button>
              </div>}
            </li>)}
          </ul>
          <nav aria-label="Paginación de procedimientos" className="flex items-center gap-3">
            <Button type="button" disabled={paginaActual === 1 || bloqueado} onClick={() => setPagina(paginaActual - 1)}>Anterior</Button>
            <p>Página {paginaActual} de {paginas} · {datos.procedimientos.length} procedimientos</p>
            <Button type="button" disabled={paginaActual === paginas || bloqueado} onClick={() => setPagina(paginaActual + 1)}>Siguiente</Button>
          </nav>
        </>}
        {datos.editable ? <>
          {confirmar && <div role="alertdialog" aria-modal="false" aria-labelledby="confirmar-eliminar-procedimiento" className="rounded-md border border-line p-3">
            <h5 id="confirmar-eliminar-procedimiento">¿Eliminar este procedimiento?</h5>
            <p>{confirmar.descripcion}</p><p>Se eliminará del plan seleccionado. Esta acción no se puede deshacer.</p>
            <Button type="button" disabled={bloqueado} onClick={() => datos.cancelarEliminar()}>Cancelar eliminación</Button>
            <Button type="button" disabled={bloqueado} onClick={() => {
              void datos.eliminar(confirmar.id).then(() => { if (editarId === confirmar.id) setEditarId(null); }).catch(() => {});
            }}>Confirmar eliminación</Button>
          </div>}
          <h5>{editar ? "Editar procedimiento" : "Nuevo procedimiento"}</h5>
          {editar && <Button type="button" disabled={bloqueado} onClick={() => setEditarId(null)}>Cancelar edición / nuevo procedimiento</Button>}
          <ProcedimientoForm key={editar?.id ?? "nuevo"} procedimiento={editar} bloqueado={bloqueado}
            motivoBloqueo={bloqueadoTotal ? "Confirma la sincronización del total antes de otro procedimiento." : undefined}
            guardar={async (contenido) => editar ? datos.actualizar(editar.id, contenido) : datos.crear(contenido)} />
        </> : <p>Solo lectura: únicamente el odontólogo autor del plan puede modificar procedimientos.</p>}
      </>}
  </section>;
}

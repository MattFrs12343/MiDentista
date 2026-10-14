import { useId, useState } from "react";
import { Stethoscope } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DiagnosticoForm } from "./DiagnosticoForm.tsx";
import { contenidoDesdeCampos } from "./diagnosticoFormulario.ts";
import { puedeCrearDiagnostico, puedeEditarDiagnostico } from "./diagnosticoPermisos.ts";
import type { useDiagnosticos } from "./useDiagnosticos.ts";
import { presentarListaDiagnosticos } from "./diagnosticosLista.ts";

/** Lista del paciente paginada; reutiliza el formulario y los permisos validados. */
export function DiagnosticosSection({ datos }: { datos: ReturnType<typeof useDiagnosticos> }) {
  const id = useId();
  const [paginaSolicitada, setPagina] = useState(1);
  const [idEdicion, setIdEdicion] = useState<string | null>(null);
  const lista = presentarListaDiagnosticos(datos, paginaSolicitada);
  const seleccionado = datos.diagnosticos.find((d) => d.id === idEdicion);
  const puedeCrear = puedeCrearDiagnostico(datos.perfil);
  const editable = seleccionado && puedeEditarDiagnostico(datos.perfil, seleccionado);
  return (
    <Card>
      <CardHeader><CardTitle><span id={`${id}-titulo`}>Diagnósticos del paciente</span></CardTitle><CardDescription>Hallazgos clínicos que sustentan el plan de tratamiento</CardDescription></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <section aria-labelledby={`${id}-titulo`} aria-busy={lista.tipo === "loading"}>
          {lista.tipo === "loading" ? <p role="status" className="text-sm text-ink-muted">{lista.mensaje}</p> : null}
          {lista.tipo === "error" ? <div className="flex flex-col gap-2">
            <div role="alert" className="text-sm text-pastel-red-fg"><p>{lista.mensaje}</p><p>{lista.detalle}</p></div>
            <Button type="button" variant="secondary" disabled={datos.guardando} onClick={() => void datos.recargar()}>Reintentar carga</Button>
          </div> : null}
          {lista.tipo === "vacio" ? <p role="status" className="text-sm text-ink-muted">{lista.mensaje}</p> : null}
          {lista.tipo === "resultados" ? <>
            <p role="status" aria-live="polite" className="text-xs text-ink-muted">Mostrando {lista.desde}–{lista.hasta} de {lista.total} diagnósticos</p>
            <ul aria-label="Lista de diagnósticos del paciente" className="flex flex-col divide-y divide-line">
              {lista.filas.map(({ diagnostico: d, pieza, observaciones, estado, fecha, actualizado, editable: puedeEditar }) => (
                <li key={d.id} className="flex flex-wrap items-start gap-3 py-3">
                  <Stethoscope size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-brand-500" />
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-pre-wrap break-words text-sm font-medium text-ink">{d.descripcion}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {pieza ? <span className="text-xs text-ink-muted">{pieza}</span> : null}
                      <span className="text-xs text-ink-muted">Estado:</span>
                      <Badge tone={d.estado === "activo" ? "blue" : d.estado === "resuelto" ? "green" : "neutral"}>{estado}</Badge>
                    </div>
                    {observaciones ? <p className="mt-2 whitespace-pre-wrap break-words text-sm text-ink-soft"><span className="font-medium">Observaciones: </span>{observaciones}</p> : null}
                    <dl className="mt-2 flex flex-col gap-1 text-xs text-ink-muted">
                      <div className="flex flex-wrap gap-1"><dt>Fecha del diagnóstico:</dt><dd>{d.fechaDiagnostico ? <time dateTime={d.fechaDiagnostico}>{fecha}</time> : fecha}</dd></div>
                      <div className="flex flex-wrap gap-1"><dt>Última actualización:</dt><dd>{d.actualizadoEn ? <time dateTime={d.actualizadoEn}>{actualizado}</time> : actualizado}</dd></div>
                    </dl>
                  </div>
                  {puedeEditar ? <Button type="button" variant="secondary" aria-label={`Editar diagnóstico y estado: ${d.descripcion}`}
                    disabled={datos.guardando} onClick={() => setIdEdicion(d.id)}>Editar / cambiar estado</Button>
                    : <span className="text-xs text-ink-muted">Solo lectura</span>}
                </li>
              ))}
            </ul>
            {lista.totalPaginas > 1 ? <nav aria-label="Paginación de diagnósticos" className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <Button type="button" variant="secondary" disabled={datos.guardando || lista.pagina === 1}
                onClick={() => setPagina(lista.pagina - 1)}>Anterior</Button>
              <span className="text-sm text-ink-muted">Página {lista.pagina} de {lista.totalPaginas}</span>
              <Button type="button" variant="secondary" disabled={datos.guardando || lista.pagina === lista.totalPaginas}
                onClick={() => setPagina(lista.pagina + 1)}>Siguiente</Button>
            </nav> : null}
          </> : null}
        </section>
        {datos.estado === "success" && puedeCrear ? (
          <DiagnosticoForm key={editable ? seleccionado.id : "nuevo"} diagnostico={editable ? seleccionado : undefined}
            bloqueado={datos.guardando} cancelar={editable ? () => setIdEdicion(null) : undefined}
            guardar={async (accion, campos) => {
              if (accion === "estado" && editable) return datos.cambiarEstado(seleccionado.id, campos.estado);
              const contenido = contenidoDesdeCampos(campos);
              if (editable) return datos.actualizar(seleccionado.id, contenido);
              const confirmado = await datos.crear(contenido);
              setPagina(1); // Un alta confirmada debe verse aunque se creara en otra página.
              return confirmado;
            }} />
        ) : datos.estado === "success" ? <p className="text-sm text-ink-muted">Acceso de solo lectura a diagnósticos.</p> : null}
      </CardContent>
    </Card>
  );
}

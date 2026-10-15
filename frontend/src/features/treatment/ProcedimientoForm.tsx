import { useLayoutEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { crearFormularioProcedimiento } from "./procedimientoFormulario.ts";
import { ESTADOS_PROCEDIMIENTO, PRIORIDADES_PROCEDIMIENTO } from "./procedimientoMapper.ts";
import type { ContenidoProcedimiento, EstadoProcedimiento, NuevoProcedimiento, PrioridadProcedimiento, ProcedimientoTratamiento } from "./tipos.ts";

export function ProcedimientoForm({ procedimiento, bloqueado, guardar, motivoBloqueo }: {
  procedimiento?: ProcedimientoTratamiento; bloqueado: boolean;
  guardar: (datos: ContenidoProcedimiento & NuevoProcedimiento) => Promise<ProcedimientoTratamiento>;
  motivoBloqueo?: string;
}) {
  const [formulario] = useState(() => crearFormularioProcedimiento(procedimiento));
  const b = useSyncExternalStore(formulario.suscribir, formulario.obtener, formulario.obtener);
  useLayoutEffect(() => { formulario.activar(); return () => formulario.desactivar(); }, [formulario]);
  const prefijo = `procedimiento-${procedimiento?.id ?? "nuevo"}`;
  const disabled = bloqueado || b.guardando;
  return <form className="flex flex-col gap-3" aria-busy={disabled} onSubmit={(e) => {
    e.preventDefault(); if (!disabled) void formulario.enviar(guardar);
  }}>
    <label htmlFor={`${prefijo}-descripcion`}>Descripción del procedimiento</label>
    <Textarea id={`${prefijo}-descripcion`} required disabled={disabled} value={b.descripcion}
      onChange={(e) => formulario.cambiar("descripcion", e.target.value)} />
    <label htmlFor={`${prefijo}-pieza`}>Pieza FDI (opcional)</label>
    <Input id={`${prefijo}-pieza`} inputMode="numeric" disabled={disabled} value={b.pieza}
      onChange={(e) => formulario.cambiar("pieza", e.target.value)} />
    <label htmlFor={`${prefijo}-costo`}>Costo (Bs)</label>
    <Input id={`${prefijo}-costo`} required inputMode="decimal" disabled={disabled} value={b.costo}
      onChange={(e) => formulario.cambiar("costo", e.target.value)} />
    <label htmlFor={`${prefijo}-prioridad`}>Prioridad</label>
    <select id={`${prefijo}-prioridad`} disabled={disabled} value={b.prioridad}
      onChange={(e) => formulario.cambiar("prioridad", e.target.value as PrioridadProcedimiento)} className="rounded-md border border-line p-2">
      {PRIORIDADES_PROCEDIMIENTO.map((p) => <option key={p} value={p}>{p}</option>)}
    </select>
    {procedimiento ? <>
      <label htmlFor={`${prefijo}-estado`}>Estado del procedimiento</label>
      <select id={`${prefijo}-estado`} disabled={disabled} value={b.estado}
        onChange={(e) => formulario.cambiar("estado", e.target.value as EstadoProcedimiento)} className="rounded-md border border-line p-2">
        {ESTADOS_PROCEDIMIENTO.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
    </> : <>
      <p>Estado inicial: pendiente</p>
      <label htmlFor={`${prefijo}-servicio`}>Id de servicio (UUID opcional, sin catálogo integrado)</label>
      <Input id={`${prefijo}-servicio`} disabled={disabled} value={b.servicioId}
        onChange={(e) => formulario.cambiar("servicioId", e.target.value)} />
    </>}
    <Button type="submit" disabled={disabled}>{procedimiento ? "Guardar procedimiento" : "Crear procedimiento"}</Button>
    {b.error && <p role="alert">{b.error}</p>}
    {b.mensaje && <p role="status">{b.mensaje}</p>}
    {disabled && <p role="status">{motivoBloqueo ?? "Guardando procedimiento…"}</p>}
  </form>;
}

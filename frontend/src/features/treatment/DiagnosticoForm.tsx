import { useId, useLayoutEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ESTADOS_DIAGNOSTICO, esEstadoDiagnostico } from "./diagnosticoMapper.ts";
import { crearControladorFormularioDiagnostico, type AccionFormularioDiagnostico, type CamposDiagnostico } from "./diagnosticoFormulario.ts";
import type { DiagnosticoPaciente } from "./tipos.ts";

export function DiagnosticoForm({ diagnostico, bloqueado, guardar, cancelar }: {
  diagnostico?: DiagnosticoPaciente;
  bloqueado: boolean;
  guardar: (accion: AccionFormularioDiagnostico, campos: CamposDiagnostico) => Promise<DiagnosticoPaciente>;
  cancelar?: () => void;
}) {
  const id = useId();
  const [controlador] = useState(() => crearControladorFormularioDiagnostico(diagnostico, guardar));
  useLayoutEffect(() => { controlador.actualizarGuardar(guardar); }, [controlador, guardar]);
  const [resultado, setResultado] = useState(controlador.obtener);
  useLayoutEffect(() => controlador.suscribir(setResultado), [controlador]);
  const deshabilitado = bloqueado || resultado.guardando;
  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!deshabilitado) void controlador.enviar("contenido");
  }
  return (
    <form onSubmit={enviar} aria-label={diagnostico ? "Editar diagnóstico" : "Crear diagnóstico"}
      aria-busy={resultado.guardando} aria-describedby={resultado.error ? `${id}-error` : undefined} className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-ink">{diagnostico ? "Editar diagnóstico" : "Nuevo diagnóstico"}</p>
      <fieldset disabled={deshabilitado} className="flex flex-col gap-3">
        <Field label="Descripción del diagnóstico" htmlFor={`${id}-descripcion`}>
          <Textarea id={`${id}-descripcion`} value={resultado.campos.descripcion} required
            onChange={(e) => controlador.cambiar("descripcion", e.target.value)}
            placeholder="Ej. caries profunda con compromiso pulpar…" />
        </Field>
        <Field label="Pieza dental (opcional)" htmlFor={`${id}-pieza`} hint="Numeración FDI permanente o temporal. Deja vacío si no corresponde.">
          <Input id={`${id}-pieza`} inputMode="numeric" value={resultado.campos.numeroPieza}
            aria-describedby={resultado.error ? `${id}-error` : undefined}
            onChange={(e) => controlador.cambiar("numeroPieza", e.target.value)} placeholder="46" />
        </Field>
        <Field label="Observaciones" htmlFor={`${id}-observaciones`}>
          <Textarea id={`${id}-observaciones`} value={resultado.campos.observaciones}
            onChange={(e) => controlador.cambiar("observaciones", e.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="secondary">{resultado.guardando ? "Guardando…" : diagnostico ? "Guardar cambios" : "Registrar diagnóstico"}</Button>
          {cancelar ? <Button type="button" variant="ghost" onClick={cancelar}>Cerrar edición</Button> : null}
        </div>
        {diagnostico ? (
          <div className="flex flex-col gap-3 border-t border-line pt-3">
            <Field label="Estado del diagnóstico" htmlFor={`${id}-estado`} hint="El estado se guarda con su propio botón; no modifica el contenido del diagnóstico.">
              <Select disabled={deshabilitado} value={resultado.campos.estado} onValueChange={(v) => { if (esEstadoDiagnostico(v)) controlador.cambiar("estado", v); }}>
                <SelectTrigger id={`${id}-estado`}><SelectValue /></SelectTrigger>
                <SelectContent>{ESTADOS_DIAGNOSTICO.map((estado) => <SelectItem key={estado} value={estado}>{estado}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Button type="button" variant="secondary" disabled={resultado.campos.estado === diagnostico.estado}
              onClick={() => { if (!deshabilitado) void controlador.enviar("estado"); }}>Actualizar estado</Button>
          </div>
        ) : <p className="text-xs text-ink-muted">Estado inicial: activo.</p>}
      </fieldset>
      {resultado.error ? <p id={`${id}-error`} role="alert" className="text-sm text-pastel-red-fg">{resultado.error}</p> : null}
      {resultado.exito ? <p role="status" className="text-sm text-ink">{resultado.exito}</p> : null}
    </form>
  );
}

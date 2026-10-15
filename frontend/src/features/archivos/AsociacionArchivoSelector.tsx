import { useEffect, useId, useState } from "react";
import { Field } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cargarOpcionesEvolucion, cargarOpcionesPlan, puedeElegirAsociacion, type OpcionAsociacion } from "./archivoAsociacionService.ts";
import type { AsociacionArchivo } from "./tipos.ts";

/** Selector de solo lectura; el padre remonta su borrador al cambiar contexto. */
export function AsociacionArchivoSelector({ pacienteId, clinicaId, perfilId, disabled, onChange }: {
  pacienteId: string; clinicaId: string; perfilId: string; disabled: boolean;
  onChange: (asociacion: AsociacionArchivo | undefined) => void;
}) {
  const id = useId();
  const [tipo, setTipo] = useState<AsociacionArchivo["tipo"]>("general");
  const [seleccion, setSeleccion] = useState("");
  const [resultado, setResultado] = useState<{ clave: string; opciones: OpcionAsociacion[]; error: string | null } | null>(null);
  const clave = JSON.stringify([pacienteId, clinicaId, tipo]);
  const [permiso, setPermiso] = useState<{ perfilId: string; permitido: boolean; error: boolean } | null>(null);
  useEffect(() => {
    let activo = true;
    void puedeElegirAsociacion(perfilId).then((permitido) => {
      if (activo) setPermiso({ perfilId, permitido, error: false });
    }).catch(() => { if (activo) setPermiso({ perfilId, permitido: false, error: true }); });
    return () => { activo = false; };
  }, [perfilId]);
  const permitido = permiso?.perfilId === perfilId && permiso.permitido;
  useEffect(() => {
    if (tipo === "general") return;
    let activo = true;
    const cargar = tipo === "evolucion" ? cargarOpcionesEvolucion : cargarOpcionesPlan;
    void cargar(pacienteId, clinicaId).then((opciones) => {
      if (activo) setResultado({ clave, opciones, error: null });
    }).catch(() => {
      if (activo) setResultado({ clave, opciones: [], error: "No pudimos cargar los destinos disponibles. Puedes volver a General del paciente." });
    });
    return () => { activo = false; };
  }, [pacienteId, clinicaId, tipo, clave]);
  const actual = resultado?.clave === clave ? resultado : null;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <Field label="Destino" htmlFor={`${id}-destino`} hint="Opcional. La asociación se fija al subir y no puede editarse después.">
        <Select value={tipo} disabled={disabled} onValueChange={(valor) => {
          if (valor !== "general" && valor !== "evolucion" && valor !== "plan") return;
          setTipo(valor); setSeleccion(""); setResultado(null);
          onChange(valor === "general" ? { tipo: "general" } : undefined);
        }}>
          <SelectTrigger id={`${id}-destino`}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General del paciente</SelectItem>
            {permitido ? <SelectItem value="evolucion">Consulta registrada</SelectItem> : null}
            {permitido ? <SelectItem value="plan">Plan de tratamiento</SelectItem> : null}
          </SelectContent>
        </Select>
      </Field>
      {permiso?.perfilId === perfilId && permiso.error ? <p role="alert" className="text-sm text-pastel-red-fg">No pudimos confirmar el acceso a asociaciones clínicas. Puedes subir como General del paciente.</p> : null}
      {tipo !== "general" ? (
        <>
          {!actual ? <p role="status" className="text-sm text-ink-muted">Cargando destinos disponibles…</p> : actual.error ? (
            <p role="alert" className="text-sm text-pastel-red-fg">{actual.error}</p>
          ) : actual.opciones.length === 0 ? <p role="status" className="text-sm text-ink-muted">No hay registros visibles para este paciente y clínica.</p> : (
            <Field label={tipo === "evolucion" ? "Consulta registrada" : "Plan de tratamiento"} htmlFor={`${id}-entidad`}>
              <Select value={seleccion} disabled={disabled} onValueChange={(valor) => {
                if (!actual.opciones.some((opcion) => opcion.id === valor)) return;
                setSeleccion(valor);
                onChange(tipo === "evolucion" ? { tipo, evolucionClinicaId: valor } : { tipo: "plan", planTratamientoId: valor });
              }}>
                <SelectTrigger id={`${id}-entidad`}><SelectValue placeholder="Selecciona un registro" /></SelectTrigger>
                <SelectContent>{actual.opciones.map((opcion) => <SelectItem key={opcion.id} value={opcion.id}>{opcion.etiqueta}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          )}
        </>
      ) : null}
    </div>
  );
}

import { useLayoutEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { crearFormularioPlan } from "./planTratamientoFormulario.ts";
import type { ContenidoPlanTratamiento, PlanTratamientoPaciente } from "./tipos.ts";

interface Props {
  plan?: PlanTratamientoPaciente;
  bloqueado: boolean;
  motivoBloqueo?: string;
  crear: (datos: ContenidoPlanTratamiento) => Promise<PlanTratamientoPaciente>;
  guardarTitulo: (titulo: string) => Promise<PlanTratamientoPaciente>;
  guardarNotas: (notas: string) => Promise<PlanTratamientoPaciente>;
}

export function PlanTratamientoForm({ plan, bloqueado, motivoBloqueo, crear, guardarTitulo, guardarNotas }: Props) {
  const id = plan?.id ?? "nuevo";
  // El padre usa key=plan.id; la selección remonta con las notas del plan real.
  const [formulario] = useState(() => crearFormularioPlan({ titulo: plan?.titulo ?? "", notas: plan?.notas ?? "" }));
  const estado = useSyncExternalStore(formulario.suscribir, formulario.obtener, formulario.obtener);
  useLayoutEffect(() => {
    formulario.activar();
    return () => formulario.desactivar();
  }, [formulario]);
  useLayoutEffect(() => {
    formulario.sincronizar({ titulo: plan?.titulo ?? "", notas: plan?.notas ?? "" });
  }, [formulario, plan?.titulo, plan?.notas]);
  const guardar = (operacion: "crear" | "titulo" | "notas") => formulario.enviar(operacion, async (datos) => {
    const confirmado = operacion === "crear" ? await crear(datos)
      : operacion === "titulo" ? await guardarTitulo(datos.titulo) : await guardarNotas(datos.notas);
    return { titulo: confirmado.titulo ?? "", notas: confirmado.notas };
  });
  const deshabilitado = bloqueado || estado.guardando;
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!plan && !deshabilitado) void guardar("crear"); }} className="flex flex-col gap-3" aria-busy={deshabilitado}>
      <label htmlFor={`titulo-plan-${id}`}>Título del plan</label>
      <Input id={`titulo-plan-${id}`} value={estado.titulo} required disabled={deshabilitado}
        onChange={(e) => formulario.cambiar("titulo", e.target.value)} />
      {plan && <Button type="button" disabled={deshabilitado} onClick={() => void guardar("titulo")}>Guardar título</Button>}
      <label htmlFor={`notas-plan-${id}`}>Notas del plan</label>
      <Textarea id={`notas-plan-${id}`} value={estado.notas} disabled={deshabilitado}
        onChange={(e) => formulario.cambiar("notas", e.target.value)} />
      {plan ? <Button type="button" disabled={deshabilitado} onClick={() => void guardar("notas")}>Guardar notas</Button>
        : <Button type="submit" disabled={deshabilitado}>Crear plan en estado propuesto</Button>}
      {estado.error && <p role="alert">{estado.error}</p>}
      {estado.mensaje && <p role="status">{estado.mensaje}</p>}
      {deshabilitado && <p role="status">{motivoBloqueo ?? "Guardando plan…"}</p>}
    </form>
  );
}

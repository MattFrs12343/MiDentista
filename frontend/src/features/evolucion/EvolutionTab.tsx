import { useCallback, useEffect, useState } from "react";
import { ArrowCounterClockwise, Notebook, Plus, Warning, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SectionLoader } from "@/components/ui/section-loader";
import { EvolutionForm } from "./EvolutionForm.tsx";
import { EvolutionTimeline } from "./EvolutionTimeline.tsx";
import { hoyEnIso } from "./fechasEvolucion.ts";
import { useEvolucionSupabase } from "./useEvolucionSupabase.ts";
import { usePlanesTratamiento } from "./usePlanesTratamiento.ts";
import type { BorradorEvolucion, EvolucionClinica } from "./tipos.ts";

/**
 * Pestaña 06 "Evolución clínica" de la ficha del paciente (T-6.7).
 *
 * Es el único punto de integración del módulo: recibe los tres UUIDs que la
 * ficha ya tiene resueltos y no depende del store en memoria. `App.tsx`,
 * `PatientProfilePage.tsx` y `tabValue.ts` son de Matías.
 */
export function EvolutionTab({
  pacienteId,
  clinicaId,
  odontologoId,
}: {
  pacienteId: string;
  clinicaId: string;
  odontologoId: string;
}) {
  const {
    evoluciones,
    cargando,
    guardando,
    error,
    lecturaSinFilas,
    cargar,
    guardar,
    actualizar,
    marcarProximaAtencion,
  } = useEvolucionSupabase();
  const {
    planes,
    procedimientos,
    cargandoPlanes,
    cargandoProcedimientos,
    cargar: cargarPlanes,
    cargarItems: cargarItemsPlan,
    titulos,
  } = usePlanesTratamiento();

  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<EvolucionClinica | null>(null);

  useEffect(() => {
    if (!pacienteId) return;
    void cargar(pacienteId);
  }, [pacienteId, cargar]);

  /** Los planes son de solo lectura y se piden junto con la primera carga. */
  useEffect(() => {
    if (!pacienteId) return;
    void cargarPlanes(pacienteId);
  }, [pacienteId, cargarPlanes]);

  const abrirNueva = useCallback(() => {
    setEditando(null);
    setFormAbierto(true);
  }, []);

  const abrirEdicion = useCallback((evolucion: EvolucionClinica) => {
    setEditando(evolucion);
    setFormAbierto(true);
  }, []);

  const cerrarFormulario = useCallback(() => {
    setFormAbierto(false);
    setEditando(null);
  }, []);

  const reintentar = useCallback(() => {
    void cargar(pacienteId);
    void cargarPlanes(pacienteId);
  }, [pacienteId, cargar, cargarPlanes]);

  /** El formulario avisa qué plan quedó elegido; aquí se piden sus procedimientos. */
  const elegirPlan = useCallback(
    (planId: string | null) => {
      void cargarItemsPlan(planId);
    },
    [cargarItemsPlan],
  );

  /**
   * El formulario entrega solo el contenido. Aquí se decide si es un alta (se
   * arma un `EvolucionNueva` con la fecha de hoy y los tres UUIDs) o una
   * edición (se conserva lo que la base ya tenía y solo se cambia el
   * borrador). El formulario solo se cierra si la escritura quedó confirmada:
   * un fallo deja el borrador en pantalla para no perder el texto escrito.
   */
  const enviarFormulario = useCallback(
    async (borrador: BorradorEvolucion) => {
      const confirmada = editando
        ? await actualizar({ ...editando, ...borrador })
        : await guardar({
          clinicaId,
          pacienteId,
          odontologoId,
          fechaConsulta: hoyEnIso(),
          ...borrador,
        });
      if (confirmada) cerrarFormulario();
    },
    [editando, actualizar, guardar, clinicaId, pacienteId, odontologoId, cerrarFormulario],
  );

  const cambiarProximaAtencion = useCallback(
    (evolucion: EvolucionClinica, fecha: string | null) => {
      void marcarProximaAtencion(evolucion, fecha);
    },
    [marcarProximaAtencion],
  );

  const total = evoluciones.length;
  const resumen = cargando && total === 0
    ? "Cargando evoluciones…"
    : total === 1
      ? "1 atención registrada"
      : `${total} atenciones registradas`;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="title-ios text-[17px] font-semibold text-label">Evolución clínica</h3>
          <p className="mt-0.5 text-[13px] text-label-2">{resumen}</p>
        </div>
        {formAbierto ? (
          <Button type="button" variant="ghost" onClick={cerrarFormulario} disabled={guardando}>
            <X size={17} aria-hidden /> Cerrar formulario
          </Button>
        ) : (
          <Button type="button" onClick={abrirNueva}>
            <Plus size={17} aria-hidden /> Nueva evolución
          </Button>
        )}
      </div>

      {/* El error se anuncia y no se traga el contenido ya cargado: si falla un
          guardado, la línea de tiempo de antes sigue siendo válida. */}
      {error ? (
        <div
          role="alert"
          className="flex min-w-0 items-start gap-3 rounded-xl border border-pastel-red-fg/15 bg-pastel-red-bg/65 p-4"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pastel-red-bg">
            <Warning size={20} weight="fill" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-pastel-red-fg">
              No se pudo completar la operación
            </p>
            <p className="mt-1 break-words text-sm text-pastel-red-fg">{error}</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={reintentar}
              disabled={cargando}
            >
              <ArrowCounterClockwise size={15} aria-hidden /> Reintentar la carga
            </Button>
          </div>
        </div>
      ) : null}

      {formAbierto ? (
        <EvolutionForm
          // La `key` remonta el formulario al cambiar de registro: sin ella el
          // borrador de una evolución se mezclaría con el de la siguiente.
          key={editando?.id ?? "nueva-evolucion"}
          inicial={editando ?? undefined}
          guardando={guardando}
          planes={planes}
          procedimientos={procedimientos}
          cargandoPlanes={cargandoPlanes}
          cargandoProcedimientos={cargandoProcedimientos}
          onElegirPlan={elegirPlan}
          onGuardar={enviarFormulario}
          onCancelar={cerrarFormulario}
        />
      ) : null}

      {cargando && total === 0 ? (
        <SectionLoader label="Cargando evolución clínica" className="min-h-[40vh]" />
      ) : (
        <EvolutionTimeline
          evoluciones={evoluciones}
          titulosDePlan={titulos()}
          onEditar={abrirEdicion}
          onProximaAtencion={cambiarProximaAtencion}
          guardando={guardando}
          vacio={
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                <Notebook size={32} aria-hidden className="text-ink-muted" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    Este paciente aún no tiene evoluciones registradas
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">
                    Registra la atención para conservar el historial clínico.
                  </p>
                </div>
                {/*
                  Un `SELECT` que devuelve `[]` puede deberse a RLS, no a que el
                  dato no exista. Con `lecturaSinFilas` se distingue el caso sin
                  afirmar que el paciente no tiene historial.
                */}
                {lecturaSinFilas ? (
                  <p className="mt-2 max-w-lg rounded-xl bg-pastel-yellow-bg px-3 py-2 text-xs leading-relaxed text-pastel-yellow-fg">
                    Si esperabas ver evoluciones y no aparecen, tu rol puede no tener
                    permiso de lectura sobre este paciente: las políticas de seguridad
                    ocultan las filas en lugar de mostrar un error.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          }
        />
      )}
    </div>
  );
}

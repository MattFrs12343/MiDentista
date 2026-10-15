import { Printer } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type { Paciente } from "@/types";
import { DiagnosticosSection } from "./DiagnosticosSection.tsx";
import { PlanesTratamientoSection } from "./PlanesTratamientoSection.tsx";
import { PlanesPorEstadoSection } from "./PlanesPorEstadoSection.tsx";
import type { useDiagnosticos } from "./useDiagnosticos.ts";
import type { usePlanesTratamiento } from "./usePlanesTratamiento.ts";
import type { usePlanesPorEstado } from "./usePlanesPorEstado.ts";

/** Composición de las secciones existentes; cada lectura mantiene su propio error. */
export function TratamientoFichaSections({ paciente, diagnosticos, planes, vista, enlaceInvalido, limpiarEnlace, abrirPlan, listoImprimir, imprimir }: {
  paciente: Paciente; diagnosticos: ReturnType<typeof useDiagnosticos>; planes: ReturnType<typeof usePlanesTratamiento>;
  vista: ReturnType<typeof usePlanesPorEstado>; enlaceInvalido: boolean; limpiarEnlace: () => void;
  abrirPlan: (id: string) => void; listoImprimir: boolean; imprimir: () => void;
}) {
  return <div className="fade-in-up flex min-w-0 flex-col gap-5">
    <header><h2 className="font-semibold">Diagnóstico y tratamiento</h2>
      <p>Ficha de {paciente.nombres} {paciente.apellidos}. Selecciona un plan del paciente para consultar sus procedimientos.</p></header>
    <DiagnosticosSection key={diagnosticos.clave} datos={diagnosticos} />
    {planes.estado === "success" && <PlanesPorEstadoSection datos={vista} navegable={planes.perfil?.rol !== "superadmin"}
      pacienteActualId={paciente.id} bloqueado={planes.guardando} abrirEnFichaActual={abrirPlan} totalesPendientes={planes.totales} />}
    {enlaceInvalido && <div role="status"><p>El plan solicitado no es válido o no está visible para este paciente.</p>
      <Button type="button" disabled={planes.guardando} onClick={limpiarEnlace}>Quitar enlace del plan</Button></div>}
    <PlanesTratamientoSection key={planes.clave} datos={planes} />
    <section aria-label="Impresión de diagnóstico y tratamiento" className="flex flex-col gap-2 sm:items-end">
      <p className="text-sm">La impresión usa diagnósticos y el plan seleccionado confirmados. El costo total es el registrado en la base de datos; no se recalcula.</p>
      {!listoImprimir && <p role="status">La impresión estará disponible tras confirmar los datos y la selección del plan, sin guardados pendientes de diagnósticos o del plan.</p>}
      <Button type="button" variant="secondary" onClick={imprimir} disabled={!listoImprimir}><Printer size={15} /> Imprimir</Button>
    </section>
  </div>;
}

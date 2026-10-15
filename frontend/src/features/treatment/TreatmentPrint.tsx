import { PrintDocument, PrintSection } from "@/components/print/PrintDocument";
import type { Paciente } from "@/types";
import type { DiagnosticoPaciente, PlanTratamientoPaciente } from "./tipos.ts";
import { datosPertenecenFicha } from "./tratamientoIntegracion.ts";
import { formatearCostoTotal } from "./planTotal.ts";

export function TreatmentPrint({
  paciente,
  diagnosticos,
  plan,
  clinica,
  totalConfirmado = true,
}: {
  paciente: Paciente;
  diagnosticos: DiagnosticoPaciente[];
  plan: PlanTratamientoPaciente | null;
  clinica?: string | null;
  totalConfirmado?: boolean;
}) {
  if (!totalConfirmado || !datosPertenecenFicha(paciente.id, diagnosticos, plan)) return null;
  return (
    <PrintDocument
      titulo="PLAN DE TRATAMIENTO"
      clinica={clinica}
      paciente={paciente}
      ariaLabel="Plan de tratamiento para impresión"
    >
      <TreatmentPrintContent diagnosticos={diagnosticos} plan={plan} />
    </PrintDocument>
  );
}

/** Contenido real compartido con el documento; permite verificarlo sin un portal DOM. */
export function TreatmentPrintContent({ diagnosticos, plan }: { diagnosticos: DiagnosticoPaciente[]; plan: PlanTratamientoPaciente | null }) {
  return <>
      <PrintSection numero="01" titulo="Diagnósticos">
        {diagnosticos.length > 0 ? (
          <ul>
            {diagnosticos.map((d) => (
              <li key={d.id}>
                {d.descripcion}
                {d.numeroPieza !== null ? ` (pieza ${d.numeroPieza})` : ""} — {d.fechaDiagnostico ?? "Sin fecha"}
              </li>
            ))}
          </ul>
        ) : (
          <p className="print-doc-empty">Aún no se registraron diagnósticos.</p>
        )}
      </PrintSection>

      <PrintSection numero="02" titulo="Plan de tratamiento seleccionado">
        {plan ? (
          <>
            <p>{plan.titulo ?? "Sin título (plan histórico)"}</p>
            <p>Estado: {plan.estado}</p><p>Id: {plan.id}</p>
            <p className="print-doc-total">Costo total registrado: {formatearCostoTotal(plan.costoTotal)}</p>
            <p>Importe persistido en la base de datos; no recalculado para esta impresión.</p>
          </>
        ) : (
          <p className="print-doc-empty">No se seleccionó un plan de tratamiento.</p>
        )}
      </PrintSection>

      <PrintSection numero="03" titulo="Observaciones del plan">
        <p className={plan?.notas.trim() ? "print-doc-text" : "print-doc-empty"}>
          {plan?.notas.trim() || "Sin notas del plan seleccionado."}
        </p>
      </PrintSection>
    </>;
}

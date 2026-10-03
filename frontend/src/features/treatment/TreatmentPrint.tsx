import { PrintDocument, PrintSection } from "@/components/print/PrintDocument";
import type { Diagnostico, Paciente, PlanTratamiento } from "@/types";

export function TreatmentPrint({
  paciente,
  diagnosticos,
  plan,
  clinica,
}: {
  paciente: Paciente;
  diagnosticos: Diagnostico[];
  plan: PlanTratamiento;
  clinica?: string;
}) {
  const total = plan.items.reduce((acc, i) => acc + i.costoEstimado, 0);

  return (
    <PrintDocument
      titulo="PLAN DE TRATAMIENTO"
      clinica={clinica}
      paciente={paciente}
      ariaLabel="Plan de tratamiento para impresión"
    >
      <PrintSection numero="01" titulo="Diagnósticos">
        {diagnosticos.length > 0 ? (
          <ul>
            {diagnosticos.map((d) => (
              <li key={d.id}>
                {d.descripcion}
                {d.pieza ? ` (pieza ${d.pieza})` : ""} — {d.registradoEl}
              </li>
            ))}
          </ul>
        ) : (
          <p className="print-doc-empty">Aún no se registraron diagnósticos.</p>
        )}
      </PrintSection>

      <PrintSection numero="02" titulo="Plan de tratamiento propuesto">
        {plan.items.length > 0 ? (
          <>
            <table className="print-doc-table">
              <thead>
                <tr>
                  <th>Procedimiento</th>
                  <th>Pieza</th>
                  <th>Prioridad</th>
                  <th>Costo (Bs)</th>
                </tr>
              </thead>
              <tbody>
                {plan.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.procedimiento}</td>
                    <td>{item.pieza ?? "—"}</td>
                    <td>{item.prioridad}</td>
                    <td>{item.costoEstimado.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="print-doc-total">Total estimado: Bs {total.toFixed(0)}</p>
          </>
        ) : (
          <p className="print-doc-empty">Aún no se propusieron procedimientos.</p>
        )}
      </PrintSection>

      <PrintSection numero="03" titulo="Observaciones del plan">
        <p className={plan.observaciones.trim() ? "print-doc-text" : "print-doc-empty"}>
          {plan.observaciones.trim() || "Sin observaciones del plan registradas."}
        </p>
      </PrintSection>
    </PrintDocument>
  );
}

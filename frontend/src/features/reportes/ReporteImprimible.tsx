import { useState } from "react";
import { PrintDocument, PrintSection } from "@/components/print/PrintDocument";

/**
 * Vista imprimible estándar de reporte (módulo 17, pieza C): mismo layout
 * para los 4 roles de staff, solo cambian columnas y filas. `firma={false}`:
 * no es un documento clínico de un paciente, no corresponde pedir firma de
 * un odontólogo responsable. Se monta siempre (oculto fuera de impresión,
 * ver `print-document.css`) y un botón "Descargar PDF" dispara
 * `window.print()` — mismo patrón que `PersonalDataPrint`/`TreatmentPrint`.
 */
export function ReporteImprimible({
  titulo,
  clinica,
  columnas,
  filas,
}: {
  titulo: string;
  /** `null` para superadmin, que no pertenece a ninguna clínica. */
  clinica?: string | null;
  columnas: readonly string[];
  filas: readonly (readonly (string | number)[])[];
}) {
  // `useState` con inicializador: lee la fecha una sola vez al montar, no en
  // cada render (`new Date()` directo en el render es impuro, lo marca el linter).
  const [fecha] = useState(() =>
    new Date().toLocaleDateString("es-BO", { year: "numeric", month: "long", day: "numeric" }),
  );

  return (
    <PrintDocument titulo={titulo} clinica={clinica} firma={false} ariaLabel={`${titulo} para impresión`}>
      <PrintSection numero="01" titulo={`Generado el ${fecha} · ${filas.length} ${filas.length === 1 ? "registro" : "registros"}`}>
        {filas.length === 0 ? (
          <p className="print-doc-empty">Sin datos para este reporte.</p>
        ) : (
          <table className="print-doc-table">
            <thead>
              <tr>
                {columnas.map((columna) => (
                  <th key={columna}>{columna}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, indiceFila) => (
                <tr key={indiceFila}>
                  {fila.map((valor, indiceColumna) => (
                    <td key={indiceColumna}>{String(valor)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PrintSection>
    </PrintDocument>
  );
}

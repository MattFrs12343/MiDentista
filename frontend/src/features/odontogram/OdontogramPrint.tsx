import { PrintDocument, PrintSection } from "@/components/print/PrintDocument";
import { CONDICION_LABEL } from "@/features/odontogram/odontogramLayout";
import type { CondicionPieza, Paciente } from "@/types";

export function OdontogramPrint({
  paciente,
  piezas,
  clinica,
}: {
  paciente: Paciente;
  piezas: CondicionPieza[];
  clinica?: string | null;
}) {
  const ordenadas = piezas.slice().sort((a, b) => a.pieza - b.pieza);

  return (
    <PrintDocument
      titulo="ODONTOGRAMA"
      clinica={clinica}
      paciente={paciente}
      ariaLabel="Odontograma para impresión"
    >
      <PrintSection numero="01" titulo="Condiciones registradas por pieza">
        {ordenadas.length > 0 ? (
          <table className="print-doc-table">
            <thead>
              <tr>
                <th>Pieza</th>
                <th>Condición</th>
                <th>Nota</th>
                <th>Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((c) => (
                <tr key={c.pieza}>
                  <td>{c.pieza}</td>
                  <td>{CONDICION_LABEL[c.condicion]}</td>
                  <td>{c.nota || "—"}</td>
                  <td>{c.actualizadoEl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="print-doc-empty">Sin condiciones registradas.</p>
        )}
      </PrintSection>
    </PrintDocument>
  );
}

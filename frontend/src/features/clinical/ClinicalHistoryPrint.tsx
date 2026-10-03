import { PrintDocument, PrintSection } from "@/components/print/PrintDocument";
import type { HistoriaClinica, Paciente } from "@/types";
import "./clinical-history-print.css";

export function ClinicalHistoryPrint({
  paciente,
  historia,
  clinica,
}: {
  paciente: Paciente;
  historia: HistoriaClinica;
  clinica?: string | null;
}) {
  const antecedentes: [string, string, string, string][] = [
    ["01", "Motivo de consulta", historia.motivoConsulta, "Sin motivo de consulta registrado."],
    ["02", "Antecedentes personales", historia.antecedentesPersonales, "Sin antecedentes personales registrados."],
    ["03", "Antecedentes familiares", historia.antecedentesFamiliares, "Sin antecedentes familiares registrados."],
    ["04", "Antecedentes odontológicos", historia.antecedentesOdontologicos, "Sin antecedentes odontológicos registrados."],
  ];

  const listas = [
    { numero: "05", titulo: "Enfermedades de base", valores: historia.enfermedadesBase, vacio: "Sin enfermedades de base registradas." },
    { numero: "06", titulo: "Medicamentos actuales", valores: historia.medicamentosActuales, vacio: "Sin medicamentos registrados." },
  ];

  return (
    <PrintDocument
      titulo="HISTORIA CLÍNICA ODONTOLÓGICA"
      clinica={clinica}
      paciente={paciente}
      ariaLabel="Historia clínica odontológica para impresión"
    >
      {antecedentes.map(([numero, titulo, contenido, vacio]) => (
        <PrintSection key={titulo} numero={numero} titulo={titulo}>
          <p className={contenido.trim() ? "print-doc-text" : "print-doc-empty"}>
            {contenido.trim() || vacio}
          </p>
        </PrintSection>
      ))}

      {listas.map(({ numero, titulo, valores, vacio }) => (
        <PrintSection key={titulo} numero={numero} titulo={titulo}>
          {valores.length > 0 ? (
            <ul>
              {valores.map((valor, i) => <li key={`${i}-${valor}`}>{valor}</li>)}
            </ul>
          ) : <p className="print-doc-empty">{vacio}</p>}
        </PrintSection>
      ))}

      <PrintSection numero="07" titulo="Alergias">
        {historia.alergias.length > 0 ? (
          <ul className="clinical-print-allergies">
            {historia.alergias.map((alergia) => (
              <li key={alergia.id} className={alergia.severidad === "grave" ? "clinical-print-allergy-severe" : undefined}>
                <span className="clinical-print-allergy-name">{alergia.sustancia}</span>
                <span className="clinical-print-allergy-level">
                  Severidad: <strong>{alergia.severidad.toUpperCase()}</strong>
                </span>
                {alergia.severidad === "grave" ? (
                  <span className="clinical-print-caution">Revisar antes de indicar medicación.</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : <p className="print-doc-empty">Sin alergias registradas.</p>}
      </PrintSection>

      <PrintSection numero="08" titulo="Hábitos">
        {historia.habitos.length > 0 ? (
          <ul>
            {historia.habitos.map((habito, i) => <li key={`${i}-${habito}`}>{habito}</li>)}
          </ul>
        ) : <p className="print-doc-empty">Sin hábitos registrados.</p>}
      </PrintSection>

      <PrintSection numero="09" titulo="Observaciones generales" className="print-doc-box">
        <p className={historia.observacionesGenerales.trim() ? "print-doc-text" : "print-doc-empty"}>
          {historia.observacionesGenerales.trim() || "Sin observaciones generales registradas."}
        </p>
      </PrintSection>

      <PrintSection numero="10" titulo="Trazabilidad" className="print-doc-infobox">
        {historia.actualizadoEl || historia.actualizadoPor ? (
          <dl className="print-doc-patient">
            {historia.actualizadoEl ? (
              <div>
                <dt>Última actualización</dt>
                <dd>
                  <time dateTime={historia.actualizadoEl}>
                    {new Date(historia.actualizadoEl).toLocaleString("es", {
                      dateStyle: "medium",
                      timeStyle: "medium",
                    })}
                  </time>
                </dd>
              </div>
            ) : null}
            {historia.actualizadoPor ? (
              <div>
                <dt>Responsable</dt>
                <dd>{historia.actualizadoPor}</dd>
              </div>
            ) : null}
          </dl>
        ) : <p className="print-doc-empty">Sin actualización registrada.</p>}
      </PrintSection>
    </PrintDocument>
  );
}

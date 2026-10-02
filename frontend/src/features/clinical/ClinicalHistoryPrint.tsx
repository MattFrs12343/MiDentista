import { createPortal } from "react-dom";
import type { HistoriaClinica, Paciente } from "@/types";
import "./clinical-history-print.css";

export function ClinicalHistoryPrint({
  paciente,
  historia,
  clinica,
}: {
  paciente: Paciente;
  historia: HistoriaClinica;
  clinica?: string;
}) {
  const datosPaciente: [string, string][] = [
    ["Nombre completo", `${paciente.nombres} ${paciente.apellidos}`],
    ["CI", paciente.ci],
    ["Fecha de nacimiento", paciente.fechaNacimiento],
    ["Teléfono", paciente.telefono],
    ["Correo electrónico", paciente.email],
  ];

  const antecedentes: [string, string, string][] = [
    ["1. Motivo de consulta", historia.motivoConsulta, "Sin motivo de consulta registrado."],
    ["2. Antecedentes personales", historia.antecedentesPersonales, "Sin antecedentes personales registrados."],
    ["3. Antecedentes familiares", historia.antecedentesFamiliares, "Sin antecedentes familiares registrados."],
    ["4. Antecedentes odontológicos", historia.antecedentesOdontologicos, "Sin antecedentes odontológicos registrados."],
  ];

  const listas = [
    { titulo: "5. Enfermedades de base", valores: historia.enfermedadesBase, vacio: "Sin enfermedades de base registradas." },
    { titulo: "6. Medicamentos actuales", valores: historia.medicamentosActuales, vacio: "Sin medicamentos registrados." },
  ];

  return createPortal(
    <article className="clinical-history-print" aria-label="Historia clínica odontológica para impresión">
      <header className="clinical-print-header">
        <p className="clinical-print-brand">MI DENTISTA</p>
        <h1>HISTORIA CLÍNICA ODONTOLÓGICA</h1>
        {clinica ? <p>{clinica}</p> : null}
      </header>

      <section className="clinical-print-section clinical-print-patient-section">
        <h2>Datos del paciente</h2>
        <dl className="clinical-print-patient">
          {datosPaciente.map(([etiqueta, valor]) => (
            <div key={etiqueta}>
              <dt>{etiqueta}</dt>
              <dd>{valor.trim() || "No registrado"}</dd>
            </div>
          ))}
        </dl>
      </section>

      {antecedentes.map(([titulo, contenido, vacio]) => (
        <section key={titulo} className="clinical-print-section">
          <h2>
            <span className="clinical-print-number">{titulo.slice(0, titulo.indexOf(".")).padStart(2, "0")}</span>
            <span>{titulo.slice(titulo.indexOf(". ") + 2)}</span>
          </h2>
          <p className={contenido.trim() ? "clinical-print-text" : "clinical-print-empty"}>
            {contenido.trim() || vacio}
          </p>
        </section>
      ))}

      {listas.map(({ titulo, valores, vacio }) => (
        <section key={titulo} className="clinical-print-section">
          <h2>
            <span className="clinical-print-number">{titulo.slice(0, titulo.indexOf(".")).padStart(2, "0")}</span>
            <span>{titulo.slice(titulo.indexOf(". ") + 2)}</span>
          </h2>
          {valores.length > 0 ? (
            <ul>
              {valores.map((valor, i) => <li key={`${i}-${valor}`}>{valor}</li>)}
            </ul>
          ) : <p className="clinical-print-empty">{vacio}</p>}
        </section>
      ))}

      <section className="clinical-print-section">
        <h2><span className="clinical-print-number">07</span><span>Alergias</span></h2>
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
        ) : <p className="clinical-print-empty">Sin alergias registradas.</p>}
      </section>

      <section className="clinical-print-section">
        <h2><span className="clinical-print-number">08</span><span>Hábitos</span></h2>
        {historia.habitos.length > 0 ? (
          <ul>
            {historia.habitos.map((habito, i) => <li key={`${i}-${habito}`}>{habito}</li>)}
          </ul>
        ) : <p className="clinical-print-empty">Sin hábitos registrados.</p>}
      </section>

      <section className="clinical-print-section clinical-print-observations">
        <h2><span className="clinical-print-number">09</span><span>Observaciones generales</span></h2>
        <p className={historia.observacionesGenerales.trim() ? "clinical-print-text" : "clinical-print-empty"}>
          {historia.observacionesGenerales.trim() || "Sin observaciones generales registradas."}
        </p>
      </section>

      <section className="clinical-print-section clinical-print-traceability">
        <h2><span className="clinical-print-number">10</span><span>Trazabilidad</span></h2>
        {historia.actualizadoEl || historia.actualizadoPor ? (
          <dl className="clinical-print-patient">
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
        ) : <p className="clinical-print-empty">Sin actualización registrada.</p>}
      </section>

      <footer className="clinical-print-signature">
        <div className="clinical-print-signature-line" />
        <p><span>Odontólogo responsable</span><span>Firma y sello</span></p>
      </footer>
    </article>,
    document.body,
  );
}

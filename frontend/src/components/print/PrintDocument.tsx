import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import logo from "@/assets/banners/logo-mark-hd.jpg";
import type { Paciente } from "@/types";
import "./print-document.css";

/**
 * Layout genérico para documentos imprimibles de la app (historia clínica,
 * ficha de datos personales, odontograma, plan de tratamiento...).
 *
 * Se monta con `createPortal` como hermano directo de `document.body`: el CSS
 * de `print-document.css` oculta el resto de la app en `@media print` vía
 * `body:has(> .print-document) > :not(.print-document) { display: none }`,
 * de modo que al llamar a `window.print()` solo se imprime este `<article>`.
 *
 * El componente que llama es responsable de mantenerlo siempre montado
 * (oculto por CSS fuera de impresión) y de disparar `window.print()` desde un
 * botón "Imprimir".
 */
export function PrintDocument({
  titulo,
  clinica,
  paciente,
  ariaLabel,
  children,
}: {
  /** Título del documento, ej. "HISTORIA CLÍNICA ODONTOLÓGICA". */
  titulo: string;
  /** Nombre de la clínica (sesion?.clinica), se muestra bajo el título. */
  clinica?: string;
  /** Si se pasa, renderiza el bloque "Datos del paciente" reutilizable. */
  paciente?: Paciente;
  ariaLabel?: string;
  children?: ReactNode;
}) {
  return createPortal(
    <article className="print-document" aria-label={ariaLabel ?? `${titulo} para impresión`}>
      <header className="print-doc-header">
        <div className="print-doc-brand">
          <img src={logo} alt="" className="print-doc-logo" />
          <span>MI DENTISTA</span>
        </div>
        <h1>{titulo}</h1>
        {clinica ? <p className="print-doc-clinic">{clinica}</p> : null}
      </header>

      {paciente ? <DatosPaciente paciente={paciente} /> : null}

      {children}

      <footer className="print-doc-signature">
        <div className="print-doc-signature-line" />
        <p>
          <span>Odontólogo responsable</span>
          <span>Firma y sello</span>
        </p>
      </footer>
    </article>,
    document.body,
  );
}

function DatosPaciente({ paciente }: { paciente: Paciente }) {
  const datos: [string, string][] = [
    ["Nombre completo", `${paciente.nombres} ${paciente.apellidos}`],
    ["CI", paciente.ci],
    ["Fecha de nacimiento", paciente.fechaNacimiento],
    ["Teléfono", paciente.telefono],
    ["Correo electrónico", paciente.email],
  ];

  return (
    <section className="print-doc-section print-doc-patient-section">
      <h2>Datos del paciente</h2>
      <dl className="print-doc-patient">
        {datos.map(([etiqueta, valor]) => (
          <div key={etiqueta}>
            <dt>{etiqueta}</dt>
            <dd>{valor.trim() || "No registrado"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * Sección numerada estándar de un documento imprimible: título con número de
 * orden + contenido. Replica el patrón visual que ya usaba
 * `clinical-print-section`/`clinical-print-number` para que los distintos
 * documentos se vean consistentes entre sí.
 */
export function PrintSection({
  numero,
  titulo,
  className,
  children,
}: {
  numero: string;
  titulo: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={["print-doc-section", className].filter(Boolean).join(" ")}>
      <h2>
        <span className="print-doc-number">{numero}</span>
        <span>{titulo}</span>
      </h2>
      {children}
    </section>
  );
}

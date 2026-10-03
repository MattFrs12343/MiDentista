import { PrintDocument, PrintSection } from "@/components/print/PrintDocument";
import type { Paciente } from "@/types";

const SEXO_LABEL: Record<Paciente["sexo"], string> = {
  femenino: "Femenino",
  masculino: "Masculino",
  otro: "Otro",
};

export function PersonalDataPrint({ paciente, clinica }: { paciente: Paciente; clinica?: string | null }) {
  const campos: [string, string][] = [
    ["Nombres", paciente.nombres],
    ["Apellidos", paciente.apellidos],
    ["Carnet de identidad", paciente.ci],
    ["Fecha de nacimiento", paciente.fechaNacimiento],
    ["Sexo", SEXO_LABEL[paciente.sexo]],
    ["Teléfono", paciente.telefono],
    ["Correo electrónico", paciente.email || "No registrado"],
    ["Dirección", paciente.direccion || "No registrada"],
    ["Fecha de registro", paciente.creadoEl || "No registrada"],
  ];

  return (
    <PrintDocument
      titulo="FICHA DE DATOS PERSONALES"
      clinica={clinica}
      ariaLabel="Ficha de datos personales para impresión"
    >
      <PrintSection numero="01" titulo="Datos personales" className="print-doc-patient-section">
        <dl className="print-doc-patient">
          {campos.map(([etiqueta, valor]) => (
            <div key={etiqueta}>
              <dt>{etiqueta}</dt>
              <dd>{valor}</dd>
            </div>
          ))}
        </dl>
      </PrintSection>
    </PrintDocument>
  );
}

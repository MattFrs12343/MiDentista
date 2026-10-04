import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PencilSimple, CheckCircle, Printer } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useClinicaData } from "@/data/store";
import { useAuth } from "@/features/auth/AuthContext";
import { PatientForm } from "@/features/patients/PatientForm";
import { PersonalDataPrint } from "@/features/patients/PersonalDataPrint";
import type { Paciente } from "@/types";

const SEXO_LABEL: Record<Paciente["sexo"], string> = {
  femenino: "Femenino",
  masculino: "Masculino",
  otro: "Otro",
};

export function PersonalDataTab({ paciente }: { paciente: Paciente }) {
  const { actualizarPaciente } = useClinicaData();
  const { sesion } = useAuth();
  const [editando, setEditando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Llegar con ?print=1 (desde el botón "Imprimir" de la tabla de pacientes)
  // dispara la impresión automáticamente al entrar a la ficha.
  useEffect(() => {
    if (searchParams.get("print") !== "1") return;
    window.print();
    searchParams.delete("print");
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (editando) {
    return (
      <Card className="p-6">
        <CardHeader className="p-0 pb-5">
          <CardTitle>Editar datos personales</CardTitle>
          <CardDescription>Los cambios se reflejan de inmediato en la ficha.</CardDescription>
        </CardHeader>
        <PatientForm
          inicial={paciente}
          textoBoton="Guardar cambios"
          onSubmit={(datos) => {
            actualizarPaciente(paciente.id, datos);
            setEditando(false);
            setGuardado(true);
            setTimeout(() => setGuardado(false), 3000);
          }}
        />
      </Card>
    );
  }

  const tieneEmergencia = Boolean(
    paciente.contactoEmergenciaNombre ||
      paciente.contactoEmergenciaTelefono ||
      paciente.contactoEmergenciaParentesco,
  );

  const campos: [string, string][] = [
    ["Nombres", paciente.nombres],
    ["Apellidos", paciente.apellidos],
    ["Carnet de identidad", paciente.ci],
    ["Fecha de nacimiento", paciente.fechaNacimiento],
    ["Sexo", SEXO_LABEL[paciente.sexo]],
    ["Teléfono", paciente.telefono],
    ["Correo electrónico", paciente.email || "—"],
    ["Dirección", paciente.direccion || "—"],
    ...(tieneEmergencia
      ? ([
          ["Contacto de emergencia", paciente.contactoEmergenciaNombre || "—"],
          ["Teléfono de emergencia", paciente.contactoEmergenciaTelefono || "—"],
          ["Parentesco", paciente.contactoEmergenciaParentesco || "—"],
        ] as [string, string][])
      : []),
  ];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Datos personales</CardTitle>
          <CardDescription>Información de contacto e identificación</CardDescription>
        </div>
        <div className="flex items-center gap-3">
          {guardado ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-pastel-green-fg fade-in-up">
              <CheckCircle size={14} weight="fill" /> Guardado
            </span>
          ) : null}
          <Button size="sm" variant="secondary" onClick={() => window.print()}>
            <Printer size={14} /> Imprimir
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setEditando(true)}>
            <PencilSimple size={14} /> Editar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          {campos.map(([label, valor]) => (
            <div key={label}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {label}
              </dt>
              <dd className="mt-1 text-sm text-ink">{valor}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
      <PersonalDataPrint paciente={paciente} clinica={sesion?.clinica} />
    </Card>
  );
}

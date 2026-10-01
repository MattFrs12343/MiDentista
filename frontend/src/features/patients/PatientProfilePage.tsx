import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { CalendarBlank, IdentificationCard, Phone, EnvelopeSimple } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageHeader } from "@/components/layout/PageHeaderContext";
import { useClinicaData } from "@/data/store";
import { PersonalDataTab } from "@/features/patients/PersonalDataTab";
import { ClinicalHistoryTab } from "@/features/clinical/ClinicalHistoryTab";
import { OdontogramTab } from "@/features/odontogram/OdontogramTab";
import { TreatmentTab } from "@/features/treatment/TreatmentTab";
import { esTabValida } from "@/features/patients/tabValue";

export function PatientProfilePage() {
  const { pacienteId } = useParams<{ pacienteId: string }>();
  const { obtenerPaciente } = useClinicaData();
  const paciente = pacienteId ? obtenerPaciente(pacienteId) : undefined;
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tabActiva = esTabValida(tabParam) ? tabParam : "datos";

  usePageHeader({
    title: paciente ? `${paciente.nombres} ${paciente.apellidos}` : "Paciente",
    subtitle: "Ficha clínica",
    icon: IdentificationCard,
    tone: "violet",
  });

  if (!pacienteId) return <Navigate to="/app/pacientes" replace />;
  if (!paciente) {
    return (
      <div className="rounded-xl border border-dashed border-line p-10 text-center text-sm text-ink-muted">
        No se encontró este paciente. Puede haber sido eliminado.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 fade-in-up">
      <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar nombre={`${paciente.nombres} ${paciente.apellidos}`} className="h-12 w-12 text-sm" />
          <div>
            <p className="text-base font-semibold text-ink">
              {paciente.nombres} {paciente.apellidos}
            </p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
              <span className="flex items-center gap-1">
                <IdentificationCard size={13} /> {paciente.ci}
              </span>
              <span className="flex items-center gap-1">
                <CalendarBlank size={13} /> {paciente.fechaNacimiento}
              </span>
              <span className="flex items-center gap-1">
                <Phone size={13} /> {paciente.telefono}
              </span>
              <span className="flex items-center gap-1">
                <EnvelopeSimple size={13} /> {paciente.email}
              </span>
            </div>
          </div>
        </div>
        <Badge tone="blue">Paciente activo</Badge>
      </div>

      <Tabs
        value={tabActiva}
        onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}
        className="flex flex-col gap-5"
      >
        <TabsList>
          <TabsTrigger value="datos">Datos personales</TabsTrigger>
          <TabsTrigger value="historia">Historia clínica</TabsTrigger>
          <TabsTrigger value="odontograma">Odontograma</TabsTrigger>
          <TabsTrigger value="tratamiento">Diagnóstico y tratamiento</TabsTrigger>
        </TabsList>

        <TabsContent value="datos">
          <PersonalDataTab paciente={paciente} />
        </TabsContent>
        <TabsContent value="historia">
          <ClinicalHistoryTab pacienteId={paciente.id} />
        </TabsContent>
        <TabsContent value="odontograma">
          <OdontogramTab pacienteId={paciente.id} />
        </TabsContent>
        <TabsContent value="tratamiento">
          <TreatmentTab pacienteId={paciente.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

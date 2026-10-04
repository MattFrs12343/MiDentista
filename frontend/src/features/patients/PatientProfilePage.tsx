import { useEffect } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { CalendarBlank, IdentificationCard, Phone, EnvelopeSimple } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageHeader } from "@/components/layout/PageHeaderContext";
import { useClinicaData } from "@/data/store";
import { useAuth } from "@/features/auth/AuthContext";
import { PersonalDataTab } from "@/features/patients/PersonalDataTab";
import { ClinicalHistoryTab } from "@/features/clinical/ClinicalHistoryTab";
import { OdontogramTab } from "@/features/odontogram/OdontogramTab";
import { TreatmentTab } from "@/features/treatment/TreatmentTab";
import { EvolutionTab } from "@/features/evolucion/EvolutionTab";
import { PagosTab } from "@/features/pagos/PagosTab";
import { precargarVista3D } from "@/features/odontogram/precargaVista3D";
import { esTabValida } from "@/features/patients/tabValue";

export function PatientProfilePage() {
  const { pacienteId } = useParams<{ pacienteId: string }>();
  const { obtenerPaciente, miPerfil } = useClinicaData();
  const { sesion } = useAuth();
  const puedeCobrar = sesion?.rol === "recepcionista" || sesion?.rol === "odontologo_admin";
  const paciente = pacienteId ? obtenerPaciente(pacienteId) : undefined;
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tabActiva = esTabValida(tabParam) ? tabParam : "datos";

  // Anticipa la descarga del arco 3D al abrir cualquier ficha, así la pestaña
  // de odontograma no arranca con la vista en blanco.
  useEffect(() => {
    void precargarVista3D().catch(() => {});
  }, []);

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
          <TabsTrigger value="evolucion">Evolución</TabsTrigger>
          <TabsTrigger value="pagos">Pagos</TabsTrigger>
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
        <TabsContent value="evolucion">
          {miPerfil ? (
            <EvolutionTab
              pacienteId={paciente.id}
              clinicaId={miPerfil.clinicaId}
              odontologoId={miPerfil.id}
            />
          ) : (
            <p className="rounded-xl border border-dashed border-line p-10 text-center text-sm text-ink-muted">
              Cargando perfil…
            </p>
          )}
        </TabsContent>
        <TabsContent value="pagos">
          {miPerfil ? (
            <PagosTab
              pacienteId={paciente.id}
              clinicaId={miPerfil.clinicaId}
              registradoPor={puedeCobrar ? miPerfil.id : undefined}
            />
          ) : (
            <p className="rounded-xl border border-dashed border-line p-10 text-center text-sm text-ink-muted">
              Cargando perfil…
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

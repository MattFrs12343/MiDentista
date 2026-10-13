import { useEffect } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { IdentificationCard, UserCircleMinus } from "@phosphor-icons/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { usePageHeader } from "@/components/layout/PageHeaderContext";
import { useClinicaData } from "@/data/store";
import { useAuth } from "@/features/auth/AuthContext";
import { PatientHero } from "@/features/patients/PatientHero";
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
      <EmptyState
        icon={UserCircleMinus}
        title="No se encontró este paciente"
        description="Puede haber sido eliminado. Volvé al listado para elegir otro."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 fade-in-up">
      <PatientHero paciente={paciente} />

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
            <EmptyState size="sm" title="Cargando perfil…" />
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
            <EmptyState size="sm" title="Cargando perfil…" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

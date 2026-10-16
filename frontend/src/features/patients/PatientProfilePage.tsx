import { useEffect, useState } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { IdentificationCard, UserCircleMinus } from "@phosphor-icons/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { usePageHeader } from "@/components/layout/PageHeaderContext";
import { useClinicaData } from "@/data/store";
import { useAuth } from "@/features/auth/AuthContext";
import { PatientHero } from "@/features/patients/PatientHero";
import { PersonalDataTab } from "@/features/patients/PersonalDataTab";
import { HistorialAtenciones } from "@/features/patients/HistorialAtenciones";
import { ClinicalHistoryTab } from "@/features/clinical/ClinicalHistoryTab";
import { OdontogramTab } from "@/features/odontogram/OdontogramTab";
import { TreatmentTab } from "@/features/treatment/TreatmentTab";
import { EvolutionTab } from "@/features/evolucion/EvolutionTab";
import { PagosTab } from "@/features/pagos/PagosTab";
import { totalPresupuestado } from "@/features/presupuestos/calculoTotal.ts";
import { cargarPresupuestos } from "@/features/presupuestos/presupuestoService.ts";
import { precargarVista3D } from "@/features/odontogram/precargaVista3D";
import { esTabValida } from "@/features/patients/tabValue";
import { PatientFilesSection } from "@/features/archivos/PatientFilesSection.tsx";
import { usePacienteTratamiento } from "@/features/treatment/usePacienteTratamiento.ts";
import { Button } from "@/components/ui/button";

export function PatientProfilePage() {
  const { pacienteId } = useParams<{ pacienteId: string }>();
  const { obtenerPaciente, miPerfil } = useClinicaData();
  const { sesion } = useAuth();
  // El odontólogo también cobra, no solo recepción: hay clínicas que
  // trabajan sin recepcionista. La policy `pagos_insert_staff` (docs/modules/
  // 09-pagos/sql.sql) ya lo permite a nivel de base; esto solo alinea el
  // frontend con ese permiso.
  const puedeCobrar =
    sesion?.rol === "recepcionista" || sesion?.rol === "odontologo" || sesion?.rol === "odontologo_admin";
  // Gestionar el QR de cobro es un permiso aparte de cobrar: el odontólogo
  // puede subir/cambiar el QR aunque no registre pagos (ver pagos/README.md
  // "Permisos esperados", que no cambia con esto).
  const puedeGestionarQr = sesion?.rol === "recepcionista" || sesion?.rol === "odontologo";
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tabActiva = esTabValida(tabParam) ? tabParam : "datos";
  const contextoTratamiento = usePacienteTratamiento(pacienteId ?? "", sesion, tabActiva === "tratamiento");
  const paciente = tabActiva === "tratamiento" ? contextoTratamiento.datos?.paciente
    : pacienteId ? obtenerPaciente(pacienteId) : undefined;

  // Anticipa la descarga del arco 3D al abrir cualquier ficha, así la pestaña
  // de odontograma no arranca con la vista en blanco.
  useEffect(() => {
    void precargarVista3D().catch(() => {});
  }, []);

  // Costura con el módulo 08: el total presupuestado real del paciente, para
  // que "Estado de cuenta" deje de decir siempre "Sin presupuesto registrado".
  // Se pide solo al abrir la pestaña de pagos, igual que el contexto de
  // tratamiento se pide solo al abrir la suya.
  const [totalPresupuestadoPaciente, setTotalPresupuestadoPaciente] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (tabActiva !== "pagos" || !paciente?.id) return;
    let cancelado = false;
    cargarPresupuestos(paciente.id)
      .then((presupuestos) => {
        if (!cancelado) setTotalPresupuestadoPaciente(totalPresupuestado(presupuestos));
      })
      .catch(() => {
        // El total presupuestado es una ayuda del módulo 08: si falla, "Pagos"
        // sigue funcionando con el estado por defecto (sin presupuesto).
        if (!cancelado) setTotalPresupuestadoPaciente(undefined);
      });
    return () => {
      cancelado = true;
    };
  }, [tabActiva, paciente?.id]);

  usePageHeader({
    title: paciente ? `${paciente.nombres} ${paciente.apellidos}` : "Paciente",
    subtitle: "Ficha clínica",
    icon: IdentificationCard,
    tone: "violet",
  });

  if (!pacienteId) return <Navigate to="/app/pacientes" replace />;
  if (tabActiva === "tratamiento" && contextoTratamiento.estado !== "success") {
    return <section aria-label="Ficha de diagnóstico y tratamiento" aria-busy={contextoTratamiento.estado === "loading"}>
      {contextoTratamiento.estado === "error" ? <><p role="alert">{contextoTratamiento.error}</p>
        <Button type="button" onClick={() => void contextoTratamiento.recargar()}>Reintentar carga del paciente</Button></>
        : <p role="status">Cargando paciente para diagnóstico y tratamiento…</p>}
    </section>;
  }
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
        className="flex min-w-0 flex-col gap-5"
      >
        <TabsList>
          <TabsTrigger value="datos">Datos personales</TabsTrigger>
          <TabsTrigger value="historia">Historia clínica</TabsTrigger>
          <TabsTrigger value="odontograma">Odontograma</TabsTrigger>
          <TabsTrigger value="tratamiento">Diagnóstico y tratamiento</TabsTrigger>
          <TabsTrigger value="evolucion">Evolución</TabsTrigger>
          <TabsTrigger value="archivos">Archivos</TabsTrigger>
          <TabsTrigger value="pagos">Pagos</TabsTrigger>
          <TabsTrigger value="historial">Historial de atenciones</TabsTrigger>
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
          <TreatmentTab key={JSON.stringify([paciente.id, sesion?.email, sesion?.rol, sesion?.clinicaSlug, contextoTratamiento.datos?.clinicaId])}
            pacienteId={paciente.id} paciente={paciente} clinicaId={contextoTratamiento.datos?.clinicaId} />
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
        <TabsContent value="archivos" className="min-w-0">
          <PatientFilesSection pacienteId={paciente.id} perfil={miPerfil} rol={sesion?.rol ?? null} />
        </TabsContent>
        <TabsContent value="pagos">
          {miPerfil ? (
            <PagosTab
              pacienteId={paciente.id}
              clinicaId={miPerfil.clinicaId}
              registradoPor={puedeCobrar ? miPerfil.id : undefined}
              puedeGestionarQr={puedeGestionarQr}
              totalPresupuestado={totalPresupuestadoPaciente}
            />
          ) : (
            <EmptyState size="sm" title="Cargando perfil…" />
          )}
        </TabsContent>
        <TabsContent value="historial">
          <HistorialAtenciones pacienteId={paciente.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

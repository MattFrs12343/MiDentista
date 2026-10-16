import { Receipt } from "@phosphor-icons/react";
import { EmptyState } from "@/components/ui/empty-state";
import { usePageHeader } from "@/components/layout/PageHeaderContext";
import { useClinicaData } from "@/data/store";
import { useAuth } from "@/features/auth/AuthContext";
import { QrCobro } from "./QrCobro.tsx";

/**
 * Ruta transversal `/app/pagos`: lo de la clínica, no de un paciente.
 *
 * Hoy solo alberga el QR de cobro (uno por clínica). El registro y el
 * historial de pagos sigue viviendo en la pestaña "Pagos" de la ficha de cada
 * paciente (`PagosTab.tsx`, dentro de `PatientProfilePage.tsx`): esta página
 * no la duplica.
 */
export function PagosPage() {
  const { miPerfil } = useClinicaData();
  const { sesion } = useAuth();

  usePageHeader({
    title: "Pagos y cuentas",
    subtitle: "QR de cobro de la clínica. El registro y el historial de cada paciente está en su ficha.",
    icon: Receipt,
    tone: "green",
  });

  // Mismo criterio que PatientProfilePage: odontólogo o recepción gestionan
  // el QR. No habilita registrar cobros, esa regla no cambia acá.
  const puedeGestionarQr =
    sesion?.rol === "recepcionista" || sesion?.rol === "odontologo" || sesion?.rol === "odontologo_admin";

  if (!miPerfil) {
    return <EmptyState size="sm" title="Cargando perfil…" />;
  }

  return (
    <div className="flex flex-col gap-5 fade-in-up">
      <QrCobro clinicaId={miPerfil.clinicaId} puedeGestionar={puedeGestionarQr} />
    </div>
  );
}

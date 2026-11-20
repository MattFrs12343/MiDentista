import { useNavigate } from "react-router-dom";
import { usePortalPaciente } from "@/features/portal-paciente/PortalPacienteContext";
import { PortalCargando } from "@/features/portal-paciente/PortalEstado";
import { SintomasWizard } from "@/features/portal-paciente/SintomasWizard";

/**
 * Ruta `/portal/sintomas`: pantalla completa, se llega acá una sola vez,
 * justo tras la primera afiliación (ver `BuscarClinicaPage`). Para
 * reabrirlo después, ver `AsistenteSintomasFlotante` (botón flotante del
 * portal, muestra el mismo `SintomasWizard` en un panel).
 */
export function SintomasWizardPage() {
  const navigate = useNavigate();
  const { cargando } = usePortalPaciente();

  if (cargando) return <PortalCargando />;

  return (
    <SintomasWizard
      onTerminar={() => navigate("/portal", { replace: true })}
      textoBotonFinal="Continuar al portal"
    />
  );
}

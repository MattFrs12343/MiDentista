import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Stethoscope } from "@phosphor-icons/react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import { usePortalPaciente } from "@/features/portal-paciente/PortalPacienteContext";
import { SintomasWizard } from "@/features/portal-paciente/SintomasWizard";

/**
 * Botón flotante del portal del paciente — equivalente a "MiDentista IA"
 * del staff (`features/asistente-ia/AsistenteFlotante.tsx`), pero para el
 * paciente abre el wizard de tarjetas de síntomas en vez de un chat de
 * texto/voz (ver docs/modules/17-asistente-ia/README.md, decisión B4
 * revisada: el paciente tiene su propio acceso flotante, repetible, no solo
 * el paso forzoso del primer ingreso).
 *
 * Cada vez que se completa, se guarda como un registro nuevo (ver
 * `sintomasService.ts` — ya estaba pensado para quedarse con el más
 * reciente); no hay límite de una sola vez para este acceso.
 */
export function AsistenteSintomasFlotante() {
  const [abierto, setAbierto] = useState(false);
  // Aviso de descubrimiento (ver `.fab-aviso` en index.css): se apaga solo a
  // los 3 pulsos, pero también apenas el usuario hace clic.
  const [notado, setNotado] = useState(false);
  const { ficha } = usePortalPaciente();
  const { pathname } = useLocation();

  // Sin clínica todavía no hay dónde guardar nada (ver guardarPrediagnostico);
  // y en la propia pantalla del wizard sería un botón que abre lo mismo que
  // ya se está viendo.
  if (!ficha || ficha.sinClinica || pathname === "/portal/sintomas") return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setAbierto(true);
          setNotado(true);
        }}
        aria-label="Abrir el asistente de síntomas"
        // Mismo criterio de clearance que el botón del staff: en móvil deja
        // espacio para `MobileTabBar` (fija abajo, z-50); desde `lg` no hay
        // tab bar y baja a `bottom-6`.
        className={cn(
          "press fixed bottom-24 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-ink text-white shadow-e3 hover:bg-ink/90 lg:bottom-6 lg:right-6",
          !notado && "fab-aviso",
        )}
      >
        <Stethoscope size={24} weight="fill" />
      </button>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent title="Asistente de síntomas">
          <SintomasWizard onTerminar={() => setAbierto(false)} textoBotonFinal="Cerrar" />
        </DialogContent>
      </Dialog>
    </>
  );
}

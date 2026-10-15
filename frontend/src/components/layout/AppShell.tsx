import { Outlet } from "react-router-dom";
import { ClipboardText, SquaresFour, Stethoscope, Tooth, UsersThree, Wallet } from "@phosphor-icons/react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { PageHeaderProvider } from "@/components/layout/PageHeaderContext";
import { AppBackground } from "@/components/ui/app-background";
import { SectionTransition } from "@/components/layout/section-transition";
import { useAuth } from "@/features/auth/AuthContext";

/* Mismas cinco secciones que `Sidebar` (fuente de navegación de escritorio),
 * con la "pista" que pide `MobileTabBar` para la hoja. No se reusa el array
 * de `Sidebar` directo porque ahí la clave es `icon` y acá `icono` — son dos
 * convenciones de nombre distintas en el proyecto, no vale la pena unificarlas
 * para esto. El superadmin no entra acá: su única pantalla no necesita barra. */
const NAV_STAFF = [
  { to: "/app", end: true, label: "Panel general", icono: SquaresFour, pista: "Resumen de la clínica" },
  { to: "/app/pacientes", end: false, label: "Pacientes", icono: UsersThree, pista: "Buscar y gestionar" },
  {
    to: "/app/historia-clinica",
    end: false,
    label: "Historia clínica",
    icono: ClipboardText,
    pista: "Consultas y diagnósticos",
  },
  { to: "/app/odontograma", end: false, label: "Odontograma", icono: Tooth, pista: "Estado de cada pieza" },
  {
    to: "/app/diagnostico-tratamiento",
    end: false,
    label: "Diagnóstico y tratamiento",
    icono: Stethoscope,
    pista: "Plan del paciente",
  },
  { to: "/app/pagos", end: false, label: "Pagos y cuentas", icono: Wallet, pista: "QR de cobro de la clínica" },
];

/* Los dos accesos directos de la barra: lo que un odontólogo abre más — el
 * panel con el resumen del día y la lista de pacientes para entrar a uno. */
const ACCESO_IZQUIERDO_STAFF = NAV_STAFF[0];
const ACCESO_DERECHO_STAFF = NAV_STAFF[1];

export function AppShell() {
  const { sesion } = useAuth();
  const esSuperadmin = sesion?.rol === "superadmin";

  return (
    <PageHeaderProvider>
      <AppBackground />
      {/* `h-dvh` y no `h-screen`: 100vh en iOS Safari mide mas que el viewport
          visible cuando la barra del navegador esta colapsada, y el pie de la
          app quedaria debajo de ella, inalcanzable al hacer scroll del body. */}
      <div className="flex h-dvh overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          {/* el padding superior se cancela con -mt del HangingBanner para que
              las sogas nazcan pegadas al header; ambos deben coincidir.
              `overscroll-contain` evita que el scroll del contenido arrastre el
              gesto de pull-to-refresh del documento entero. `pb-24` reserva el
              lugar de `MobileTabBar` en móvil (nada en superadmin, que no la
              monta: su única pantalla no necesita navegación extra). */}
          <main
            className={`flex-1 overflow-y-auto overscroll-contain px-4 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8 lg:pb-8 ${esSuperadmin ? "pb-8" : "pb-24"}`}
          >
            <div className="mx-auto max-w-6xl">
              {/* el shell (sidebar + header) se mantiene visible: solo el area de
                  contenido entra en modo carga al cambiar de seccion. Ver
                  SectionTransition para por que la carga no se mide en red. */}
              <SectionTransition>
                <Outlet />
              </SectionTransition>
            </div>
          </main>
        </div>

        {esSuperadmin ? null : (
          <MobileTabBar
            items={NAV_STAFF}
            accesoIzquierdo={ACCESO_IZQUIERDO_STAFF}
            accesoDerecho={ACCESO_DERECHO_STAFF}
            tituloHoja="Explorar el panel"
            menuId="menu-staff"
          />
        )}
      </div>
    </PageHeaderProvider>
  );
}

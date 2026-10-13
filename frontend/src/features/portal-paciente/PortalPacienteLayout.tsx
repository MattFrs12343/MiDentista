import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  CalendarBlank,
  FileText,
  House,
  MapPin,
  Notebook,
  Receipt,
  SignOut,
  Tooth,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { AppBackground } from "@/components/ui/app-background";
import { SectionTransition } from "@/components/layout/section-transition";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { useAuth } from "@/features/auth/AuthContext";
import { PortalPacienteProvider } from "@/features/portal-paciente/PortalPacienteContext";
import { cn } from "@/lib/cn";

const NAVEGACION = [
  { to: "/portal", end: true, label: "Inicio", icono: House, pista: "Resumen y accesos" },
  { to: "/portal/buscar", end: false, label: "Buscar clínica", icono: MapPin, pista: "Clínicas cercanas" },
  { to: "/portal/historia", end: false, label: "Mi historia", icono: FileText, pista: "Consultas y diagnósticos" },
  { to: "/portal/odontograma", end: false, label: "Odontograma", icono: Tooth, pista: "Estado de tus piezas" },
  { to: "/portal/citas", end: false, label: "Mis citas", icono: CalendarBlank, pista: "Pedir y ver atenciones" },
  { to: "/portal/evoluciones", end: false, label: "Evoluciones", icono: Notebook, pista: "Registro por fecha" },
  { to: "/portal/pagos", end: false, label: "Pagos", icono: Receipt, pista: "Presupuestos y saldo" },
];

/* Los dos accesos directos de la barra inferior: las pantallas que un
   paciente abre con más frecuencia. El resto de las secciones vive detrás
   del botón circular de menú. */
const ACCESO_IZQUIERDO = NAVEGACION[0];
const ACCESO_DERECHO = NAVEGACION.find((item) => item.to === "/portal/citas")!;

export function PortalPacienteLayout() {
  const { sesion, cerrarSesion } = useAuth();
  const navigate = useNavigate();

  const salir = () => {
    cerrarSesion();
    navigate("/login", { replace: true });
  };

  return (
    <PortalPacienteProvider>
      {/* `min-h-dvh` y no `min-h-screen`: en el móvil, `100vh` mide más que la
          zona visible (la barra de direcciones no se cuenta), y con eso el pie
          de la página queda por debajo de la pantalla. `dvh` sigue al viewport
          real. `overflow-x-clip`: nada arrastra al body (en iOS eso produce el
          "page bounce" lateral). `clip` no crea contenedor de scroll, así que
          el header sticky sigue pegando.

          El canvas lo pone `AppBackground` (y `body` como respaldo), no este
          div: un `bg-canvas` opaco aquí taparía todo el fondo animado, que
          va en `-z-10` justo debajo. */}
      <div className="min-h-dvh overflow-x-clip text-ink">
        <AppBackground />

        <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 sm:h-16 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <Logo size={24} />
              <span className="hidden text-xs font-normal text-ink-muted sm:inline">
                Portal del paciente
              </span>
            </div>

            <div className="flex-1" />

            <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-3">
              <Avatar nombre={sesion?.nombre ?? "Paciente"} className="size-9 shadow-e1" />
              <span className="hidden max-w-[14rem] truncate text-sm text-ink-soft sm:inline">
                {sesion?.nombre}
              </span>
              <button
                type="button"
                onClick={salir}
                aria-label="Cerrar sesión"
                className="press shrink-0 touch-none rounded-full p-2.5 text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
              >
                <SignOut size={18} weight="bold" />
              </button>
            </div>
          </div>

          {/* La tira de secciones es de escritorio. En móvil cedió su lugar a la
              barra inferior y su hoja de menú: siete chips con scroll horizontal
              dejaban fuera "Odontograma" y "Evoluciones" sin ningún indicador de
              que había más a la derecha, y en pantallas angostas el riel parecía
              más un carrusel accidental que una navegación. La hoja los muestra
              todos de una vez. */}
          <nav
            aria-label="Secciones del portal"
            className="mx-auto hidden max-w-5xl gap-1 px-6 pb-2 lg:flex"
          >
            {NAVEGACION.map(({ to, end, label, icono: Icono }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "press inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-ink text-white"
                      : "text-ink-soft hover:bg-surface-sunken hover:text-ink",
                  )
                }
              >
                <Icono size={16} weight="duotone" />
                {label}
              </NavLink>
            ))}
          </nav>
        </header>

        <MobileTabBar
          items={NAVEGACION}
          accesoIzquierdo={ACCESO_IZQUIERDO}
          accesoDerecho={ACCESO_DERECHO}
          tituloHoja="Explorar el portal"
          menuId="menu-portal"
        />

        <main className="mx-auto w-full max-w-5xl px-4 py-5 pb-28 sm:px-6 sm:py-8 lg:pb-8">
          {/* Mismo spinner de marca que la vista del odontólogo (`AppShell`):
              antes el portal no tenía ningún `Suspense` propio y el cambio de
              sección quedaba en blanco mientras el chunk se descargaba. */}
          <SectionTransition>
            <Outlet />
          </SectionTransition>
        </main>
      </div>
    </PortalPacienteProvider>
  );
}
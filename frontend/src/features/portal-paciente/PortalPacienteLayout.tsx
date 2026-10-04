import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  CalendarBlank,
  FileText,
  House,
  MapPin,
  Receipt,
  SignOut,
  Tooth,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/features/auth/AuthContext";
import { PortalPacienteProvider } from "@/features/portal-paciente/PortalPacienteContext";

const NAVEGACION = [
  { to: "/portal", end: true, label: "Inicio", icon: House },
  { to: "/portal/buscar", end: false, label: "Buscar clínica", icon: MapPin },
  { to: "/portal/historia", end: false, label: "Mi historia", icon: FileText },
  { to: "/portal/odontograma", end: false, label: "Odontograma", icon: Tooth },
  { to: "/portal/evoluciones", end: false, label: "Evoluciones", icon: CalendarBlank },
  { to: "/portal/pagos", end: false, label: "Pagos", icon: Receipt },
];

export function PortalPacienteLayout() {
  const { sesion, cerrarSesion } = useAuth();
  const navigate = useNavigate();

  const salir = () => {
    cerrarSesion();
    navigate("/login", { replace: true });
  };

  return (
    <PortalPacienteProvider>
      {/* `overflow-x-clip`: el nav hace scroll horizontal por dentro, pero nunca
          arrastra al body (en iOS eso produce el "page bounce" lateral). `clip`
          no crea contenedor de scroll, asi que el header sticky sigue pegando. */}
      <div className="min-h-screen overflow-x-clip bg-canvas text-ink">
        <header className="sticky top-0 z-30 border-b border-line bg-white/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <Logo size={24} />
              <span className="hidden text-xs font-normal text-ink-muted sm:inline">
                Portal del paciente
              </span>
            </div>
            <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
              <span className="hidden max-w-[14rem] truncate text-sm text-ink-soft sm:inline">
                {sesion?.nombre}
              </span>
              <Button variant="ghost" size="sm" onClick={salir}>
                <SignOut size={16} weight="bold" />
                Salir
              </Button>
            </div>
          </div>

          {/* el nav scrollea en su propio eje, con recorte en los bordes para
              que el chip activo no quede pegado al borde de la pantalla */}
          <nav className="mx-auto flex max-w-5xl snap-x gap-1 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
            {NAVEGACION.map(({ to, end, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `press inline-flex shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive ? "bg-ink text-white" : "text-ink-soft hover:bg-surface-sunken hover:text-ink"
                  }`
                }
              >
                <Icon size={16} weight="duotone" />
                {label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </PortalPacienteProvider>
  );
}

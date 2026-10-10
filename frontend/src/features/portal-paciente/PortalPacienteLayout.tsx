import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  CalendarBlank,
  FileText,
  House,
  List,
  MapPin,
  Notebook,
  Receipt,
  SignOut,
  Tooth,
  X,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { AppBackground } from "@/components/ui/app-background";
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

export function PortalPacienteLayout() {
  const { sesion, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);

  /* El panel es un drawer: si queda abierto y el paciente rota el teléfono, al
     volverlo se encuentra con un overlay sobre el contenido sin haberlo pedido.
     Cerrarlo al pasar a desktop hace lo mismo con la barra de pestañas, que en
     ese tamaño vuelve a estar visible. */
  useEffect(() => {
    if (!menuAbierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuAbierto(false);
    };
    const mq = window.matchMedia("(min-width: 1024px)");
    const onCambio = (e: MediaQueryListEvent) => {
      if (e.matches) setMenuAbierto(false);
    };
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onCambio);
    return () => {
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onCambio);
    };
  }, [menuAbierto]);

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
            {/* El menú lateral es exclusivo de móvil. En el drawer el botón es
                `List` y no `X`: el panel ya se cierra tocando el overlay o
                eligiendo una sección, y un aspa arriba del header obligaba a
                volver la mirada para cerrar algo que ya está a un toque. */}
            <button
              type="button"
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menú"
              aria-expanded={menuAbierto}
              aria-controls="menu-portal"
              className="press -ml-1.5 shrink-0 touch-none rounded-full p-2.5 text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 lg:hidden"
            >
              <List size={22} weight="bold" />
            </button>

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

          {/* La tira de secciones es de escritorio. En móvil cedió su lugar al
              drawer: seis chips con scroll horizontal dejaban fuera "Odontograma"
              y "Evoluciones" sin ningún indicador de que había más a la derecha,
              y en pantallas angostas el riel parecía más un carrusel accidental
              que una navegación. El drawer los muestra todos de una vez. */}
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

        {/* Overlay del drawer. `lg:hidden` porque en desktop el panel está
            siempre abierto y este velo no debe poder aparecer. */}
        <div
          onClick={() => setMenuAbierto(false)}
          aria-hidden
          className={cn(
            "fixed inset-0 z-40 bg-ink/40 transition-opacity duration-200 ease-out lg:hidden",
            menuAbierto
              ? "visible opacity-100"
              : "invisible pointer-events-none opacity-0",
          )}
        />

        <div
          id="menu-portal"
          className={cn(
            // El mismo tratamiento que el sidebar del clínico: en móvil el
            // panel flota con sombra amplia y en desktop se apoya en un borde.
            // El `bg-white/92` translúcido sobre un panel blanco no separaba
            // nada, así que el fondo va opaco y el material lo aporta el blur
            // del header, no el panel.
            "fixed inset-y-0 left-0 z-50 flex w-[17rem] max-w-[85vw] flex-col border-r border-line bg-surface shadow-e3 transition-transform duration-200 ease-out lg:hidden",
            menuAbierto ? "visible translate-x-0" : "invisible -translate-x-full",
          )}
        >
          <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-line px-4">
            <div className="flex min-w-0 items-center gap-2">
              <Logo size={22} />
              <span className="truncate text-xs text-ink-muted">Portal del paciente</span>
            </div>
            <button
              type="button"
              onClick={() => setMenuAbierto(false)}
              aria-label="Cerrar menú"
              className="press -mr-1.5 shrink-0 touch-none rounded-full p-2 text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
            >
              <X size={18} weight="bold" />
            </button>
          </div>

          <nav aria-label="Secciones del portal" className="flex-1 overflow-y-auto p-3">
            <ul className="flex flex-col gap-1">
              {NAVEGACION.map(({ to, end, label, icono: Icono, pista }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={() => setMenuAbierto(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex min-h-14 items-center gap-3 rounded-tile px-3 py-2.5 transition-colors",
                        isActive
                          ? "bg-brand-50 text-brand-900 shadow-e1"
                          : "text-ink-soft hover:bg-surface-sunken",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          aria-hidden
                          className={cn(
                            "grid size-9 shrink-0 place-items-center rounded-tile transition-colors",
                            isActive ? "bg-brand-500 text-white" : "bg-surface-sunken text-ink-muted",
                          )}
                        >
                          <Icono size={19} weight="duotone" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium leading-tight">
                            {label}
                          </span>
                          <span className="block truncate text-[12px] leading-tight text-ink-muted">
                            {pista}
                          </span>
                        </span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* El pie repite el nombre y deja "Salir" con su ícono: en el drawer el
              botón queda abajo del todo, lejos del header, así que necesita su
              propio punto de salida y no solo un ícono suelto. */}
          <div className="shrink-0 border-t border-line p-3 pb-safe">
            <div className="flex min-w-0 items-center gap-2.5 rounded-tile bg-surface-sunken p-2.5">
              <Avatar nombre={sesion?.nombre ?? "Paciente"} className="size-9 text-xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold leading-tight text-ink">
                  {sesion?.nombre}
                </p>
                <p className="truncate text-[11px] leading-tight text-ink-muted">Paciente</p>
              </div>
              <button
                type="button"
                onClick={salir}
                aria-label="Cerrar sesión"
                className="press shrink-0 touch-none rounded-full p-2.5 text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
              >
                <SignOut size={18} weight="bold" />
              </button>
            </div>
          </div>
        </div>

        <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </PortalPacienteProvider>
  );
}
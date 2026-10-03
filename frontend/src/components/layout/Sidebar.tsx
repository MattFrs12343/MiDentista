import { NavLink } from "react-router-dom";
import {
  SquaresFour,
  MapTrifold,
  UsersThree,
  ClipboardText,
  Tooth,
  Stethoscope,
  CalendarBlank,
  ReceiptX,
  Wallet,
  LockSimple,
  ShieldCheck,
  X,
} from "@phosphor-icons/react";
import logoMark from "@/assets/banners/logo-mark-hd.jpg";
import { useAuth } from "@/features/auth/AuthContext";
import { cn } from "@/lib/cn";

const principal = [
  { to: "/app", label: "Panel general", icon: SquaresFour, end: true },
  { to: "/app/planta", label: "Planta", icon: MapTrifold, end: false },
  { to: "/app/pacientes", label: "Pacientes", icon: UsersThree, end: false },
  { to: "/app/historia-clinica", label: "Historia clínica", icon: ClipboardText, end: false },
  { to: "/app/odontograma", label: "Odontograma", icon: Tooth, end: false },
  {
    to: "/app/diagnostico-tratamiento",
    label: "Diagnóstico y tratamiento",
    icon: Stethoscope,
    end: false,
  },
];

const proximamente = [
  { label: "Agenda y citas", icon: CalendarBlank },
  { label: "Presupuestos", icon: ReceiptX },
  { label: "Pagos y cuentas", icon: Wallet },
];

export function Sidebar({
  menuAbierto,
  onClose,
}: {
  menuAbierto: boolean;
  onClose: () => void;
}) {
  const { sesion } = useAuth();
  const esSuperadmin = sesion?.rol === "superadmin";

  return (
    <>
      {/* velo del cajón: solo en pantallas donde el sidebar está oculto */}
      <div
        onClick={onClose}
        aria-hidden
        className={cn(
          "fixed inset-0 z-40 bg-ink/35 backdrop-blur-[2px] transition-opacity duration-200 ease-out lg:hidden",
          menuAbierto ? "visible opacity-100" : "invisible pointer-events-none opacity-0",
        )}
      />

      <aside
        id="menu-lateral"
        aria-label="Navegación principal"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col",
          "border-r border-white/40 bg-white/95 backdrop-blur-xl",
          "transition-[transform,visibility] duration-200 ease-out",
          "lg:visible lg:pointer-events-auto lg:static lg:translate-x-0 lg:bg-white/55",
          menuAbierto
            ? "visible translate-x-0"
            : "invisible -translate-x-full max-lg:pointer-events-none",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-line bg-white px-5">
          <img src={logoMark} alt="MiDentista" className="h-8 w-auto object-contain" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="-mr-1.5 rounded-md p-1.5 text-ink-muted transition-colors duration-150 ease-out hover:bg-surface-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 lg:hidden"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {esSuperadmin ? (
            // El superadmin no es personal de una clínica: no tiene pacientes
            // propios, así que su vista queda totalmente separada de la
            // operativa clínica (nada de Pacientes/Historia/Odontograma/etc.).
            <div>
              <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                Administración
              </p>
              <ul className="space-y-0.5">
                <li>
                  <NavLink
                    to="/app/admin"
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors duration-150 ease-out",
                        isActive
                          ? "bg-brand-50 text-brand-700"
                          : "text-ink-soft hover:bg-surface-sunken hover:text-ink",
                      )
                    }
                  >
                    <ShieldCheck size={17} weight="bold" />
                    Panel de administración
                  </NavLink>
                </li>
              </ul>
            </div>
          ) : (
            <>
              <div>
                <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                  Atención clínica
                </p>
                <ul className="space-y-0.5">
                  {principal.map(({ to, label, icon: Icon, end }) => (
                    <li key={to}>
                      <NavLink
                        to={to}
                        end={end}
                        onClick={onClose}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors duration-150 ease-out",
                            isActive
                              ? "bg-brand-50 text-brand-700"
                              : "text-ink-soft hover:bg-surface-sunken hover:text-ink",
                          )
                        }
                      >
                        <Icon size={17} weight="bold" />
                        {label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                  Próximamente
                </p>
                <ul className="space-y-0.5">
                  {proximamente.map(({ label, icon: Icon }) => (
                    <li key={label}>
                      <div className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-ink-muted/70">
                        <Icon size={17} weight="bold" />
                        <span className="flex-1">{label}</span>
                        <LockSimple size={13} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </nav>
      </aside>
    </>
  );
}

import { NavLink } from "react-router-dom";
import {
  SquaresFour,
  UsersThree,
  ClipboardText,
  Tooth,
  Stethoscope,
  CalendarBlank,
  ReceiptX,
  Wallet,
  LockSimple,
  SignOut,
} from "@phosphor-icons/react";
import logoMark from "@/assets/banners/logo-mark.jpg";
import { Avatar } from "@/components/ui/avatar";
import { useAuth, ROLE_LABEL } from "@/features/auth/AuthContext";
import { cn } from "@/lib/cn";

const principal = [
  { to: "/app", label: "Panel general", icon: SquaresFour, end: true },
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

export function Sidebar() {
  const { sesion, cerrarSesion } = useAuth();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-white/40 bg-white/55 backdrop-blur-xl">
      <div className="flex h-16 items-center border-b border-line bg-white px-5">
        <img src={logoMark} alt="Mi Dentista" className="h-8 w-auto object-contain" />
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
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
      </nav>

      {sesion ? (
        <div className="flex items-center gap-2.5 border-t border-line px-4 py-4">
          <Avatar nombre={sesion.nombre} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{sesion.nombre}</p>
            <p className="truncate text-xs text-ink-muted">{ROLE_LABEL[sesion.rol]}</p>
          </div>
          <button
            onClick={cerrarSesion}
            aria-label="Cerrar sesión"
            className="rounded-md p-2 text-ink-muted transition-colors duration-150 ease-out hover:bg-surface-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
          >
            <SignOut size={16} weight="bold" />
          </button>
        </div>
      ) : null}
    </aside>
  );
}

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
  ShieldCheck,
  X,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { ROLE_LABEL, useAuth } from "@/features/auth/AuthContext";
import { cn } from "@/lib/cn";

interface ItemMenu {
  to: string;
  label: string;
  icon: Icon;
  end?: boolean;
}

const principal: ItemMenu[] = [
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

const administracion: ItemMenu[] = [
  { to: "/app/admin", label: "Panel de administración", icon: ShieldCheck, end: false },
];

const proximamente: { label: string; icon: Icon }[] = [
  { label: "Agenda y citas", icon: CalendarBlank },
  { label: "Presupuestos", icon: ReceiptX },
  { label: "Pagos y cuentas", icon: Wallet },
];

/**
 * Estilo de un item de navegación.
 *
 * El padding izquierdo es el MISMO en activo e inactivo: lo que identifica la
 * pantalla actual es el riel de acento de `brand-600` sobre el fondo `brand-50`,
 * no un corrimiento del texto. El riel es un pseudo-elemento absoluto, asi que
 * no suma padding extra ni desalinea el icono respecto de los otros items.
 */
function claseItem({ isActive }: { isActive: boolean }) {
  return cn(
    "relative flex items-center gap-2.5 rounded-ios py-2 pl-3 pr-2.5 text-sm font-medium",
    "transition-colors duration-150 ease-out",
    isActive
      ? cn(
          "bg-brand-50 text-brand-900 shadow-e1",
          "before:absolute before:inset-y-2.5 before:left-0 before:w-[3px] before:rounded-full before:bg-brand-600",
        )
      : "text-ink-soft hover:bg-surface-sunken hover:text-ink",
  );
}

function ItemNav({
  to,
  label,
  icon: Icon,
  end,
  onNavigate,
}: ItemMenu & { onNavigate: () => void }) {
  return (
    <li>
      {/* `NavLink` marca `aria-current="page"` solo en el item activo: el riel
          es decorativo y no duplica ese anuncio para el lector de pantalla. */}
      <NavLink to={to} end={end} onClick={onNavigate} className={claseItem}>
        {({ isActive }) => (
          <>
            <Icon
              size={17}
              weight={isActive ? "fill" : "bold"}
              className={cn("shrink-0", isActive ? "text-brand-600" : "text-ink-muted")}
            />
            <span className="truncate">{label}</span>
          </>
        )}
      </NavLink>
    </li>
  );
}

/** Titulo de grupo: pesa mas que el texto que agrupa y deja un filete que
 *  prolonga la linea hacia el borde, para que la jerarquia se lea de un golpe. */
function TituloGrupo({ children }: { children: string }) {
  return (
    <div className="mb-2 flex items-center gap-2.5 px-2">
      <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
        {children}
      </span>
      <span aria-hidden className="h-px flex-1 bg-line" />
    </div>
  );
}

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
          // `border-line` sobre el canvas calido separa de verdad: un borde
          // blanco translucido sobre un panel blanco no separaba nada.
          // En movil el panel flota (sombra amplia) y en desktop se apoya en el
          // contenido con una sombra lateral, un paso por delante.
          "border-r border-line bg-white/92 backdrop-blur-xl backdrop-saturate-150",
          "shadow-e3 lg:border-line-strong lg:bg-white/70 lg:shadow-[10px_0_28px_-18px_rgb(22_35_58/0.4)]",
          "transition-[transform,visibility] duration-200 ease-out",
          "lg:visible lg:pointer-events-auto lg:static lg:translate-x-0",
          menuAbierto
            ? "visible translate-x-0"
            : "invisible -translate-x-full max-lg:pointer-events-none",
        )}
      >
        {/* el header no lleva fondo propio: hereda el material del panel, para
            que la barra del logo no se lea como una tira blanca pegada arriba */}
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-line px-4 pt-safe sm:px-5 lg:pt-0">
          <Logo size={26} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="-mr-1.5 shrink-0 rounded-full p-1.5 text-ink-muted transition-colors duration-150 ease-out hover:bg-surface-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring lg:hidden"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <nav className="scroll-edge-top flex-1 space-y-5 overflow-y-auto px-3 py-5">
          {esSuperadmin ? (
            // El superadmin no es personal de una clínica: no tiene pacientes
            // propios, así que su vista queda totalmente separada de la
            // operativa clínica (nada de Pacientes/Historia/Odontograma/etc.).
            <div>
              <TituloGrupo>Administración</TituloGrupo>
              <ul className="space-y-0.5">
                {administracion.map((item) => (
                  <ItemNav key={item.to} {...item} onNavigate={onClose} />
                ))}
              </ul>
            </div>
          ) : (
            <>
              <div>
                <TituloGrupo>Atención clínica</TituloGrupo>
                <ul className="space-y-0.5">
                  {principal.map((item) => (
                    <ItemNav key={item.to} {...item} onNavigate={onClose} />
                  ))}
                </ul>
              </div>

              <div>
                <TituloGrupo>Próximamente</TituloGrupo>
                {/* bloque bloqueado: se lee como una zona cerrada (borde punteado
                    sobre la superficie hundida), no como tres links que no
                    responden. No son botones: no hay foco ni activacion. */}
                <ul className="space-y-0.5 rounded-ios border border-dashed border-line-strong bg-surface-sunken/50 p-1.5">
                  {proximamente.map(({ label, icon: Icon }) => (
                    <li key={label}>
                      <div className="flex cursor-not-allowed select-none items-center gap-2.5 rounded-ios px-2.5 py-2 text-sm font-medium text-ink-muted/60">
                        <Icon size={17} weight="bold" className="shrink-0" />
                        <span className="flex-1 truncate">{label}</span>
                        <LockSimple size={13} weight="fill" className="shrink-0" />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </nav>

        {sesion ? (
          /* Pie: cierra el panel con quien esta trabajando y en que clinica.
             `border-t` + `shrink-0` lo mantienen siempre visible aunque la lista
             scrollee, y `truncate` evita que un nombre largo reviente el layout. */
          <div className="shrink-0 border-t border-line px-3 pt-3 pb-safe">
            <div className="flex items-center gap-2.5 rounded-ios bg-surface-sunken/60 px-2.5 py-2">
              <Avatar nombre={sesion.nombre} className="h-8 w-8 text-[11px]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold leading-tight text-ink">
                  {sesion.nombre}
                </p>
                <p className="truncate text-[11px] leading-tight text-ink-muted">
                  {ROLE_LABEL[sesion.rol]}
                  {sesion.clinica ? ` · ${sesion.clinica}` : ""}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </>
  );
}
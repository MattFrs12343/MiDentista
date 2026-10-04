import { List, LockKey, SignOut } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { useAuth, ROLE_LABEL } from "@/features/auth/AuthContext";
import { ChangePasswordDialog } from "@/features/auth/ChangePasswordDialog";

export function Topbar({
  menuAbierto,
  onMenuClick,
}: {
  menuAbierto: boolean;
  onMenuClick: () => void;
}) {
  const { sesion, cerrarSesion } = useAuth();

  return (
    // Barra de navegacion translucida: el contenido pasa por debajo con blur.
    // El separador usa el mismo token `line` que el borde del sidebar, asi que
    // ambos paneles se leen como una sola pieza de cromo y no como dos barras
    // pegadas con reglas distintas. El `border-color` de `.material` lo pisa el
    // `border-line` de la utilidad, que va en la capa de utilities.
    <header className="relative z-20 shrink-0">
      <div className="material flex h-14 items-center gap-1 border-b border-line px-2 sm:h-16 sm:gap-2 sm:px-6 lg:gap-3 lg:px-8">
        <div className="pt-safe flex w-full min-w-0 items-center gap-1.5 sm:gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Abrir menú"
            aria-expanded={menuAbierto}
            aria-controls="menu-lateral"
            className="press -ml-1 shrink-0 touch-none rounded-full p-2.5 text-label-2 hover:bg-black/[0.04] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring lg:hidden"
          >
            <List size={22} weight="bold" />
          </button>

          {/* el logo del sidebar queda oculto en movil, donde el header es lo unico visible */}
          <div className="min-w-0 lg:hidden">
            <Logo size={22} />
          </div>

          <div className="min-w-0 flex-1" />

          {sesion ? (
            <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-3">
              {/* Identidad y acciones estan pegadas sin ningun pelo que las
                  separe: el filete va en este bloque, que es justamente la
                  frontera entre "quien sos" y "que podes hacer". Como el bloque
                  de texto es `hidden` en movil, el filete tampoco aparece ahi. */}
              <div className="hidden min-w-0 border-l border-line pl-3 text-right sm:block sm:max-w-[10rem] lg:max-w-none">
                <p className="label-ios truncate text-[15px] font-semibold leading-tight text-label">
                  {sesion.nombre}
                </p>
                <p className="label-ios truncate text-[13px] leading-tight text-label-2">
                  {ROLE_LABEL[sesion.rol]}
                </p>
              </div>
              <Avatar nombre={sesion.nombre} className="shadow-e1" />
              <ChangePasswordDialog>
                <button
                  type="button"
                  aria-label="Cambiar contraseña"
                  className="press shrink-0 touch-none rounded-full p-2.5 text-label-2 hover:bg-black/[0.04] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  <LockKey size={18} weight="bold" />
                </button>
              </ChangePasswordDialog>
              <button
                type="button"
                onClick={cerrarSesion}
                aria-label="Cerrar sesión"
                className="press shrink-0 touch-none rounded-full p-2.5 text-label-2 hover:bg-black/[0.04] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <SignOut size={18} weight="bold" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
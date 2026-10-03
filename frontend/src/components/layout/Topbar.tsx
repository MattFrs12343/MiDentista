import { List, LockKey, SignOut } from "@phosphor-icons/react";
import logoMark from "@/assets/banners/logo-mark.jpg";
import { Avatar } from "@/components/ui/avatar";
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
    // El separador es un hairline negro tenue, no un borde blanco de 1px: en iOS
    // la linea solo aparece para separar el cromo del contenido que pasa debajo,
    // y es oscura porque separa superficie clara de contenido claro.
    <header className="relative z-20 shrink-0">
      <div className="material flex h-14 items-center gap-1 border-b border-black/[0.06] px-3 sm:h-16 sm:gap-2 sm:px-6 lg:gap-3 lg:px-8">
        <div className="pt-safe flex w-full items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Abrir menú"
            aria-expanded={menuAbierto}
            aria-controls="menu-lateral"
            className="press -ml-1 touch-none rounded-full p-2.5 text-label-2 hover:bg-black/[0.04] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-blue/45 lg:hidden"
          >
            <List size={22} weight="bold" />
          </button>

          {/* el logo del sidebar queda oculto en movil, donde el header es lo unico visible */}
          <img
            src={logoMark}
            alt="MiDentista"
            className="h-7 w-auto object-contain lg:hidden"
          />

          <div className="flex-1" />

          {sesion ? (
            <div className="flex items-center gap-1.5 sm:gap-3">
              <div className="hidden text-right sm:block">
                <p className="label-ios truncate text-[15px] font-semibold leading-tight text-label">
                  {sesion.nombre}
                </p>
                <p className="label-ios truncate text-[13px] leading-tight text-label-2">
                  {ROLE_LABEL[sesion.rol]}
                </p>
              </div>
              <Avatar nombre={sesion.nombre} />
              <ChangePasswordDialog>
                <button
                  type="button"
                  aria-label="Cambiar contraseña"
                  className="press touch-none rounded-full p-2.5 text-label-2 hover:bg-black/[0.04] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-blue/45"
                >
                  <LockKey size={18} weight="bold" />
                </button>
              </ChangePasswordDialog>
              <button
                type="button"
                onClick={cerrarSesion}
                aria-label="Cerrar sesión"
                className="press touch-none rounded-full p-2.5 text-label-2 hover:bg-black/[0.04] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-blue/45"
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

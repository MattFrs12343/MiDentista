import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import type { Icon } from "@phosphor-icons/react";
import { SquaresFour, X } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

export interface ItemBarraMovil {
  to: string;
  end?: boolean;
  label: string;
  icono: Icon;
  /** Segunda línea en la hoja de menú ("Resumen y accesos"). Opcional: el
   * panel del odontólogo no la necesita, el portal del paciente sí. */
  pista?: string;
}

/**
 * Color único del botón de menú en toda la app (portal del paciente y panel
 * del odontólogo): tiene que reconocerse de un vistazo como "el botón", sin
 * confundirse con el azul de marca, el violeta de identidad de sección, o
 * los verdes/amarillos de estado que ya usa el resto de la interfaz. Cian
 * profundo, ninguna otra superficie de la app lo usa. `#0e7490` con texto
 * blanco da ~5.4:1 de contraste (AA).
 */
export const COLOR_MENU_MOVIL = "#0e7490";

/**
 * Navegación móvil compartida: barra inferior con, como mucho, tres botones
 * (dos accesos directos y un menú circular) + la hoja que despliega el mapa
 * completo de secciones. Es el mismo "CSS global de móvil" para cualquier
 * área de la app — portal del paciente y panel del odontólogo lo instancian
 * con su propia lista de secciones, sin duplicar el layout.
 *
 * Exclusiva de `lg:hidden`: en escritorio cada área sigue con su propia
 * navegación (tira horizontal o sidebar). El consumidor es responsable de
 * reservar espacio abajo en su `<main>` (`pb-28 lg:pb-8`) para que esta barra
 * fija no tape el contenido.
 */
export function MobileTabBar({
  items,
  accesoIzquierdo,
  accesoDerecho,
  tituloHoja,
  subtituloHoja = "Elegí a dónde querés ir",
  menuId,
}: {
  items: ItemBarraMovil[];
  accesoIzquierdo: ItemBarraMovil;
  accesoDerecho: ItemBarraMovil;
  tituloHoja: string;
  subtituloHoja?: string;
  /** Único por instancia: evita colisión de ids si dos layouts montaran esta
   * barra en simultáneo (no pasa hoy, pero `aria-controls` depende de esto). */
  menuId: string;
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);

  /* La hoja es un panel inferior: si queda abierta y el usuario rota el
     teléfono, al volverlo se encuentra con un overlay sobre el contenido sin
     haberlo pedido. Cerrarla al pasar a escritorio hace lo mismo con la
     navegación de esa pantalla, que ahí vuelve a estar visible. */
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

  return (
    <>
      {/* Velo de la hoja. `lg:hidden`: en escritorio la navegación de esa
          pantalla está siempre visible y este velo no debe poder aparecer. */}
      <div
        onClick={() => setMenuAbierto(false)}
        aria-hidden
        className={cn(
          "fixed inset-0 z-40 bg-ink/40 transition-opacity duration-200 ease-out lg:hidden",
          menuAbierto ? "visible opacity-100" : "invisible pointer-events-none opacity-0",
        )}
      />

      {/* Hoja con el mapa completo de secciones. Se ancla al fondo y agrega su
          propia reserva de espacio abajo (`pb-24`) para que el contenido no
          quede tapado por la barra fija: la barra, con fondo opaco y más
          z-index, se superpone a esa reserva y da la sensación de que la hoja
          termina justo encima suyo. La animación es un `translate-y` desde el
          100%: la hoja nace detrás de la barra y se despliega hacia arriba. */}
      <div
        id={menuId}
        role="dialog"
        aria-label={`Todas las secciones · ${tituloHoja}`}
        aria-modal="true"
        className={cn(
          "fixed inset-x-0 bottom-0 z-[45] origin-bottom transition-transform duration-300 ease-out lg:hidden",
          menuAbierto ? "visible translate-y-0" : "invisible translate-y-full",
        )}
      >
        <div className="mx-auto max-w-5xl rounded-t-[1.75rem] border border-line bg-surface p-4 pb-24 shadow-e3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-[15px] font-semibold text-ink">{tituloHoja}</p>
              <p className="text-[12.5px] text-ink-muted">{subtituloHoja}</p>
            </div>
            <button
              type="button"
              onClick={() => setMenuAbierto(false)}
              aria-label="Cerrar menú"
              className="press shrink-0 touch-none rounded-full bg-surface-sunken p-2 text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
            >
              <X size={18} weight="bold" />
            </button>
          </div>

          {/* Como máximo dos columnas: siempre legible sin achicar los textos,
              sea cual sea la cantidad de secciones. */}
          <nav aria-label={tituloHoja}>
            <ul className="grid grid-cols-2 gap-3">
              {items.map(({ to, end, label, icono: Icono, pista }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={() => setMenuAbierto(false)}
                    className={({ isActive }) =>
                      cn(
                        "press flex min-h-[6.5rem] flex-col items-center justify-center gap-2 rounded-tile border border-line bg-surface-sunken/60 p-3 text-center shadow-e1 transition-colors",
                        isActive ? "border-brand-200 bg-brand-50 text-brand-900" : "text-ink-soft hover:bg-surface-sunken",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          aria-hidden
                          className={cn(
                            "grid size-10 shrink-0 place-items-center rounded-full transition-colors",
                            isActive ? "bg-brand-500 text-white" : "bg-surface text-brand-600 shadow-e1",
                          )}
                        >
                          <Icono size={19} weight="duotone" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-semibold leading-tight text-ink">
                            {label}
                          </span>
                          {pista ? (
                            <span className="block truncate text-[11px] leading-tight text-ink-muted">
                              {pista}
                            </span>
                          ) : null}
                        </span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* Barra de herramientas inferior: exclusiva de móvil. A lo sumo tres
          botones (dos accesos directos y el menú) en vez de la navegación
          completa: es lo esencial para arrancar, el resto vive detrás del
          botón circular. */}
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-50 bg-surface/95 pb-safe shadow-[0_-8px_24px_-12px_rgba(22,35,58,0.18)] backdrop-blur-xl lg:hidden"
      >
        {/* Ola decorativa: reemplaza el `border-t` plano por un filo con
            forma propia y color — el contraste que le faltaba a una barra
            blanca lisa. `preserveAspectRatio="none"` estira el mismo trazo a
            cualquier ancho de pantalla sin recalcular nada; el degradé repite
            el azul de marca y el cian del botón de menú, así la ola se lee
            como parte del mismo sistema de color, no un adorno suelto. */}
        <svg
          aria-hidden
          viewBox="0 0 400 20"
          preserveAspectRatio="none"
          className="absolute inset-x-0 -top-[11px] h-3 w-full"
        >
          <defs>
            <linearGradient id="ola-barra-movil" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--color-brand-500)" />
              <stop offset="50%" stopColor="#0e7490" />
              <stop offset="100%" stopColor="var(--color-brand-500)" />
            </linearGradient>
          </defs>
          <path
            d="M0,14 C40,2 80,2 120,11 C160,20 190,20 200,11 C210,2 240,2 280,11 C320,20 360,20 400,8 L400,20 L0,20 Z"
            fill="url(#ola-barra-movil)"
          />
        </svg>

        <div className="mx-auto grid max-w-5xl grid-cols-3 items-start px-4 pt-2">
          <NavLink
            to={accesoIzquierdo.to}
            end={accesoIzquierdo.end}
            className={({ isActive }) =>
              cn(
                "press flex flex-col items-center gap-1 rounded-tile py-1.5 text-[11px] font-medium transition-colors",
                isActive ? "text-brand-600" : "text-ink-muted hover:text-ink",
              )
            }
          >
            <accesoIzquierdo.icono size={22} weight="duotone" />
            {accesoIzquierdo.label}
          </NavLink>

          {/* El botón de menú sobresale del borde superior de la barra, como
              el FAB central de una tab bar nativa. Color sólido (no
              degradado), ver `COLOR_MENU_MOVIL`. */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => setMenuAbierto((abierto) => !abierto)}
              aria-haspopup="dialog"
              aria-expanded={menuAbierto}
              aria-controls={menuId}
              aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
              style={{
                backgroundColor: COLOR_MENU_MOVIL,
                boxShadow: "0 10px 22px -6px rgba(14,116,144,0.55), 0 2px 6px -1px rgba(14,116,144,0.4)",
              }}
              className={cn(
                "press -mt-7 grid size-14 shrink-0 place-items-center rounded-full text-white ring-4 ring-surface transition-transform duration-200 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0e7490]/50",
                menuAbierto && "rotate-45",
              )}
            >
              <SquaresFour size={24} weight="bold" />
            </button>
            <span className="mt-1 text-[11px] font-medium text-ink-muted">Menú</span>
          </div>

          <NavLink
            to={accesoDerecho.to}
            end={accesoDerecho.end}
            className={({ isActive }) =>
              cn(
                "press flex flex-col items-center gap-1 rounded-tile py-1.5 text-[11px] font-medium transition-colors",
                isActive ? "text-brand-600" : "text-ink-muted hover:text-ink",
              )
            }
          >
            <accesoDerecho.icono size={22} weight="duotone" />
            {accesoDerecho.label}
          </NavLink>
        </div>
      </nav>
    </>
  );
}

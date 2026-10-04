import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Sogas que bajan desde el borde inferior del Topbar hasta cerca de las
 * esquinas superiores del banner. Anclan hacia dentro en el header y se abren
 * hacia fuera al llegar a la bandera, con una leve caída tipo catenaria.
 * Las coordenadas son porcentajes del ancho, así sirven para banners angostos
 * (secciones) y anchos (panel).
 */
const LEFT_ROPE = "M 11 0 C 8 24, 4 42, 2 56";
const RIGHT_ROPE = "M 89 0 C 92 24, 96 42, 98 56";

/** Ojal: anillo metálico que une la soga con la bandera. */
function Eyelet({ side }: { side: "left" | "right" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute top-0 z-20 grid h-[18px] w-[18px] place-items-center rounded-full",
        "-translate-y-1/2",
        // `shadow-e2` en lugar del `shadow-[...]` escrito a mano: el metal pasa
        // a usar la misma escala de elevación que el resto de la app. e1 es
        // demasiado tenue contra la foto y e3 (blur de 24px) se volvería un
        // halo en un aro de 18px; e2 es el token que sí levanta el ojal.
        // Sigue siendo `rounded-full` y no `rounded-tile`: un aro metálico es
        // un círculo, y 14px de radio sobre 18px lo vuelve un cuadrado de
        // esquinas vivas.
        "border-2 border-rope-deep/80 bg-ink/25 shadow-e2",
        side === "left" ? "left-[2%] -translate-x-1/2" : "right-[2%] translate-x-1/2",
      )}
    >
      <span className="h-[5px] w-[5px] rounded-full bg-ink/55" />
    </span>
  );
}

/**
 * Envuelve un hero (`SectionHero` o `SectionHeroStrip`) y lo hace colgar del
 * header con dos sogas. El hijo debe recibir `hanger-panel` para la sombra (y
 * su propia animación de entrada, p. ej. `fade-in-up`), nunca el wrapper, que
 * ya usa transform para el balanceo.
 *
 * Este componente no crea ningún elemento interactivo (sogas y ojal son
 * decoración `aria-hidden`), así que no lleva anillo de foco propio: lo que
 * llega por `children` conserva el suyo (`Button` ya usa
 * `focus-visible:ring-2`). El péndulo y el contrato `hanger`/`hanger-panel`
 * quedan intactos.
 */
export function HangingBanner({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    // -mt-* cancela el pt-* del <main> para que la soga nazca pegada al
    // header (deben coincidir: pt-5 sm:pt-6 lg:pt-8); pt-14 reserva los 56px
    // de la catenaria. Mismo max-w-3xl que los banners para que las sogas
    // caigan en sus esquinas.
    <div
      className={cn(
        "hanger relative -mt-5 mx-auto w-full max-w-3xl pt-14 sm:-mt-6 lg:-mt-8",
        className,
      )}
    >
      <svg
        aria-hidden
        viewBox="0 0 100 56"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 top-0 h-14 w-full overflow-visible"
      >
        <defs>
          <linearGradient id="hanger-rope" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-rope)" />
            <stop offset="100%" stopColor="var(--color-rope-deep)" />
          </linearGradient>
        </defs>

        {/* sombra de la soga sobre el fondo */}
        <g className="hanger-rope-shadow">
          <path d={LEFT_ROPE} transform="translate(1.6 1.6)" />
          <path d={RIGHT_ROPE} transform="translate(1.6 1.6)" />
        </g>

        <g className="hanger-rope-strand">
          <path d={LEFT_ROPE} />
          <path d={RIGHT_ROPE} />
        </g>
      </svg>

      <div className="relative">
        <Eyelet side="left" />
        <Eyelet side="right" />
        {children}
      </div>
    </div>
  );
}

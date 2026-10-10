import type { ComponentType, ReactNode } from "react";
import type { IconProps } from "@phosphor-icons/react";
import type { ModuleTone } from "@/components/layout/PageHeaderContext";
import { cn } from "@/lib/cn";

/**
 * Fuente unica del gradiente de modulo. Antes vivia aqui; el fondo animado del
 * portal lo necesitaba tambien, y mantener una sola copia es justamente lo que
 * evita que estos valores se desincronicen sin que nadie lo note.
 */
const TONE_GRADIENT: Record<ModuleTone, string> = {
  blue: "from-brand-900 via-brand-700 to-brand-400",
  violet: "from-[#2f2159] via-[#5b3f9f] to-[#9b81d6]",
  green: "from-[#123a26] via-[#2f6b48] to-[#6fb890]",
  yellow: "from-[#4a3208] via-[#93641c] to-[#d9a54a]",
};

const OVERLAY: Record<"light" | "strong", string> = {
  // overlay tenue: la foto es la protagonista (banners sin texto)
  light:
    "linear-gradient(to right, rgba(22,35,58,0.42) 0%, rgba(22,35,58,0.18) 55%, rgba(22,35,58,0.04) 100%)",
  // overlay marcado a la izquierda: asegura contraste del texto del panel
  strong:
    "linear-gradient(to right, rgba(22,35,58,0.93) 0%, rgba(22,35,58,0.78) 38%, rgba(22,35,58,0.28) 64%, rgba(22,35,58,0.06) 100%)",
};

/**
 * Todos los banners comparten la misma dimensión: altura derivada del ratio
 * nativo de las fotos (1600x600) con tope de ancho max-w-3xl. Al calzar exacto
 * el ratio, object-cover no recorta y las secciones no descoordinan entre sí.
 * En pantallas estrechas el ratio daría ~135px y el texto del panel no cabría,
 * así que un min-height toma el relevo en móvil sin desalinear nada en desktop.
 *
 * Sobre la forma: `rounded-panel` (no `rounded-2xl`) para que el recorte de la
 * bandera coincida con el radio de los paneles nuevos del tema.
 *
 * El filo del borde es un `border` de 1px y no un `ring-1 ring-inset` a
 * propósito: en Tailwind v4 `ring-*` se compone dentro de `box-shadow`, que es
 * la misma propiedad que usa la clase `.hanger-panel` (en `@layer components`);
 * como la capa utilities gana, el anillo borraría la sombra de colgado que los
 * callers pasan por `className`. Con `border` el filo no toca `box-shadow`
 * (y `box-sizing: border-box` mantiene intacto el aspect-ratio y el alto).
 */
function HeroBackdrop({
  icon: Icon,
  tone,
  photo,
  photoPosition = "center",
  overlay,
  children,
  className,
}: {
  icon: ComponentType<IconProps>;
  tone: ModuleTone;
  photo?: string;
  photoPosition?: string;
  overlay: "light" | "strong";
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center overflow-hidden rounded-panel border border-ink/10 bg-gradient-to-r",
        "aspect-[1600/600] min-h-[9.5rem] w-full max-w-3xl self-center sm:min-h-[11rem]",
        TONE_GRADIENT[tone],
        className,
      )}
    >
      {photo ? (
        <>
          <img
            src={photo}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: photoPosition }}
          />
          <div className="absolute inset-0 bg-ink/5" />
          <div className="absolute inset-0" style={{ background: OVERLAY[overlay] }} />
        </>
      ) : null}

      <Icon
        weight="duotone"
        className="pointer-events-none absolute -bottom-6 -right-5 text-white/10"
        style={{ width: 150, height: 150, transform: "rotate(-12deg)" }}
      />

      {children}
    </div>
  );
}

export function SectionHero({
  icon,
  tone,
  kicker,
  heading,
  description,
  photo,
  photoPosition = "center",
  children,
  className,
}: {
  icon: ComponentType<IconProps>;
  tone: ModuleTone;
  kicker?: string;
  heading: string;
  description?: string;
  photo?: string;
  photoPosition?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <HeroBackdrop
      icon={icon}
      tone={tone}
      photo={photo}
      photoPosition={photoPosition}
      overlay="strong"
      className={className}
    >
      <div className="relative z-10 flex max-w-md flex-col px-5 sm:px-8">
        {kicker ? (
          // El kicker conserva su tracking propio: es texto en mayúscula y sin
          // aire las letras se tocan. La convención de la casa para ese rol es
          // tracking ancha (`.dashboard-hero-label` usa 3px, `Label`/`Badge`
          // usan `tracking-wide`); `label-ios` es la clase de optical sizing
          // para texto de UI y dejaría el kicker apretado contra el heading.
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70 sm:text-xs">
            {kicker}
          </p>
        ) : null}
        <h2
          className={cn(
            // `title-ios` ya trae el tracking y el interlineado de las
            // jerarquías del resto de la app, así que se sacan el `tracking-*`
            // y el `leading-*` sueltos: son utilities y le ganarían por capa.
            "title-ios font-semibold text-white",
            "text-[1.5rem] sm:text-[2rem]",
            kicker && "mt-2",
          )}
        >
          {heading}
        </h2>
        {description ? (
          // `text-ios` para que la descripción comparta el ajuste óptico del
          // resto del texto corrido de la app.
          <p className="text-ios mt-2 text-xs leading-relaxed text-white/80 sm:text-sm">
            {description}
          </p>
        ) : null}
        {children}
      </div>
    </HeroBackdrop>
  );
}

export function SectionHeroStrip({
  icon,
  tone,
  photo,
  photoPosition = "center",
  className,
}: {
  icon: ComponentType<IconProps>;
  tone: ModuleTone;
  photo?: string;
  photoPosition?: string;
  className?: string;
}) {
  return (
    <HeroBackdrop
      icon={icon}
      tone={tone}
      photo={photo}
      photoPosition={photoPosition}
      overlay="light"
      className={className}
    />
  );
}

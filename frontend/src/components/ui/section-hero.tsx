import type { ComponentType, ReactNode } from "react";
import type { IconProps } from "@phosphor-icons/react";
import type { ModuleTone } from "@/components/layout/PageHeaderContext";
import { cn } from "@/lib/cn";

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
        "relative flex items-center overflow-hidden rounded-2xl bg-gradient-to-r",
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70 sm:text-xs">
            {kicker}
          </p>
        ) : null}
        <h2
          className={cn(
            "font-semibold leading-tight tracking-[-0.02em] text-white",
            "text-[1.5rem] sm:text-[2rem]",
            kicker && "mt-2",
          )}
        >
          {heading}
        </h2>
        {description ? (
          <p className="mt-2 text-xs leading-relaxed text-white/80 sm:text-sm">{description}</p>
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

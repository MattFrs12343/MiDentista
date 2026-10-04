import { Tooth } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

/**
 * Logo de MiDentista dibujado con vector (SVG) en vez de una imagen JPG con
 * fondo blanco: los JPG con fondo solido se veían como un "cuadrado blanco"
 * sobre el fondo con degradé. Acá no hay caja: solo el isotipo y el wordmark,
 * así que se funde con cualquier superficie clara.
 *
 * El lockup es exactamente el mismo que ya usa el proyecto:
 * `Tooth` duotone en brand-600 + "Mi" en brand-400 / "Dentista" en brand-800.
 */
interface LogoProps {
  /** Alto del isotipo en px. El texto se deriva de este valor (72%). */
  size?: number;
  /** `false` renderiza solo el isotipo. */
  withText?: boolean;
  className?: string;
}

/** Solo el isotipo. */
export function LogoMark({ size = 24, className }: { size?: number; className?: string }) {
  return <Tooth size={size} weight="duotone" className={cn("shrink-0 text-brand-600", className)} />;
}

/** Isotipo + wordmark. */
export function Logo({ size = 24, withText = true, className }: LogoProps) {
  if (!withText) return <LogoMark size={size} className={className} />;

  return (
    <span
      role="img"
      aria-label="MiDentista"
      className={cn("inline-flex min-w-0 items-center gap-2 select-none", className)}
    >
      <LogoMark size={size} />
      <span
        className="truncate font-semibold tracking-tight text-brand-800"
        style={{ fontSize: `${Math.round(size * 0.72)}px`, lineHeight: 1.1 }}
      >
        <span className="text-brand-400">Mi</span> <span>Dentista</span>
      </span>
    </span>
  );
}

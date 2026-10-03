import spinnerMark from "@/assets/banners/spinner-mark.png";
import { cn } from "@/lib/cn";

/**
 * Spinner de carga por seccion.
 *
 * Usa el mismo diente del logo (recortado a 120x120 y con el fondo blanco
 * hecho transparente) girando como elemento de carga. El contenedor reserva
 * una altura similar a la de una seccion real para que, al reemplazar el
 * fallback por el contenido, la pagina no salte de lugar.
 */
export function SectionLoader({
  label = "Cargando",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 py-16",
        className,
      )}
    >
      <span className="relative grid h-20 w-20 place-items-center">
        {/* Contorno de circunferencia: pista completa tenu + arco que gira.
            El radio (35.5 sobre un viewBox de 80) deja ~10px de aire alrededor
            del dibujo real del diente, que ocupa 58x47px de los 64px del <img>. */}
        <svg viewBox="0 0 80 80" aria-hidden="true" className="absolute inset-0 h-full w-full">
          {/* `stroke="currentColor"` es obligatorio: en SVG el `stroke` por
              defecto es `none`, y una clase de color de Tailwind solo cambia
              `color`, asi que sin esto el contorno no se dibuja. */}
          <circle
            cx="40" cy="40" r="35.5" fill="none" stroke="currentColor" strokeWidth="3"
            className="text-brand-100"
          />
          {/* 62 de 223 (la circunferencia) = ~28% de arco, con extremos redondeados */}
          <circle
            cx="40" cy="40" r="35.5" fill="none" stroke="currentColor" strokeWidth="3.5"
            strokeLinecap="round" strokeDasharray="62 161"
            className="anillo-cargando text-brand-500"
          />
        </svg>

        {/* el logo queda quieto: el movimiento lo lleva el contorno, no el dibujo */}
        <img
          src={spinnerMark}
          alt=""
          aria-hidden="true"
          width={120}
          height={120}
          className="relative h-14 w-14 object-contain opacity-90"
        />
      </span>

      <span className="flex items-center gap-2 text-sm font-medium text-ink-soft">
        {label}
        <span className="flex gap-1" aria-hidden="true">
          <span className="h-1 w-1 rounded-full bg-brand-400 motion-safe:animate-bounce [animation-delay:-0.3s]" />
          <span className="h-1 w-1 rounded-full bg-brand-400 motion-safe:animate-bounce [animation-delay:-0.15s]" />
          <span className="h-1 w-1 rounded-full bg-brand-400 motion-safe:animate-bounce" />
        </span>
      </span>
    </div>
  );
}

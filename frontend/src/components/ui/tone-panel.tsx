import type { ReactNode } from "react";
import type { ModuleTone } from "@/components/layout/PageHeaderContext";
import { AnimatedTeeth } from "@/components/ui/animated-teeth";
import { cn } from "@/lib/cn";

/**
 * Fuente única de verdad del gradiente de módulo. Antes vivía suelto en
 * `section-hero.tsx`; al necesitar el mismo fondo en el portal del paciente
 * estaba a punto de existir una segunda copia, que es como estos valores se
 * desincronizan sin que nadie lo note.
 */
const TONE_GRADIENT: Record<ModuleTone, string> = {
  blue: "from-brand-900 via-brand-700 to-brand-400",
  violet: "from-[#2f2159] via-[#5b3f9f] to-[#9b81d6]",
  green: "from-[#123a26] via-[#2f6b48] to-[#6fb890]",
  yellow: "from-[#4a3208] via-[#93641c] to-[#d9a54a]",
};

/**
 * Panel de módulo con el fondo animado.
 *
 * Reúne las tres piezas que hacen que una superficie se lea como la plantilla
 * de referencia: el gradiente del módulo, los blobs de `AppBackground` y los
 * dientes flotantes de `AnimatedTeeth`. Sin los blobs el gradiente se ve plano
 * al lado del resto de la app; sin los dientes el panel es un bloque de color
 * sin movimiento.
 *
 * `animated` existe para los casos donde el movimiento estorba (impresión) y
 * para el `prefers-reduced-motion`, que se resuelve en CSS sobre
 * `.drift-tooth`.
 */
export function TonePanel({
  tone,
  children,
  animated = true,
  className,
}: {
  tone: ModuleTone;
  children: ReactNode;
  animated?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-panel bg-gradient-to-r",
        TONE_GRADIENT[tone],
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden print:hidden">
        <div className="mesh-blob-a absolute -left-1/5 -top-1/3 h-[85%] w-[70%] rounded-full bg-white/10 blur-3xl" />
        <div className="mesh-blob-b absolute -bottom-1/3 -right-1/5 h-[90%] w-[70%] rounded-full bg-brand-200/20 blur-3xl" />
        {animated ? <AnimatedTeeth tone="vivid" /> : null}
      </div>
      {children}
    </div>
  );
}

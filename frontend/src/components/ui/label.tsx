import * as LabelPrimitive from "@radix-ui/react-label";
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import { cn } from "@/lib/cn";

export const Label = forwardRef<
  ElementRef<typeof LabelPrimitive.Root>,
  ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    // Micro etiqueta de formulario. Se alinea con los titulos de grupo del
    // Sidebar (`text-[11px] font-bold uppercase tracking-[0.08em]`) para que
    // "Administracion" y "Nombre del paciente" se lean como el mismo nivel.
    // OJO: no usar `label-ios` aqui — su tracking de 0.006em esta disenado para
    // texto corrido y le quitaria el aire a una etiqueta en mayuscula.
    className={cn(
      "text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted",
      className,
    )}
    {...props}
  />
));
Label.displayName = "Label";

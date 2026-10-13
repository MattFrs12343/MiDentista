import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";
import { useFormTheme } from "@/components/ui/form-theme";

export function Field({
  label,
  htmlFor,
  className,
  labelClassName,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  className?: string;
  labelClassName?: string;
  hint?: string;
  /** Error de validación. Pinta la etiqueta y el texto de ayuda en rojo. */
  error?: string | null;
  children: ReactNode;
}) {
  const tema = useFormTheme();
  return (
    // Este es el esqueleto de los formularios de la app. El `gap-1.5` separa
    // etiqueta / control / ayuda; con la etiqueta ahora en 11px uppercase, el
    // pista de abajo tiene que quedar claramente por debajo del control para que
    // el campo se lea como una unidad y no como tres textos sueltos.
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor} className={cn(tema.label, error && "text-ios-red", labelClassName)}>
        {label}
      </Label>
      {children}
      {/* El error reemplaza a la pista: si los dos textos aparecen juntos se
          duplica la misma complainta en dos tonos distintos. */}
      {error ? (
        <p className="text-ios text-[12px] leading-relaxed text-ios-red">{error}</p>
      ) : hint ? (
        <p className={cn(tema.hint)}>{hint}</p>
      ) : null}
    </div>
  );
}

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";

export function Field({
  label,
  htmlFor,
  className,
  labelClassName,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  className?: string;
  labelClassName?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    // Este es el esqueleto de los 13 formularios de la app. El `gap-1.5` separa
    // etiqueta / control / ayuda; con la etiqueta ahora en 11px uppercase, el
    // pista de abajo tiene que quedar claramente por debajo del control para que
    // el campo se lea como una unidad y no como tres textos sueltos.
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor} className={labelClassName}>
        {label}
      </Label>
      {children}
      {hint ? <p className="text-ios text-[12px] leading-relaxed text-ink-muted">{hint}</p> : null}
    </div>
  );
}

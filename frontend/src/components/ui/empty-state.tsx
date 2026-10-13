import type { HTMLAttributes, ReactNode } from "react";
import type { Icon, IconProps } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/** Tono del chip del ícono. Reusa los pares pastel del tema. */
export type EmptyStateTone = "neutral" | "brand" | "positive" | "warning" | "danger";

const TONE_CHIP: Record<EmptyStateTone, string> = {
  neutral: "bg-surface text-ink-muted",
  brand: "bg-brand-50 text-brand-600",
  positive: "bg-pastel-green-bg text-pastel-green-fg",
  warning: "bg-pastel-yellow-bg text-pastel-yellow-fg",
  danger: "bg-pastel-red-bg text-pastel-red-fg",
};

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  /** Ícono del motivo (búsqueda sin resultados, caja vacía, error). Decorativo. */
  icon?: Icon;
  iconTone?: EmptyStateTone;
  iconWeight?: IconProps["weight"];
  /** Qué falta, en una línea. Es el texto que más se lee: va en el peso fuerte. */
  title: string;
  /** Explica qué hacer o por qué no hay nada. */
  description?: ReactNode;
  /** Acción lista para usar (nodo). Tiene prioridad sobre `actionLabel`. */
  action?: ReactNode;
  /** Acción simple: se renderiza con el botón de la app. */
  actionLabel?: string;
  onAction?: () => void;
  actionVariant?: "primary" | "secondary";
  size?: "sm" | "md";
  /**
   * Anuncia el cambio con `role="status"`. Encaja cuando el vacío aparece al
   * filtrar, no cuando la vista ya nació vacía (ahí el texto se lee solo).
   */
  live?: boolean;
}

/**
 * Estado vacío: sin resultados, sin registros, nada que mostrar todavía.
 *
 * Sigue la estructura del bloque `empty` de la plantilla de referencia (ícono,
 * título, descripción, acción) pero con el tono de MiDentista: radio de panel,
 * borde punteado sobre superficie hundida y la acción con el botón de la casa,
 * cuyo foco ya es visible. Sirve tanto a secas como dentro de la celda
 * `empty` de `DataTable`.
 */
export function EmptyState({
  icon: Icono,
  iconTone = "neutral",
  iconWeight = "duotone",
  title,
  description,
  action,
  actionLabel,
  onAction,
  actionVariant = "primary",
  size = "md",
  live = false,
  className,
  ...props
}: EmptyStateProps) {
  const chico = size === "sm";

  return (
    <div
      role={live ? "status" : undefined}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-3 rounded-panel border border-dashed border-line bg-surface-sunken/70 text-center",
        chico ? "px-4 py-8" : "px-6 py-12",
        className,
      )}
      {...props}
    >
      {Icono ? (
        <span
          aria-hidden="true"
          className={cn(
            "grid shrink-0 place-items-center rounded-ios",
            chico ? "size-10" : "size-12",
            TONE_CHIP[iconTone],
          )}
        >
          <Icono size={chico ? 20 : 24} weight={iconWeight} />
        </span>
      ) : null}

      <div className="flex max-w-sm flex-col gap-1.5">
        <p
          className={cn(
            "title-ios font-semibold text-ink text-balance",
            chico ? "text-[15px]" : "text-[17px]",
          )}
        >
          {title}
        </p>
        {description ? (
          <p className="text-[13px] leading-relaxed text-ink-muted text-pretty">
            {description}
          </p>
        ) : null}
      </div>

      {action ??
        (actionLabel && onAction ? (
          <Button
            type="button"
            variant={actionVariant}
            size={chico ? "sm" : "md"}
            onClick={onAction}
            className="mt-1"
          >
            {actionLabel}
          </Button>
        ) : null)}
    </div>
  );
}

import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
  {
    variants: {
      tone: {
        neutral: "bg-surface-sunken text-ink-soft",
// `blue` y `violet` usan la rampa de marca. El celeste `pastel-blue-bg` y el
  // lila `pastel-violet-bg` quedan fuera de la identidad de la plataforma; los
  // nombres se conservan porque el resto de la app los pide por tono de modulo.
  blue: "bg-brand-100 text-brand-700",
  red: "bg-pastel-red-bg text-pastel-red-fg",
  green: "bg-pastel-green-bg text-pastel-green-fg",
  yellow: "bg-pastel-yellow-bg text-pastel-yellow-fg",
  violet: "bg-brand-50 text-brand-600",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

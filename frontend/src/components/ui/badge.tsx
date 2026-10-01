import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
  {
    variants: {
      tone: {
        neutral: "bg-surface-sunken text-ink-soft",
        blue: "bg-pastel-blue-bg text-pastel-blue-fg",
        red: "bg-pastel-red-bg text-pastel-red-fg",
        green: "bg-pastel-green-bg text-pastel-green-fg",
        yellow: "bg-pastel-yellow-bg text-pastel-yellow-fg",
        violet: "bg-pastel-violet-bg text-pastel-violet-fg",
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

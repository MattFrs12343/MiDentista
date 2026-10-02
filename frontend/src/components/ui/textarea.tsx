import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-20 w-full rounded-xl border border-line-field bg-surface px-4 py-2.5 text-sm text-ink shadow-[inset_0_1px_2px_rgba(22,35,58,0.04)] placeholder:text-ink-muted transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:border-ios-blue focus-visible:ring-2 focus-visible:ring-ios-blue/15 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

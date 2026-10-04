import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      // Debe coincidir con `Input`: mismo radio, misma altura de linea, mismo
      // anillo de foco. Antes iba `rounded-xl` + `text-sm`, asi que un campo de
      // texto largo al lado de un input se veia descuadrado. Ademas `text-sm`
      // (14px) hacia zoom automatico en iOS al enfocar: un `<textarea>` es un
      // campo de texto y Safari aplica la misma regla que a los `<input>`.
      className={cn(
        "flex min-h-20 w-full rounded-ios-lg border border-line-field bg-surface px-4 py-2.5 text-[16px] leading-6 text-ink shadow-[inset_0_1px_2px_rgba(22,35,58,0.04)] placeholder:text-label-3 transition-colors duration-150 ease-out focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      // text-[16px] es obligatorio en iOS: por debajo de 16px Safari hace zoom
      // al enfocar y el usuario queda perdido en la pagina.
      // El foco pasa a anillo de 2px con el token `focus-ring`: antes era un
      // borde azul mas un halo de 4px al 15%, que se leia como dos senales.
      className={cn(
        "flex h-11 w-full rounded-ios-lg border border-line-field bg-white px-4 text-[16px] leading-6 text-label shadow-[inset_0_1px_2px_rgba(22,35,58,0.04)] placeholder:text-label-3 transition-colors duration-150 ease-out focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

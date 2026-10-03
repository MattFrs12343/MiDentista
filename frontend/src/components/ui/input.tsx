import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      // text-[16px] es obligatorio en iOS: por debajo de 16px Safari hace zoom
      // al enfocar y el usuario queda perdido en la pagina.
      className={cn(
        "flex h-11 w-full rounded-ios-lg border border-line-field bg-white px-4 text-[16px] leading-6 text-label shadow-[inset_0_1px_2px_rgba(22,35,58,0.04)] placeholder:text-label-3 transition-colors duration-150 ease-out focus-visible:border-ios-blue focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ios-blue/15 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

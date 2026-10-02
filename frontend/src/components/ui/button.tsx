import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  // `press` = feedback en pointer-down; `touch-none` evita el retardo de 300ms
  // del tap en moviles. El foco usa ring como hace el foco de iOS, no outline.
  "press inline-flex touch-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-colors duration-100 ease-out disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-blue/45 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
  {
    variants: {
      variant: {
        // filled: la accion principal, un solo color solido por pantalla
        primary:
          "bg-brand-600 text-white shadow-diffuse hover:bg-brand-700 active:bg-brand-800",
        // tinted: accion secundaria, color diluido (como UIButton tinted)
        secondary: "bg-brand-50 text-brand-700 hover:bg-brand-100 active:bg-brand-200",
        // plain: sin fondo hasta que se toca
        ghost: "text-label-2 hover:bg-black/[0.04] hover:text-ink active:bg-black/[0.08]",
        danger: "bg-ios-red text-white hover:brightness-95 active:brightness-90",
      },
      size: {
        sm: "h-9 px-3.5 text-[13px]",
        md: "h-11 px-5 text-[15px]",
        lg: "h-13 px-6 text-[17px]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";

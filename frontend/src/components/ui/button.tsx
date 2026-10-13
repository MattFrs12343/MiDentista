import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  // `press` = feedback en pointer-down; `touch-none` evita el retardo de 300ms
  // del tap en moviles. El foco usa ring como hace el foco de iOS, no outline,
  // y el anillo sale del token `focus-ring` para que todos los controles de la
  // app compartan exactamente el mismo azul y el mismo grosor.
  "press inline-flex touch-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-colors duration-100 ease-out disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
  {
    variants: {
      variant: {
        // filled: la accion principal, un solo color solido por pantalla.
        // `shadow-e2` la despega del fondo; antes usaba la sombra difusa y se
        // leia al mismo nivel que las superficies.
        primary: "bg-ink text-white shadow-e2 hover:bg-ink/90 active:bg-ink-muted",
        // tinted: accion secundaria, color diluido (como UIButton tinted)
        secondary:
          "bg-surface-sunken text-ink border border-line hover:bg-line active:bg-line-strong",
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

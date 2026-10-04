import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      // Superficie agrupada. `shadow-e2` es lo que hace que una tarjeta se
      // lea como elevada: con `shadow-diffuse` (la sombra vieja) todo quedaba
      // en el mismo plano y la jerarquia solo se expresaba con tamano de texto.
      // `rounded-panel` alinea el recorte con los banners y los bloques nuevos.
      className={cn(
        "rounded-panel border border-ink/[0.08] bg-white/85 shadow-e2 backdrop-blur-2xl",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

// Header mas compacto que antes (p-4 en vez de p-5): la densidad deja que la
// tarjeta muestre mas informacion sin que el padding se coma el contenido.
export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-4 pb-2.5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("title-ios text-[16px] font-semibold text-label", className)} {...props} />
  );
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-[12.5px] leading-relaxed text-label-2", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-4 pb-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-4 pb-4 pt-0", className)} {...props} />;
}

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type CardVariant = "flat" | "raised" | "overlay" | "glass";
/**
 * Sin `violet`: el morado `#5b3f9f` es el único tono frio de la paleta y sobre
 * el canvas calido se lee como un color ajeno. Se usa en los heroes de modulo
 * (donde el gradiente lo justifies porque el panel es grande y oscuro), pero
 * como superficie de tarjeta se ve sucio. Quien necesite identidad de seccion
 * usa el acento de la marca; para estadoclinico, `green` / `yellow` / `red`.
 */
export type CardTone = "neutral" | "brand" | "green" | "yellow" | "red";

/**
 * Vocabulario de superficies de la app.
 *
 * Antes todas las tarjetas eran el mismo bloque: `bg-white/85` +
 * `backdrop-blur-2xl` + `shadow-e2`. Tres problemas de eso:
 *
 * 1. **Sin jerarquia.** Si las 59 tarjetas de la app estan elevadas, nada
 *    destaca: la jerarquia solo se podia expresar con tamano de texto. Ahora
 *    hay tres niveles y cada uno tiene un destino claro.
 * 2. **Carta blanca lechosa.** `bg-white/85` sobre un canvas calido deja el
 *    texto con menos contraste del que deberia y difumina el borde de la
 *    tarjeta. La superficie es opaca y el filo queda nitido.
 * 3. **Coste en celular.** `backdrop-blur` obliga al navegador a leer y
 *    componer el fondo detras de cada elemento. Con 59 tarjetas en pantalla
 *    eso es trabajo real por frame, y es justo el dispositivo donde no se nota
 *    el efecto. Queda como `variant="glass"`, para los pocos paneles que si
 *    lo necesitan.
 *
 * Los tonos reutilizan los pasteles de `badge.tsx` para que un panel y su
 * etiqueta se lean como la misma familia de color.
 */
const VARIANT: Record<CardVariant, string> = {
  // `flat`: contenido anidado dentro de otra tarjeta, o listas densas donde
  // una sombra por fila solo produciria ruido.
  flat: "border border-line",
  // `raised`: la tarjeta de contenido normal de una seccion. El borde usa el
  // token `line` y no `border-ink/[0.07]`: 7% de tinta sobre blanco daba 1.26
  // de contraste, o sea un borde que no delimitaba nada. Con `line` da 1.42 y
  // la tarjeta se lee como superficie.
  raised: "border border-line shadow-e1",
  // `overlay`: lo que flota por encima del contenido (dialogos, menues,
  // paneles que se despegan al hacer scroll). Borde mas presente porque se
  // superpone al contenido y necesita separarse de lo que tiene debajo.
  overlay: "border border-line-strong shadow-e2",
  // `glass`: reservado. Ver la nota 3 de arriba.
  glass: "border border-white/60 backdrop-blur-xl",
};

/* `brand` usa la rampa de marca y no `pastel-blue`: `#e1f3fe` es un celeste
   mas saturado que la identidad de la app, y el azul de marca ya tiene sus
   propios pasos claros (`brand-50` / `brand-100`). */
const TONE: Record<CardTone, string> = {
  neutral: "bg-surface",
  brand: "bg-brand-50",
  green: "bg-pastel-green-bg",
  yellow: "bg-pastel-yellow-bg",
  red: "bg-pastel-red-bg",
};

const ACCENT: Record<CardTone, string> = {
  neutral: "bg-ink/25",
  brand: "bg-brand-500",
  green: "bg-pastel-green-fg",
  yellow: "bg-pastel-yellow-fg",
  red: "bg-pastel-red-fg",
};

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  tone?: CardTone;
  /** Filo de color a la izquierda: identifica la seccion de un vistazo. */
  accent?: boolean;
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "raised", tone = "neutral", accent = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-panel",
        VARIANT[variant],
        TONE[tone],
        accent && `before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:content-[''] ${ACCENT[tone]}`,
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

/**
 * `divided` cierra el header con un filo. Sin el, el titulo y el contenido
 * quedan como dos bloques pegados y la tarjeta se lee como una sola masa de
 * texto; el filo es lo que separa "de que trata" de "los datos".
 */
export function CardHeader({
  className,
  divided = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { divided?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 p-4",
        divided ? "border-b border-line pb-3" : "pb-2.5",
        className,
      )}
      {...props}
    />
  );
}

/**
 * `as` existe porque el nivel de encabezado no puede fijarse en la primitiva:
 * un `h3` dentro de una seccion sin `h2` deja el documento sin jerarquia para
 * el lector de pantalla. El default sigue siendo `h3` por compatibilidad.
 */
export function CardTitle({
  className,
  as: As = "h3",
  ...props
}: HTMLAttributes<HTMLHeadingElement> & { as?: "h1" | "h2" | "h3" | "h4" }) {
  return (
    <As className={cn("title-ios text-[16px] font-semibold text-label", className)} {...props} />
  );
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-[12.5px] leading-relaxed text-label-2", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-4 pb-4", className)} {...props} />;
}

/** El pie se apoya en `divided` por el mismo motivo que el header. */
export function CardFooter({
  className,
  divided = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { divided?: boolean }) {
  return (
    <div
      className={cn(
        "px-4 pb-4",
        divided ? "border-t border-line pt-3" : "pt-0",
        className,
      )}
      {...props}
    />
  );
}

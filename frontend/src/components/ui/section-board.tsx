import type { ReactNode } from "react";
import type { Icon } from "@phosphor-icons/react";
import { StatTile, type StatTileTone } from "@/components/ui/stat-tile";
import { cn } from "@/lib/cn";

/**
 * Fila de métricas de una sección, al estilo del panel de la plantilla de
 * referencia (total de ventas / beneficio / pedidos / activos).
 *
 * Existe por una razón concreta: las fichas de paciente mostraban el
 * odontograma, el plan y la historia sin decirte nada del estado del paciente
 * hasta que ibas a buscarlo. Con la fila, entrar a una pestaña ya te dice
 * cuántas piezas están marcadas, cuántos diagnósticos hay o cuánto
 * cuesta el plan, sin tocar nada.
 *
 * Todos los valores los calcula quien la usa: esta pieza no inventa números.
 */
export interface SectionMetric {
  label: string;
  value: ReactNode;
  icon: Icon;
  tone: StatTileTone;
  /** Segunda línea: "de 18 piezas", "sin saldo pendiente". */
  hint?: ReactNode;
  /** Realza la métrica que manda en la sección (el total del plan, por ejemplo). */
  destacado?: boolean;
}

const MARCO_TONE: Record<StatTileTone, string> = {
  neutral: "border-line",
  brand: "border-brand-200",
  blue: "border-brand-200",
  green: "border-pastel-green-fg/25",
  orange: "border-pastel-yellow-fg/30",
  red: "border-pastel-red-fg/25",
  // `violet` resuelve a la marca: el morada pastel no pertenece a la paleta y
  // su borde se ve sucio sobre el canvas calido. Ver nota en `stat-tile.tsx`.
  violet: "border-brand-200",
  teal: "border-brand-200",
};

/**
 * Relleno del filo de acento. Va aparte de `MARCO_TONE` porque el marco es un
 * color diluido (para el borde) y el filo necesita saturacion: con el mismo
 * valor el acento se pierde contra el canvas.
 */
const FILO_TONE: Record<StatTileTone, string> = {
  neutral: "bg-ink/25",
  brand: "bg-brand-500",
  blue: "bg-brand-500",
  green: "bg-pastel-green-fg",
  orange: "bg-pastel-yellow-fg",
  red: "bg-pastel-red-fg",
  violet: "bg-brand-500",
  teal: "bg-ios-teal",
};

/**
 * Marco de la fila. El color lo toma de la primera métrica: así cada sección
 * llega con su acento ya aplicado y las cuatro tarjetas se leen como un
 * bloque y no como cuatro cosas sueltas.
 */
export function SectionStatStrip({
  metrics,
  className,
}: {
  metrics: SectionMetric[];
  className?: string;
}) {
  if (metrics.length === 0) return null;
  const acento = metrics.find((m) => m.destacado) ?? metrics[0];
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-panel border border-line bg-surface p-2.5",
        MARCO_TONE[acento.tone],
        className,
      )}
    >
      {/* Filo de identidad de la seccion. Es el mismo lenguaje que el acento de
          `Card`: color saturado a la izquierda, para que al pasar de una
          pestana a otra se sepa de que modulo se trata sin leer el titulo. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-[3px]",
          FILO_TONE[acento.tone],
        )}
      />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <StatTile
            key={m.label}
            label={m.label}
            value={m.value}
            icon={m.icon}
            iconTone={m.tone}
            hint={m.hint}
            className={cn("shadow-none", m.destacado && "ring-1 ring-inset ring-current/10")}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Barra de herramientas de una sección: búsqueda a la izquierda, acciones a la
 * derecha, sobre una superficie propia.
 *
 * Antes eran dos `<div>` sueltos flotando sobre el fondo de la página, y al
 * desplazarse el buscador se iba con el contenido. Esto los fija en un
 * contenedor y le da la profundidad que en la plantilla usan las barras de filtro.
 */
export function SectionToolbar({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "sticky top-0 z-20 flex flex-wrap items-center gap-3 rounded-panel border border-line bg-surface/90 p-2.5 shadow-e1 backdrop-blur-md",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Tarjeta-índice para las secciones con muchos bloques (historia clínica).
 *
 * Reemplaza los `<button>` en tira: cada bloque pasa a ser una celda con
 * ícono, nombre y **cuántos registros tiene**, que es el dato que en realidad
 * uno busca al entrar. Sigue siendo un `<button>`, así que conserva foco,
 * teclado y rol.
 */
export function RailCard({
  icon: Icono,
  titulo,
  conteo,
  descripcion,
  tone = "violet",
  onSelect,
  className,
}: {
  icon: Icon;
  titulo: string;
  conteo: number;
  descripcion: string;
  tone?: StatTileTone;
  onSelect: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "lift-hover press-row group flex w-full items-start gap-3 rounded-tile border border-line bg-surface p-3 text-left",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-ios",
          /* `blue` y `violet` resuelven al azul de marca: los pasteles
             equivalentes (celeste y lila) quedan fuera de la identidad de la
             plataforma. Ver la nota de `stat-tile.tsx`. */
          (tone === "violet" || tone === "brand") && "bg-brand-50 text-brand-600",
          tone === "blue" && "bg-brand-100 text-brand-700",
          tone === "teal" && "bg-brand-50 text-ios-teal",
          tone === "orange" && "bg-pastel-yellow-bg text-pastel-yellow-fg",
          tone === "green" && "bg-pastel-green-bg text-pastel-green-fg",
          tone === "red" && "bg-pastel-red-bg text-pastel-red-fg",
          tone === "neutral" && "bg-surface-sunken text-ink-muted",
        )}
      >
        <Icono size={17} weight="duotone" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-ios text-[14px] font-semibold text-ink">{titulo}</span>
          <span
            className={cn(
              "shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
              conteo > 0 ? "bg-ink text-white" : "bg-surface-sunken text-ink-muted",
            )}
          >
            {conteo}
            <span className="sr-only"> registros</span>
          </span>
        </span>
        <span className="mt-0.5 block text-[12px] leading-snug text-ink-muted">{descripcion}</span>
      </span>
    </button>
  );
}

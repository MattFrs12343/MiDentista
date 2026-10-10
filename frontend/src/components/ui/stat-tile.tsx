import type { HTMLAttributes, ReactNode } from "react";
import type { Icon, IconProps } from "@phosphor-icons/react";
import { Minus, TrendDown, TrendUp } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

/** Tono del chip del icono. Cada uno reusa un par pastel ya definido en el tema. */
export type StatTileTone =
  | "neutral"
  | "brand"
  | "blue"
  | "green"
  | "orange"
  | "red"
  | "violet"
  | "teal";

/**
 * `blue` y `violet` quedan como alias de la marca, no de los pasteles.
 *
 * `pastel-blue-bg` es `#e1f3fe`, un celeste mas saturado y frio que el azul de
 * la plataforma (`brand-500` `#3d84b8`), y `pastel-violet-bg` es un lila con
 * base morada que sobre el canvas calido se lee como color ajeno. Ninguno de
 * los dos pertenece a la identidad. Se conservan los nombres porque otras
 * vistas los piden por tono de modulo, pero resuelven al azul de marca.
 */
const TONE_CHIP: Record<StatTileTone, string> = {
  neutral: "bg-surface-sunken text-ink-muted",
  brand: "bg-brand-50 text-brand-600",
  blue: "bg-brand-100 text-brand-700",
  green: "bg-pastel-green-bg text-pastel-green-fg",
  orange: "bg-pastel-yellow-bg text-pastel-yellow-fg",
  red: "bg-pastel-red-bg text-pastel-red-fg",
  violet: "bg-brand-50 text-brand-600",
  teal: "bg-brand-50 text-ios-teal",
};

/**
 * Cambio respecto del período anterior.
 *
 * `trend` describe el movimiento (subió o bajó) y `sentiment` el color. Se
 * separan porque en la clínica no todos los números suben bien: en deuda,
 * cuentas por cobrar o ausencias, subir es malo. Si se omite `sentiment`, se
 * deduce del `trend` (subió = positivo, bajó = negativo).
 */
export interface StatDelta {
  /** Texto del cambio: `+12 %`, `"$ 1.200"`, `"3 días"`. Si es número y la tendencia sube, se le antepone el signo `+`. */
  value: ReactNode;
  /** Dirección del cambio. Define el ícono y, por defecto, el color. */
  trend?: "up" | "down" | "flat";
  /** Fuerza el color cuando el signo no significa "mejor". */
  sentiment?: "positive" | "negative" | "neutral";
  /** Palabras para lectores de pantalla; si faltan se derivan de `trend`. */
  srText?: string;
}

const DELTA_PILL: Record<NonNullable<StatDelta["sentiment"]>, string> = {
  positive: "bg-pastel-green-bg text-pastel-green-fg",
  negative: "bg-pastel-red-bg text-pastel-red-fg",
  neutral: "bg-surface-sunken text-ink-muted",
};

/** Palabras del movimiento, para no depender solo del color ni solo del ícono. */
const DELTA_PALABRA: Record<NonNullable<StatDelta["trend"]>, string> = {
  up: "aumenta",
  down: "disminuye",
  flat: "sin cambio",
};

const DELTA_ICON: Record<NonNullable<StatDelta["trend"]>, Icon> = {
  up: TrendUp,
  down: TrendDown,
  flat: Minus,
};

function sentimientoDe(delta: StatDelta): NonNullable<StatDelta["sentiment"]> {
  if (delta.sentiment) return delta.sentiment;
  const trend = delta.trend ?? "flat";
  if (trend === "up") return "positive";
  if (trend === "down") return "negative";
  return "neutral";
}

/** Un número con `trend: "up"` se muestra con signo explícito; una cadena se respeta tal cual. */
function textoDelta(delta: StatDelta): ReactNode {
  const trend = delta.trend ?? "flat";
  if (typeof delta.value !== "number") return delta.value;
  const signo = trend === "up" && delta.value > 0 ? "+" : "";
  return `${signo}${delta.value}`;
}

export interface StatTileProps extends HTMLAttributes<HTMLDivElement> {
  /** Qué mide el número. Va arriba, en el tono de etiqueta de la app. */
  label: string;
  /** El número grande. Acepta texto para unidades, moneda o unidades clínicas. */
  value: ReactNode;
  /** Cambio respecto del período anterior: ícono + texto + color. */
  delta?: StatDelta;
  /** Ícono de la métrica. Decorativo: la etiqueta ya nombra el número. */
  icon?: Icon;
  iconTone?: StatTileTone;
  /** Peso del ícono, para acompañar el tono (los duotone son los de marca). */
  iconWeight?: IconProps["weight"];
  /** Línea de contexto bajo el valor: "vs. mes anterior", "de 18 pacientes". */
  hint?: ReactNode;
  /**
   * Realza el tile como destino táctil. El elemento clickeable lo pone quien
   * lo usa (un `<Link>` envolviendo, o un botón en `children`): el color y la
   * elevación solo acompañan, no reemplazan el foco ni el rol.
   */
  interactive?: boolean;
}

/**
 * Tile de métrica para el panel, pagos y agenda: etiqueta, valor, delta con
 * color semántico, ícono opcional y una línea de contexto.
 *
 * Pensado para una grilla: no trae padding de tarjeta propia más allá del
 * interior, usa `rounded-tile` y la sombra `e1` de la app en vez del borde
 * duro de la plantilla de referencia, y el valor va en `tabular-nums` para
 * que las cifras de dos tiles queden alineadas y se puedan comparar de un
 * vistazo.
 */
export function StatTile({
  label,
  value,
  delta,
  icon: Icono,
  iconTone = "neutral",
  iconWeight = "duotone",
  hint,
  interactive = false,
  className,
  children,
  ...props
}: StatTileProps) {
  const tendencia = delta ? (delta.trend ?? "flat") : null;
  const IconoDelta = tendencia ? DELTA_ICON[tendencia] : null;

  return (
    <div
      role="group"
      aria-label={props["aria-label"] ?? label}
      className={cn(
        "flex flex-col gap-3 rounded-tile border border-line bg-surface p-4 shadow-e1",
        interactive && "lift-hover press-row cursor-pointer transition-shadow duration-150 ease-out",
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="label-ios text-[13px] leading-snug font-medium text-ink-muted">{label}</p>
        {Icono ? (
          <span
            aria-hidden="true"
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-ios",
              TONE_CHIP[iconTone],
            )}
          >
            <Icono size={18} weight={iconWeight} />
          </span>
        ) : null}
      </div>

      {/* 26px en escritorio, 22px en móvil: con `leading-none` y dos columnas
          los cuatro tiles de la fila no dejaban respirar el dígito, y el número
          es justo lo que el paciente entra a mirar. */}
      <p className="text-ios text-[22px] leading-none font-semibold tracking-[-0.02em] text-ink tabular-nums sm:text-[26px]">
        {value}
      </p>

      {delta || hint || children ? (
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1">
          {delta ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold",
                DELTA_PILL[sentimientoDe(delta)],
              )}
            >
              {IconoDelta ? (
                <IconoDelta size={13} weight="bold" aria-hidden="true" className="shrink-0" />
              ) : null}
              {textoDelta(delta)}
              {/* el color y la flecha no bastan: el movimiento se lee también en texto */}
              <span className="sr-only">
                {delta.srText ?? ` ${DELTA_PALABRA[tendencia ?? "flat"]}`}
              </span>
            </span>
          ) : null}

          {hint ? <span className="text-[12px] text-ink-muted">{hint}</span> : null}
          {children}
        </div>
      ) : null}
    </div>
  );
}

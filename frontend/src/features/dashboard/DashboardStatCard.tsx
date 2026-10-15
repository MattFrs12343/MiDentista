import type { HTMLAttributes, ReactNode } from "react";
import type { Icon, IconProps } from "@phosphor-icons/react";
import {
  Buildings,
  CalendarCheck,
  CalendarDots,
  ChartLineUp,
  ClipboardText,
  CurrencyCircleDollar,
  FileText,
  Tooth,
  User,
  UsersThree,
} from "@phosphor-icons/react";
import { StatTile } from "@/components/ui/stat-tile";
import type { Indicador } from "./tipos";
import { deltaDesdeIndicador, tonoStatTile } from "./dashboardCards";

/**
 * Registro explícito de iconos admitidos por `Indicador.icono`.
 *
 * `Indicador.icono` es un `string` (el tipo de `tipos.ts` mantiene el dato
 * desacoplado del render). El adaptador resuelve ese nombre aquí, dentro del
 * módulo. Si el nombre no está en el registro, el indicador se muestra sin
 * icono: `StatTile` lo admite como opcional. Para añadir uno nuevo, se importa
 * y se agrega a este mapa; no hace falta tocar nada fuera de `features/dashboard`.
 */
const ICONOS: Record<string, Icon> = {
  Buildings,
  CalendarCheck,
  CalendarDots,
  ChartLineUp,
  ClipboardText,
  CurrencyCircleDollar,
  FileText,
  Tooth,
  User,
  UsersThree,
};

function resolverIcono(nombre?: string): Icon | undefined {
  return nombre ? ICONOS[nombre] : undefined;
}

export interface DashboardStatCardProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Indicador a presentar. `Indicador` es el contrato de `tipos.ts`. */
  indicador: Indicador;
  /** Línea de contexto bajo el valor; `Indicador` no la lleva. */
  hint?: ReactNode;
  /**
   * Realce táctil del tile. El elemento clickeable (un `<Link>`, un botón) lo
   * pone quien envuelve la tarjeta: aquí solo se acompaña el color y la presión.
   */
  interactive?: boolean;
  /** Peso del icono; por defecto el duotone de marca de `StatTile`. */
  iconWeight?: IconProps["weight"];
}

/**
 * Adaptador de `Indicador` al `StatTile` compartido (T-13.6).
 *
 * No reimplementa el tile: traduce el contrato de datos del módulo (etiqueta,
 * valor, delta, tono, icono por nombre) a las props reales de `StatTile`.
 */
export function DashboardStatCard({
  indicador,
  hint,
  interactive,
  iconWeight,
  ...props
}: DashboardStatCardProps) {
  const icono = resolverIcono(indicador.icono);

  return (
    <StatTile
      label={indicador.etiqueta}
      value={indicador.valor}
      delta={deltaDesdeIndicador(indicador)}
      icon={icono}
      iconTone={tonoStatTile(indicador.tono)}
      iconWeight={iconWeight}
      hint={hint}
      interactive={interactive}
      {...props}
    />
  );
}

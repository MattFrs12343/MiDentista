import type { ReactNode } from "react";
import type { Icon } from "@phosphor-icons/react";
import { CircleNotch, ShieldWarning, Tray, WarningCircle } from "@phosphor-icons/react";
import { EmptyState } from "@/components/ui/empty-state";
import type { EmptyStateTone } from "@/components/ui/empty-state";
import type { DatosDashboard } from "./tipos";
import { estadoDashboard, type EstadoDashboard } from "./dashboardCards";

/** Cara de cada estado no-listos. Cada uno se distingue por icono, tono y copy. */
interface CaraEstado {
  icon: Icon;
  iconTone: EmptyStateTone;
  title: string;
  description: string;
}

const CARAS: Record<Exclude<EstadoDashboard, "listo">, CaraEstado> = {
  cargando: {
    icon: CircleNotch,
    iconTone: "brand",
    title: "Cargando información…",
    description: "Espera un momento mientras se consultan los datos.",
  },
  error: {
    icon: WarningCircle,
    iconTone: "danger",
    title: "No se pudieron cargar los datos",
    description: "Ocurrió un error al consultar la información.",
  },
  sinPermiso: {
    icon: ShieldWarning,
    iconTone: "warning",
    title: "No tienes permiso para ver estos datos",
    // La consulta pudo devolver cero filas por RLS, no por ausencia de datos.
    description:
      "El resultado vino vacío y puede deberse a una restricción de acceso, no a que el dato no exista.",
  },
  vacio: {
    icon: Tray,
    iconTone: "neutral",
    title: "Todavía no hay datos",
    description: "Cuando existan registros aparecerán aquí.",
  },
};

export interface DashboardEmptyStateProps<T> {
  /** Estado de los datos: carga, permiso, error y valor. */
  datos: DatosDashboard<T>;
  /**
   * Predicado opcional para decidir si `valor` es "nada que mostrar". Si se
   * omite, solo `null`, `undefined` o un arreglo sin elementos cuentan como
   * vacío (ver `estaVacioPorDefecto`).
   */
  estaVacio?: (valor: T) => boolean;
  /** Título del estado vacío legítimo (el más frecuente). */
  vacioTitle?: string;
  /** Descripción del estado vacío legítimo. */
  vacioDescription?: ReactNode;
  /** Anuncia el cambio del vacío con `role="status"` (uso al filtrar). */
  live?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Adaptador de `DatosDashboard<T>` al `EmptyState` compartido (T-13.6).
 *
 * Distingue cuatro estados —cargando, error, sinPermiso y vacío— y no decide
 * nada sobre los datos: las banderas (`cargando`, `error`, `sinPermiso`) las
 * pone quien carga. En particular, un resultado vacío NO se interpreta como
 * cero ni como error de permisos; solo `sinPermiso` muestra la cara de permiso.
 * Cuando hay valor (`listo`), no renderiza nada.
 */
export function DashboardEmptyState<T>({
  datos,
  estaVacio,
  vacioTitle,
  vacioDescription,
  live,
  size,
  className,
}: DashboardEmptyStateProps<T>) {
  const estado = estadoDashboard(datos, estaVacio);
  if (estado === "listo") return null;

  const cara = CARAS[estado];
  const title = estado === "vacio" ? (vacioTitle ?? cara.title) : cara.title;
  const description =
    estado === "error"
      ? (datos.error ?? cara.description)
      : estado === "vacio"
        ? (vacioDescription ?? cara.description)
        : cara.description;

  return (
    <EmptyState
      icon={cara.icon}
      iconTone={cara.iconTone}
      title={title}
      description={description}
      live={live}
      size={size}
      className={className}
    />
  );
}

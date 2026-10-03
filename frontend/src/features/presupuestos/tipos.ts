/**
 * Tipos propios del módulo 08 Presupuestos.
 *
 * NO van a `@/types`: ese archivo es de integración y solo lo edita Matías
 * (ver AGENTS.md). Ver también `docs/ARCHITECTURE.md`.
 *
 * Tablas: `presupuestos` e `items_presupuesto` (docs/DATABASE.md secciones 15 y 16).
 */

/** `as const` en lugar de `enum`: `erasableSyntaxOnly` lo prohíbe. */
export const ESTADOS_PRESUPUESTO = [
  "borrador",
  "enviado",
  "aceptado",
  "rechazado",
] as const;

export type EstadoPresupuesto = (typeof ESTADOS_PRESUPUESTO)[number];

/** Numérico de Postgres llega como número o como texto según el driver. */
export type Decimal = number | string | null;

export interface Presupuesto {
  id: string;
  clinicaId: string;
  pacienteId: string;
  odontologoId: string;
  titulo: string;
  /** Descuento aplicado sobre el subtotal de las partidas. */
  descuento: Decimal;
  /** Total ya calculado: subtotal menos descuento. */
  total: Decimal;
  estado: EstadoPresupuesto;
  /** `YYYY-MM-DD`, igual que la columna `valido_hasta`. */
  validoHasta: string | null;
  notas: string;
  creadoEl: string;
  actualizadoEn: string;
}

export interface ItemPresupuesto {
  id: string;
  clinicaId: string;
  presupuestoId: string;
  /** Vincula con `servicios` si la partida viene del catálogo. */
  servicioId: string | null;
  descripcion: string;
  numeroPieza: number | null;
  cantidad: number;
  precioUnitario: Decimal;
  subtotal: Decimal;
}

export type ItemPresupuestoNuevo = Omit<ItemPresupuesto, "id" | "subtotal">;

export interface PresupuestoNuevo {
  clinicaId: string;
  pacienteId: string;
  odontologoId: string;
  titulo: string;
  descuento: Decimal;
  validoHasta: string | null;
  notas: string;
}

/** El presupuesto con sus partidas, que es lo que pintan todas las vistas. */
export interface PresupuestoCompleto extends Presupuesto {
  items: ItemPresupuesto[];
}

/**
 * Cycle of life de un presupuesto.
 *
 * sigue el mismo criterio documentado en `docs/figuras_monografia/` para las
 * citas: los estados no retroceden. Un presupuesto rechazado vuelve a
 * `borrador` para editarse, y eso se hace con una acción explícita, no
 * arrastrando el estado.
 */
export function transicionValida(desde: EstadoPresupuesto, hacia: EstadoPresupuesto): boolean {
  if (desde === hacia) return false;
  if (desde === "borrador") return hacia === "enviado";
  if (desde === "enviado") return hacia === "aceptado" || hacia === "rechazado";
  return false;
}

/**
 * Tipos propios del módulo 09 Pagos y Cuentas.
 *
 * NO van a `@/types`: ese archivo es de integración y solo lo edita Matías
 * (ver AGENTS.md).
 *
 * Tabla: `pagos` (docs/DATABASE.md sección 17).
 */

/** `as const` en lugar de `enum`: `erasableSyntaxOnly` lo prohíbe. */
export const METODOS_PAGO = ["efectivo", "qr", "transferencia", "otro"] as const;
export type MetodoPago = (typeof METODOS_PAGO)[number];

export const ESTADOS_PAGO = ["pendiente", "confirmado", "rechazado"] as const;
export type EstadoPago = (typeof ESTADOS_PAGO)[number];

/** Numérico de Postgres llega como número o como texto según el driver. */
export type Decimal = number | string | null;

export interface Pago {
  id: string;
  clinicaId: string;
  pacienteId: string;
  /** Vincula con `presupuestos`. Es null en pagos a cuenta sin presupuesto. */
  presupuestoId: string | null;
  monto: Decimal;
  metodoPago: MetodoPago;
  /** `YYYY-MM-DD`, igual que la columna `fecha_pago`. */
  fechaPago: string;
  codigoReferencia: string | null;
  notas: string;
  estado: EstadoPago;
  /** Quién registró el pago: recepción normalmente, no el odontólogo. */
  registradoPor: string | null;
  creadoEl: string;
}

export type PagoNuevo = Omit<Pago, "id" | "creadoEl" | "codigoReferencia"> &
  Partial<Pick<Pago, "codigoReferencia">>;

/**
 * Estado de cuenta de un paciente (US-9.7).
 *
 * `T-9.7` depende del módulo 08: los totales vienen del presupuesto, no de un
 * segundo cálculo. Aqui solo se guardan los numeros que el módulo 09 necesita,
 * de modo que este módulo no importa tipos ajenos y ambos pueden avanzar en
 * paralelo sin bloquearse.
 */
export interface EstadoCuenta {
  pacienteId: string;
  /** Suma de los pagos en estado `confirmado`. */
  totalPagado: number;
  /** Suma de los totales de los presupuestos no rechazados. */
  totalPresupuestado: number;
  /** `totalPresupuestado - totalPagado`, nunca negativo. */
  saldoPendiente: number;
  pagos: Pago[];
}

/**
 * Cálculos del panel del paciente (T-13.5, US-13.4).
 *
 * Lógica pura, sin React ni Supabase, para poder probarla con `node --test`.
 * No reimplementa la aritmética de dinero ni la máquina de estados de los
 * planes: solo selecciona y agrega, y deja el formato a la vista.
 *
 * La fuente de datos es `FichaPaciente` (ver `@/data/api`), que llega de la
 * función `paciente/mi-ficha` acotada por RLS a la propia fila del paciente.
 * Aquí NO se consulta nada: solo se decide qué mostrar de lo que ya llegó.
 *
 * Vocabulario de estados (docs/DATABASE.md):
 *   - cita:    reservada | confirmada | atendida | cancelada
 *   - plan:    propuesto | aceptado | en_proceso | completado | cancelado
 *   - ítem:    pendiente | en_proceso | completado | cancelado
 *   - pago:    pendiente | confirmado | rechazado
 */

import type { CitaPortal, PagoPortal, PlanPortal } from "@/data/api";
import type { Indicador } from "./tipos";

/** Estados de cita que siguen en pie (ni atendidas ni canceladas). */
const CITAS_VIGENTES = ["reservada", "confirmada"] as const;

/** Estados de plan que cuentan como "tratamiento actual". */
const PLANES_TERMINALES = { completado: true, cancelado: true } as const;

/**
 * Cita futura más próxima: a partir de `hoy` (inclusive), en estado reservada o
 * confirmada, ordenada por fecha y luego por hora. `null` si no hay ninguna.
 */
export function proximaCita(citas: readonly CitaPortal[], hoy: string): CitaPortal | null {
  const futuras = citas
    .filter(
      (cita) =>
        cita.fechaCita >= hoy &&
        (CITAS_VIGENTES as readonly string[]).includes(cita.estado),
    )
    .sort(
      (a, b) =>
        a.fechaCita.localeCompare(b.fechaCita) || a.horaInicio.localeCompare(b.horaInicio),
    );
  return futuras[0] ?? null;
}

/** Planes que no terminaron (ni completados ni cancelados). */
export function planesVigentes(planes: readonly PlanPortal[]): PlanPortal[] {
  return planes.filter((plan) => !(plan.estado in PLANES_TERMINALES));
}

/**
 * Tratamiento actual: el plan vigente de mayor prioridad. Se prefiere el que ya
 * está en marcha, y ante empate el más reciente. `null` si no hay ninguno.
 */
export function planActual(planes: readonly PlanPortal[]): PlanPortal | null {
  const prioridad: Record<string, number> = { en_proceso: 0, aceptado: 1, propuesto: 2 };
  const ordenados = [...planesVigentes(planes)].sort((a, b) => {
    const pa = prioridad[a.estado] ?? 3;
    const pb = prioridad[b.estado] ?? 3;
    if (pa !== pb) return pa - pb;
    return (b.creadoEl ?? "").localeCompare(a.creadoEl ?? "");
  });
  return ordenados[0] ?? null;
}

export interface AvancePlan {
  completados: number;
  /** Ítems no cancelados: el denominador honesto del avance. */
  total: number;
  /** 0..100. Sin ítems, 0. */
  porcentaje: number;
}

/** Avance de un plan: ítems completados sobre el total (sin contar cancelados). */
export function avancePlan(plan: PlanPortal): AvancePlan {
  const items = plan.items.filter((item) => item.estado !== "cancelado");
  const completados = items.filter((item) => item.estado === "completado").length;
  const total = items.length;
  const porcentaje = total === 0 ? 0 : Math.round((completados / total) * 100);
  return { completados, total, porcentaje };
}

/** Pagos registrados que todavía no se confirmaron. */
export function pagosPendientes(pagos: readonly PagoPortal[]): PagoPortal[] {
  return pagos.filter((pago) => pago.estado === "pendiente");
}

/**
 * Tarjetas del panel del paciente. Los textos ya vienen formateados por quien
 * llama (fechas, moneda) porque el formato depende de la vista, no del cálculo.
 */
export function indicadoresPaciente({
  proximaFecha,
  planPorcentaje,
  saldoTexto,
  saldoPendiente,
}: {
  /** Fecha de la próxima cita ya formateada, o "—". */
  proximaFecha: string;
  /** Avance del plan (0..100), o `null` si no hay tratamiento activo. */
  planPorcentaje: number | null;
  /** Saldo pendiente ya formateado como moneda. */
  saldoTexto: string;
  /** Saldo numérico, para decidir el tono. */
  saldoPendiente: number;
}): Indicador[] {
  const alDia = saldoPendiente <= 0;
  return [
    {
      id: "proxima-cita",
      etiqueta: "Próxima cita",
      valor: proximaFecha,
      icono: "CalendarDots",
      tono: "blue",
    },
    {
      id: "tratamiento-actual",
      etiqueta: "Tratamiento actual",
      valor: planPorcentaje === null ? "—" : `${planPorcentaje}%`,
      icono: "Tooth",
      tono: "violet",
    },
    {
      id: "pagos-pendientes",
      etiqueta: "Saldo pendiente",
      valor: saldoTexto,
      icono: "CurrencyCircleDollar",
      tono: alDia ? "green" : "red",
    },
    {
      // Bloqueado: el módulo de archivos aún no expone lectura para el paciente.
      id: "documentos",
      etiqueta: "Documentos",
      valor: "—",
      icono: "FileText",
      tono: "neutral",
    },
  ];
}

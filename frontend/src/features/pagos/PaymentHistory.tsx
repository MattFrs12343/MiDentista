import { Check, Receipt, X } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatearFecha, formatearMoneda } from "./pagoFormato.ts";
import type { EstadoPago, MetodoPago, Pago } from "./tipos.ts";

/** `confirmado` es dinero; los otros dos tonos lo dicen sin leer la etiqueta. */
const ESTADO_TONE: Record<EstadoPago, "green" | "yellow" | "red"> = {
  confirmado: "green",
  pendiente: "yellow",
  rechazado: "red",
};

const METODO_ETIQUETA: Record<MetodoPago, string> = {
  efectivo: "Efectivo",
  qr: "QR",
  transferencia: "Transferencia",
  otro: "Otro",
};

const ESTADO_ETIQUETA: Record<EstadoPago, string> = {
  confirmado: "Confirmado",
  pendiente: "Pendiente",
  rechazado: "Rechazado",
};

export interface PaymentHistoryProps {
  pagos: Pago[];
  error?: string | null;
  /**
   * Quien puede registrar pagos (recepción u odontólogo) también puede
   * confirmarlos o rechazarlos: es el mismo permiso, no uno nuevo. Sin esto
   * la columna de acciones no se monta — ni para el paciente ni para un
   * perfil de solo lectura.
   */
  puedeConfirmar?: boolean;
  guardando?: boolean;
  onCambiarEstado?: (pago: Pago, estado: EstadoPago) => void;
}

/**
 * Historial de pagos del paciente (US-9.5, US-9.6).
 *
 * Distingue dos cosas que se parecen en pantalla pero significan lo opuesto:
 *
 * - Sin pagos registrados: el paciente no ha pagado, o las RLS no le dejaron
 *   ver los pagos. Un `SELECT` vacio llega como lista vacia, no como error.
 * - `error`: la consulta fallo de verdad (red, permisos o sesion). Ahi no se
 *   muestra el estado vacio, porque "no hay pagos" seria mentira.
 *
 * Confirmar/rechazar (US-9.6) solo aparece en filas `pendiente`: un pago ya
 * `confirmado` o `rechazado` es un registro contable cerrado, no se revierte
 * desde acá.
 */
export function PaymentHistory({ pagos, error, puedeConfirmar = false, guardando = false, onCambiarEstado }: PaymentHistoryProps) {
  // Con error y sin filas no se afirma nada: solo se muestra lo que fallo.
  const soloError = Boolean(error) && pagos.length === 0;
  const vacio = !error && pagos.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de pagos</CardTitle>
        <CardDescription>
          Del más reciente al más antiguo. Un pago pendiente no cuenta como pagado.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl bg-pastel-red-bg px-3 py-2 text-[12px] leading-snug text-pastel-red-fg"
          >
            <Receipt size={14} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}

        {soloError ? null : vacio ? (
          <div className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink-muted">
            Sin pagos registrados
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-sunken text-xs uppercase tracking-wide text-ink-muted">
                  <th scope="col" className="px-4 py-2.5 font-semibold">Fecha</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Monto</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Método</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Estado</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Referencia</th>
                  {puedeConfirmar ? (
                    <th scope="col" className="px-4 py-2.5 font-semibold">
                      <span className="sr-only">Acciones</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pagos.map((pago) => (
                  <tr key={pago.id || `${pago.fechaPago}-${pago.monto}`}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-ink-soft">
                      {formatearFecha(pago.fechaPago)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-ink">
                      {formatearMoneda(pago.monto)}
                    </td>
                    <td className="px-4 py-2.5 text-ink-soft">{METODO_ETIQUETA[pago.metodoPago]}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={ESTADO_TONE[pago.estado]}>{ESTADO_ETIQUETA[pago.estado]}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-ink-muted">{pago.codigoReferencia || "—"}</td>
                    {puedeConfirmar ? (
                      <td className="whitespace-nowrap px-4 py-2.5">
                        {pago.estado === "pendiente" ? (
                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={guardando}
                              onClick={() => onCambiarEstado?.(pago, "confirmado")}
                              aria-label={`Confirmar pago de ${formatearMoneda(pago.monto)} del ${formatearFecha(pago.fechaPago)}`}
                              className="h-7 gap-1 px-2.5 text-[12px] text-ios-green hover:bg-pastel-green-bg"
                            >
                              <Check size={13} weight="bold" aria-hidden="true" />
                              Confirmar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={guardando}
                              onClick={() => onCambiarEstado?.(pago, "rechazado")}
                              aria-label={`Rechazar pago de ${formatearMoneda(pago.monto)} del ${formatearFecha(pago.fechaPago)}`}
                              className="h-7 gap-1 px-2.5 text-[12px] text-pastel-red-fg hover:bg-pastel-red-bg"
                            >
                              <X size={13} weight="bold" aria-hidden="true" />
                              Rechazar
                            </Button>
                          </div>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

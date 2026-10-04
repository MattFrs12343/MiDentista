import { Receipt } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
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

/**
 * Historial de pagos del paciente (US-9.5).
 *
 * Distingue dos cosas que se parecen en pantalla pero significan lo opuesto:
 *
 * - Sin pagos registrados: el paciente no ha pagado, o las RLS no le dejaron
 *   ver los pagos. Un `SELECT` vacio llega como lista vacia, no como error.
 * - `error`: la consulta fallo de verdad (red, permisos o sesion). Ahi no se
 *   muestra el estado vacio, porque "no hay pagos" seria mentira.
 */
export function PaymentHistory({ pagos, error }: { pagos: Pago[]; error?: string | null }) {
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
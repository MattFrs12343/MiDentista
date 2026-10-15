import { useEffect } from "react";
import { QrCode } from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";
import { formatearMoneda } from "./pagoFormato.ts";
import { useQrCobro } from "./useQrCobro.ts";
import type { Decimal } from "./tipos.ts";

export interface QrPasarelaProps {
  clinicaId: string;
  monto: Decimal;
}

/**
 * "Pasarela" de pago por QR. No hay ninguna API de pago real: es un paso de
 * checkout visual con el QR vigente de la clínica y el monto a cobrar, para
 * que el paciente escanee en persona. El registro del pago sigue siendo el
 * mismo flujo de siempre (`onRegistrar` en `PaymentForm`): nace `pendiente` y
 * se confirma después, como cualquier otro método.
 */
export function QrPasarela({ clinicaId, monto }: QrPasarelaProps) {
  const { url, cargando, error, cargar } = useQrCobro(clinicaId);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <Card variant="flat" className="bg-surface-sunken">
      <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
          Monto a cobrar
        </p>
        <p className="text-2xl font-semibold tabular-nums text-ink">{formatearMoneda(monto)}</p>

        {cargando ? (
          <p className="text-sm text-ink-muted">Cargando QR…</p>
        ) : error ? (
          <p className="text-sm text-pastel-red-fg">{error}</p>
        ) : url ? (
          <>
            <img
              src={url}
              alt="QR de cobro de la clínica"
              className="h-48 w-48 rounded-xl border border-line bg-white object-contain"
            />
            <p className="max-w-xs text-xs leading-snug text-ink-muted">
              Que el paciente escanee este código para pagar. Cuando confirme el pago, registra el
              cobro.
            </p>
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <QrCode size={18} aria-hidden="true" />
            Esta clínica todavía no tiene un QR de cobro cargado.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

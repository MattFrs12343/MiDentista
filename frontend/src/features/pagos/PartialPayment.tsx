import { Receipt } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { aNumero, redondear, saldoTrasAbono } from "./pagoCalculo.ts";
import { formatearMoneda } from "./pagoFormato.ts";
import type { Decimal } from "./tipos.ts";

export interface PartialPaymentProps {
  /** Lo que aún se debe. En 0 no hay presupuesto contra el cual abonar. */
  saldoPendiente: Decimal;
  /** Monto ya escrito en el formulario, para previsualizar el saldo restante. */
  montoActual?: Decimal;
  /** Aplica un monto sugerido al formulario de pago que lo contiene. */
  onSugerirMonto?: (monto: number) => void;
  className?: string;
}

/**
 * Banda de pago parcial (US-9.4).
 *
 * No cobra nada por su cuenta: muestra el saldo pendiente, ofrece abonar el
 * total o la mitad, y previsualiza el saldo que quedaría. El registro real lo
 * hace `PaymentForm`. Todo el cálculo pasa por `pagoCalculo`, así que este
 * componente nunca resta por su lado y no puede discrepar del estado de cuenta.
 */
export function PartialPayment({
  saldoPendiente,
  montoActual = 0,
  onSugerirMonto,
  className,
}: PartialPaymentProps) {
  const saldo = redondear(aNumero(saldoPendiente));
  const monto = aNumero(montoActual);
  const restante = saldoTrasAbono(saldo, monto);
  const mitad = redondear(saldo / 2);
  const excede = monto > saldo;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-tile border border-pastel-green-fg/25 bg-pastel-green-bg/40 px-3 py-2.5 fade-in-up",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-pastel-green-fg">
          <Receipt size={14} weight="bold" aria-hidden="true" />
          Saldo pendiente
        </span>
        <span className="text-[15px] font-semibold tabular-nums text-ink">
          {formatearMoneda(saldo)}
        </span>
      </div>

      <p className="text-[12px] leading-snug text-ink-muted">
        {excede
          ? `El abono no puede superar el saldo pendiente (${formatearMoneda(saldo)}).`
          : monto > 0
            ? `Si abonás ${formatearMoneda(monto)}, quedaría un saldo de ${formatearMoneda(restante)}.`
            : "Podés abonar el total del saldo o una parte."}
      </p>

      {onSugerirMonto ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => onSugerirMonto(saldo)}>
            Abonar el total
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={mitad <= 0}
            onClick={() => onSugerirMonto(mitad)}
          >
            Abonar la mitad
          </Button>
        </div>
      ) : null}
    </div>
  );
}

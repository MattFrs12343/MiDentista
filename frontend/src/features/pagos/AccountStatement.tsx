import { WarningCircle } from "@phosphor-icons/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatearMoneda } from "./pagoFormato.ts";
import type { EstadoCuenta } from "./tipos.ts";

function Dato({
  etiqueta,
  valor,
  detalle,
  className,
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  className?: string;
}) {
  return (
    <div className="rounded-2xl bg-surface-sunken px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{etiqueta}</p>
      <p className={`mt-1 text-[17px] font-semibold ${className ?? "text-ink"}`}>{valor}</p>
      {detalle ? <p className="mt-0.5 text-[11px] leading-snug text-ink-muted">{detalle}</p> : null}
    </div>
  );
}

/**
 * Estado de cuenta del paciente (US-9.7).
 *
 * Esta tarjeta **no calcula nada**: pinta los numeros que le entrega
 * `calcularEstadoCuenta`. Duplicar la formula del saldo aqui es exactamente el
 * bug que esta separacion evita: si la tarjeta restara por su cuenta, el saldo
 * de la cabecera y el del modulo 08 dejarian de coincidir.
 *
 * `totalPresupuestado === 0` se trata aparte a proposito. Sin presupuesto, un
 * `saldoPendiente` de cero parece "esta al dia" cuando en realidad no hay nada
 * contra lo cual comparar: es mejor decir que no hay presupuesto.
 */
export function AccountStatement({ estado }: { estado: EstadoCuenta }) {
  const sinPresupuesto = estado.totalPresupuestado <= 0;
  // Solo informativo: el saldo ya viene calculado y no se toca.
  const pendientes = estado.pagos.filter((p) => p.estado === "pendiente").length;
  const saldado = !sinPresupuesto && estado.saldoPendiente <= 0;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle>Estado de cuenta</CardTitle>
          <CardDescription>
            Solo los pagos confirmados cuentan como dinero recibido.
          </CardDescription>
        </div>
        {saldado ? <Badge tone="green">Al día</Badge> : null}
        {!saldado && pendientes > 0 ? <Badge tone="yellow">{pendientes} pendiente{pendientes === 1 ? "" : "s"}</Badge> : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Dato
            etiqueta="Total presupuestado"
            valor={sinPresupuesto ? "Sin presupuesto registrado" : formatearMoneda(estado.totalPresupuestado)}
            detalle={sinPresupuesto ? "El módulo 08 aún no aporta el total." : undefined}
            className={sinPresupuesto ? "text-[15px] text-ink-soft" : undefined}
          />
          <Dato etiqueta="Total pagado" valor={formatearMoneda(estado.totalPagado)} />
          <Dato
            etiqueta="Saldo pendiente"
            valor={sinPresupuesto ? "No aplica" : formatearMoneda(estado.saldoPendiente)}
            detalle={
              sinPresupuesto
                ? "Sin presupuesto no hay saldo que mostrar."
                : saldado
                  ? "No hay saldo pendiente."
                  : undefined
            }
            className={sinPresupuesto ? "text-[15px] text-ink-soft" : undefined}
          />
        </div>

        {pendientes > 0 ? (
          <p className="flex items-start gap-2 rounded-xl bg-pastel-yellow-bg px-3 py-2 text-[12px] leading-snug text-pastel-yellow-fg">
            <WarningCircle size={14} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              Hay {pendientes} pago{pendientes === 1 ? "" : "s"} en estado pendiente. No se suman al
              total pagado hasta que se confirmen.
            </span>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
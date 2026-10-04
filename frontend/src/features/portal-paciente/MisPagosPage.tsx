import { Navigate } from "react-router-dom";
import { Money, Receipt, SpinnerGap, TrendUp, WarningCircle } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePortalPaciente } from "@/features/portal-paciente/PortalPacienteContext";
import {
  etiquetaEstado,
  formatearFecha,
  formatearMoneda,
  tonoEstado,
} from "@/features/portal-paciente/portalFormato";
import type { PagoPortal, PresupuestoPortal } from "@/data/api";

export function MisPagosPage() {
  const { ficha, cargando, error, recargar } = usePortalPaciente();

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20">
        <SpinnerGap size={26} className="animate-spin text-ink-soft" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <WarningCircle size={26} weight="fill" className="text-pastel-red-fg" />
          <p className="text-sm text-ink-soft">{error}</p>
          <Button type="button" onClick={() => void recargar()}>
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!ficha) return null;
  if (ficha.sinClinica) return <Navigate to="/portal/buscar" replace />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Mis pagos</h1>
        <p className="mt-1 text-sm text-ink-soft">Tus presupuestos y los pagos que realizaste.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Saldo pendiente
            </p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink">
              <Money size={20} weight="duotone" className="text-pastel-red-fg" />
              {formatearMoneda(ficha.resumen.saldoPendiente, "Bs")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Total pagado
            </p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink">
              <TrendUp size={20} weight="duotone" className="text-pastel-green-fg" />
              {formatearMoneda(ficha.resumen.totalPagado, "Bs")}
            </p>
          </CardContent>
        </Card>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Presupuestos</h2>

        {ficha.presupuestos.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
              <Receipt size={26} weight="duotone" className="text-ink-muted" />
              <p className="text-sm text-ink-soft">No tenés presupuestos registrados.</p>
            </CardContent>
          </Card>
        ) : (
          ficha.presupuestos.map((presupuesto) => (
            <CardPresupuesto key={presupuesto.id} presupuesto={presupuesto} />
          ))
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Pagos</h2>

        {ficha.pagos.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
              <Money size={26} weight="duotone" className="text-ink-muted" />
              <p className="text-sm text-ink-soft">Todavía no hay pagos registrados.</p>
            </CardContent>
          </Card>
        ) : (
          ficha.pagos.map((pago) => <CardPago key={pago.id} pago={pago} />)
        )}
      </section>
    </div>
  );
}

function CardPresupuesto({ presupuesto }: { presupuesto: PresupuestoPortal }) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="font-semibold text-ink">{presupuesto.titulo ?? "Presupuesto"}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{formatearFecha(presupuesto.creadoEl)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={tonoEstado(presupuesto.estado)}>{etiquetaEstado(presupuesto.estado)}</Badge>
          <span className="text-base font-semibold tabular-nums text-ink">
            {formatearMoneda(presupuesto.total, "Bs")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function CardPago({ pago }: { pago: PagoPortal }) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="font-semibold tabular-nums text-ink">{formatearMoneda(pago.monto, "Bs")}</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {pago.metodoPago} · {formatearFecha(pago.fechaPago)}
          </p>
          {pago.codigoReferencia ? (
            <p className="mt-1 text-xs text-ink-muted">Referencia: {pago.codigoReferencia}</p>
          ) : null}
        </div>
        <Badge tone={tonoEstado(pago.estado)}>{etiquetaEstado(pago.estado)}</Badge>
      </CardContent>
    </Card>
  );
}
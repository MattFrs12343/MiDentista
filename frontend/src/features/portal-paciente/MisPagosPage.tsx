import { Navigate } from "react-router-dom";
import { Money, Receipt, TrendUp } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionStatStrip } from "@/components/ui/section-board";
import { usePortalPaciente } from "@/features/portal-paciente/PortalPacienteContext";
import { PortalSubHeader } from "@/features/portal-paciente/PortalHero";
import { PortalCargando, PortalError } from "@/features/portal-paciente/PortalEstado";
import {
  etiquetaEstado,
  formatearFecha,
  formatearMoneda,
  tonoEstado,
} from "@/features/portal-paciente/portalFormato";
import type { PagoPortal, PresupuestoPortal } from "@/data/api";

export function MisPagosPage() {
  const { ficha, cargando, error, recargar } = usePortalPaciente();

  if (cargando) return <PortalCargando />;
  if (error) return <PortalError mensaje={error} onReintentar={() => void recargar()} />;

  if (!ficha) return null;
  if (ficha.sinClinica) return <Navigate to="/portal/buscar" replace />;

  return (
    <div className="flex flex-col gap-6">
      <PortalSubHeader
        icono={Receipt}
        titulo="Mis pagos"
        descripcion="Tus presupuestos y los pagos que realizaste."
        seccion="pagos"
      />

      {/* El saldo deja de ser una tarjeta suelta y pasa a la fila de métricas:
          es la cifra que el paciente busca al entrar a esta vista, y las otras
          dos la contextualizan sin competir con ella. */}
      <SectionStatStrip
        metrics={[
          {
            label: "Saldo pendiente",
            value: formatearMoneda(ficha.resumen.saldoPendiente, "Bs"),
            icon: Money,
            tone: ficha.resumen.saldoPendiente > 0 ? "orange" : "neutral",
            hint: ficha.resumen.saldoPendiente > 0 ? "Tenés saldo a pagar" : "Estás al día",
            destacado: true,
          },
          {
            label: "Total pagado",
            value: formatearMoneda(ficha.resumen.totalPagado, "Bs"),
            icon: TrendUp,
            tone: "brand",
            hint: `${ficha.pagos.length} pagos registrados`,
          },
          {
            label: "Presupuestos",
            value: ficha.presupuestos.length,
            icon: Receipt,
            tone: "blue",
            hint: "Planes enviados por tu clínica",
          },
        ]}
      />

      <section className="flex flex-col gap-3">
        <CardTitle as="h2" className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Presupuestos
        </CardTitle>

        {ficha.presupuestos.length === 0 ? (
          <Card variant="flat">
            <EmptyState
              icon={Receipt}
              title="No tenés presupuestos registrados"
              description="Cuando tu clínica te envíe uno, lo vas a ver acá."
              size="sm"
            />
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
            <EmptyState
              icon={Money}
              title="Todavía no hay pagos registrados"
              description="Los pagos que tu clínica registre van a aparecer acá."
              size="sm"
            />
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
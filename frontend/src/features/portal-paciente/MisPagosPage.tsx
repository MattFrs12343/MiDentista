import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Bank, Money, QrCode, Receipt, TrendUp, Wallet } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionStatStrip } from "@/components/ui/section-board";
import { usePortalPaciente } from "@/features/portal-paciente/PortalPacienteContext";
import { PortalSubHeader } from "@/features/portal-paciente/PortalHero";
import { PortalCargando, PortalError } from "@/features/portal-paciente/PortalEstado";
import {
  etiquetaEstado,
  etiquetaMetodoPago,
  formatearFecha,
  formatearMoneda,
  tonoEstado,
} from "@/features/portal-paciente/portalFormato";
import type { ClinicaResumen, PagoPortal, PresupuestoPortal } from "@/data/api";

type MetodoElegido = "qr" | "transferencia" | "efectivo";

const METODOS: Array<{ valor: MetodoElegido; etiqueta: string; icono: typeof QrCode }> = [
  { valor: "qr", etiqueta: "QR", icono: QrCode },
  { valor: "transferencia", etiqueta: "Transferencia", icono: Bank },
  { valor: "efectivo", etiqueta: "Efectivo en la clínica", icono: Wallet },
];

export function MisPagosPage() {
  const { ficha, cargando, error, recargar } = usePortalPaciente();
  const [metodo, setMetodo] = useState<MetodoElegido>("qr");

  if (cargando) return <PortalCargando />;
  if (error) return <PortalError mensaje={error} onReintentar={() => void recargar()} />;

  if (!ficha) return null;
  if (ficha.sinClinica) return <Navigate to="/portal/buscar" replace />;

  const hayDeuda = ficha.resumen.saldoPendiente > 0;

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

      {hayDeuda ? (
        <section className="flex flex-col gap-3">
          <CardTitle as="h2" className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            ¿Cómo querés pagar?
          </CardTitle>
          <Card>
            <CardContent className="flex flex-col gap-4 p-5">
              <div className="flex flex-wrap gap-2">
                {METODOS.map(({ valor, etiqueta, icono: Icono }) => (
                  <Button
                    key={valor}
                    type="button"
                    variant={metodo === valor ? "primary" : "secondary"}
                    size="sm"
                    aria-pressed={metodo === valor}
                    onClick={() => setMetodo(valor)}
                  >
                    <Icono size={14} weight="bold" aria-hidden="true" />
                    {etiqueta}
                  </Button>
                ))}
              </div>

              <ContenidoMetodo metodo={metodo} qrCobroUrl={ficha.qrCobroUrl} clinica={ficha.clinica} />

              <p className="text-xs leading-snug text-ink-muted">
                Esto no envía el pago: pagá por el medio que elegiste y tu clínica confirma el cobro.
                Cuando lo confirme, lo vas a ver reflejado en tu historial de pagos.
              </p>
            </CardContent>
          </Card>
        </section>
      ) : null}

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
            {etiquetaMetodoPago(pago.metodoPago)} · {formatearFecha(pago.fechaPago)}
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

/**
 * Instrucciones según el método elegido. No hay pasarela de pago real: el QR
 * es el mismo que la clínica usa en persona (módulo 09), y acá solo se muestra
 * para que el paciente pueda pagar sin tener que pedirlo. Nada de esto crea un
 * pago: eso lo sigue haciendo la clínica al confirmarlo.
 */
function ContenidoMetodo({
  metodo,
  qrCobroUrl,
  clinica,
}: {
  metodo: MetodoElegido;
  qrCobroUrl: string | null;
  clinica: ClinicaResumen | null;
}) {
  if (metodo === "qr") {
    if (!qrCobroUrl) {
      return (
        <p className="text-sm text-ink-muted">
          Tu clínica todavía no cargó un QR de cobro. Elegí otro método o consultale directamente.
        </p>
      );
    }
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <img
          src={qrCobroUrl}
          alt="QR de cobro de tu clínica"
          className="h-48 w-48 rounded-xl border border-line bg-white object-contain"
        />
        <p className="max-w-xs text-xs leading-snug text-ink-muted">
          Escaneá este código con tu app del banco o billetera móvil para pagar.
        </p>
      </div>
    );
  }

  if (metodo === "transferencia") {
    if (!clinica?.telefono && !clinica?.email) {
      return (
        <p className="text-sm text-ink-muted">
          Tu clínica no registró datos de contacto. Consultale directamente en tu próxima visita.
        </p>
      );
    }
    return (
      <div className="text-sm text-ink-soft">
        <p>Coordiná la transferencia con tu clínica:</p>
        <ul className="mt-1 flex flex-col gap-0.5">
          {clinica.telefono ? <li>Teléfono: {clinica.telefono}</li> : null}
          {clinica.email ? <li>Correo: {clinica.email}</li> : null}
        </ul>
      </div>
    );
  }

  return (
    <p className="text-sm text-ink-muted">
      Podés pagar en efectivo en tu próxima visita a la clínica.
    </p>
  );
}
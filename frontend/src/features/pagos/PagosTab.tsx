import { useEffect, useMemo, useState } from "react";
import { Plus, Receipt } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { SectionLoader } from "@/components/ui/section-loader";
import { AccountStatement } from "./AccountStatement.tsx";
import { PaymentForm } from "./PaymentForm.tsx";
import { PaymentHistory } from "./PaymentHistory.tsx";
import { QrCobro } from "./QrCobro.tsx";
import { calcularEstadoCuenta } from "./pagoService.ts";
import { usePagosSupabase } from "./usePagosSupabase.ts";
import type { Decimal, Pago } from "./tipos.ts";

export interface PagosTabProps {
  pacienteId: string;
  clinicaId: string;
  /**
   * UUID del usuario que cobra (recepcion). Sin el, la pestaña es de solo
   * lectura: `registrarPago` exige `registradoPor` y no se puede inventar.
   */
  registradoPor?: string;
  /**
   * Total presupuestado del paciente, que aporta el modulo 08. Por defecto 0:
   * sin presupuesto no hay saldo que mostrar y `AccountStatement` lo dice.
   * Cuando el 08 este integrado, Matias pasa aqui el total real desde
   * `PatientProfilePage.tsx` y esta es la unica costura que cambia.
   */
  totalPresupuestado?: Decimal;
  /**
   * Odontólogo o recepción: pueden subir/cambiar el QR de cobro de la
   * clínica. Es independiente de `registradoPor`: no habilita registrar
   * pagos, solo gestionar el QR.
   */
  puedeGestionarQr?: boolean;
}

/**
 * Pestaña "Pagos" de la ficha del paciente (modulo 09).
 *
 * El estado de cuenta se calcula en un solo punto y se reparte: el saldo va a
 * `AccountStatement` (lo pinta) y a `PaymentForm` (topea el pago parcial con
 * `saldoPendiente`). Ninguna vista resta pagos por su cuenta.
 */
export function PagosTab({
  pacienteId,
  clinicaId,
  registradoPor,
  totalPresupuestado = 0,
  puedeGestionarQr = false,
}: PagosTabProps) {
  const { pagos, cargando, guardando, error, cargar, registrar } = usePagosSupabase();
  const [formAbierto, setFormAbierto] = useState(false);

  useEffect(() => {
    void cargar(pacienteId);
  }, [cargar, pacienteId]);

  // El estado de cuenta se calcula en un solo sitio. Ninguna otra vista resta
  // pagos por su cuenta.
  const estadoCuenta = useMemo(
    () => calcularEstadoCuenta(pacienteId, pagos, totalPresupuestado),
    [pacienteId, pagos, totalPresupuestado],
  );

  const manejarRegistro = (pago: Pago) => {
    void (async () => {
      const guardado = await registrar(pago);
      // El formulario se desmonta al guardar: asi el siguiente cobro arranca
      // en blanco. Si falla, el error lo muestra el propio formulario.
      if (guardado) setFormAbierto(false);
    })();
  };

  if (cargando && pagos.length === 0) {
    return <SectionLoader label="Cargando pagos" className="min-h-64" />;
  }

  return (
    <div className="flex flex-col gap-5 fade-in-up">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="title-ios flex items-center gap-2 text-[17px] font-semibold text-label">
            <Receipt size={18} weight="bold" aria-hidden="true" />
            Pagos y cuentas
          </h2>
          <p className="mt-1 text-[13px] text-label-2">
            Saldo del paciente y historial de cobros.
          </p>
        </div>
        {registradoPor ? (
          <Button
            type="button"
            variant={formAbierto ? "secondary" : "primary"}
            size="sm"
            onClick={() => setFormAbierto((abierto) => !abierto)}
            disabled={guardando}
          >
            <Plus size={14} weight="bold" aria-hidden="true" />
            {formAbierto ? "Cancelar" : "Registrar pago"}
          </Button>
        ) : null}
      </div>

      <QrCobro clinicaId={clinicaId} puedeGestionar={puedeGestionarQr} />

      <AccountStatement estado={estadoCuenta} />

      {formAbierto && registradoPor ? (
        <PaymentForm
          clinicaId={clinicaId}
          pacienteId={pacienteId}
          registradoPor={registradoPor}
          saldoPendiente={estadoCuenta.saldoPendiente}
          guardando={guardando}
          error={error}
          onRegistrar={manejarRegistro}
          onCancelar={() => setFormAbierto(false)}
        />
      ) : null}

      <PaymentHistory pagos={pagos} error={error} />
    </div>
  );
}
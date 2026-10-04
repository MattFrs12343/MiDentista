import { useEffect, useMemo, useState } from "react";
import { Plus, Receipt } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { SectionLoader } from "@/components/ui/section-loader";
import { AccountStatement } from "./AccountStatement.tsx";
import { PaymentForm } from "./PaymentForm.tsx";
import { PaymentHistory } from "./PaymentHistory.tsx";
import { calcularEstadoCuenta } from "./pagoService.ts";
import { usePagosSupabase } from "./usePagosSupabase.ts";
import type { Pago } from "./tipos.ts";

export interface PagosTabProps {
  pacienteId: string;
  clinicaId: string;
  /**
   * UUID del usuario que cobra (recepcion). Sin el, la pestaña es de solo
   * lectura: `registrarPago` exige `registradoPor` y no se puede inventar.
   */
  registradoPor?: string;
}

/**
 * Pestaña "Pagos" de la ficha del paciente (modulo 09).
 *
 * Todavia no aporta el total: se le pasa `0` a proposito y
 * `AccountStatement` lo trata como "Sin presupuesto registrado". Cuando el
 * modulo 08 este integrado, este unico `0` se cambia por el total que llegue
 * del presupuesto. No hay otro calculo del saldo en toda la pestana.
 */
export function PagosTab({ pacienteId, clinicaId, registradoPor }: PagosTabProps) {
  const { pagos, cargando, guardando, error, cargar, registrar } = usePagosSupabase();
  const [formAbierto, setFormAbierto] = useState(false);

  useEffect(() => {
    void cargar(pacienteId);
  }, [cargar, pacienteId]);

  // El estado de cuenta se calcula en un solo sitio. Ninguna otra vista resta
  // pagos por su cuenta.
  const estadoCuenta = useMemo(
    () => calcularEstadoCuenta(pacienteId, pagos, 0),
    [pacienteId, pagos],
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
    <div className="flex flex-col gap-5">
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

      <AccountStatement estado={estadoCuenta} />

      {formAbierto && registradoPor ? (
        <PaymentForm
          clinicaId={clinicaId}
          pacienteId={pacienteId}
          registradoPor={registradoPor}
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
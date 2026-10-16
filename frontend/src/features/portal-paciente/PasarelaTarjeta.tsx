import { useState } from "react";
import { AppleLogo, Bank, CreditCard, GoogleLogo, ShieldCheck, Wallet } from "@phosphor-icons/react";

/**
 * Vista estática de una pasarela de pago con tarjeta. Los campos se pueden
 * tipear (se sienten como un formulario real) pero no procesan nada de
 * verdad: no hay `<form>`, no hay `onSubmit`, nada se guarda ni viaja a
 * ningún lado. Es una referencia visual de cómo se va a ver el cobro con
 * tarjeta cuando se integre un procesador real — por eso el aviso explícito
 * de "vista previa": que un paciente real no piense que esto la cobra.
 */

function LogoVisa() {
  return (
    <span className="text-[13px] font-black italic leading-none tracking-tight text-[#1A1F71]" aria-hidden="true">
      VISA
    </span>
  );
}

function LogoMastercard() {
  return (
    <span className="relative inline-flex h-5 w-8 items-center" aria-hidden="true">
      <span className="absolute left-0 h-5 w-5 rounded-full bg-[#EB001B]" />
      <span className="absolute left-3 h-5 w-5 rounded-full bg-[#F79E1B] mix-blend-multiply" />
    </span>
  );
}

function LogoAmex() {
  return (
    <span
      className="rounded-[3px] bg-[#2E77BC] px-1.5 py-[3px] text-[9px] font-bold leading-none tracking-wide text-white"
      aria-hidden="true"
    >
      AMEX
    </span>
  );
}

/** Sin validar de verdad: solo agrupa dígitos para que se sienta como un campo real. */
function formatearNumeroTarjeta(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 16);
  return (digitos.match(/.{1,4}/g) ?? []).join(" ");
}

function formatearVencimiento(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 4);
  return digitos.length <= 2 ? digitos : `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
}

function formatearCvc(valor: string): string {
  return valor.replace(/\D/g, "").slice(0, 4);
}

const METODOS_ALTERNATIVOS = [
  { etiqueta: "Apple Pay", icono: <AppleLogo size={18} weight="fill" aria-hidden="true" /> },
  {
    etiqueta: "PayPal",
    icono: (
      <span className="text-[13px] font-black italic leading-none text-[#003087]" aria-hidden="true">
        Pay<span className="text-[#009cde]">Pal</span>
      </span>
    ),
  },
  { etiqueta: "Google Pay", icono: <GoogleLogo size={18} weight="bold" aria-hidden="true" /> },
  { etiqueta: "Pago bancario", icono: <Bank size={18} weight="bold" aria-hidden="true" /> },
  { etiqueta: "Billetera digital", icono: <Wallet size={18} weight="bold" aria-hidden="true" /> },
  { etiqueta: "Otros medios", icono: <CreditCard size={18} weight="bold" aria-hidden="true" /> },
];

export function PasarelaTarjeta() {
  // Nada de esto envía ni procesa un pago (ver nota de arriba). El estado es
  // puramente visual: marca qué botón tocó el paciente para que la pantalla
  // responda al clic, igual que respondería cualquier botón real de la app.
  const [elegido, setElegido] = useState<string | null>(null);
  // Los campos se pueden tipear (se sienten como un formulario real), pero
  // nada de lo que se escriba acá se guarda, se valida ni sale de este
  // componente: no hay `onSubmit`, no hay request. `autoComplete="off"` evita
  // que el navegador ofrezca autocompletar con una tarjeta real guardada.
  const [numero, setNumero] = useState("");
  const [vencimiento, setVencimiento] = useState("");
  const [cvc, setCvc] = useState("");

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_8px_30px_-12px_rgba(37,99,235,0.25)]">
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        {/* 1) Pago con tarjeta */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[15px] font-semibold text-ink">Pago con tarjeta</h3>
            <div className="flex items-center gap-2">
              <LogoVisa />
              <LogoMastercard />
              <LogoAmex />
            </div>
          </div>

          <div className="rounded-xl border-2 border-brand-500/70 bg-white px-4 py-3 shadow-[0_0_0_3px_rgba(37,99,235,0.08)] transition-shadow duration-150 ease-out hover:shadow-[0_0_0_5px_rgba(37,99,235,0.12)] focus-within:shadow-[0_0_0_5px_rgba(37,99,235,0.16)]">
            <div className="flex items-center gap-2">
              <CreditCard size={20} weight="duotone" className="shrink-0 text-brand-600" aria-hidden="true" />
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={numero}
                onChange={(e) => setNumero(formatearNumeroTarjeta(e.target.value))}
                placeholder="4242 4242 4242 4242"
                aria-label="Número de tarjeta (vista previa, no procesa pagos)"
                className="w-full min-w-0 bg-transparent text-[15px] tracking-[0.08em] text-ink outline-none placeholder:text-ink-muted/50"
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                  Vencimiento
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={vencimiento}
                  onChange={(e) => setVencimiento(formatearVencimiento(e.target.value))}
                  placeholder="MM/AA"
                  aria-label="Fecha de vencimiento (vista previa, no procesa pagos)"
                  className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-muted/50"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">CVC</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={cvc}
                  onChange={(e) => setCvc(formatearCvc(e.target.value))}
                  placeholder="123"
                  aria-label="Código de seguridad (vista previa, no procesa pagos)"
                  className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-muted/50"
                />
              </label>
            </div>
          </div>
        </section>

        {/* 2) Métodos alternativos */}
        <section className="flex flex-col gap-3">
          <h4 className="text-[13px] font-medium text-ink-soft">¿O preferís otro método de pago alternativo?</h4>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {METODOS_ALTERNATIVOS.map(({ etiqueta, icono }) => (
              <button
                key={etiqueta}
                type="button"
                aria-pressed={elegido === etiqueta}
                onClick={() => setElegido((actual) => (actual === etiqueta ? null : etiqueta))}
                className={`press flex h-14 flex-col items-center justify-center gap-1 rounded-xl border px-2 transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
                  elegido === etiqueta
                    ? "border-brand-500 bg-brand-50"
                    : "border-line bg-surface-sunken/60 hover:border-brand-300 hover:bg-brand-50/50"
                }`}
              >
                {icono}
                <span className="text-[10px] font-medium text-ink-muted">{etiqueta}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 3) Indicadores de seguridad */}
        <div className="flex flex-col items-center gap-1 border-t border-line pt-4 text-center">
          <div className="flex items-center gap-1.5 text-ios-green">
            <ShieldCheck size={16} weight="fill" aria-hidden="true" />
            <span className="text-[12px] font-semibold">Pago seguro · Conexión protegida</span>
          </div>
          <p className="text-[10px] text-ink-muted">Procesado y confirmado por el equipo de tu clínica</p>
        </div>
      </div>

      <div className="bg-brand-50 px-5 py-2.5 text-center text-[11px] leading-snug text-brand-800 sm:px-6">
        Vista previa: el cobro directo con tarjeta todavía no está activo. Mientras tanto, pagá por QR,
        transferencia o efectivo.
      </div>
    </div>
  );
}

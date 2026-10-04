import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { aNumero, redondear } from "./pagoCalculo.ts";
import { hoyIso } from "./pagoFormato.ts";
import { METODOS_PAGO, type MetodoPago, type Pago } from "./tipos.ts";

const METODO_ETIQUETA: Record<MetodoPago, string> = {
  efectivo: "Efectivo",
  qr: "QR",
  transferencia: "Transferencia",
  otro: "Otro",
};

export interface PaymentFormProps {
  clinicaId: string;
  pacienteId: string;
  /** Quien cobra: recepcion. `pagoService` lo exige como UUID real. */
  registradoPor: string;
  guardando: boolean;
  onRegistrar: (pago: Pago) => void;
  /**
   * Punto de union con el modulo 08 (presupuestos). Aqui va `null` porque el
   * pago a cuenta no pertenece a ningun presupuesto; cuando se integre, la
   * capa de UI le pasa aqui el UUID.
   */
  presupuestoId?: string | null;
  /** Error de la ultima escritura, para no duplicarlo en el historial. */
  error?: string | null;
  onCancelar?: () => void;
}

/**
 * Alta de un pago a cuenta (US-9.4).
 *
 * El pago nace `pendiente`, no `confirmado`: el default de la base es
 * `confirmado`, asi que enviarlo explicito evita que una compra mal digitada
 * entre sola como dinero recibido. Quien confirma el cobro lo hace recepcion,
 * en un paso aparte.
 */
export function PaymentForm({
  clinicaId,
  pacienteId,
  registradoPor,
  guardando,
  onRegistrar,
  presupuestoId = null,
  error,
  onCancelar,
}: PaymentFormProps) {
  const [monto, setMonto] = useState("");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("efectivo");
  const [fechaPago, setFechaPago] = useState(hoyIso);
  const [codigoReferencia, setCodigoReferencia] = useState("");
  const [notas, setNotas] = useState("");
  const [fallo, setFallo] = useState<string | null>(null);

  const montoNumero = redondear(aNumero(monto));
  const montoValido = montoNumero > 0;
  const referencia = codigoReferencia.trim();

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    if (!montoValido) {
      setFallo("El monto debe ser mayor que cero.");
      return;
    }
    setFallo(null);
    onRegistrar({
      // `id` y `creadoEl` los pone la base; se mandan vacios a proposito.
      id: "",
      clinicaId,
      pacienteId,
      presupuestoId,
      monto: montoNumero,
      metodoPago,
      fechaPago,
      codigoReferencia: referencia ? referencia : null,
      notas: notas.trim(),
      estado: "pendiente",
      registradoPor,
      creadoEl: "",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar pago</CardTitle>
        <CardDescription>
          El pago queda pendiente hasta que se confirme. Solo los confirmados suman al total pagado.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={enviar} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Monto (Bs)"
              htmlFor="pago-monto"
              hint={monto && !montoValido ? "Debe ser mayor que cero." : undefined}
            >
              <Input
                id="pago-monto"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                disabled={guardando}
                required
              />
            </Field>

<Field label="Método de pago" htmlFor="pago-metodo">
              <Select
                value={metodoPago}
                onValueChange={(valor) => setMetodoPago(valor as MetodoPago)}
                disabled={guardando}
              >
                <SelectTrigger id="pago-metodo" aria-label="Método de pago">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METODOS_PAGO.map((metodo) => (
                    <SelectItem key={metodo} value={metodo}>
                      {METODO_ETIQUETA[metodo]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Fecha del pago" htmlFor="pago-fecha">
              <Input
                id="pago-fecha"
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                disabled={guardando}
                required
              />
            </Field>

            <Field
              label="Referencia"
              htmlFor="pago-referencia"
              hint="Número de operación o referencia bancaria. Opcional."
            >
              <Input
                id="pago-referencia"
                type="text"
                placeholder="Opcional"
                value={codigoReferencia}
                onChange={(e) => setCodigoReferencia(e.target.value)}
                disabled={guardando}
              />
            </Field>
          </div>

          <Field label="Notas" htmlFor="pago-notas" hint="Opcional.">
            <Textarea
              id="pago-notas"
              rows={3}
              placeholder="Detalle del cobro"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              disabled={guardando}
            />
          </Field>

          {fallo || error ? (
            <p role="alert" className="text-[12px] leading-snug text-pastel-red-fg">
              {fallo ?? error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={guardando || !montoValido}>
              {guardando ? "Registrando…" : "Registrar pago"}
            </Button>
            {onCancelar ? (
              <Button type="button" variant="ghost" size="md" onClick={onCancelar} disabled={guardando}>
                Cancelar
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
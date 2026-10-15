import { useEffect, useRef, type ChangeEvent } from "react";
import { QrCode, UploadSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormAlert } from "@/components/ui/form-parts";
import { QR_COBRO_ACCEPT } from "./qrCobroValidacion.ts";
import { useQrCobro } from "./useQrCobro.ts";

export interface QrCobroProps {
  clinicaId: string;
  /** Odontólogo o recepción: solo ellos pueden subir o cambiar el QR. */
  puedeGestionar: boolean;
}

/**
 * QR de cobro de la clínica (uno solo, compartido). Vive arriba de
 * `AccountStatement` en `PagosTab`: es información de la clínica, no del
 * paciente, pero esta es la pantalla que el equipo tiene abierta cuando hay
 * que cobrar.
 */
export function QrCobro({ clinicaId, puedeGestionar }: QrCobroProps) {
  const { url, cargando, subiendo, error, cargar, subir } = useQrCobro(clinicaId);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  function elegirArchivo() {
    inputRef.current?.click();
  }

  function archivoElegido(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    // Se limpia siempre: sin esto, volver a elegir el mismo archivo no dispara `onChange`.
    evento.target.value = "";
    if (archivo) void subir(archivo);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle>QR de cobro</CardTitle>
          <CardDescription>El código que el paciente escanea para pagar por QR.</CardDescription>
        </div>
        {puedeGestionar ? (
          <Button type="button" variant="secondary" size="sm" onClick={elegirArchivo} disabled={subiendo}>
            <UploadSimple size={14} weight="bold" aria-hidden="true" />
            {subiendo ? "Subiendo…" : url ? "Cambiar QR" : "Subir QR"}
          </Button>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {puedeGestionar ? (
          <input
            ref={inputRef}
            type="file"
            accept={QR_COBRO_ACCEPT}
            className="hidden"
            onChange={archivoElegido}
            aria-label="Seleccionar imagen del QR de cobro"
          />
        ) : null}

        {error ? <FormAlert>{error}</FormAlert> : null}

        {cargando && !url ? (
          <p className="text-sm text-ink-muted">Cargando QR…</p>
        ) : url ? (
          <img
            src={url}
            alt="QR de cobro de la clínica"
            className="h-40 w-40 rounded-xl border border-line bg-white object-contain"
          />
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-line px-4 py-6 text-sm text-ink-muted">
            <QrCode size={18} aria-hidden="true" />
            Esta clínica todavía no tiene un QR de cobro cargado.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useId } from "react";
import { CalendarBlank, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatearFechaLarga } from "./fechasEvolucion";

/**
 * Fecha de la próxima atención (columna `proxima_atencion`, tipo DATE).
 *
 * Es un `input type="date"` nativo a propósito: en móvil abre el calendario del
 * sistema y en escritorio valida el formato, sin construir un date picker propio.
 * Guarda el mismo texto `YYYY-MM-DD` que la columna, sin conversiones ni zona
 * horaria de por medio.
 */
export function NextVisitPicker({
  value,
  onChange,
  id,
  min,
  disabled,
}: {
  /** `YYYY-MM-DD` o `null` cuando no hay próxima atención acordada. */
  value: string | null;
  onChange: (fecha: string | null) => void;
  id?: string;
  /** Fecha mínima permitida en `YYYY-MM-DD` (por ejemplo, hoy). */
  min?: string;
  disabled?: boolean;
}) {
  const idGenerado = useId();
  const idCampo = id ?? `proxima-atencion-${idGenerado}`;
  const hayValor = value !== null && value !== "";

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={idCampo}>Próxima atención</Label>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-44">
          <CalendarBlank
            size={16}
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <Input
            id={idCampo}
            type="date"
            value={value ?? ""}
            min={min}
            disabled={disabled}
            onChange={(evento) => onChange(evento.target.value || null)}
            className="pl-10"
            aria-describedby={`${idCampo}-ayuda`}
          />
        </div>
        {hayValor ? (
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={disabled}
            onClick={() => onChange(null)}
            aria-label="Quitar la próxima atención"
          >
            <X size={15} weight="bold" aria-hidden /> Quitar
          </Button>
        ) : null}
      </div>
      <p id={`${idCampo}-ayuda`} className="text-xs text-ink-muted">
        {hayValor
          ? `Atención sugerida para el ${formatearFechaLarga(value)}.`
          : "Opcional. Deja la fecha vacía si no hay una próxima atención acordada."}
      </p>
    </div>
  );
}

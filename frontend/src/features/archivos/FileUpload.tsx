import { useId, useRef, useState, type ChangeEvent } from "react";
import { WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ACCEPT_ARCHIVOS, validarSeleccionArchivos } from "./archivoSeleccion.ts";

export type FileUploadProps = {
  disabled?: boolean;
  onFileSelected: (file: File | null) => void;
};

function tamanoLegible(bytes: number): string {
  const formato = new Intl.NumberFormat("es", { maximumFractionDigits: 2 });
  if (bytes < 1024) return `${formato.format(bytes)} bytes`;
  if (bytes < 1048576) return `${formato.format(bytes / 1024)} KiB`;
  return `${formato.format(bytes / 1048576)} MiB`;
}

/** Selección local de T-10.3. El padre recibe el File; aquí no hay persistencia. */
export function FileUpload({ disabled = false, onFileSelected }: FileUploadProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const idAyuda = `${id}-ayuda`;
  const idEstado = `${id}-estado`;
  const idError = `${id}-error`;
  const descripcion = `${idAyuda} ${idEstado}${error ? ` ${idError}` : ""}`;

  function abrirSelector() {
    if (disabled || !inputRef.current) return;
    // La selección vive en React, no en el input. Permite volver a elegir el
    // mismo archivo; cancelar el diálogo no borra el estado ni emite callbacks.
    inputRef.current.value = "";
    inputRef.current.click();
  }

  function seleccionar(evento: ChangeEvent<HTMLInputElement>) {
    if (disabled) return;
    const archivos = Array.from(evento.currentTarget.files ?? []);
    evento.currentTarget.value = "";
    if (archivos.length === 0) return;

    const resultado = validarSeleccionArchivos(archivos);
    if (!resultado.valido) {
      setArchivo(null);
      setError(resultado.error);
      onFileSelected(null);
      return;
    }
    setArchivo(resultado.archivo);
    setError(null);
    onFileSelected(resultado.archivo);
  }

  function quitarSeleccion() {
    if (disabled) return;
    setArchivo(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
    onFileSelected(null);
  }

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Seleccionar archivo</CardTitle>
        <CardDescription id={idAyuda}>
          JPG, PNG, WEBP o PDF. Máximo 10 MiB por archivo
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4">
        <Input
          ref={inputRef}
          id={`${id}-archivo`}
          type="file"
          className="hidden"
          accept={ACCEPT_ARCHIVOS}
          multiple={false}
          disabled={disabled}
          aria-label="Seleccionar archivo"
          aria-describedby={descripcion}
          aria-invalid={error ? true : undefined}
          onChange={seleccionar}
        />

        <div id={idEstado} role="status" aria-atomic="true" className="min-w-0">
          {archivo ? (
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-sm font-semibold text-ink">Archivo seleccionado</p>
              <p className="break-all text-sm text-ink">{archivo.name}</p>
              <p className="text-xs text-ink-muted">{tamanoLegible(archivo.size)}</p>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">Ningún archivo seleccionado.</p>
          )}
        </div>

        {error ? (
          <p
            id={idError}
            role="alert"
            className="flex min-w-0 items-start gap-2 rounded-xl border border-pastel-red-fg/25 bg-pastel-red-bg px-3.5 py-3 text-sm text-pastel-red-fg"
          >
            <WarningCircle size={17} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
            <span className="min-w-0 break-words">{error}</span>
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={archivo ? "secondary" : "primary"}
            disabled={disabled}
            aria-describedby={descripcion}
            onClick={abrirSelector}
          >
            {archivo ? "Cambiar archivo" : "Seleccionar archivo"}
          </Button>
          {archivo ? (
            <Button
              type="button"
              variant="ghost"
              disabled={disabled}
              aria-describedby={idEstado}
              onClick={quitarSeleccion}
            >
              Quitar selección
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

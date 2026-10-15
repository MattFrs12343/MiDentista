import { useId, useState, type FormEvent } from "react";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "./FileUpload.tsx";
import { esUuid } from "./archivoMapper.ts";
import { validarSeleccionImagen } from "./archivoSeleccion.ts";
import { useSubidaImagen } from "./useSubidaImagen.ts";
import type { Archivo, AsociacionArchivo, TipoImagen } from "./tipos.ts";
import { AsociacionArchivoSelector } from "./AsociacionArchivoSelector.tsx";
import { mensajePublicoSubida, type ObservadorSubida } from "./patientFilesSection.ts";

export type ImageUploadFormProps = {
  pacienteId: string;
  clinicaId: string;
  subidoPor: string;
  onUploadSuccess?: (archivo: Archivo) => void;
  onUploadStateChange?: ObservadorSubida;
};

/** Remontar el borrador al cambiar ficha/clínica/autor; nunca mezclar contextos. */
export function ImageUploadForm(props: ImageUploadFormProps) {
  const clave = JSON.stringify([props.pacienteId, props.clinicaId, props.subidoPor]);
  return <FormularioImagen key={clave} {...props} />;
}

function FormularioImagen({ pacienteId, clinicaId, subidoPor, onUploadSuccess, onUploadStateChange }: ImageUploadFormProps) {
  const id = useId();
  const [seleccionado, setSeleccionado] = useState<File | null>(null);
  const [tipoArchivo, setTipoArchivo] = useState<TipoImagen>("fotografia");
  const [descripcion, setDescripcion] = useState("");
  const [asociacion, setAsociacion] = useState<AsociacionArchivo | undefined>({ tipo: "general" });
  const [versionSelector, setVersionSelector] = useState(0);
  const subida = useSubidaImagen({ pacienteId, clinicaId, subidoPor }, onUploadStateChange);
  const subiendo = subida.estado === "uploading";
  const pendiente = subida.error?.requiereRevision ?? false;
  const contextoValido = esUuid(pacienteId) && esUuid(clinicaId) && esUuid(subidoPor);
  const validacion = seleccionado ? validarSeleccionImagen([seleccionado], tipoArchivo) : null;
  const errorSeleccion = validacion && !validacion.valido ? validacion.error : null;
  const error = !contextoValido ? "Paciente, clínica y autor deben tener UUID reales para subir la imagen."
    : subida.error ? mensajePublicoSubida(subida.error) : errorSeleccion;

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!seleccionado || !validacion?.valido || !contextoValido || subiendo || pendiente || !asociacion) return;
    const archivo = await subida.iniciarSubida({
      archivo: seleccionado, pacienteId, clinicaId, subidoPor, tipoArchivo, descripcion, asociacion,
    });
    if (!archivo) return;
    setSeleccionado(null);
    setDescripcion("");
    setTipoArchivo("fotografia");
    setAsociacion({ tipo: "general" });
    setVersionSelector((anterior) => anterior + 1);
    onUploadSuccess?.(archivo);
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <FileUpload
        key={versionSelector}
        disabled={subiendo || pendiente}
        onFileSelected={(archivo) => {
          setSeleccionado(archivo);
          subida.reiniciar();
        }}
      />
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Subir imagen clínica</CardTitle>
          <CardDescription>
            Selecciona Fotografía clínica o Radiografía. Las imágenes se guardan como archivos clínicos del paciente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={enviar} noValidate className="flex min-w-0 flex-col gap-4" aria-busy={subiendo}>
            <Field label="Tipo de imagen" htmlFor={`${id}-tipo`} hint="Una radiografía debe clasificarse explícitamente.">
              <Select
                value={tipoArchivo}
                disabled={subiendo || pendiente}
                onValueChange={(valor) => {
                  if (valor !== "fotografia" && valor !== "radiografia") return;
                  setTipoArchivo(valor);
                  subida.reiniciar();
                }}
              >
                <SelectTrigger id={`${id}-tipo`} aria-label="Tipo de imagen">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fotografia">Fotografía clínica</SelectItem>
                  <SelectItem value="radiografia">Radiografía</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <AsociacionArchivoSelector key={versionSelector} pacienteId={pacienteId} clinicaId={clinicaId} perfilId={subidoPor} disabled={subiendo || pendiente || !contextoValido}
              onChange={(valor) => { setAsociacion(valor); subida.reiniciar(); }} />
            <Field label="Descripción" htmlFor={`${id}-descripcion`} hint="Opcional.">
              <Textarea
                id={`${id}-descripcion`}
                rows={3}
                value={descripcion}
                disabled={subiendo || pendiente}
                placeholder="Detalle de la imagen clínica"
                onChange={(evento) => {
                  setDescripcion(evento.target.value);
                  subida.reiniciar();
                }}
              />
            </Field>

            {error ? (
              <p id={`${id}-error`} role="alert" className="flex min-w-0 items-start gap-2 rounded-xl border border-pastel-red-fg/25 bg-pastel-red-bg px-3.5 py-3 text-sm text-pastel-red-fg">
                <WarningCircle size={17} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
                <span className="min-w-0 break-words">{error}</span>
              </p>
            ) : null}
            {subida.estado === "success" && subida.archivo ? (
              <p role="status" className="flex min-w-0 items-start gap-2 rounded-xl border border-pastel-green-fg/25 bg-pastel-green-bg px-3.5 py-3 text-sm text-pastel-green-fg">
                <CheckCircle size={17} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
                <span className="min-w-0 break-words">Imagen subida y registrada correctamente: {subida.archivo.nombre}</span>
              </p>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="submit"
                disabled={subiendo || pendiente || !contextoValido || !validacion?.valido || !asociacion}
                aria-describedby={error ? `${id}-error` : undefined}
              >
                {subiendo ? "Subiendo imagen…" : "Subir imagen"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

import { useId, useState, type FormEvent } from "react";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "./FileUpload.tsx";
import { esUuid } from "./archivoMapper.ts";
import { validarSeleccionDocumento } from "./archivoSeleccion.ts";
import { useSubidaDocumento } from "./useSubidaDocumento.ts";
import type { Archivo, AsociacionArchivo } from "./tipos.ts";
import { AsociacionArchivoSelector } from "./AsociacionArchivoSelector.tsx";
import { mensajePublicoSubida, type ObservadorSubida } from "./patientFilesSection.ts";

export type DocumentUploadFormProps = {
  pacienteId: string;
  clinicaId: string;
  subidoPor: string;
  onUploadSuccess?: (archivo: Archivo) => void;
  onUploadStateChange?: ObservadorSubida;
};

/** Borrador aislado por paciente/clínica/autor, igual que el flujo de imágenes. */
export function DocumentUploadForm(props: DocumentUploadFormProps) {
  const clave = JSON.stringify([props.pacienteId, props.clinicaId, props.subidoPor]);
  return <FormularioDocumento key={clave} {...props} />;
}

function FormularioDocumento({ pacienteId, clinicaId, subidoPor, onUploadSuccess, onUploadStateChange }: DocumentUploadFormProps) {
  const id = useId();
  const [seleccionado, setSeleccionado] = useState<File | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [asociacion, setAsociacion] = useState<AsociacionArchivo | undefined>({ tipo: "general" });
  const [versionSelector, setVersionSelector] = useState(0);
  const subida = useSubidaDocumento({ pacienteId, clinicaId, subidoPor }, onUploadStateChange);
  const subiendo = subida.estado === "uploading";
  const pendiente = subida.error?.requiereRevision ?? false;
  const contextoValido = esUuid(pacienteId) && esUuid(clinicaId) && esUuid(subidoPor);
  const validacion = seleccionado ? validarSeleccionDocumento([seleccionado]) : null;
  const errorSeleccion = validacion && !validacion.valido ? validacion.error : null;
  const error = !contextoValido ? "Paciente, clínica y autor deben tener UUID reales para subir el PDF."
    : subida.error ? mensajePublicoSubida(subida.error) : errorSeleccion;

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!seleccionado || !validacion?.valido || !contextoValido || subiendo || pendiente || !asociacion) return;
    const archivo = await subida.iniciarSubida({ archivo: seleccionado, pacienteId, clinicaId, subidoPor, descripcion, asociacion });
    if (!archivo) return;
    setSeleccionado(null);
    setDescripcion("");
    setAsociacion({ tipo: "general" });
    setVersionSelector((anterior) => anterior + 1);
    onUploadSuccess?.(archivo);
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <FileUpload
        key={versionSelector}
        disabled={subiendo || pendiente}
        onFileSelected={(archivo) => { setSeleccionado(archivo); subida.reiniciar(); }}
      />
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Subir documento PDF</CardTitle>
          <CardDescription>Adjunta un PDF de hasta 10 MiB. La categoría se determina según el perfil que realiza la subida.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={enviar} noValidate className="flex min-w-0 flex-col gap-4" aria-busy={subiendo}>
            <AsociacionArchivoSelector key={versionSelector} pacienteId={pacienteId} clinicaId={clinicaId} perfilId={subidoPor} disabled={subiendo || pendiente || !contextoValido}
              onChange={(valor) => { setAsociacion(valor); subida.reiniciar(); }} />
            <Field label="Descripción" htmlFor={`${id}-descripcion`} hint="Opcional.">
              <Textarea
                id={`${id}-descripcion`}
                rows={3}
                value={descripcion}
                disabled={subiendo || pendiente}
                placeholder="Detalle del documento"
                onChange={(evento) => { setDescripcion(evento.target.value); subida.reiniciar(); }}
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
                <span className="min-w-0 break-words">PDF subido y registrado correctamente: {subida.archivo.nombre}</span>
              </p>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="submit"
                disabled={subiendo || pendiente || !contextoValido || !validacion?.valido || !asociacion}
                aria-describedby={error ? `${id}-error` : undefined}
              >
                {subiendo ? "Subiendo PDF…" : "Subir PDF"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

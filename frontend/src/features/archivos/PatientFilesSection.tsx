import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Image, FilePdf } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ImageUploadForm } from "./ImageUploadForm.tsx";
import { DocumentUploadForm } from "./DocumentUploadForm.tsx";
import { PatientFilesGallery, type PatientFilesGalleryHandle } from "./PatientFilesGallery.tsx";
import { FileUploadDialog } from "./FileUploadDialog.tsx";
import { capacidadesArchivos, crearCoordinadorArchivos, registroEscritura, type PerfilArchivos } from "./patientFilesSection.ts";
import { cargarContextoPacienteArchivos, type ContextoPacienteArchivos } from "./patientFilesSectionService.ts";
import type { Archivo } from "./tipos.ts";

type Props = { pacienteId: string; perfil: PerfilArchivos | null; rol: string | null };

/** Aislar borradores/lecturas y actor sin ampliar el store ni los tipos globales. */
export function PatientFilesSection(props: Props) {
  const clave = JSON.stringify([props.pacienteId.toLowerCase(), props.perfil?.id.toLowerCase(), props.perfil?.clinicaId?.toLowerCase(), props.rol]);
  return <SeccionArchivos key={clave} {...props} clave={clave} />;
}

function SeccionArchivos({ pacienteId, perfil, rol, clave }: Props & { clave: string }) {
  const [contexto, setContexto] = useState<ContextoPacienteArchivos | null>(null);
  const [errorContexto, setErrorContexto] = useState<string | null>(null);
  const [modal, setModal] = useState<"imagen" | "pdf" | null>(null);
  const [confirmacion, setConfirmacion] = useState<string | null>(null);
  const [errorRefresh, setErrorRefresh] = useState(false);
  const galeria = useRef<PatientFilesGalleryHandle>(null);
  const seccion = useRef<HTMLElement>(null);
  const origen = useRef<HTMLButtonElement | null>(null);
  const montado = useRef(false);
  const coordinador = useRef<((archivo: Archivo) => Promise<boolean>) | null>(null);
  const registro = useMemo(() => registroEscritura(clave), [clave]);
  const escritura = useSyncExternalStore(registro.suscribir, registro.leer, registro.leer);
  const capacidades = capacidadesArchivos(pacienteId, contexto, perfil, rol);
  const perfilId = perfil?.id;

  useLayoutEffect(() => {
    montado.current = true;
    return () => { montado.current = false; };
  }, []);
  useEffect(() => {
    let activo = true;
    void cargarContextoPacienteArchivos(pacienteId).then((datos) => {
      if (activo) setContexto(datos);
    }).catch(() => {
      if (activo) setErrorContexto("No pudimos confirmar el contexto del paciente. La subida no está disponible; puedes consultar los archivos visibles.");
    });
    return () => { activo = false; };
  }, [pacienteId]);

  useLayoutEffect(() => {
    if (!contexto || !perfilId) return;
    coordinador.current = crearCoordinadorArchivos({ ...contexto, perfilId }, {
      vigente: () => montado.current,
      cerrar: () => setModal(null),
      confirmar: (archivo) => { setConfirmacion(`Archivo subido y registrado correctamente: ${archivo.nombre}`); setErrorRefresh(false); },
      reload: () => galeria.current?.reload() ?? Promise.resolve(),
      errorRefresh: () => setErrorRefresh(true),
    });
    return () => { coordinador.current = null; };
  }, [contexto, perfilId]);
  const confirmarSubida = useCallback((archivo: Archivo) => coordinador.current?.(archivo) ?? Promise.resolve(false), []);
  // Si la escritura termina tras salir/volver a la pestaña, solo el consumidor
  // del mismo contexto puede confirmar/refrescar; nunca la ficha siguiente.
  useEffect(() => registro.observarConfirmacion((archivo) => { void confirmarSubida(archivo); }), [registro, confirmarSubida]);
  const onUploadSuccess = useCallback((archivo: Archivo) => { void confirmarSubida(archivo); }, [confirmarSubida]);

  function abrir(tipo: "imagen" | "pdf", boton: HTMLButtonElement) {
    if (modal || escritura.subiendo || escritura.requiereRevision || !(tipo === "imagen" ? capacidades.imagen : capacidades.pdf)) return;
    origen.current = boton;
    setConfirmacion(null); setErrorRefresh(false); setModal(tipo);
  }
  function cerrar() { if (!registro.leer().subiendo) setModal(null); }
  function devolverFoco() {
    if (origen.current?.isConnected && !origen.current.disabled) origen.current.focus();
    else seccion.current?.focus();
  }
  const bloquear = modal !== null || escritura.subiendo || escritura.requiereRevision;
  return (
    <section ref={seccion} tabIndex={-1} aria-label="Sección Archivos del paciente" className="fade-in-up flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">Archivos del paciente</h2>
        <div className="flex flex-wrap gap-2">
          {rol === "odontologo" || rol === "recepcionista" ? (
            <>
              <Button type="button" variant="secondary" disabled={!capacidades.imagen || bloquear} onClick={(evento) => abrir("imagen", evento.currentTarget)}><Image size={18} aria-hidden />Subir imagen</Button>
              <Button type="button" variant="secondary" disabled={!capacidades.pdf || bloquear} onClick={(evento) => abrir("pdf", evento.currentTarget)}><FilePdf size={18} aria-hidden />Subir PDF</Button>
            </>
          ) : null}
        </div>
      </div>
      {!contexto && !errorContexto ? <p role="status" className="text-sm text-ink-muted">Cargando contexto del paciente…</p> : null}
      {contexto && !perfil ? <p role="status" className="text-sm text-ink-muted">Cargando perfil para habilitar la subida…</p> : null}
      {errorContexto ? <p role="alert" className="text-sm text-pastel-red-fg">{errorContexto}</p> : null}
      {contexto && perfil && !capacidades.imagen && (rol === "odontologo" || rol === "recepcionista") ? (
        <p role="alert" className="text-sm text-pastel-red-fg">No se confirmó un perfil y clínica compatibles para subir archivos de este paciente.</p>
      ) : null}
      {escritura.subiendo && !modal ? <p role="status" className="text-sm text-ink-muted">Hay una subida de este paciente en curso.</p> : null}
      {escritura.requiereRevision ? <p role="alert" className="rounded-xl border border-pastel-red-fg/25 bg-pastel-red-bg p-3 text-sm text-pastel-red-fg">No se confirmó un intento de subida. Revisa el intento antes de volver a subir; cerrar el formulario no elimina esta alerta.</p> : null}
      {confirmacion ? <p role="status" className="min-w-0 break-words text-sm text-pastel-green-fg">{confirmacion}</p> : null}
      {errorRefresh ? <p role="alert" className="text-sm text-ink-muted">El archivo quedó registrado, pero no pudimos actualizar la galería automáticamente. Usa Actualizar o Reintentar.</p> : null}
      <PatientFilesGallery ref={galeria} pacienteId={pacienteId} mostrarEncabezado={false} />
      {modal && contexto && perfil ? (
        <FileUploadDialog open subiendo={escritura.subiendo} title={modal === "imagen" ? "Subir imagen" : "Subir PDF"}
          description="Archivo del paciente actual. Máximo 10 MiB. Selecciona un destino opcional antes de subir."
          onClose={cerrar} onReturnFocus={devolverFoco}>
          {modal === "imagen" ? (
            <ImageUploadForm pacienteId={contexto.pacienteId} clinicaId={contexto.clinicaId} subidoPor={perfil.id}
              onUploadSuccess={onUploadSuccess} onUploadStateChange={registro.publicar} />
          ) : (
            <DocumentUploadForm pacienteId={contexto.pacienteId} clinicaId={contexto.clinicaId} subidoPor={perfil.id}
              onUploadSuccess={onUploadSuccess} onUploadStateChange={registro.publicar} />
          )}
        </FileUploadDialog>
      ) : null}
    </section>
  );
}

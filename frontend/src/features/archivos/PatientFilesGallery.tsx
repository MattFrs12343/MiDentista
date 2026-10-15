import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { DownloadSimple, FilePdf, Images, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { prepararPresentacion } from "./archivosGaleria.ts";
import { useArchivosPaciente } from "./useArchivosPaciente.ts";
import { ImageViewer } from "./ImageViewer.tsx";
import { puedeAbrirImagen } from "./imageViewer.ts";
import { esDescargable, type EstadoDescarga } from "./archivoDescarga.ts";
import { useDescargaArchivo } from "./useDescargaArchivo.ts";
import { useResumenesAsociaciones } from "./useResumenesAsociaciones.ts";
import { ASOCIACION_NO_DISPONIBLE } from "./archivoAsociacionService.ts";
import type { Archivo, EstadoMiniatura } from "./tipos.ts";

function MiniaturaImagen({ archivo, miniatura }: { archivo: Archivo; miniatura?: EstadoMiniatura }) {
  const [urlFallida, setUrlFallida] = useState<string | null>(null);
  const disponible = miniatura?.estado === "disponible" && urlFallida !== miniatura.url;
  return (
    <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-line bg-surface-sunken">
      {disponible ? (
        <img
          src={miniatura.url}
          alt={`${prepararPresentacion(archivo).tipo}: ${archivo.nombre}`}
          className="h-full w-full object-contain"
          loading="lazy"
          onError={() => setUrlFallida(miniatura.url)}
        />
      ) : (
        <div className="flex flex-col items-center gap-2 p-4 text-center text-xs text-ink-muted" role="status">
          <Images size={32} aria-hidden />
          <span>{miniatura?.estado === "pendiente" ? "Cargando vista previa…" : "Vista previa no disponible."}</span>
        </div>
      )}
    </div>
  );
}

function TarjetaArchivo({ archivo, miniatura, cargando, onVer, descarga, onDescargar, resumenAsociacion }: {
  archivo: Archivo;
  miniatura?: EstadoMiniatura;
  cargando: boolean;
  onVer: (archivo: Archivo, boton: HTMLButtonElement) => void;
  descarga?: EstadoDescarga;
  onDescargar: (id: string) => void;
  resumenAsociacion?: string;
}) {
  const presentacion = prepararPresentacion(archivo);
  return (
    <Card className="h-full min-w-0">
      <CardHeader>
        <CardTitle className="line-clamp-2 break-words [overflow-wrap:anywhere]">{archivo.nombre}</CardTitle>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-3">
        {presentacion.miniatura ? (
          <MiniaturaImagen
            key={miniatura?.estado === "disponible" ? `${miniatura.url}:${miniatura.venceEn}` : miniatura?.estado}
            archivo={archivo}
            miniatura={miniatura}
          />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-line bg-surface-sunken text-ink-muted">
            <FilePdf size={48} weight="duotone" aria-hidden />
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Badge tone="neutral">{presentacion.tipo}</Badge>
          <Badge tone="neutral">{presentacion.categoria}</Badge>
        </div>
        <time dateTime={archivo.creadoEl} className="text-xs text-ink-muted">{presentacion.fecha}</time>
        {archivo.evolucionClinicaId || archivo.planTratamientoId ? (
          <p className="min-w-0 line-clamp-2 break-words text-xs text-ink-muted">{resumenAsociacion ?? ASOCIACION_NO_DISPONIBLE}</p>
        ) : null}
        {presentacion.descripcion ? (
          <p className="min-w-0 line-clamp-3 break-words text-sm text-ink [overflow-wrap:anywhere]">{presentacion.descripcion}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {puedeAbrirImagen(archivo) ? (
            <Button type="button" variant="secondary" disabled={cargando} aria-label={`Ver imagen: ${archivo.nombre}`} onClick={(evento) => onVer(archivo, evento.currentTarget)}>Ver imagen</Button>
          ) : null}
          {esDescargable(archivo) ? (
            <Button type="button" variant="secondary" disabled={cargando || descarga?.estado === "descargando"} aria-label={`Descargar: ${archivo.nombre}`} onClick={() => onDescargar(archivo.id)}>
              {descarga?.estado === "descargando" ? <SpinnerGap size={18} className="animate-spin" aria-hidden /> : <DownloadSimple size={18} aria-hidden />}
              {descarga?.estado === "descargando" ? "Descargando…" : "Descargar"}
            </Button>
          ) : null}
        </div>
        {descarga?.estado === "descargando" ? <p role="status" className="text-sm text-ink-muted">Descargando…</p> : null}
        {descarga?.estado === "error" ? <p role="alert" className="min-w-0 break-words text-sm text-pastel-red-fg">{descarga.mensaje}</p> : null}
      </CardContent>
    </Card>
  );
}

export type PatientFilesGalleryHandle = { reload: () => Promise<void> };

/** Una instancia de lectura; el contenedor solo solicita refresh tras INSERT. */
export const PatientFilesGallery = forwardRef<PatientFilesGalleryHandle, { pacienteId: string; mostrarEncabezado?: boolean }>(
function PatientFilesGallery({ pacienteId, mostrarEncabezado = true }, ref) {
  const { estado, archivos, urlsPorId, error, reload, asegurarUrlArchivo } = useArchivosPaciente(pacienteId);
  useImperativeHandle(ref, () => ({ reload }), [reload]);
  const { descargar, estadosPorId } = useDescargaArchivo(pacienteId, archivos, estado === "success");
  const resumenes = useResumenesAsociaciones(archivos);
  const [seleccion, setSeleccion] = useState<{ pacienteId: string; archivoId: string } | null>(null);
  const botonOrigen = useRef<HTMLButtonElement | null>(null);
  const galeriaRef = useRef<HTMLElement>(null);
  const seleccionado = seleccion?.pacienteId === pacienteId.toLowerCase()
    ? archivos.find((archivo) => archivo.id === seleccion.archivoId && archivo.pacienteId.toLowerCase() === pacienteId.toLowerCase())
    : undefined;
  // Descartar selección durante el render evita reabrirla al volver a otra ficha.
  if (seleccion && (seleccion.pacienteId !== pacienteId.toLowerCase() || (estado !== "loading" && !seleccionado))) {
    setSeleccion(null);
  }

  function abrir(archivo: Archivo, boton: HTMLButtonElement) {
    if (estado !== "success" || !puedeAbrirImagen(archivo)) return;
    botonOrigen.current = boton;
    setSeleccion({ pacienteId: pacienteId.toLowerCase(), archivoId: archivo.id });
    void asegurarUrlArchivo(archivo.id);
  }

  function devolverFoco() {
    if (botonOrigen.current?.isConnected && !botonOrigen.current.disabled) botonOrigen.current.focus();
    else galeriaRef.current?.focus();
  }
  return (
    <section ref={galeriaRef} tabIndex={-1} className="flex min-w-0 flex-col gap-4" aria-label="Archivos del paciente" aria-busy={estado === "loading"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {mostrarEncabezado ? <h2 className="text-base font-semibold text-ink">Archivos del paciente</h2> : <span />}
        {archivos.length > 0 ? (
          <Button type="button" variant="secondary" disabled={estado === "loading"} onClick={() => { void reload(); }}>Actualizar</Button>
        ) : null}
      </div>
      {estado === "loading" ? <p role="status" className="text-sm text-ink-muted">Cargando archivos del paciente…</p> : null}
      {estado === "error" ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 pt-4">
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-pastel-red-fg/25 bg-pastel-red-bg px-3.5 py-3 text-sm text-pastel-red-fg">
              <WarningCircle size={17} weight="fill" className="shrink-0" aria-hidden />
              <span>{error}</span>
            </p>
            <Button type="button" variant="secondary" onClick={() => { void reload(); }}>Reintentar</Button>
          </CardContent>
        </Card>
      ) : null}
      {estado === "success" && archivos.length === 0 ? (
        <EmptyState icon={Images} iconTone="neutral" title="Este paciente todavía no tiene archivos." live />
      ) : null}
      {archivos.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {archivos.map((archivo) => (
            <li key={`${pacienteId}:${archivo.id}`} className="min-w-0">
              <TarjetaArchivo archivo={archivo} miniatura={urlsPorId[archivo.id]} cargando={estado === "loading"} onVer={abrir}
                descarga={estadosPorId[archivo.id]} onDescargar={(id) => { void descargar(id); }} resumenAsociacion={resumenes[archivo.id]} />
            </li>
          ))}
        </ul>
      ) : null}
      {seleccionado && puedeAbrirImagen(seleccionado) ? (
        <ImageViewer
          archivo={seleccionado}
          miniatura={urlsPorId[seleccionado.id]}
          onClose={() => setSeleccion(null)}
          onRetry={() => { void asegurarUrlArchivo(seleccionado.id, true); }}
          onReturnFocus={devolverFoco}
          descarga={estadosPorId[seleccionado.id]}
          descargaHabilitada={estado === "success"}
          onDownload={() => { void descargar(seleccionado.id); }}
        />
      ) : null}
    </section>
  );
});

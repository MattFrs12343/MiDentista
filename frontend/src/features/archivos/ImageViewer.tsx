import { useCallback, useLayoutEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { DownloadSimple, SpinnerGap, Minus, Plus, ArrowCounterClockwise, X } from "@phosphor-icons/react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { prepararPresentacion } from "./archivosGaleria.ts";
import {
  acercar, alejar, altImagen, dimensionesImagen, estadoVisor, fuenteImagen,
  puedeAbrirImagen, restablecerZoom, viewportDesdeContenido, ZOOM_MAXIMO, ZOOM_MINIMO, type CargaImagen,
} from "./imageViewer.ts";
import type { Archivo, EstadoMiniatura } from "./tipos.ts";
import type { EstadoDescarga } from "./archivoDescarga.ts";

type ImageViewerProps = {
  archivo: Archivo;
  miniatura: EstadoMiniatura | undefined;
  onClose: () => void;
  onRetry: () => void;
  onReturnFocus?: () => void;
  descarga?: EstadoDescarga;
  descargaHabilitada: boolean;
  onDownload: () => void;
};

/** Un cambio de archivo reinicia el visor; renovar su firma conserva el zoom. */
export function ImageViewer(props: ImageViewerProps) {
  if (!puedeAbrirImagen(props.archivo)) return null;
  return <VisorImagen key={props.archivo.id} {...props} />;
}

function ImagenAmpliada({
  archivo, url, zoom, viewport, visible, onLoad, onError,
}: {
  archivo: Archivo;
  url: string;
  zoom: number;
  viewport: { ancho: number; alto: number };
  visible: boolean;
  onLoad: () => void;
  onError: () => void;
}) {
  const [natural, setNatural] = useState({ ancho: 0, alto: 0 });
  const dimensiones = dimensionesImagen(natural, viewport, zoom);
  return (
    <div
      className="flex items-center justify-center"
      style={{ width: Math.max(viewport.ancho, dimensiones.ancho), height: Math.max(viewport.alto, dimensiones.alto) }}
    >
      <img
        src={url}
        alt={altImagen(archivo)}
        className="block max-w-none shrink-0 object-contain"
        style={{ width: dimensiones.ancho, height: dimensiones.alto, visibility: visible ? "visible" : "hidden" }}
        onLoad={(evento) => {
          const imagen = evento.currentTarget;
          if (!imagen.naturalWidth || !imagen.naturalHeight) { onError(); return; }
          setNatural({ ancho: imagen.naturalWidth, alto: imagen.naturalHeight });
          onLoad();
        }}
        onError={onError}
      />
    </div>
  );
}

function VisorImagen({ archivo, miniatura, onClose, onRetry, onReturnFocus, descarga, descargaHabilitada, onDownload }: ImageViewerProps) {
  const [zoom, setZoom] = useState(restablecerZoom);
  const [carga, setCarga] = useState<CargaImagen | null>(null);
  const [viewport, setViewport] = useState({ ancho: 0, alto: 0 });
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const fuente = fuenteImagen(miniatura);
  const fuenteActual = useRef<string | null>(fuente);
  const estado = estadoVisor(miniatura, carga);
  const presentacion = prepararPresentacion(archivo);

  // Invalidar eventos de la URL anterior antes de efectos pasivos.
  useLayoutEffect(() => {
    fuenteActual.current = fuente;
    return () => { fuenteActual.current = null; };
  }, [fuente]);

  // El portal puede montar después del padre: observar desde el ref de montaje.
  // Medir el área disponible, nunca el lienzo que crece con el zoom.
  const montarViewport = useCallback((elemento: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    scrollRef.current = elemento;
    if (!elemento) return;
    const observer = new ResizeObserver((entradas) => {
      if (scrollRef.current !== elemento) return;
      const entrada = entradas.find((dato) => dato.target === elemento);
      if (!entrada) return;
      // clientWidth/clientHeight redondean y pueden generar scroll a 1x.
      // Medir el content box y conservar el gutter rompe esa realimentación.
      const siguiente = viewportDesdeContenido(entrada.contentRect.width, entrada.contentRect.height);
      setViewport((anterior) => anterior.ancho === siguiente.ancho && anterior.alto === siguiente.alto
        ? anterior : siguiente);
    });
    observerRef.current = observer;
    observer.observe(elemento);
  }, []);

  function registrarCarga(estadoCarga: "visible" | "error") {
    if (fuente && fuenteActual.current === fuente) setCarga({ fuente, estado: estadoCarga });
  }

  function reset() {
    setZoom(restablecerZoom());
    scrollRef.current?.scrollTo({ top: 0, left: 0 });
  }

  return (
    <Dialog open onOpenChange={(abierto) => { if (!abierto) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="overlay-animate fixed inset-0 z-40 bg-ink/30 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          className="dialog-animate fixed left-1/2 top-1/2 z-50 flex h-[90dvh] max-h-[90dvh] w-[calc(100%-2rem)] max-w-5xl flex-col gap-3 overflow-hidden rounded-[28px] border border-white/50 bg-white/75 p-4 shadow-diffuse backdrop-blur-2xl focus:outline-none sm:h-[85dvh] sm:p-6"
          onCloseAutoFocus={(evento) => {
            if (onReturnFocus) { evento.preventDefault(); onReturnFocus(); }
          }}
        >
          <div className="flex min-w-0 shrink-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogPrimitive.Title className="line-clamp-2 break-words text-lg font-semibold text-ink [overflow-wrap:anywhere]">{archivo.nombre}</DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm text-ink-muted">
                {presentacion.tipo} · <time dateTime={archivo.creadoEl}>{presentacion.fecha}</time>
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label="Cerrar visor de imagen"><X size={20} aria-hidden /></Button>
            </DialogPrimitive.Close>
          </div>
          {presentacion.descripcion ? <p className="min-w-0 shrink-0 line-clamp-3 break-words text-sm text-ink-muted [overflow-wrap:anywhere]">{presentacion.descripcion}</p> : null}
          <div className="flex shrink-0 flex-wrap items-center gap-2" role="group" aria-label="Controles de zoom">
            <Button type="button" variant="secondary" size="icon" aria-label="Alejar imagen" disabled={estado !== "visible" || zoom <= ZOOM_MINIMO} onClick={() => setZoom(alejar)}><Minus size={18} aria-hidden /></Button>
            <output className="min-w-14 text-center text-sm tabular-nums text-ink" aria-label="Nivel de zoom" aria-live="polite">{Math.round(zoom * 100)} %</output>
            <Button type="button" variant="secondary" size="icon" aria-label="Acercar imagen" disabled={estado !== "visible" || zoom >= ZOOM_MAXIMO} onClick={() => setZoom(acercar)}><Plus size={18} aria-hidden /></Button>
            <Button type="button" variant="ghost" aria-label="Restablecer zoom" disabled={estado !== "visible"} onClick={reset}><ArrowCounterClockwise size={18} aria-hidden />Restablecer</Button>
            <Button type="button" variant="secondary" className="w-40" disabled={!descargaHabilitada || descarga?.estado === "descargando"} aria-label={`Descargar: ${archivo.nombre}`} onClick={onDownload}>
              {descarga?.estado === "descargando" ? <SpinnerGap size={18} className="animate-spin" aria-hidden /> : <DownloadSimple size={18} aria-hidden />}
              {descarga?.estado === "descargando" ? "Descargando…" : "Descargar"}
            </Button>
          </div>
          {/* Espacio fijo: cambios de descarga no alteran viewport ni scroll/zoom. */}
          <div className="h-12 shrink-0 overflow-auto text-sm">
            {descarga?.estado === "descargando" ? <p role="status" className="text-ink-muted">Descargando…</p> : null}
            {descarga?.estado === "error" ? <p role="alert" className="break-words text-pastel-red-fg">{descarga.mensaje}</p> : null}
          </div>
          <div className="relative min-h-0 min-w-0 flex-1">
            <div
              ref={montarViewport}
              tabIndex={0}
              role="region"
              aria-label="Imagen ampliada; utiliza las flechas del teclado para desplazarte"
              aria-busy={estado === "cargando"}
              className="h-full overflow-auto overscroll-contain [scrollbar-gutter:stable] rounded-xl border border-line bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              {miniatura?.estado === "disponible" && fuente && estado !== "error" ? (
                <ImagenAmpliada
                  key={fuente}
                  archivo={archivo}
                  url={miniatura.url}
                  zoom={zoom}
                  viewport={viewport}
                  visible={estado === "visible"}
                  onLoad={() => registrarCarga("visible")}
                  onError={() => registrarCarga("error")}
                />
              ) : null}
            </div>
            {estado !== "visible" ? (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
                {estado === "cargando" ? <p role="status" className="text-sm text-ink-muted">Cargando imagen…</p> : (
                  <>
                    <p role="alert" className="text-sm text-ink">No pudimos mostrar esta imagen. Intenta nuevamente.</p>
                    <Button type="button" variant="secondary" className="pointer-events-auto" onClick={onRetry}>Reintentar</Button>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}

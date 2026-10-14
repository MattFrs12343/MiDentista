import { etiquetaTipo, necesitaMiniatura } from "./archivosGaleria.ts";
import type { Archivo, EstadoMiniatura } from "./tipos.ts";

export const ZOOM_MINIMO = 1;
export const ZOOM_MAXIMO = 4;
export const PASO_ZOOM = 0.5;

export function limitarZoom(zoom: number): number {
  return Number.isFinite(zoom) ? Math.max(ZOOM_MINIMO, Math.min(ZOOM_MAXIMO, zoom)) : ZOOM_MINIMO;
}

export function acercar(zoom: number): number { return limitarZoom(zoom + PASO_ZOOM); }
export function alejar(zoom: number): number { return limitarZoom(zoom - PASO_ZOOM); }
export function restablecerZoom(): number { return ZOOM_MINIMO; }

export function puedeAbrirImagen(archivo: Pick<Archivo, "mime">): boolean {
  return necesitaMiniatura(archivo);
}

export function altImagen(archivo: Pick<Archivo, "nombre" | "tipoArchivo" | "mime">): string {
  return `${etiquetaTipo(archivo)}: ${archivo.nombre}`;
}

/** El content box excluye bordes y barras; truncar evita desbordes por redondeo. */
export function viewportDesdeContenido(ancho: number, alto: number) {
  const dimension = (valor: number) => Number.isFinite(valor) ? Math.max(0, Math.floor(valor)) : 0;
  return { ancho: dimension(ancho), alto: dimension(alto) };
}

export function dimensionesImagen(
  natural: { ancho: number; alto: number },
  viewport: { ancho: number; alto: number },
  zoom: number,
) {
  if (![natural.ancho, natural.alto, viewport.ancho, viewport.alto].every((valor) => Number.isFinite(valor) && valor > 0)) {
    return { ancho: 0, alto: 0 };
  }
  const ajuste = Math.min(1, viewport.ancho / natural.ancho, viewport.alto / natural.alto);
  return { ancho: natural.ancho * ajuste * limitarZoom(zoom), alto: natural.alto * ajuste * limitarZoom(zoom) };
}

/** Incluye vencimiento para diferenciar reintentos incluso con igual URL firmada. */
export function fuenteImagen(miniatura: EstadoMiniatura | undefined): string | null {
  return miniatura?.estado === "disponible" ? JSON.stringify([miniatura.url, miniatura.venceEn]) : null;
}

export type CargaImagen = { fuente: string; estado: "visible" | "error" };

export function estadoVisor(miniatura: EstadoMiniatura | undefined, carga: CargaImagen | null): "cargando" | "visible" | "error" {
  if (miniatura?.estado === "fallida" || !miniatura) return "error";
  if (miniatura.estado === "pendiente") return "cargando";
  const fuente = fuenteImagen(miniatura);
  return carga?.fuente === fuente ? carga.estado : "cargando";
}

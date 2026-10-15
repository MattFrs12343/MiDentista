import { formatearFechaCorta, hoyEnIso } from "../evolucion/fechasEvolucion.ts";
import type { Archivo, CategoriaArchivo, EstadoMiniatura, UrlsPorId } from "./tipos.ts";

export const VALIDEZ_URL_SEGUNDOS = 300;
export const MARGEN_RENOVACION_MS = 30_000;

/** Criterio común de miniatura y visor de imágenes; excluye expresamente PDF. */
export function necesitaMiniatura(archivo: Pick<Archivo, "mime">): boolean {
  return ["image/jpeg", "image/png", "image/webp"].includes(archivo.mime);
}

export function etiquetaTipo(archivo: Pick<Archivo, "tipoArchivo" | "mime">): string {
  if (archivo.tipoArchivo === "fotografia") return "Fotografía clínica";
  if (archivo.tipoArchivo === "radiografia") return "Radiografía";
  return archivo.mime === "application/pdf" ? "Documento PDF" : "Documento";
}

export function etiquetaCategoria(categoria: CategoriaArchivo): string {
  return { clinico: "Clínico", administrativo: "Administrativo", portal: "Portal" }[categoria];
}

export function prepararPresentacion(archivo: Archivo) {
  return {
    tipo: etiquetaTipo(archivo),
    categoria: etiquetaCategoria(archivo.categoria),
    descripcion: archivo.descripcion.trim(),
    fecha: formatearFechaCorta(hoyEnIso(new Date(archivo.creadoEl))),
    miniatura: necesitaMiniatura(archivo),
  };
}

export function miniaturasPendientes(archivos: readonly Archivo[]): UrlsPorId {
  return Object.fromEntries(archivos.filter(necesitaMiniatura).map((archivo) => [archivo.id, { estado: "pendiente" }]));
}

/** Cada rechazo queda aislado; no cambia ni filtra la lista original. */
export async function resolverMiniaturas(
  archivos: readonly Archivo[],
  firmar: (archivo: Archivo, segundos: number) => Promise<string>,
  ahora: () => number = Date.now,
  alResolver?: (id: string, miniatura: EstadoMiniatura) => void,
): Promise<UrlsPorId> {
  const entradas = await Promise.all(archivos.filter(necesitaMiniatura).map(async (archivo) => {
    // Medir antes de la petición evita sobreestimar la vigencia por latencia.
    const inicio = ahora();
    let miniatura: EstadoMiniatura;
    try {
      const url = await firmar(archivo, VALIDEZ_URL_SEGUNDOS);
      if (!url.trim()) throw new Error("URL firmada vacía.");
      const venceEn = inicio + VALIDEZ_URL_SEGUNDOS * 1000 - MARGEN_RENOVACION_MS;
      if (ahora() >= venceEn) throw new Error("La firma llegó fuera de su vigencia conservadora.");
      miniatura = { estado: "disponible", url, venceEn };
    } catch {
      miniatura = { estado: "fallida" };
    }
    alResolver?.(archivo.id, miniatura);
    return [archivo.id, miniatura] as const;
  }));
  return Object.fromEntries(entradas);
}

export function miniaturaVencida(miniatura: EstadoMiniatura | undefined, ahora: number): boolean {
  return miniatura?.estado === "disponible" && miniatura.venceEn <= ahora;
}

/** Una generación de lectura: caché en memoria y petición compartida por id. */
export function crearGestorUrls(
  archivos: readonly Archivo[],
  firmar: (archivo: Archivo, segundos: number) => Promise<string>,
  alCambiar: (urls: UrlsPorId) => void,
  ahora: () => number = Date.now,
) {
  const porId = new Map(archivos.filter(necesitaMiniatura).map((archivo) => [archivo.id, archivo]));
  const pendientes = new Map<string, Promise<EstadoMiniatura | undefined>>();
  let urls: UrlsPorId = {};
  let activo = true;

  function publicar(id: string, miniatura: EstadoMiniatura) {
    if (!activo) return;
    urls = { ...urls, [id]: miniatura };
    alCambiar(urls);
  }

  function asegurarUrlArchivo(id: string, forzar = false): Promise<EstadoMiniatura | undefined> {
    const archivo = porId.get(id);
    if (!activo || !archivo) return Promise.resolve(undefined);
    const enCurso = pendientes.get(id);
    if (enCurso) return enCurso;
    const actual = urls[id];
    if (!forzar && actual?.estado === "disponible" && !miniaturaVencida(actual, ahora())) {
      return Promise.resolve(actual);
    }
    // Registrar la promesa antes de publicar; la red empieza en una microtarea.
    const peticion = Promise.resolve().then(async () => {
      if (!activo) return undefined;
      const resultado = await resolverMiniaturas([archivo], firmar, ahora);
      if (!activo) return undefined;
      publicar(id, resultado[id]);
      return resultado[id];
    }).finally(() => { pendientes.delete(id); });
    pendientes.set(id, peticion);
    publicar(id, { estado: "pendiente" });
    return peticion;
  }

  return {
    asegurarUrlArchivo,
    invalidar() { activo = false; urls = {}; pendientes.clear(); },
  };
}

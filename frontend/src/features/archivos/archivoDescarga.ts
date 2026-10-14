import { MAX_FILE_SIZE } from "./archivoSeleccion.ts";
import { TIPOS_VISUALIZABLES, type Archivo } from "./tipos.ts";

export type MotivoDescarga = "no_visible" | "no_encontrado" | "sin_permiso" | "red" | "storage" | "invalida";
export const MENSAJES_DESCARGA: Record<MotivoDescarga, string> = {
  no_visible: "Este archivo no está disponible o ya no tienes acceso.",
  no_encontrado: "No pudimos encontrar el archivo para descargar.",
  sin_permiso: "No tienes permiso para descargar este archivo.",
  red: "No pudimos conectar para descargar el archivo. Intenta nuevamente.",
  storage: "No pudimos descargar el archivo. Intenta nuevamente.",
  invalida: "No pudimos obtener un archivo válido para descargar. Intenta nuevamente.",
};

export class ErrorDescargaArchivo extends Error {
  readonly motivo: MotivoDescarga;
  constructor(motivo: MotivoDescarga, causa?: unknown) {
    super(MENSAJES_DESCARGA[motivo], { cause: causa });
    this.name = "ErrorDescargaArchivo";
    this.motivo = motivo;
  }
}

export function errorDescarga(causa: unknown): ErrorDescargaArchivo {
  if (causa instanceof ErrorDescargaArchivo) return causa;
  if (causa && typeof causa === "object") {
    const datos = causa as { status?: unknown; statusCode?: unknown; code?: unknown; name?: unknown; originalError?: unknown };
    const statuses = [Number(datos.status), Number(datos.statusCode)];
    const codes = [String(datos.code), String(datos.statusCode)];
    if (statuses.some((status) => [401, 403].includes(status)) || codes.some((code) => ["42501", "AccessDenied", "Unauthorized", "InvalidJWT"].includes(code))) {
      return new ErrorDescargaArchivo("sin_permiso", causa);
    }
    if (statuses.includes(404) || codes.some((code) => ["NoSuchKey", "NotFound", "ObjectNotFound"].includes(code))) {
      return new ErrorDescargaArchivo("no_encontrado", causa);
    }
    if (datos.name === "TypeError" || ["ETIMEDOUT", "ECONNRESET", "ERR_NETWORK"].includes(String(datos.code))
        || datos.originalError instanceof TypeError) return new ErrorDescargaArchivo("red", causa);
  }
  return new ErrorDescargaArchivo("storage", causa);
}

export function esDescargable(archivo: Pick<Archivo, "mime">): boolean {
  return TIPOS_VISUALIZABLES.some((mime) => mime === archivo.mime);
}

/** Solo cambia la etiqueta de MIME genérico; los bytes no se transforman. */
export function validarBlobDescarga(blob: unknown, archivo: Pick<Archivo, "mime">): Blob {
  if (!(blob instanceof Blob) || blob.size === 0 || blob.size > MAX_FILE_SIZE || !esDescargable(archivo)) {
    throw new ErrorDescargaArchivo("invalida");
  }
  const mime = blob.type.split(";", 1)[0].trim().toLowerCase();
  if (!mime || mime === "application/octet-stream") return blob.slice(0, blob.size, archivo.mime);
  if (mime !== archivo.mime) throw new ErrorDescargaArchivo("invalida");
  return blob;
}

export type ResultadoDescarga = { archivo: Archivo; blob: Blob };
export type EstadoDescarga =
  | { estado: "inactivo" }
  | { estado: "descargando" }
  | { estado: "error"; mensaje: string };
export type DescargasPorId = Record<string, EstadoDescarga>;

type EnlaceTemporal = Pick<HTMLAnchorElement, "href" | "download" | "click" | "remove">;
export type EntornoDescarga = {
  crearUrl: (blob: Blob) => string;
  revocarUrl: (url: string) => void;
  crearEnlace: () => EnlaceTemporal;
  agregarEnlace: (enlace: EnlaceTemporal) => void;
  programar: (cleanup: () => void, milisegundos: number) => void;
};

export const DEMORA_REVOCACION_MS = 60_000;

/** El cleanup pertenece a esta entrega, no al ciclo de vida del componente. */
export function entregarBlob(
  { archivo, blob }: ResultadoDescarga,
  entorno: EntornoDescarga = {
    crearUrl: (datos) => URL.createObjectURL(datos),
    revocarUrl: (url) => URL.revokeObjectURL(url),
    crearEnlace: () => document.createElement("a"),
    agregarEnlace: (enlace) => document.body.appendChild(enlace as HTMLAnchorElement),
    programar: (cleanup, demora) => { setTimeout(cleanup, demora); },
  },
): void {
  let url: string | undefined;
  let enlace: EnlaceTemporal | undefined;
  let activado = false;
  try {
    url = entorno.crearUrl(blob);
    enlace = entorno.crearEnlace();
    enlace.href = url;
    enlace.download = archivo.nombre;
    entorno.agregarEnlace(enlace);
    enlace.click();
    activado = true;
  } finally {
    try { enlace?.remove(); } finally {
      if (url !== undefined) {
        const creada = url;
        if (activado) {
          try { entorno.programar(() => entorno.revocarUrl(creada), DEMORA_REVOCACION_MS); }
          catch { entorno.revocarUrl(creada); }
        } else entorno.revocarUrl(creada);
      }
    }
  }
}

/** Bloqueo síncrono por id y cancelación de una generación de ficha. */
export function crearGestorDescargas(
  pacienteId: string,
  archivos: readonly Archivo[],
  obtener: (id: string, pacienteId: string, signal: AbortSignal) => Promise<ResultadoDescarga>,
  entregar: (resultado: ResultadoDescarga) => void,
  alCambiar: (estados: DescargasPorId) => void,
) {
  const porId = new Map(archivos.map((archivo) => [archivo.id, archivo]));
  const pendientes = new Map<string, AbortController>();
  let activo = true;
  let estados: DescargasPorId = {};
  function publicar(id: string, estado: EstadoDescarga) {
    if (!activo) return;
    estados = { ...estados, [id]: estado };
    alCambiar(estados);
  }
  async function descargar(id: string): Promise<void> {
    if (!activo || pendientes.has(id)) return;
    const archivo = porId.get(id);
    if (!archivo || archivo.pacienteId.toLowerCase() !== pacienteId.toLowerCase() || !esDescargable(archivo)) {
      publicar(id, { estado: "error", mensaje: MENSAJES_DESCARGA.no_visible });
      return;
    }
    const controller = new AbortController();
    pendientes.set(id, controller);
    publicar(id, { estado: "descargando" });
    try {
      const resultado = await obtener(id, pacienteId, controller.signal);
      if (!activo || controller.signal.aborted) return;
      if (resultado.archivo.id !== id || resultado.archivo.pacienteId.toLowerCase() !== pacienteId.toLowerCase()) {
        throw new ErrorDescargaArchivo("no_visible");
      }
      entregar(resultado);
      publicar(id, { estado: "inactivo" });
    } catch (causa) {
      if (activo && !controller.signal.aborted) publicar(id, { estado: "error", mensaje: errorDescarga(causa).message });
    } finally { pendientes.delete(id); }
  }
  return {
    descargar,
    invalidar() {
      activo = false;
      for (const controller of pendientes.values()) controller.abort();
      pendientes.clear();
      estados = {};
    },
  };
}

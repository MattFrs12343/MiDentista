/** Límite local por archivo, alineado con el bucket del módulo 10. */
export const MAX_FILE_SIZE = 10485760;

export const MIME_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const EXTENSIONES_PERMITIDAS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"] as const;

const MIME_POR_EXTENSION: Record<(typeof EXTENSIONES_PERMITIDAS)[number], string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

export const ACCEPT_ARCHIVOS = [...MIME_PERMITIDOS, ...EXTENSIONES_PERMITIDAS].join(",");

export type ResultadoValidacionArchivo =
  | { valido: true; archivo: File }
  | { valido: false; error: string };

/**
 * Acepta FileList o una colección de File sin modificarlos ni leer su contenido.
 * `accept` solo orienta al navegador: tamaño, nombre y formato se validan aquí.
 * El MIME declarado y la extensión no sustituyen la verificación del servidor.
 */
export function validarSeleccionArchivos(archivos: ArrayLike<File>): ResultadoValidacionArchivo {
  if (archivos.length !== 1) {
    return {
      valido: false,
      error: archivos.length === 0 ? "Selecciona un archivo." : "Selecciona un solo archivo a la vez.",
    };
  }

  const archivo = archivos[0];
  if (!archivo || !archivo.name.trim()) {
    return { valido: false, error: "El archivo debe tener un nombre válido." };
  }
  if (!Number.isFinite(archivo.size) || archivo.size <= 0) {
    return { valido: false, error: "El archivo está vacío. Selecciona un archivo con contenido." };
  }
  if (archivo.size > MAX_FILE_SIZE) {
    return { valido: false, error: "El archivo supera el máximo de 10 MiB permitido." };
  }
  if (!archivo.type) {
    return { valido: false, error: "No se pudo identificar el formato del archivo (MIME vacío)." };
  }
  if (!MIME_PERMITIDOS.some((mime) => mime === archivo.type)) {
    return { valido: false, error: "Formato no permitido. Selecciona un archivo JPG, PNG, WEBP o PDF." };
  }

  const nombre = archivo.name.toLowerCase();
  const extension = EXTENSIONES_PERMITIDAS.find((valor) => nombre.endsWith(valor));
  if (!extension) {
    return { valido: false, error: "Extensión no permitida. Usa .jpg, .jpeg, .png, .webp o .pdf." };
  }
  if (MIME_POR_EXTENSION[extension] !== archivo.type) {
    return { valido: false, error: "La extensión del archivo no coincide con su formato MIME." };
  }

  return { valido: true, archivo };
}

/** Restricción de T-10.4 sobre el selector genérico; nunca infiere radiografías. */
export function validarSeleccionImagen(
  archivos: ArrayLike<File>,
  tipoArchivo: unknown,
): ResultadoValidacionArchivo {
  const resultado = validarSeleccionArchivos(archivos);
  if (!resultado.valido) return resultado;
  if (resultado.archivo.type === "application/pdf") {
    return { valido: false, error: "Este formulario solo permite imágenes JPG, PNG o WEBP" };
  }
  if (tipoArchivo !== "fotografia" && tipoArchivo !== "radiografia") {
    return { valido: false, error: "Selecciona Fotografía clínica o Radiografía." };
  }
  return resultado;
}

/** T-10.5: solo PDF; comparte los límites sin validar el contenido binario. */
export function validarSeleccionDocumento(archivos: ArrayLike<File>): ResultadoValidacionArchivo {
  const resultado = validarSeleccionArchivos(archivos);
  if (!resultado.valido) return resultado;
  if (resultado.archivo.type !== "application/pdf") {
    return { valido: false, error: "Este formulario solo permite documentos PDF" };
  }
  return resultado;
}

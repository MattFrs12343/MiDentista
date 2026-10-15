/**
 * Validación del archivo del QR de cobro.
 *
 * Local y mínima a propósito: no se reutiliza `archivos/archivoSeleccion.ts`
 * porque ese módulo valida también documentos PDF y categorías clínicas que
 * no aplican aquí. El QR es siempre una imagen, nada más.
 */

/** Igual al límite del bucket `qr-cobros` (ver docs/modules/09-pagos/sql-qr-cobro.sql). */
export const QR_COBRO_TAMANO_MAXIMO = 2097152;

export const QR_COBRO_MIME_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"] as const;

export const QR_COBRO_ACCEPT = QR_COBRO_MIME_PERMITIDOS.join(",");

export type ResultadoValidacionQr = { valido: true } | { valido: false; error: string };

export function validarQrCobro(archivo: File): ResultadoValidacionQr {
  if (!Number.isFinite(archivo.size) || archivo.size <= 0) {
    return { valido: false, error: "La imagen está vacía. Selecciona un archivo con contenido." };
  }
  if (archivo.size > QR_COBRO_TAMANO_MAXIMO) {
    return { valido: false, error: "La imagen supera el máximo de 2 MiB permitido." };
  }
  if (!QR_COBRO_MIME_PERMITIDOS.some((mime) => mime === archivo.type)) {
    return { valido: false, error: "Formato no permitido. Selecciona una imagen JPG, PNG o WEBP." };
  }
  return { valido: true };
}

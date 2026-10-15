import type { SupabaseClient } from "@supabase/supabase-js";
import { obtenerSupabase } from "../../lib/supabase.ts";
import { esUuid } from "./pagoMapper.ts";
import { validarQrCobro } from "./qrCobroValidacion.ts";

const BUCKET = "qr-cobros";

/** Vigencia corta: es una URL firmada, no se persiste en ningún lado. */
const SEGUNDOS_VALIDEZ = 300;

function exigirUuid(valor: string, campo: string) {
  if (!esUuid(valor)) {
    throw new Error(`${campo} debe ser un UUID real de Supabase; no se admiten IDs de demo.`);
  }
}

function storage(cliente: SupabaseClient) {
  return cliente.storage.from(BUCKET);
}

/**
 * Ruta fija por clínica: no lleva extensión. El `contentType` que se manda al
 * subir decide cómo se sirve, así una subida nueva siempre reemplaza a la
 * anterior (`upsert: true`) sin dejar objetos viejos con otra extensión.
 */
export function rutaQrCobro(clinicaId: string): string {
  return `${clinicaId}/qr`;
}

function esObjetoInexistente(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const mensaje = "message" in error && typeof error.message === "string" ? error.message : "";
  return /not.?found/i.test(mensaje);
}

/**
 * URL firmada del QR vigente de la clínica, o `null` si todavía no subió
 * ninguno. Igual que en `archivoService.ts`, no se persiste la URL: caduca.
 */
export async function obtenerUrlQrCobro(
  clinicaId: string,
  cliente?: SupabaseClient,
): Promise<string | null> {
  exigirUuid(clinicaId, "clinicaId");
  const { data, error } = await storage(cliente ?? obtenerSupabase()).createSignedUrl(
    rutaQrCobro(clinicaId),
    SEGUNDOS_VALIDEZ,
  );
  if (error) {
    if (esObjetoInexistente(error)) return null;
    throw new Error(`No se pudo obtener el QR de cobro: ${error.message}`);
  }
  if (!data?.signedUrl?.trim()) throw new Error("Storage no devolvió una URL firmada válida.");
  return data.signedUrl;
}

/** Sube (o reemplaza) el QR de la clínica y devuelve una URL firmada nueva. */
export async function subirQrCobro(
  clinicaId: string,
  archivo: File,
  cliente?: SupabaseClient,
): Promise<string> {
  exigirUuid(clinicaId, "clinicaId");
  const validacion = validarQrCobro(archivo);
  if (!validacion.valido) throw new Error(validacion.error);

  const supabase = cliente ?? obtenerSupabase();
  const ruta = rutaQrCobro(clinicaId);
  const { error } = await storage(supabase).upload(ruta, archivo, {
    contentType: archivo.type,
    upsert: true,
  });
  if (error) throw new Error(`No se pudo subir el QR de cobro: ${error.message}`);

  const url = await obtenerUrlQrCobro(clinicaId, supabase);
  if (!url) throw new Error("La subida no se confirmó: el QR no apareció en Storage.");
  return url;
}

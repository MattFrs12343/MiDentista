import type { SupabaseClient } from "@supabase/supabase-js";
import { obtenerSupabase } from "../../lib/supabase.ts";
import {
  archivoDesdeFila,
  archivoParaGuardar,
  esUuid,
  rutaEnBucket,
  type ArchivoFila,
} from "./archivoMapper.ts";
import { ORDEN_GALERIA, type Archivo } from "./tipos.ts";

const COLUMNAS =
  "id,clinica_id,paciente_id,nombre,ruta,mime,tamano,categoria,descripcion,subido_por,creado_en";

const BUCKET = "archivos-clinica";

function exigirUuid(valor: string, campo: string) {
  if (!esUuid(valor)) {
    throw new Error(`${campo} debe ser un UUID real de Supabase; no se admiten IDs de demo.`);
  }
}

function tabla(cliente: SupabaseClient) {
  return cliente.schema("public").from("archivos");
}

function storage(cliente: SupabaseClient) {
  return cliente.storage.from(BUCKET);
}

/**
 * Galería de un paciente (US-10.1).
 *
 * Devuelve solo la metadata. Las URLs de Storage **no** se guardan en la base:
 * caducan y hay que pedirlas cada vez. Para mostrarlas, usa `crearUrlArchivo`.
 *
 * Una lista vacia puede deberse a RLS, no a que el paciente no tenga archivos.
 */
export async function cargarArchivos(
  pacienteId: string,
  cliente?: SupabaseClient,
): Promise<Archivo[]> {
  exigirUuid(pacienteId, "pacienteId");
  const { data, error } = await tabla(cliente ?? obtenerSupabase())
    .select(COLUMNAS)
    .eq("paciente_id", pacienteId)
    .order(ORDEN_GALERIA);

  if (error) throw new Error(`No se pudieron cargar los archivos: ${error.message}`);
  if (!data) throw new Error("Supabase no devolvio un resultado de consulta valido.");
  return data.map((fila) => archivoDesdeFila(fila as ArchivoFila));
}

/**
 * Sube un archivo al bucket y registra su metadata (US-10.2).
 *
 * El orden importa: primero se sube el objeto y después se inserta la fila. Si
 * la inserción falla, se elimina el objeto para no dejar archivos huérfanos en el
 * bucket. Al revés —insertar primero— dejaría filas apuntando a objetos que no
 * existen.
 */
export async function subirArchivo(
  archivo: Archivo,
  contenido: File | Blob,
  cliente?: SupabaseClient,
): Promise<Archivo> {
  exigirUuid(archivo.clinicaId, "clinicaId");
  exigirUuid(archivo.pacienteId, "pacienteId");

  const supabase = cliente ?? obtenerSupabase();
  const ruta = archivo.ruta || rutaEnBucket(archivo.clinicaId, archivo.pacienteId, archivo.nombre);

  const { error: errorSubida } = await storage(supabase).upload(ruta, contenido, {
    contentType: archivo.mime,
    upsert: false,
  });
  if (errorSubida) throw new Error(`No se pudo subir el archivo: ${errorSubida.message}`);

  const { data, error } = await tabla(supabase)
    .insert({ ...archivoParaGuardar({ ...archivo, ruta }), ruta })
    .select(COLUMNAS)
    .single();

  if (error) {
    // La metadata fallo: se limpia el objeto para no dejar basura en el bucket.
    await storage(supabase).remove([ruta]);
    throw new Error(`Se subio el archivo pero fallo su registro. Detalle: ${error.message}`);
  }
  if (!data) throw new Error("El archivo no devolvio la fila guardada.");

  return archivoDesdeFila(data as ArchivoFila);
}

/**
 * URL firmada para previsualizar un archivo (US-10.3).
 *
 * Caduca a proposito: las radiografías son datos clínicos y una URL publica
 * permanente seria una fuga. El bucket es privado.
 */
export async function crearUrlArchivo(
  archivo: Archivo,
  segundosValidez = 300,
  cliente?: SupabaseClient,
): Promise<string | null> {
  const { data, error } = await storage(cliente ?? obtenerSupabase()).createSignedUrl(
    archivo.ruta,
    segundosValidez,
  );
  if (error) throw new Error(`No se pudo generar la URL del archivo: ${error.message}`);
  return data?.signedUrl ?? null;
}

/**
 * Borra la fila y el objeto (US-10.4).
 *
 * Primero la fila: si el objeto se borrara primero y la fila fallara, quedaria
 * metadata apuntando al vacio. Los archivos clínicos no se borran sin
 * confirmación de Matías: esto es información de pacientes.
 */
export async function eliminarArchivo(
  archivo: Archivo,
  cliente?: SupabaseClient,
): Promise<boolean> {
  exigirUuid(archivo.id, "id");
  exigirUuid(archivo.clinicaId, "clinicaId");

  const supabase = cliente ?? obtenerSupabase();

  const { error } = await tabla(supabase)
    .delete()
    .eq("id", archivo.id)
    .eq("clinica_id", archivo.clinicaId)
    .eq("paciente_id", archivo.pacienteId);
  if (error) throw new Error(`No se pudo borrar el archivo: ${error.message}`);

  await storage(supabase).remove([archivo.ruta]);
  return true;
}

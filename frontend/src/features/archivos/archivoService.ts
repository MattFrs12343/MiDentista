import type { SupabaseClient } from "@supabase/supabase-js";
import { obtenerSupabase } from "../../lib/supabase.ts";
import {
  archivoDesdeFila,
  esUuid,
  referenciasDesdeAsociacion,
  type ArchivoPayload,
  type ArchivoFila,
} from "./archivoMapper.ts";
import { validarSeleccionDocumento, validarSeleccionImagen } from "./archivoSeleccion.ts";
import { ErrorDescargaArchivo, errorDescarga, esDescargable, validarBlobDescarga, type ResultadoDescarga } from "./archivoDescarga.ts";
import { validarDestinoArchivo } from "./archivoAsociacionService.ts";
import {
  type Archivo, type CategoriaArchivo, type SubidaDocumento,
  type SubidaImagen, type TipoArchivo,
} from "./tipos.ts";

const COLUMNAS =
  "id,clinica_id,paciente_id,nombre,ruta,mime,tamano,categoria,tipo_archivo,descripcion,subido_por,creado_en,evolucion_clinica_id,plan_tratamiento_id";

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
    .order("creado_en", { ascending: false })
    .order("id", { ascending: false });

  if (error) throw new Error(`No se pudieron cargar los archivos: ${error.message}`);
  if (!data) throw new Error("Supabase no devolvio un resultado de consulta valido.");
  return data.map((fila) => archivoDesdeFila(fila as ArchivoFila));
}

/** T-10.8: ruta/nombre confirmados por SELECT; bytes mediante Storage autenticado. */
export async function descargarArchivo(
  archivoId: string,
  pacienteId: string,
  cliente?: SupabaseClient,
  signal?: AbortSignal,
): Promise<ResultadoDescarga> {
  exigirUuid(archivoId, "archivoId");
  exigirUuid(pacienteId, "pacienteId");
  signal?.throwIfAborted();
  try {
    const supabase = cliente ?? obtenerSupabase();
    let consulta = tabla(supabase).select(COLUMNAS).eq("id", archivoId).eq("paciente_id", pacienteId);
    if (signal) consulta = consulta.abortSignal(signal);
    const { data: fila, error: errorConsulta } = await consulta.maybeSingle();
    signal?.throwIfAborted();
    if (errorConsulta) throw errorConsulta;
    if (!fila) throw new ErrorDescargaArchivo("no_visible");
    let archivo: Archivo;
    try { archivo = archivoDesdeFila(fila as ArchivoFila); }
    catch (causa) { throw new ErrorDescargaArchivo("invalida", causa); }
    if (archivo.id.toLowerCase() !== archivoId.toLowerCase()
        || archivo.pacienteId.toLowerCase() !== pacienteId.toLowerCase()) throw new ErrorDescargaArchivo("no_visible");
    if (!esDescargable(archivo)) throw new ErrorDescargaArchivo("invalida");
    const { data, error } = await storage(supabase).download(archivo.ruta, {}, { signal });
    signal?.throwIfAborted();
    if (error) throw error;
    return { archivo, blob: validarBlobDescarga(data, archivo) };
  } catch (causa) {
    if (signal?.aborted) throw causa;
    throw errorDescarga(causa);
  }
}

export type EtapaSubidaArchivo = "validacion" | "autoria" | "subida" | "registro" | "confirmacion" | "limpieza" | "cuota";
export type EtapaSubidaImagen = EtapaSubidaArchivo;
export type EstadoLimpieza = "no_intentada" | "confirmada" | "fallida" | "incierta";

/** Conserva causas y ruta sin convertir una respuesta incierta en éxito. */
export class ErrorSubidaArchivo extends Error {
  readonly etapa: EtapaSubidaArchivo;
  readonly ruta: string | null;
  readonly errorOriginal: unknown;
  readonly errorLimpieza: unknown;
  readonly errorConfirmacion: unknown;
  readonly limpieza: EstadoLimpieza;
  readonly requiereRevision: boolean;
  readonly operacionId: string | null;

  constructor(mensaje: string, datos: {
    etapa: EtapaSubidaArchivo;
    ruta?: string;
    errorOriginal?: unknown;
    errorLimpieza?: unknown;
    errorConfirmacion?: unknown;
    limpieza?: EstadoLimpieza;
    requiereRevision?: boolean;
    operacionId?: string;
  }) {
    super(mensaje, { cause: datos.errorOriginal });
    this.name = "ErrorSubidaArchivo";
    this.etapa = datos.etapa;
    this.ruta = datos.ruta ?? null;
    this.errorOriginal = datos.errorOriginal;
    this.errorLimpieza = datos.errorLimpieza;
    this.errorConfirmacion = datos.errorConfirmacion;
    this.limpieza = datos.limpieza ?? "no_intentada";
    this.requiereRevision = datos.requiereRevision ?? false;
    this.operacionId = datos.operacionId ?? null;
  }
}

// Mismo constructor: conserva instanceof y el contrato de consumidores T-10.4.
export { ErrorSubidaArchivo as ErrorSubidaImagen };

function mensajeDe(causa: unknown): string {
  if (causa && typeof causa === "object" && "message" in causa && typeof causa.message === "string") {
    return causa.message;
  }
  return "Respuesta no confirmada.";
}

function confirmarFila(fila: ArchivoFila, payload: ArchivoPayload): Archivo {
  const archivo = archivoDesdeFila(fila);
  if (archivo.ruta !== payload.ruta || archivo.clinicaId.toLowerCase() !== payload.clinica_id
      || archivo.pacienteId.toLowerCase() !== payload.paciente_id
      || archivo.subidoPor.toLowerCase() !== payload.subido_por
      || archivo.tipoArchivo !== payload.tipo_archivo || archivo.categoria !== payload.categoria
      || archivo.mime !== payload.mime || archivo.tamano !== payload.tamano || archivo.nombre !== payload.nombre) {
    throw new Error("La fila recuperada no corresponde al intento de subida.");
  }
  if (archivo.evolucionClinicaId !== payload.evolucion_clinica_id || archivo.planTratamientoId !== payload.plan_tratamiento_id) {
    throw new Error("La asociación recuperada no corresponde al intento de subida.");
  }
  return archivo;
}

// Repetir el mismo File/destino conserva la clave si la red quedó incierta.
// Solo memoria: nunca persistir File, rutas, JWT ni datos clínicos en localStorage.
const operaciones = new WeakMap<File, Map<string, string>>();

/** T-10.4 sigue aceptando exclusivamente fotografía/radiografía y MIME de imagen. */
export function subirArchivo(datos: SubidaImagen, cliente?: SupabaseClient): Promise<Archivo> {
  return subirValidado({ ...datos }, datos.tipoArchivo, "imagen", cliente);
}

/** T-10.5 fija documento y deriva su categoría del perfil Auth real. */
export function subirDocumento(datos: SubidaDocumento, cliente?: SupabaseClient): Promise<Archivo> {
  return subirValidado({ ...datos }, "documento", "documento", cliente);
}

/** Núcleo PRIVADO: ningún consumidor puede suministrar ruta, MIME o categoría. */
async function subirValidado(
  datos: SubidaDocumento, tipoArchivo: TipoArchivo, flujo: "imagen" | "documento",
  cliente?: SupabaseClient,
): Promise<Archivo> {
  // Capturar valores antes de cualquier await; no aceptar metadatos del cliente.
  const intento = { ...datos };
  let referencias: ReturnType<typeof referenciasDesdeAsociacion>;
  try {
    referencias = referenciasDesdeAsociacion(intento.asociacion);
    exigirUuid(intento.pacienteId, "pacienteId");
    exigirUuid(intento.clinicaId, "clinicaId");
    exigirUuid(intento.subidoPor, "subidoPor");
    const validacion = flujo === "imagen"
      ? validarSeleccionImagen([intento.archivo], tipoArchivo)
      : validarSeleccionDocumento([intento.archivo]);
    if (!validacion.valido) throw new Error(validacion.error);
    if (intento.descripcion !== undefined && typeof intento.descripcion !== "string") {
      throw new Error("La descripción debe ser texto.");
    }
  } catch (causa) {
    throw new ErrorSubidaArchivo(mensajeDe(causa), { etapa: "validacion", errorOriginal: causa });
  }

  let supabase: SupabaseClient;
  let categoria: CategoriaArchivo = "clinico";
  try {
    supabase = cliente ?? obtenerSupabase();
    const { data: usuario, error: errorUsuario } = await supabase.auth.getUser();
    if (errorUsuario) throw errorUsuario;
    if (!usuario.user) throw new Error("No hay un usuario Auth autenticado.");
    const { data: perfil, error } = await supabase.schema("public").from("perfiles")
      .select("id,auth_user_id,activo,rol").eq("id", intento.subidoPor.toLowerCase())
      .eq("auth_user_id", usuario.user.id).eq("activo", true).maybeSingle();
    if (error) throw error;
    if (!perfil || perfil.id !== intento.subidoPor.toLowerCase() || perfil.auth_user_id !== usuario.user.id || perfil.activo !== true) {
      throw new Error("El autor no corresponde a un perfil activo del usuario Auth actual.");
    }
    if (flujo === "documento") {
      if (perfil.rol === "odontologo" || perfil.rol === "odontologo_admin" || perfil.rol === "superadmin") categoria = "clinico";
      else if (perfil.rol === "recepcionista") categoria = "administrativo";
      else throw new Error("La subida de PDF requiere un perfil odontologo o recepcionista, o superadmin activo.");
    }
    if (flujo === "imagen" && perfil.rol === "paciente") categoria = "portal";
    await validarDestinoArchivo(referencias, intento.pacienteId, intento.clinicaId, categoria, perfil.rol, supabase);
  } catch (causa) {
    throw new ErrorSubidaArchivo(mensajeDe(causa), { etapa: "autoria", errorOriginal: causa });
  }

  const datosBackend = { tipo_archivo: tipoArchivo, descripcion: intento.descripcion?.trim() ?? "", ...referencias };
  const clave = JSON.stringify([intento.pacienteId.toLowerCase(), intento.clinicaId.toLowerCase(), intento.subidoPor.toLowerCase(), datosBackend]);
  const porArchivo = operaciones.get(intento.archivo) ?? new Map<string, string>();
  let operacionId: string;
  try { operacionId = porArchivo.get(clave) ?? globalThis.crypto.randomUUID(); }
  catch (causa) { throw new ErrorSubidaArchivo("Utiliza un navegador compatible en un contexto seguro.", { etapa: "validacion", errorOriginal: causa }); }
  porArchivo.set(clave, operacionId);
  operaciones.set(intento.archivo, porArchivo);
  const extension = intento.archivo.type === "image/jpeg" ? "jpg" : intento.archivo.type === "image/png" ? "png"
    : intento.archivo.type === "image/webp" ? "webp" : "pdf";
  const payload: ArchivoPayload = {
    clinica_id: intento.clinicaId.toLowerCase(), paciente_id: intento.pacienteId.toLowerCase(),
    subido_por: intento.subidoPor.toLowerCase(), nombre: intento.archivo.name, mime: intento.archivo.type,
    tamano: intento.archivo.size, categoria, ...datosBackend,
    ruta: `${intento.clinicaId.toLowerCase()}/${intento.pacienteId.toLowerCase()}/${operacionId}.${extension}`,
  };
  const form = new FormData();
  form.set("archivo", intento.archivo);
  form.set("pacienteId", payload.paciente_id);
  form.set("operacionId", operacionId);
  form.set("datos", JSON.stringify(datosBackend));
  try {
    const { data, error } = await supabase.functions.invoke("archivos", { body: form });
    if (error) throw error;
    if (data?.codigo === "CUOTA_EXCEDIDA") {
      throw new ErrorSubidaArchivo("No hay espacio suficiente en el almacenamiento de la clínica.", { etapa: "cuota", operacionId });
    }
    if (data?.codigo && data.requiereRevision === false
        && ["ACCESO_DENEGADO", "ARCHIVO_INVALIDO", "SUBIDA_RECHAZADA"].includes(data.codigo)) {
      porArchivo.delete(clave);
      throw new ErrorSubidaArchivo("El servidor rechazó la subida antes de confirmarla.", { etapa: "subida", operacionId });
    }
    if (!data?.archivo || data.operacionId !== operacionId) throw new Error("Respuesta de subida no confirmada.");
    return confirmarFila(data.archivo as ArchivoFila, payload);
  } catch (causa) {
    if (causa instanceof ErrorSubidaArchivo) throw causa;
    // Consultar la operación durable, no reintentar upload ni borrar objetos.
    try {
      const { data, error } = await supabase.functions.invoke("archivos", { body: { accion: "estado", operacionId } });
      if (!error && data?.estado === "confirmada" && data.archivo) return confirmarFila(data.archivo as ArchivoFila, payload);
    } catch { /* Una consulta fallida no acredita ausencia. */ }
    throw new ErrorSubidaArchivo("Registro no confirmado. Revisa el intento antes de volver a subir el archivo.", {
      etapa: "confirmacion", ruta: payload.ruta, operacionId, errorOriginal: causa, requiereRevision: true,
    });
  }
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
): Promise<string> {
  const { data, error } = await storage(cliente ?? obtenerSupabase()).createSignedUrl(
    archivo.ruta,
    segundosValidez,
  );
  if (error) throw new Error(`No se pudo generar la URL del archivo: ${error.message}`);
  if (!data?.signedUrl?.trim()) throw new Error("Storage no devolvió una URL firmada válida.");
  return data.signedUrl;
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

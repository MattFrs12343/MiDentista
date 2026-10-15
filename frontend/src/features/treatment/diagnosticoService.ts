import type { SupabaseClient } from "@supabase/supabase-js";
import { obtenerSupabase } from "../../lib/supabase.ts";
import { diagnosticoDesdeFila, diagnosticoParaGuardar, esEstadoDiagnostico, exigirUuid } from "./diagnosticoMapper.ts";
import type { ContenidoDiagnostico, DestinoDiagnostico, DiagnosticoPaciente, EstadoDiagnostico, PerfilDiagnosticos } from "./tipos.ts";

const COLUMNAS = "id,paciente_id,clinica_id,odontologo_id,numero_pieza,descripcion,observaciones,estado,fecha_diagnostico,creado_en,actualizado_en";
const tabla = (cliente: SupabaseClient) => cliente.schema("public").from("diagnosticos");

function errorOperacion(accion: string, causa: unknown): Error {
  const codigo = causa && typeof causa === "object" && "code" in causa ? String(causa.code) : "";
  const detalle = codigo === "42501" ? "No tienes permiso para esta operación. Revisa tu sesión y la autoría."
    : codigo === "23514" ? "Los datos no cumplen las validaciones del diagnóstico."
    : codigo === "23503" ? "El paciente o profesional no corresponde a la clínica indicada."
    : codigo === "PGRST116" ? "No se confirmó una fila afectada. El diagnóstico puede no existir o no ser editable por tu sesión."
    : causa instanceof TypeError ? "No se confirmó la respuesta por un fallo de conexión. Recarga antes de repetir una creación."
    : causa instanceof Error ? causa.message
    : causa && typeof causa === "object" && "message" in causa ? String(causa.message)
    : "No se confirmó la respuesta. Comprueba la conexión y recarga antes de repetir una creación.";
  return new Error(`No se pudo ${accion}: ${detalle}`, { cause: causa });
}

function validarDestino(destino: DestinoDiagnostico) {
  exigirUuid(destino.pacienteId, "pacienteId"); exigirUuid(destino.clinicaId, "clinicaId");
  exigirUuid(destino.odontologoId, "odontologoId");
}

function exigirContexto(d: DiagnosticoPaciente, pacienteId: string, clinicaId: string | null, odontologoId?: string, id?: string) {
  if (d.pacienteId !== pacienteId.toLowerCase() || (clinicaId !== null && d.clinicaId !== clinicaId.toLowerCase())
      || (odontologoId && d.odontologoId !== odontologoId.toLowerCase()) || (id && d.id !== id.toLowerCase())) {
    throw new Error("La respuesta no corresponde al diagnóstico, paciente, clínica o autor solicitados.");
  }
}

/** Identidad real de Auth; no usa el perfil cacheado del store ni claves privilegiadas. */
export async function obtenerPerfilDiagnosticos(emailSesion: string, cliente?: SupabaseClient): Promise<PerfilDiagnosticos> {
  const supabase = cliente ?? obtenerSupabase();
  const { data: autenticacion, error: errorAuth } = await supabase.auth.getUser();
  if (errorAuth) throw errorOperacion("verificar la sesión", errorAuth);
  const usuario = autenticacion?.user;
  if (!usuario || !emailSesion || usuario.email?.toLowerCase() !== emailSesion.toLowerCase()) {
    throw new Error("La sesión cambió o venció. Vuelve a abrir la ficha con tu sesión actual.");
  }
  exigirUuid(usuario.id, "usuario Auth");
  const { data, error } = await supabase.schema("public").from("perfiles")
    .select("id,clinica_id,rol,activo").eq("auth_user_id", usuario.id).eq("activo", true).limit(2);
  if (error) throw errorOperacion("consultar el perfil", error);
  if (!Array.isArray(data) || data.length !== 1) throw new Error("No se confirmó un único perfil activo para tu sesión.");
  const perfil = data[0] as Record<string, unknown>;
  exigirUuid(perfil.id, "perfilId");
  if (perfil.clinica_id !== null) exigirUuid(perfil.clinica_id, "clinicaId");
  if (typeof perfil.rol !== "string" || perfil.activo !== true) throw new Error("El perfil de la sesión no es válido o está inactivo.");
  return { id: perfil.id.toLowerCase(), clinicaId: typeof perfil.clinica_id === "string" ? perfil.clinica_id.toLowerCase() : null,
    rol: perfil.rol, activo: true };
}

/** Lista vacía significa sin filas visibles; no autoriza asumir ausencia ni crear. */
export async function listarDiagnosticosPaciente(pacienteId: string, clinicaId: string | null, cliente?: SupabaseClient): Promise<DiagnosticoPaciente[]> {
  exigirUuid(pacienteId, "pacienteId");
  if (clinicaId !== null) exigirUuid(clinicaId, "clinicaId");
  const supabase = cliente ?? obtenerSupabase();
  const diagnosticos: DiagnosticoPaciente[] = [];
  let total: number | null = null;
  // La UI pagina localmente; cargar por rangos evita truncar al límite de la API.
  // El count exacto también detecta un rango vacío/incompleto o cambios de volumen.
  do {
    let consulta = tabla(supabase).select(COLUMNAS, { count: "exact" }).eq("paciente_id", pacienteId);
    if (clinicaId !== null) consulta = consulta.eq("clinica_id", clinicaId);
    let respuesta;
    try { respuesta = await consulta.order("creado_en", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false }).range(diagnosticos.length, diagnosticos.length + 199); }
    catch (causa) { throw errorOperacion("cargar los diagnósticos", causa); }
    const { data, error, count } = respuesta;
    if (error) throw errorOperacion("cargar los diagnósticos", error);
    if (!Array.isArray(data) || count === null || !Number.isSafeInteger(count) || count < 0) {
      throw new Error("Supabase no confirmó la consulta y el total de diagnósticos.");
    }
    if (total !== null && total !== count) throw new Error("La lista cambió durante la carga. Reintenta para obtener los diagnósticos actuales.");
    total = count;
    if (data.length > 200 || diagnosticos.length + data.length > total || (data.length === 0 && diagnosticos.length < total)) {
      throw new Error("No se confirmó la lista completa de diagnósticos. Reintenta la carga.");
    }
    const recibidos = data.map(diagnosticoDesdeFila);
    for (const d of recibidos) exigirContexto(d, pacienteId, clinicaId);
    diagnosticos.push(...recibidos);
    if (new Set(diagnosticos.map((d) => d.id)).size !== diagnosticos.length) throw new Error("Supabase devolvió diagnósticos duplicados.");
  } while (diagnosticos.length < total);
  return diagnosticos;
}

async function confirmarEscritura(
  consulta: PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>,
  destino: DestinoDiagnostico, accion: string, id?: string,
): Promise<DiagnosticoPaciente> {
  let respuesta;
  try { respuesta = await consulta; }
  catch (causa) { throw errorOperacion(accion, causa); }
  if (respuesta.error) throw errorOperacion(accion, respuesta.error);
  if (!respuesta.data) throw new Error("No se confirmó una fila guardada. Revisa permisos, sesión y autoría antes de reintentar.");
  const diagnostico = diagnosticoDesdeFila(respuesta.data);
  exigirContexto(diagnostico, destino.pacienteId, destino.clinicaId, destino.odontologoId, id);
  if (!diagnostico.actualizadoEn) throw new Error("No se confirmó la fecha de actualización del diagnóstico guardado.");
  return diagnostico;
}

export async function crearDiagnostico(destino: DestinoDiagnostico, datos: ContenidoDiagnostico, cliente?: SupabaseClient): Promise<DiagnosticoPaciente> {
  validarDestino(destino);
  const contenido = diagnosticoParaGuardar(datos);
  const diagnostico = await confirmarEscritura(tabla(cliente ?? obtenerSupabase()).insert({ ...contenido,
    paciente_id: destino.pacienteId, clinica_id: destino.clinicaId, odontologo_id: destino.odontologoId }).select(COLUMNAS).single(), destino, "crear el diagnóstico");
  if (diagnostico.estado !== "activo") throw new Error("El diagnóstico creado no confirmó su estado inicial activo.");
  if (!diagnostico.creadoEn) throw new Error("No se confirmó la fecha de creación del diagnóstico.");
  confirmarContenido(diagnostico, contenido);
  return diagnostico;
}

function confirmarContenido(d: DiagnosticoPaciente, contenido: ReturnType<typeof diagnosticoParaGuardar>) {
  if (d.descripcion !== contenido.descripcion || d.numeroPieza !== contenido.numero_pieza || d.observaciones !== contenido.observaciones) {
    throw new Error("La respuesta no confirmó el contenido enviado. Recarga antes de repetir la operación.");
  }
}

export async function actualizarDiagnostico(id: string, destino: DestinoDiagnostico, datos: ContenidoDiagnostico, cliente?: SupabaseClient): Promise<DiagnosticoPaciente> {
  exigirUuid(id, "diagnosticoId"); validarDestino(destino);
  const contenido = diagnosticoParaGuardar(datos);
  const diagnostico = await confirmarEscritura(tabla(cliente ?? obtenerSupabase()).update(contenido)
    .eq("id", id).eq("paciente_id", destino.pacienteId).eq("clinica_id", destino.clinicaId)
    .eq("odontologo_id", destino.odontologoId).select(COLUMNAS).single(), destino, "actualizar el diagnóstico", id);
  confirmarContenido(diagnostico, contenido);
  return diagnostico;
}

export async function cambiarEstadoDiagnostico(id: string, destino: DestinoDiagnostico, estado: EstadoDiagnostico, cliente?: SupabaseClient): Promise<DiagnosticoPaciente> {
  exigirUuid(id, "diagnosticoId"); validarDestino(destino);
  if (!esEstadoDiagnostico(estado)) throw new Error("El estado debe ser activo, inactivo o resuelto.");
  const diagnostico = await confirmarEscritura(tabla(cliente ?? obtenerSupabase()).update({ estado })
    .eq("id", id).eq("paciente_id", destino.pacienteId).eq("clinica_id", destino.clinicaId)
    .eq("odontologo_id", destino.odontologoId).select(COLUMNAS).single(), destino, "cambiar el estado", id);
  if (diagnostico.estado !== estado) throw new Error("Supabase no confirmó el estado solicitado.");
  return diagnostico;
}

// Desplegar únicamente tras migracion-ciclo-4.sql. Sin eliminación de objetos.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { BUCKET_ARCHIVOS, MAX_ARCHIVO, UUID, exigirAlcance, exigirAuditor, validarContenido,
  type DatosArchivo, type PerfilReal, type PacienteReal } from "./contrato.ts";
import { ejecutarSubida, type Intento, type Operacion } from "./flujoSubida.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (datos: unknown, status = 200) => new Response(JSON.stringify(datos), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function rpc<T>(nombre: string, parametros: Record<string, unknown>): Promise<T> {
  const { data, error } = await admin.rpc(nombre, parametros);
  if (error) throw error;
  if (data === null || data === undefined) throw new Error("RESPUESTA_SQL_INCIERTA");
  return data as T;
}

/** Limita el cuerpo real incluso sin Content-Length; no reservar memoria ilimitada. */
async function cuerpoAcotado(req: Request): Promise<Uint8Array<ArrayBuffer>> {
  const max = MAX_ARCHIVO + 65_536;
  if (Number(req.headers.get("content-length")) > max || !req.body) throw new Error("ARCHIVO_INVALIDO");
  const lector = req.body.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await lector.read();
      if (done) break;
      total += value.length;
      if (total > max) { await lector.cancel(); throw new Error("ARCHIVO_INVALIDO"); }
      partes.push(value);
    }
  } finally { lector.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const parte of partes) { bytes.set(parte, offset); offset += parte.length; }
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ codigo: "METODO_INVALIDO", requiereRevision: false }, 405);
  try {
    const authorization = req.headers.get("Authorization") ?? "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    const { data: identidad, error: errorAuth } = await admin.auth.getUser(token);
    if (errorAuth || !identidad.user) return json({ codigo: "ACCESO_DENEGADO", requiereRevision: false }, 401);
    // Cliente del JWT: las consultas clínicas NO utilizan service_role.
    const usuario = createClient(url, anon, { global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false } });
    const { data: perfil, error: errorPerfil } = await usuario.from("perfiles")
      .select("id,auth_user_id,clinica_id,rol,activo").eq("auth_user_id", identidad.user.id).eq("activo", true).single();
    if (errorPerfil || !perfil || perfil.auth_user_id !== identidad.user.id) return json({ codigo: "ACCESO_DENEGADO", requiereRevision: false }, 403);
    const real = perfil as PerfilReal;
    if (!req.headers.get("content-type")?.startsWith("multipart/form-data")) {
      const contenido = await cuerpoAcotado(req);
      if (contenido.length > 4096) throw new Error("ARCHIVO_INVALIDO");
      const body = JSON.parse(new TextDecoder().decode(contenido));
      if (body.accion === "auditar") {
        exigirAuditor(real);
        if (body.clinicaId !== undefined && !UUID.test(body.clinicaId)) throw new Error("ARCHIVO_INVALIDO");
        const { data, error } = await usuario.rpc("archivos_c4_auditar", { p_clinica: body.clinicaId ?? null });
        if (error || !data) return json({ estado: "indeterminado", candidatos: [], fecha: new Date().toISOString(), fuente: "catalogo_storage" });
        return json(data);
      }
      if (body.accion === "estado" && UUID.test(body.operacionId)) {
        const { data, error } = await usuario.rpc("archivos_c4_estado", { p_operacion: body.operacionId });
        if (error || !data) return json({ codigo: "ACCESO_DENEGADO", requiereRevision: false }, 403);
        // La fila final se obtiene con RLS del usuario, no con admin.
        if (data.estado === "confirmada" && data.archivo_id) {
          const { data: archivo, error: errorFila } = await usuario.from("archivos").select("*").eq("id", data.archivo_id).single();
          if (!errorFila && archivo) return json({ ...data, archivo });
        }
        return json(data);
      }
      throw new Error("ARCHIVO_INVALIDO");
    }
    const cuerpo = await cuerpoAcotado(req);
    const form = await new Response(cuerpo, { headers: { "Content-Type": req.headers.get("content-type")! } }).formData();
    const file = form.get("archivo");
    const operacion = String(form.get("operacionId") ?? "").toLowerCase();
    const pacienteId = String(form.get("pacienteId") ?? "").toLowerCase();
    const info = JSON.parse(String(form.get("datos") ?? "null"));
    if (!(file instanceof File) || !UUID.test(operacion) || !UUID.test(pacienteId)
        || !info || typeof info !== "object" || typeof info.descripcion !== "string"
        || typeof info.tipo_archivo !== "string"
        || ![null, "string"].includes(info.evolucion_clinica_id === null ? null : typeof info.evolucion_clinica_id)
        || ![null, "string"].includes(info.plan_tratamiento_id === null ? null : typeof info.plan_tratamiento_id)) throw new Error("ARCHIVO_INVALIDO");
    const datos: DatosArchivo = { nombre: file.name, mime: file.type, tipo_archivo: info.tipo_archivo,
      descripcion: info.descripcion.trim(), evolucion_clinica_id: info.evolucion_clinica_id?.toLowerCase() ?? null,
      plan_tratamiento_id: info.plan_tratamiento_id?.toLowerCase() ?? null };
    const bytes = new Uint8Array(await file.arrayBuffer());
    validarContenido(bytes, datos);
    const { data: paciente, error: errorPaciente } = await usuario.from("pacientes").select("id,clinica_id,perfil_id").eq("id", pacienteId).single();
    if (errorPaciente || !paciente) return json({ codigo: "ACCESO_DENEGADO", requiereRevision: false }, 403);
    exigirAlcance(real, paciente as PacienteReal, datos);

    const validarAsociacion = async () => {
      if (!datos.evolucion_clinica_id && !datos.plan_tratamiento_id) return;
      const { data, error } = await usuario.rpc("archivos_asociacion_autorizada", {
        p_evolucion: datos.evolucion_clinica_id, p_plan: datos.plan_tratamiento_id,
        p_paciente: pacienteId, p_clinica: paciente.clinica_id,
        p_categoria: real.rol === "paciente" ? "portal" : "clinico",
      });
      if (error || data !== true) throw new Error("ACCESO_DENEGADO");
    };
    await validarAsociacion();
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (b) => b.toString(16).padStart(2,"0")).join("");
    const intento: Intento = { actor: identidad.user.id, paciente: pacienteId, operacion, bytes, sha256: hash, datos };
    const params = { p_actor: intento.actor, p_operacion: operacion };
    const resultado = await ejecutarSubida(intento, {
      reservar: () => rpc<Operacion>("archivos_c4_reservar", { ...params, p_paciente: pacienteId,
        p_bytes: bytes.length, p_sha256: hash, p_datos: datos }),
      iniciar: () => rpc<boolean>("archivos_c4_iniciar", params),
      subir: async (ruta) => {
        const { data, error } = await admin.storage.from(BUCKET_ARCHIVOS).upload(ruta, bytes, { contentType: datos.mime, upsert: false });
        if (error) throw error;
        if (!data || data.path !== ruta) throw new Error("UPLOAD_INCIERTO");
      },
      confirmar: async () => {
        await validarAsociacion();
        return rpc<Record<string, unknown>>("archivos_c4_confirmar", params);
      },
      rechazoDefinitivo: (_intento, status) => rpc<boolean>("archivos_c4_rechazo_storage", { ...params, p_status: status }),
      marcarIncierta: async () => {
        const { error } = await admin.rpc("archivos_c4_marcar_incierta", params);
        if (error) throw error;
      },
    });
    // Errores de negocio en JSON 200 para no perder su código en functions.invoke.
    return json(resultado);
  } catch (error) {
    const codigo = error instanceof Error && ["ACCESO_DENEGADO", "AUDITORIA_DENEGADA"].includes(error.message)
      ? "ACCESO_DENEGADO" : "ARCHIVO_INVALIDO";
    return json({ codigo, requiereRevision: false }, codigo === "ACCESO_DENEGADO" ? 403 : 400);
  }
});

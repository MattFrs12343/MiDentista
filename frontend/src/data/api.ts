import type { Session } from "@supabase/supabase-js";
import type { Role, Sesion } from "@/types";
import { obtenerSupabase } from "@/lib/supabase";

/** Base de la Edge Function que concentra las acciones privilegiadas
 * (login con bloqueo, invitar/gestionar personal) que no pueden resolverse
 * con una política de RLS porque requieren la service_role key. */
const FUNCIONES_URL = `${import.meta.env?.VITE_SUPABASE_URL?.trim()}/functions/v1/api`;

export interface Clinica {
  id: string;
  nombre: string;
  slug: string;
  ciudad: string | null;
  pais: string | null;
  email: string | null;
  telefono: string | null;
}

/** Fila de la tabla "Personal" del panel de administración. El superadmin no
 * pertenece a ninguna clínica (solo audita el sistema), así que para esas
 * filas clinica/clinicaSlug vienen null. */
export interface PerfilAdmin {
  id: string;
  email: string;
  nombre: string;
  rol: Role;
  especialidad: string | null;
  activo: boolean;
  invitacionPendiente: boolean;
  clinica: string | null;
  clinicaSlug: string | null;
}

export class ApiError extends Error {
  readonly estado: number;

  constructor(message: string, estado: number) {
    super(message);
    this.name = "ApiError";
    this.estado = estado;
  }
}

export async function listarClinicas(): Promise<Clinica[]> {
  const supabase = obtenerSupabase();
  const { data, error } = await supabase
    .from("clinicas")
    .select("id, nombre, slug, ciudad, pais, email, telefono")
    .eq("activo", true)
    .order("nombre");

  if (error) throw new ApiError("No se pudieron leer las clínicas", 503);
  return (data ?? []) as Clinica[];
}

// ----------------------------------------------------------------------------
// Edge Function "api": login con bloqueo por intentos, y gestión de personal
// (invitar/reenviar/cancelar/cambiar contraseña), todo lo que necesita la
// service_role key y por eso no puede resolverse con una política de RLS.
// ----------------------------------------------------------------------------

async function llamarFuncion<T>(
  ruta: string,
  body?: unknown,
  accessToken?: string,
  method: "POST" | "GET" = "POST",
): Promise<T> {
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const init: RequestInit = { method, headers };
  if (method !== "GET") {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body ?? {});
  }

  const resp = await fetch(`${FUNCIONES_URL}/${ruta}`, init);
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new ApiError((data as { error?: string })?.error || "No se pudo completar la acción", resp.status);
  }
  return data as T;
}

/** Access token de la sesión actual, requerido para las rutas protegidas. */
async function tokenDeSesion(): Promise<string> {
  const {
    data: { session },
  } = await obtenerSupabase().auth.getSession();
  if (!session?.access_token) throw new ApiError("No se pudo identificar tu sesión", 401);
  return session.access_token;
}

interface RespuestaLogin {
  email: string;
  nombre: string;
  rol: Role;
  especialidad: string | null;
  // null para superadmin: no pertenece a ninguna clínica, solo audita el sistema.
  clinica: string | null;
  clinicaSlug: string | null;
  ciudad: string | null;
  session: Session;
}

export async function iniciarSesionApi(correo: string, clave: string): Promise<{ sesion: Sesion; session: Session }> {
  const data = await llamarFuncion<RespuestaLogin>("login", { correo, clave });
  return {
    sesion: {
      nombre: data.nombre,
      rol: data.rol,
      clinica: data.clinica,
      clinicaSlug: data.clinicaSlug,
      ciudad: data.ciudad,
      email: data.email,
      especialidad: data.especialidad,
    },
    session: data.session,
  };
}

export async function cambiarContrasenaPropiaApi(claveActual: string, claveNueva: string): Promise<void> {
  const token = await tokenDeSesion();
  await llamarFuncion("cambiar-contrasena-propia", { claveActual, claveNueva }, token);
}

export async function listarPersonalApi(): Promise<PerfilAdmin[]> {
  const token = await tokenDeSesion();
  return llamarFuncion<PerfilAdmin[]>("admin/listar", undefined, token, "GET");
}

export async function invitarPersonalApi(datos: {
  email: string;
  nombreCompleto: string;
  rol: Role;
  /** Obligatoria salvo para rol "superadmin", que no pertenece a ninguna clínica. */
  clinicaId?: string;
  especialidad?: string;
}): Promise<void> {
  const token = await tokenDeSesion();
  await llamarFuncion("admin/invitar", datos, token);
}

export async function reenviarInvitacionApi(perfilId: string): Promise<void> {
  const token = await tokenDeSesion();
  await llamarFuncion("admin/reenviar-invitacion", { perfilId }, token);
}

export async function cancelarInvitacionApi(perfilId: string): Promise<void> {
  const token = await tokenDeSesion();
  await llamarFuncion("admin/cancelar-invitacion", { perfilId }, token);
}

/** El superadmin nunca escribe la contraseña nueva de otra persona: esto
 * dispara el mismo correo de "recuperar contraseña" del login, y el usuario
 * elige su propia contraseña nueva desde ahí. */
export async function restablecerContrasenaPersonalApi(perfilId: string): Promise<void> {
  const token = await tokenDeSesion();
  await llamarFuncion("admin/restablecer-contrasena", { perfilId }, token);
}

/** Pasa por la Edge Function (no un UPDATE de RLS directo) para que el
 * servidor pueda rechazar que un superadmin se elimine a sí mismo. */
export async function eliminarPersonalApi(perfilId: string): Promise<void> {
  const token = await tokenDeSesion();
  await llamarFuncion("admin/eliminar", { perfilId }, token);
}

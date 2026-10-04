import type { Session } from "@supabase/supabase-js";
import type { Role, Sesion, CondicionPieza } from "@/types";
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
  direccion: string | null;
  /** Coordenadas para el cálculo de cercanía (radio 5 km, US-1.7/T-1.14). */
  latitud: number | null;
  longitud: number | null;
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
    .select("id, nombre, slug, ciudad, pais, email, telefono, direccion, latitud, longitud")
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

// ----------------------------------------------------------------------------
// Portal del paciente (módulo 01)
//
// El paciente entra con Google. Al primer ingreso la Edge Function crea su
// perfil (`paciente/registrar`); la afiliación a una clínica la hace la función
// SECURITY DEFINER `afiliar_paciente`; y todas las lecturas clínicas vienen de
// `paciente/mi-ficha`, acotadas a su propia fila (no se usa RLS clínico, que es
// por clínica y expondría a los demás pacientes).
// ----------------------------------------------------------------------------

export interface DatosAfiliacion {
  nombreCompleto: string;
  nombres?: string;
  apellidos?: string;
  ci?: string;
  fechaNacimiento?: string;
  genero?: string;
  telefono?: string;
  direccion?: string;
  contactoEmergenciaNombre?: string;
  contactoEmergenciaTelefono?: string;
  contactoEmergenciaParentesco?: string;
}

export interface ClinicaResumen {
  id: string;
  nombre: string;
  slug: string;
  ciudad: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
}

export interface PacientePortal {
  id: string;
  ci: string | null;
  nombreCompleto: string;
  nombres: string | null;
  apellidos: string | null;
  fechaNacimiento: string | null;
  genero: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  contactoEmergenciaNombre: string | null;
  contactoEmergenciaTelefono: string | null;
  contactoEmergenciaParentesco: string | null;
}

export interface HistoriaPortal {
  motivoConsulta: string | null;
  antecedentesMedicos: string | null;
  antecedentesFamiliares: string | null;
  antecedentesOdontologicos: string | null;
  alergias: string | null;
  medicamentos: string | null;
  enfermedades: string | null;
  habitos: string | null;
  observaciones: string | null;
  actualizadoEl: string | null;
}

export interface OdontogramaPortal {
  id: string;
  fechaExamen: string | null;
  piezas: CondicionPieza[];
  notas: string | null;
  actualizadoEl: string | null;
}

export interface DiagnosticoPortal {
  id: string;
  descripcion: string;
  numeroPieza: number | null;
  estado: string;
  fechaDiagnostico: string | null;
}

export interface ItemPlanPortal {
  id: string;
  descripcion: string;
  numeroPieza: number | null;
  costo: number;
  estado: string;
  prioridad: string;
}

export interface PlanPortal {
  id: string;
  titulo: string | null;
  estado: string;
  costoTotal: number;
  notas: string | null;
  creadoEl: string | null;
  items: ItemPlanPortal[];
}

export interface EvolucionPortal {
  id: string;
  fechaConsulta: string | null;
  motivoConsulta: string | null;
  procedimientoRealizado: string | null;
  observaciones: string | null;
  indicaciones: string | null;
  proximaAtencion: string | null;
  numeroPieza: number | null;
}

export interface CitaPortal {
  id: string;
  fechaCita: string;
  horaInicio: string;
  horaFin: string;
  estado: string;
  motivoConsulta: string | null;
  notas: string | null;
}

export interface PresupuestoPortal {
  id: string;
  titulo: string | null;
  total: number;
  descuento: number;
  estado: string;
  validoHasta: string | null;
  creadoEl: string | null;
}

export interface PagoPortal {
  id: string;
  monto: number;
  metodoPago: string;
  fechaPago: string;
  estado: string;
  codigoReferencia: string | null;
  notas: string | null;
}

export interface FichaPaciente {
  /** true cuando todavía no se afilió a ninguna clínica. */
  sinClinica: boolean;
  perfil: { nombre: string; email: string | null; telefono: string | null; avatarUrl: string | null };
  clinica: ClinicaResumen | null;
  paciente: PacientePortal | null;
  historia: HistoriaPortal | null;
  odontograma: OdontogramaPortal | null;
  diagnosticos: DiagnosticoPortal[];
  planes: PlanPortal[];
  evoluciones: EvolucionPortal[];
  citas: CitaPortal[];
  presupuestos: PresupuestoPortal[];
  pagos: PagoPortal[];
  resumen: { totalPagado: number; saldoPendiente: number };
}

interface RawMiFicha {
  perfil: { nombre: string; email: string | null; telefono: string | null; avatarUrl: string | null };
  clinica: ClinicaResumen | null;
  paciente: {
    id: string;
    ci: string | null;
    nombre_completo: string;
    nombres: string | null;
    apellidos: string | null;
    fecha_nacimiento: string | null;
    genero: string | null;
    telefono: string | null;
    email: string | null;
    direccion: string | null;
    contacto_emergencia_nombre: string | null;
    contacto_emergencia_telefono: string | null;
    contacto_emergencia_parentesco: string | null;
  } | null;
  historia: Record<string, string | null> | null;
  odontograma: { id: string; fecha_examen: string | null; piezas: unknown[]; notas: string | null; actualizado_en: string | null } | null;
  diagnosticos: Array<{ id: string; descripcion: string; numero_pieza: number | null; estado: string; fecha_diagnostico: string | null }>;
  planes: Array<{
    id: string;
    titulo: string | null;
    estado: string;
    costo_total: number | null;
    notas: string | null;
    creado_en: string | null;
    items: Array<{ id: string; descripcion: string; numero_pieza: number | null; costo: number | null; estado: string; prioridad: string }>;
  }>;
  evoluciones: Array<{
    id: string;
    fecha_consulta: string | null;
    motivo_consulta: string | null;
    procedimiento_realizado: string | null;
    observaciones: string | null;
    indicaciones: string | null;
    proxima_atencion: string | null;
    numero_pieza: number | null;
  }>;
  citas: Array<{ id: string; fecha_cita: string; hora_inicio: string; hora_fin: string; estado: string; motivo_consulta: string | null; notas: string | null }>;
  presupuestos: Array<{ id: string; titulo: string | null; total: number | null; descuento: number | null; estado: string; valido_hasta: string | null; creado_en: string | null }>;
  pagos: Array<{ id: string; monto: number; metodo_pago: string; fecha_pago: string; estado: string; codigo_referencia: string | null; notas: string | null }>;
  resumen: { totalPagado: number; saldoPendiente: number };
}

/** Da de alta el perfil de paciente ligado a la cuenta de Google. */
export async function registrarPacientePortalApi(datos: { nombreCompleto: string; telefono?: string }): Promise<void> {
  const token = await tokenDeSesion();
  await llamarFuncion("paciente/registrar", datos, token);
}

/** Afiliación a una clínica. Va por RPC a la función SECURITY DEFINER
 * `afiliar_paciente`, que solo deja tocar la propia fila del paciente. */
export async function afiliarPacientePortalApi(clinicaId: string, datos: DatosAfiliacion): Promise<void> {
  const supabase = obtenerSupabase();
  const { error } = await supabase.rpc("afiliar_paciente", {
    p_clinica_id: clinicaId,
    p_datos: datos,
  });
  if (error) throw new ApiError(error.message || "No se pudo completar la afiliación", 503);
}

/** El JSONB `piezas` puede traer basura de bases viejas: se filtra igual que en
 * `data/store.tsx` antes de exponerlo. */
function piezasValidas(piezas: unknown): CondicionPieza[] {
  if (!Array.isArray(piezas)) return [];
  return piezas.filter((p): p is CondicionPieza => {
    if (typeof p !== "object" || p === null) return false;
    const fila = p as Record<string, unknown>;
    return typeof fila.pieza === "number" && typeof fila.condicion === "string";
  });
}

function mapearHistoria(raw: Record<string, string | null> | null): HistoriaPortal | null {
  if (!raw) return null;
  return {
    motivoConsulta: raw.motivo_consulta ?? null,
    antecedentesMedicos: raw.antecedentes_medicos ?? null,
    antecedentesFamiliares: raw.antecedentes_familiares ?? null,
    antecedentesOdontologicos: raw.antecedentes_odontologicos ?? null,
    alergias: raw.alergias ?? null,
    medicamentos: raw.medicamentos ?? null,
    enfermedades: raw.enfermedades ?? null,
    habitos: raw.habitos ?? null,
    observaciones: raw.observaciones ?? null,
    actualizadoEl: raw.actualizado_en ?? null,
  };
}

function mapearFicha(raw: RawMiFicha): FichaPaciente {
  return {
    sinClinica: raw.paciente === null,
    perfil: raw.perfil,
    clinica: raw.clinica,
    paciente: raw.paciente
      ? {
          id: raw.paciente.id,
          ci: raw.paciente.ci,
          nombreCompleto: raw.paciente.nombre_completo,
          nombres: raw.paciente.nombres,
          apellidos: raw.paciente.apellidos,
          fechaNacimiento: raw.paciente.fecha_nacimiento,
          genero: raw.paciente.genero,
          telefono: raw.paciente.telefono,
          email: raw.paciente.email,
          direccion: raw.paciente.direccion,
          contactoEmergenciaNombre: raw.paciente.contacto_emergencia_nombre,
          contactoEmergenciaTelefono: raw.paciente.contacto_emergencia_telefono,
          contactoEmergenciaParentesco: raw.paciente.contacto_emergencia_parentesco,
        }
      : null,
    historia: mapearHistoria(raw.historia),
    odontograma: raw.odontograma
      ? {
          id: raw.odontograma.id,
          fechaExamen: raw.odontograma.fecha_examen,
          piezas: piezasValidas(raw.odontograma.piezas),
          notas: raw.odontograma.notas,
          actualizadoEl: raw.odontograma.actualizado_en,
        }
      : null,
    diagnosticos: (raw.diagnosticos ?? []).map((d) => ({
      id: d.id,
      descripcion: d.descripcion,
      numeroPieza: d.numero_pieza,
      estado: d.estado,
      fechaDiagnostico: d.fecha_diagnostico,
    })),
    planes: (raw.planes ?? []).map((p) => ({
      id: p.id,
      titulo: p.titulo,
      estado: p.estado,
      costoTotal: Number(p.costo_total ?? 0),
      notas: p.notas,
      creadoEl: p.creado_en,
      items: (p.items ?? []).map((i) => ({
        id: i.id,
        descripcion: i.descripcion,
        numeroPieza: i.numero_pieza,
        costo: Number(i.costo ?? 0),
        estado: i.estado,
        prioridad: i.prioridad,
      })),
    })),
    evoluciones: (raw.evoluciones ?? []).map((e) => ({
      id: e.id,
      fechaConsulta: e.fecha_consulta,
      motivoConsulta: e.motivo_consulta,
      procedimientoRealizado: e.procedimiento_realizado,
      observaciones: e.observaciones,
      indicaciones: e.indicaciones,
      proximaAtencion: e.proxima_atencion,
      numeroPieza: e.numero_pieza,
    })),
    citas: (raw.citas ?? []).map((c) => ({
      id: c.id,
      fechaCita: c.fecha_cita,
      horaInicio: c.hora_inicio,
      horaFin: c.hora_fin,
      estado: c.estado,
      motivoConsulta: c.motivo_consulta,
      notas: c.notas,
    })),
    presupuestos: (raw.presupuestos ?? []).map((p) => ({
      id: p.id,
      titulo: p.titulo,
      total: Number(p.total ?? 0),
      descuento: Number(p.descuento ?? 0),
      estado: p.estado,
      validoHasta: p.valido_hasta,
      creadoEl: p.creado_en,
    })),
    pagos: (raw.pagos ?? []).map((p) => ({
      id: p.id,
      monto: Number(p.monto ?? 0),
      metodoPago: p.metodo_pago,
      fechaPago: p.fecha_pago,
      estado: p.estado,
      codigoReferencia: p.codigo_referencia,
      notas: p.notas,
    })),
    resumen: raw.resumen,
  };
}

/** Ficha del paciente autenticado (o el estado "sin clínica" para el
 * onboarding). Lecturas acotadas al propio paciente. */
export async function miFichaPacienteApi(): Promise<FichaPaciente> {
  const token = await tokenDeSesion();
  const raw = await llamarFuncion<RawMiFicha>("paciente/mi-ficha", undefined, token, "GET");
  return mapearFicha(raw);
}

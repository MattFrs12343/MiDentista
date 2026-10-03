import type {
  Role,
  Paciente,
  HistoriaClinica,
  Alergia,
  CondicionPieza,
  Diagnostico,
  PlanTratamiento,
  ItemTratamiento,
  Cita,
  Horario,
} from "@/types";

export interface Clinica {
  id: string;
  nombre: string;
  slug: string;
  ciudad: string | null;
  pais: string | null;
  email: string | null;
  telefono: string | null;
}

/** Cuenta de personal resuelta desde la BD, ya con su clínica asociada. */
export interface Cuenta {
  email: string;
  nombre: string;
  rol: Role;
  especialidad: string | null;
  clinica: string;
  clinicaSlug: string;
  ciudad: string | null;
}

export class ApiError extends Error {
  readonly estado: number;

  constructor(message: string, estado: number) {
    super(message);
    this.name = "ApiError";
    this.estado = estado;
  }
}

// En local, "/api" alcanza porque nginx hace de proxy hacia la API (mismo
// origen). En un hosting estático sin ese proxy (p. ej. HostGator) hace
// falta la URL completa de la API, configurada en build time.
const API_BASE = import.meta.env?.VITE_API_URL?.trim().replace(/\/$/, "") || "/api";

async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_BASE}${ruta}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor de la clínica", 0);
  }

  const cuerpo = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    throw new ApiError(
      (cuerpo as { error?: string } | null)?.error ?? "Ocurrió un error inesperado",
      respuesta.status,
    );
  }

  return cuerpo as T;
}

export function listarClinicas(signal?: AbortSignal): Promise<Clinica[]> {
  return pedir<Clinica[]>("/clinicas", { signal });
}

export function resolverCuenta(correo: string, clave: string): Promise<Cuenta> {
  return pedir<Cuenta>("/sesion", {
    method: "POST",
    body: JSON.stringify({ correo, clave }),
  });
}

export function resolverCuentaGoogle(accessToken: string): Promise<Cuenta> {
  return pedir<Cuenta>("/sesion-google", {
    method: "POST",
    body: JSON.stringify({ accessToken }),
  });
}

export function cambiarContrasena(
  correo: string,
  claveActual: string,
  claveNueva: string,
): Promise<{ ok: true }> {
  return pedir<{ ok: true }>("/cambiar-contrasena", {
    method: "POST",
    body: JSON.stringify({ correo, claveActual, claveNueva }),
  });
}

export function solicitarRecuperacion(correo: string): Promise<{ ok: true; mensaje: string }> {
  return pedir("/recuperacion/solicitar", {
    method: "POST",
    body: JSON.stringify({ correo }),
  });
}

// ----------------------------------------------------------------------------
// Datos de la clínica (pacientes, historia, odontograma, tratamiento, agenda).
// No hay token de sesión: cada pedido identifica al usuario por su correo,
// igual que resolverCuenta, y el servidor resuelve su clínica a partir de eso.
// ----------------------------------------------------------------------------

export function listarPacientes(correo: string): Promise<Paciente[]> {
  return pedir<Paciente[]>(`/pacientes?correo=${encodeURIComponent(correo)}`);
}

export function crearPaciente(
  correo: string,
  paciente: Omit<Paciente, "id" | "creadoEl">,
): Promise<Paciente> {
  return pedir<Paciente>("/pacientes", {
    method: "POST",
    body: JSON.stringify({ correo, paciente }),
  });
}

export function actualizarPacienteApi(
  correo: string,
  id: string,
  cambios: Partial<Paciente>,
): Promise<Paciente> {
  return pedir<Paciente>(`/pacientes/${id}`, {
    method: "PUT",
    body: JSON.stringify({ correo, cambios }),
  });
}

export function eliminarPacienteApi(correo: string, id: string): Promise<{ ok: true }> {
  return pedir<{ ok: true }>(`/pacientes/${id}?correo=${encodeURIComponent(correo)}`, {
    method: "DELETE",
  });
}

export function obtenerHistoriaApi(correo: string, pacienteId: string): Promise<HistoriaClinica> {
  return pedir<HistoriaClinica>(`/pacientes/${pacienteId}/historia?correo=${encodeURIComponent(correo)}`);
}

export function actualizarHistoriaApi(
  correo: string,
  pacienteId: string,
  cambios: Partial<HistoriaClinica>,
  responsable?: string,
): Promise<HistoriaClinica> {
  return pedir<HistoriaClinica>(`/pacientes/${pacienteId}/historia`, {
    method: "PUT",
    body: JSON.stringify({ correo, cambios, responsable }),
  });
}

export function agregarAlergiaApi(
  correo: string,
  pacienteId: string,
  alergia: Omit<Alergia, "id">,
  responsable?: string,
): Promise<HistoriaClinica> {
  return pedir<HistoriaClinica>(`/pacientes/${pacienteId}/alergias`, {
    method: "POST",
    body: JSON.stringify({ correo, alergia, responsable }),
  });
}

export function quitarAlergiaApi(
  correo: string,
  pacienteId: string,
  alergiaId: string,
): Promise<HistoriaClinica> {
  return pedir<HistoriaClinica>(
    `/pacientes/${pacienteId}/alergias/${alergiaId}?correo=${encodeURIComponent(correo)}`,
    { method: "DELETE" },
  );
}

export function obtenerOdontogramaApi(correo: string, pacienteId: string): Promise<CondicionPieza[]> {
  return pedir<CondicionPieza[]>(`/pacientes/${pacienteId}/odontograma?correo=${encodeURIComponent(correo)}`);
}

export function registrarCondicionApi(
  correo: string,
  pacienteId: string,
  condicion: CondicionPieza,
): Promise<CondicionPieza[]> {
  return pedir<CondicionPieza[]>(`/pacientes/${pacienteId}/odontograma`, {
    method: "PUT",
    body: JSON.stringify({ correo, condicion }),
  });
}

export function listarDiagnosticosApi(correo: string, pacienteId: string): Promise<Diagnostico[]> {
  return pedir<Diagnostico[]>(`/pacientes/${pacienteId}/diagnosticos?correo=${encodeURIComponent(correo)}`);
}

export function registrarDiagnosticoApi(
  correo: string,
  pacienteId: string,
  descripcion: string,
  pieza?: number,
): Promise<Diagnostico> {
  return pedir<Diagnostico>(`/pacientes/${pacienteId}/diagnosticos`, {
    method: "POST",
    body: JSON.stringify({ correo, descripcion, pieza }),
  });
}

export function obtenerPlanApi(correo: string, pacienteId: string): Promise<PlanTratamiento> {
  return pedir<PlanTratamiento>(`/pacientes/${pacienteId}/plan?correo=${encodeURIComponent(correo)}`);
}

export function agregarItemPlanApi(
  correo: string,
  pacienteId: string,
  item: Omit<ItemTratamiento, "id">,
): Promise<PlanTratamiento> {
  return pedir<PlanTratamiento>(`/pacientes/${pacienteId}/plan/items`, {
    method: "POST",
    body: JSON.stringify({ correo, item }),
  });
}

export function quitarItemPlanApi(
  correo: string,
  pacienteId: string,
  itemId: string,
): Promise<PlanTratamiento> {
  return pedir<PlanTratamiento>(
    `/pacientes/${pacienteId}/plan/items/${itemId}?correo=${encodeURIComponent(correo)}`,
    { method: "DELETE" },
  );
}

export function actualizarObservacionesPlanApi(
  correo: string,
  pacienteId: string,
  observaciones: string,
): Promise<PlanTratamiento> {
  return pedir<PlanTratamiento>(`/pacientes/${pacienteId}/plan/observaciones`, {
    method: "PUT",
    body: JSON.stringify({ correo, observaciones }),
  });
}

export function listarHorariosApi(correo: string): Promise<Horario[]> {
  return pedir<Horario[]>(`/horarios?correo=${encodeURIComponent(correo)}`);
}

export function listarCitasApi(correo: string): Promise<Cita[]> {
  return pedir<Cita[]>(`/citas?correo=${encodeURIComponent(correo)}`);
}

export function registrarCitaApi(correo: string, cita: Omit<Cita, "id">): Promise<Cita> {
  return pedir<Cita>("/citas", {
    method: "POST",
    body: JSON.stringify({ correo, cita }),
  });
}

export function cambiarEstadoCitaApi(
  correo: string,
  citaId: string,
  estado: Cita["estado"],
): Promise<Cita> {
  return pedir<Cita>(`/citas/${citaId}/estado`, {
    method: "PUT",
    body: JSON.stringify({ correo, estado }),
  });
}

// ----------------------------------------------------------------------------
// Administración (solo superadmin)
// ----------------------------------------------------------------------------

export interface PerfilAdmin {
  id: string;
  email: string;
  nombre: string;
  rol: Role;
  especialidad: string | null;
  activo: boolean;
  invitacionPendiente: boolean;
  clinica: string;
  clinicaSlug: string;
}

export function listarPersonalApi(correo: string): Promise<PerfilAdmin[]> {
  return pedir<PerfilAdmin[]>(`/admin/perfiles?correo=${encodeURIComponent(correo)}`);
}

export function invitarPersonalApi(
  correo: string,
  datos: {
    email: string;
    nombreCompleto: string;
    rol: "odontologo" | "recepcionista" | "superadmin";
    clinicaId: string;
    especialidad?: string;
  },
): Promise<{ ok: true }> {
  return pedir<{ ok: true }>("/admin/invitar", {
    method: "POST",
    body: JSON.stringify({ correo, ...datos }),
  });
}

export function reenviarInvitacionApi(correo: string, id: string): Promise<{ ok: true }> {
  return pedir<{ ok: true }>(`/admin/perfiles/${id}/reenviar-invitacion`, {
    method: "POST",
    body: JSON.stringify({ correo }),
  });
}

export function cancelarInvitacionApi(correo: string, id: string): Promise<{ ok: true }> {
  return pedir<{ ok: true }>(`/admin/perfiles/${id}/invitacion?correo=${encodeURIComponent(correo)}`, {
    method: "DELETE",
  });
}

export function eliminarPersonalApi(correo: string, id: string): Promise<{ ok: true }> {
  return pedir<{ ok: true }>(`/admin/perfiles/${id}?correo=${encodeURIComponent(correo)}`, {
    method: "DELETE",
  });
}

export function cambiarContrasenaPersonalApi(
  correo: string,
  id: string,
  claveNueva: string,
): Promise<{ ok: true }> {
  return pedir<{ ok: true }>(`/admin/perfiles/${id}/contrasena`, {
    method: "POST",
    body: JSON.stringify({ correo, claveNueva }),
  });
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { obtenerSupabase } from "../../lib/supabase.ts";
import { esUuid } from "./archivoMapper.ts";
import { formatearFechaCorta, hoyEnIso } from "../evolucion/fechasEvolucion.ts";
import type { Archivo } from "./tipos.ts";

export type OpcionAsociacion = { id: string; etiqueta: string };
export type FilaEvolucionOpcion = { id: string; paciente_id: string; clinica_id: string; fecha_consulta: string | null; procedimiento_realizado: string | null; motivo_consulta: string | null; creado_en: string };
export type FilaPlanOpcion = { id: string; paciente_id: string; clinica_id: string; titulo: string | null; estado: string; creado_en: string };
const EVOLUCIONES = "id,paciente_id,clinica_id,fecha_consulta,procedimiento_realizado,motivo_consulta,creado_en";
const PLANES = "id,paciente_id,clinica_id,titulo,estado,creado_en";
const ESTADOS: Record<string, string> = { propuesto: "Propuesto", aceptado: "Aceptado", en_proceso: "En proceso", completado: "Completado", cancelado: "Cancelado" };
export const ASOCIACION_NO_DISPONIBLE = "Asociación clínica no disponible";

/** Solo controla la oferta visual; servicio/RPC/policy verifican nuevamente al guardar. */
export async function puedeElegirAsociacion(perfilId: string, cliente?: SupabaseClient): Promise<boolean> {
  if (!esUuid(perfilId)) throw new Error("El perfil requiere un UUID real.");
  const supabase = cliente ?? obtenerSupabase();
  const { data: identidad, error: errorAuth } = await supabase.auth.getUser();
  if (errorAuth || !identidad.user) throw new Error("No se pudo verificar el perfil activo.");
  const { data, error } = await supabase.schema("public").from("perfiles").select("id,auth_user_id,activo,rol")
    .eq("id", perfilId.toLowerCase()).eq("auth_user_id", identidad.user.id).eq("activo", true).maybeSingle();
  if (error || !data || data.id !== perfilId.toLowerCase() || data.auth_user_id !== identidad.user.id || data.activo !== true) {
    throw new Error("No se pudo verificar el perfil activo.");
  }
  return ["odontologo", "odontologo_admin", "recepcionista", "superadmin"].includes(data.rol);
}

function exigirContexto(pacienteId: string, clinicaId: string) {
  if (!esUuid(pacienteId) || !esUuid(clinicaId)) throw new Error("Paciente y clínica requieren UUID reales.");
}
function validarFila(fila: { id: string; paciente_id: string; clinica_id: string }, pacienteId: string, clinicaId: string) {
  if (!esUuid(fila.id) || fila.paciente_id?.toLowerCase() !== pacienteId.toLowerCase()
      || fila.clinica_id?.toLowerCase() !== clinicaId.toLowerCase()) throw new Error("Entidad de otro contexto o inválida.");
}
export function etiquetaEvolucion(fila: FilaEvolucionOpcion): string {
  return `${formatearFechaCorta(fila.fecha_consulta)} · ${fila.procedimiento_realizado?.trim() || fila.motivo_consulta?.trim() || "Atención registrada"}`;
}
export function etiquetaPlan(fila: FilaPlanOpcion): string {
  const fecha = Number.isFinite(Date.parse(fila.creado_en)) ? formatearFechaCorta(hoyEnIso(new Date(fila.creado_en))) : "Sin fecha";
  return `${fila.titulo?.trim() || `Plan del ${fecha}`} · ${ESTADOS[fila.estado] ?? "Estado no disponible"}`;
}

export async function cargarOpcionesEvolucion(pacienteId: string, clinicaId: string, cliente?: SupabaseClient): Promise<OpcionAsociacion[]> {
  exigirContexto(pacienteId, clinicaId);
  const { data, error } = await (cliente ?? obtenerSupabase()).schema("public").from("evoluciones_clinicas")
    .select(EVOLUCIONES).eq("paciente_id", pacienteId).eq("clinica_id", clinicaId)
    .order("fecha_consulta", { ascending: false }).order("creado_en", { ascending: false }).order("id", { ascending: false });
  if (error || !data) throw new Error("No se pudieron cargar las consultas disponibles.");
  return data.map((fila) => { validarFila(fila, pacienteId, clinicaId); return { id: fila.id, etiqueta: etiquetaEvolucion(fila as FilaEvolucionOpcion) }; });
}
export async function cargarOpcionesPlan(pacienteId: string, clinicaId: string, cliente?: SupabaseClient): Promise<OpcionAsociacion[]> {
  exigirContexto(pacienteId, clinicaId);
  const { data, error } = await (cliente ?? obtenerSupabase()).schema("public").from("planes_tratamiento")
    .select(PLANES).eq("paciente_id", pacienteId).eq("clinica_id", clinicaId)
    .order("creado_en", { ascending: false }).order("id", { ascending: false });
  if (error || !data) throw new Error("No se pudieron cargar los planes disponibles.");
  return data.map((fila) => { validarFila(fila, pacienteId, clinicaId); return { id: fila.id, etiqueta: etiquetaPlan(fila as FilaPlanOpcion) }; });
}

/** Preflight de usuario + entidad real. FK/policy vuelven a comprobar en INSERT. */
export async function validarDestinoArchivo(
  referencias: { evolucion_clinica_id: string | null; plan_tratamiento_id: string | null },
  pacienteId: string, clinicaId: string, categoria: string, rol: string, cliente: SupabaseClient,
): Promise<void> {
  const id = referencias.evolucion_clinica_id ?? referencias.plan_tratamiento_id;
  if (!id) return;
  if (!["odontologo", "odontologo_admin", "recepcionista", "superadmin"].includes(rol) || categoria === "portal") {
    throw new Error("El perfil no puede asociar archivos a entidades clínicas.");
  }
  const evolucion = referencias.evolucion_clinica_id !== null;
  const { data, error } = await cliente.schema("public").from(evolucion ? "evoluciones_clinicas" : "planes_tratamiento")
    .select("id,paciente_id,clinica_id").eq("id", id).eq("paciente_id", pacienteId.toLowerCase()).eq("clinica_id", clinicaId.toLowerCase()).maybeSingle();
  if (error || !data) throw new Error("La asociación clínica no está disponible o no tienes acceso.");
  validarFila(data, pacienteId, clinicaId);
  if (data.id.toLowerCase() !== id) throw new Error("La asociación no corresponde a la entidad solicitada.");
  const { data: autorizada, error: errorPermiso } = await cliente.rpc("archivos_asociacion_autorizada", {
    p_evolucion: referencias.evolucion_clinica_id, p_plan: referencias.plan_tratamiento_id,
    p_paciente: pacienteId.toLowerCase(), p_clinica: clinicaId.toLowerCase(), p_categoria: categoria,
  });
  if (errorPermiso || autorizada !== true) throw new Error("No se confirmó autorización para la asociación clínica.");
}

/** Lectura por grupos paciente/clínica/tipo, sin N consultas por tarjeta ni joins que oculten archivos. */
export async function cargarResumenesAsociaciones(archivos: readonly Archivo[], cliente?: SupabaseClient): Promise<Record<string, string>> {
  const resumenes: Record<string, string> = {};
  const grupos = new Map<string, { evolucion: boolean; pacienteId: string; clinicaId: string; archivos: Archivo[] }>();
  for (const archivo of archivos) {
    if (!archivo.evolucionClinicaId && !archivo.planTratamientoId) continue;
    resumenes[archivo.id] = ASOCIACION_NO_DISPONIBLE;
    const evolucion = archivo.evolucionClinicaId !== null;
    const clave = JSON.stringify([archivo.pacienteId, archivo.clinicaId, evolucion]);
    const grupo = grupos.get(clave) ?? { evolucion, pacienteId: archivo.pacienteId, clinicaId: archivo.clinicaId, archivos: [] };
    grupo.archivos.push(archivo); grupos.set(clave, grupo);
  }
  await Promise.all([...grupos.values()].map(async (grupo) => {
    try {
      const ids = grupo.archivos.map((archivo) => grupo.evolucion ? archivo.evolucionClinicaId! : archivo.planTratamientoId!);
      const columnas: string = grupo.evolucion ? EVOLUCIONES : PLANES;
      const { data, error } = await (cliente ?? obtenerSupabase()).schema("public").from(grupo.evolucion ? "evoluciones_clinicas" : "planes_tratamiento")
        .select(columnas).eq("paciente_id", grupo.pacienteId).eq("clinica_id", grupo.clinicaId).in("id", [...new Set(ids)])
        .returns<(FilaEvolucionOpcion | FilaPlanOpcion)[]>();
      if (error || !data) return;
      for (const fila of data) {
        validarFila(fila, grupo.pacienteId, grupo.clinicaId);
        if (!ids.includes(fila.id)) continue;
        const etiqueta = grupo.evolucion ? `Consulta: ${etiquetaEvolucion(fila as FilaEvolucionOpcion)}`
          : `Plan de tratamiento: ${(fila as FilaPlanOpcion).titulo?.trim() || etiquetaPlan(fila as FilaPlanOpcion)}`;
        for (const archivo of grupo.archivos) {
          if ((grupo.evolucion ? archivo.evolucionClinicaId : archivo.planTratamientoId) === fila.id) resumenes[archivo.id] = etiqueta;
        }
      }
    } catch { /* Un destino invisible/fallido no elimina archivos de la galería. */ }
  }));
  return resumenes;
}

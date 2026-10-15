import type { SupabaseClient } from "@supabase/supabase-js";
import { obtenerSupabase } from "../../lib/supabase.ts";
import { exigirUuid } from "./diagnosticoMapper.ts";
import { notasParaGuardar, planDesdeFila, planParaGuardar, tituloParaGuardar } from "./planTratamientoMapper.ts";
import type { ContenidoPlanTratamiento, DestinoPlanTratamiento, EstadoPlanTratamiento, PlanTratamientoPaciente } from "./tipos.ts";
import { exigirTransicionPlan } from "./planEstado.ts";

const COLUMNAS = "id,clinica_id,paciente_id,odontologo_id,titulo,estado,costo_total,notas,creado_en,actualizado_en";
const tabla = (cliente: SupabaseClient) => cliente.schema("public").from("planes_tratamiento");

/** SELECT concreto: total persistido, sin sumas ni escrituras. Autoridad bajo RLS. */
export async function obtenerPlanPorId(id: string, destino: Pick<DestinoPlanTratamiento, "pacienteId" | "clinicaId">,
  cliente?: SupabaseClient): Promise<PlanTratamientoPaciente> {
  exigirUuid(id, "planId"); exigirUuid(destino.pacienteId, "pacienteId"); exigirUuid(destino.clinicaId, "clinicaId");
  const { data, error } = await tabla(cliente ?? obtenerSupabase()).select(COLUMNAS).eq("id", id)
    .eq("paciente_id", destino.pacienteId).eq("clinica_id", destino.clinicaId).single();
  if (error || !data) throw new Error("No se confirmó la lectura del plan. Revisa conexión, sesión y visibilidad del plan.", { cause: error });
  const plan = planDesdeFila(data);
  confirmarContexto(plan, destino.pacienteId, destino.clinicaId, undefined, id);
  return plan;
}

function errorPlan(causa: unknown): Error {
  const detalle = causa && typeof causa === "object" && "message" in causa ? String(causa.message) : "Respuesta no confirmada";
  return new Error(`No se pudo confirmar la operación del plan: ${detalle}. Revisa sesión, permisos y conexión; recarga antes de repetir una creación.`, { cause: causa });
}

function validarDestino(d: DestinoPlanTratamiento) {
  exigirUuid(d.pacienteId, "pacienteId"); exigirUuid(d.clinicaId, "clinicaId"); exigirUuid(d.odontologoId, "odontologoId");
}

function confirmarContexto(p: PlanTratamientoPaciente, pacienteId: string, clinicaId: string | null, autor?: string, id?: string) {
  if (p.pacienteId !== pacienteId.toLowerCase() || (clinicaId !== null && p.clinicaId !== clinicaId.toLowerCase())
      || (autor && p.odontologoId !== autor.toLowerCase()) || (id && p.id !== id.toLowerCase())) {
    throw new Error("El plan confirmado no corresponde al paciente, clínica, autor o id solicitados.");
  }
}

/** Solo SELECT. Cero filas visibles nunca desencadena una creación. */
export async function listarPlanesPaciente(pacienteId: string, clinicaId: string | null, cliente?: SupabaseClient): Promise<PlanTratamientoPaciente[]> {
  exigirUuid(pacienteId, "pacienteId");
  if (clinicaId !== null) exigirUuid(clinicaId, "clinicaId");
  const planes: PlanTratamientoPaciente[] = [];
  let total: number | null = null;
  do {
    let consulta = tabla(cliente ?? obtenerSupabase()).select(COLUMNAS, { count: "exact" }).eq("paciente_id", pacienteId);
    if (clinicaId !== null) consulta = consulta.eq("clinica_id", clinicaId);
    let respuesta;
    try { respuesta = await consulta.order("creado_en", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false }).range(planes.length, planes.length + 199); }
    catch (causa) { throw errorPlan(causa); }
    const { data, error, count } = respuesta;
    if (error) throw errorPlan(error);
    if (!Array.isArray(data) || count === null || !Number.isSafeInteger(count) || count < 0
        || (total !== null && count !== total) || data.length > 200 || planes.length + data.length > count
        || (data.length === 0 && planes.length < count)) throw new Error("No se confirmó la lista completa de planes. Reintenta la carga.");
    total = count;
    const recibidos = data.map(planDesdeFila);
    for (const p of recibidos) confirmarContexto(p, pacienteId, clinicaId);
    planes.push(...recibidos);
    if (new Set(planes.map((p) => p.id)).size !== planes.length) throw new Error("Se recibieron planes duplicados.");
  } while (planes.length < total);
  return planes;
}

async function confirmarEscritura(consulta: PromiseLike<{ data: unknown; error: unknown }>, destino: DestinoPlanTratamiento,
  contenido: { titulo?: string; notas?: string }, id?: string): Promise<PlanTratamientoPaciente> {
  let respuesta;
  try { respuesta = await consulta; } catch (causa) { throw errorPlan(causa); }
  if (respuesta.error) throw errorPlan(respuesta.error);
  if (!respuesta.data) throw new Error("No se confirmó una fila guardada del plan. Revisa permisos y autoría.");
  const p = planDesdeFila(respuesta.data);
  confirmarContexto(p, destino.pacienteId, destino.clinicaId, destino.odontologoId, id);
  if (!p.actualizadoEn || (contenido.titulo !== undefined && p.titulo !== contenido.titulo)
      || (contenido.notas !== undefined && p.notas !== contenido.notas)) throw new Error("La fila no confirmó el contenido o actualización del plan. Recarga antes de reintentar.");
  return p;
}

export async function crearPlanTratamiento(destino: DestinoPlanTratamiento, datos: ContenidoPlanTratamiento, cliente?: SupabaseClient) {
  validarDestino(destino);
  const contenido = planParaGuardar(datos);
  const p = await confirmarEscritura(tabla(cliente ?? obtenerSupabase()).insert({ ...contenido,
    paciente_id: destino.pacienteId, clinica_id: destino.clinicaId, odontologo_id: destino.odontologoId,
    estado: "propuesto" }).select(COLUMNAS).single(), destino, contenido);
  if (p.estado !== "propuesto" || !p.creadoEn) throw new Error("No se confirmó el estado inicial propuesto o la fecha de creación.");
  return p;
}

async function actualizar(id: string, destino: DestinoPlanTratamiento, contenido: { titulo?: string; notas?: string }, cliente?: SupabaseClient) {
  exigirUuid(id, "planId"); validarDestino(destino);
  return confirmarEscritura(tabla(cliente ?? obtenerSupabase()).update(contenido).eq("id", id)
    .eq("paciente_id", destino.pacienteId).eq("clinica_id", destino.clinicaId).eq("odontologo_id", destino.odontologoId)
    .select(COLUMNAS).single(), destino, contenido, id);
}

export async function actualizarNotasPlan(id: string, destino: DestinoPlanTratamiento, notas: string, cliente?: SupabaseClient) {
  return actualizar(id, destino, { notas: notasParaGuardar(notas) }, cliente);
}

export async function actualizarTituloPlan(id: string, destino: DestinoPlanTratamiento, titulo: string, cliente?: SupabaseClient) {
  return actualizar(id, destino, { titulo: tituloParaGuardar(titulo) }, cliente);
}

/** CAS: no reintentar automáticamente si la lectura previa ya no coincide. */
export async function cambiarEstadoPlan(id: string, destino: DestinoPlanTratamiento,
  anterior: EstadoPlanTratamiento, nuevo: EstadoPlanTratamiento, cliente?: SupabaseClient): Promise<PlanTratamientoPaciente> {
  exigirUuid(id, "planId"); validarDestino(destino); exigirTransicionPlan(anterior, nuevo);
  let respuesta;
  try {
    respuesta = await tabla(cliente ?? obtenerSupabase()).update({ estado: nuevo }).eq("id", id)
      .eq("paciente_id", destino.pacienteId).eq("clinica_id", destino.clinicaId).eq("odontologo_id", destino.odontologoId)
      .eq("estado", anterior).select(COLUMNAS).single();
  } catch (causa) { throw errorPlan(causa); }
  if (respuesta.error?.code === "PGRST116" || (!respuesta.error && !respuesta.data)) {
    throw new Error("No se confirmó una fila: el estado del plan cambió en otra sesión o no tienes autorización. Recarga o vuelve a seleccionar el plan.");
  }
  if (respuesta.error) throw errorPlan(respuesta.error);
  const confirmado = planDesdeFila(respuesta.data);
  confirmarContexto(confirmado, destino.pacienteId, destino.clinicaId, destino.odontologoId, id);
  if (confirmado.estado !== nuevo || !confirmado.actualizadoEn) {
    throw new Error("El servidor no confirmó el estado esperado del plan. Recarga antes de reintentar.");
  }
  return confirmado;
}

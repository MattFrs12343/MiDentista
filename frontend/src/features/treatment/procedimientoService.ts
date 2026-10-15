import type { SupabaseClient } from "@supabase/supabase-js";
import { obtenerSupabase } from "../../lib/supabase.ts";
import { exigirUuid } from "./diagnosticoMapper.ts";
import { procedimientoDesdeFila, procedimientoParaGuardar } from "./procedimientoMapper.ts";
import type { ContenidoProcedimiento, DestinoProcedimiento, NuevoProcedimiento, ProcedimientoTratamiento } from "./tipos.ts";

const COLUMNAS = "id,clinica_id,plan_tratamiento_id,servicio_id,numero_pieza,descripcion,prioridad,costo,estado,creado_en,actualizado_en";
const tabla = (cliente: SupabaseClient) => cliente.schema("public").from("procedimientos_tratamiento");
function errorProcedimiento(causa: unknown) {
  const codigo = causa && typeof causa === "object" && "code" in causa ? String(causa.code) : "";
  const detalle = codigo === "23503" ? "El procedimiento tiene referencias asociadas o el servicio/plan no corresponde a la clínica."
    : codigo === "42501" ? "Tu sesión no tiene permiso; solo el autor del plan puede escribir."
    : causa && typeof causa === "object" && "message" in causa ? String(causa.message) : "Respuesta no confirmada";
  return new Error(`No se confirmó la operación del procedimiento: ${detalle} Revisa permisos y conexión; recarga antes de repetir una creación incierta.`, { cause: causa });
}
function validarDestino(d: DestinoProcedimiento) {
  exigirUuid(d.planTratamientoId, "planTratamientoId"); exigirUuid(d.clinicaId, "clinicaId");
}
function contexto(p: ProcedimientoTratamiento, planId: string, clinicaId: string | null, id?: string) {
  if (p.planTratamientoId !== planId.toLowerCase() || (clinicaId !== null && p.clinicaId !== clinicaId.toLowerCase())
      || (id && p.id !== id.toLowerCase())) throw new Error("La fila no corresponde al procedimiento, plan o clínica solicitados.");
}

export async function listarProcedimientosPlan(planId: string, clinicaId: string | null, cliente?: SupabaseClient): Promise<ProcedimientoTratamiento[]> {
  exigirUuid(planId, "planTratamientoId"); if (clinicaId !== null) exigirUuid(clinicaId, "clinicaId");
  const lista: ProcedimientoTratamiento[] = [];
  let total: number | null = null;
  do {
    let consulta = tabla(cliente ?? obtenerSupabase()).select(COLUMNAS, { count: "exact" }).eq("plan_tratamiento_id", planId);
    if (clinicaId !== null) consulta = consulta.eq("clinica_id", clinicaId);
    let respuesta;
    try { respuesta = await consulta.order("creado_en", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true }).range(lista.length, lista.length + 199); }
    catch (causa) { throw errorProcedimiento(causa); }
    const { data, error, count } = respuesta;
    if (error) throw errorProcedimiento(error);
    if (!Array.isArray(data) || count === null || !Number.isSafeInteger(count) || count < 0
        || (total !== null && total !== count) || data.length > 200 || lista.length + data.length > count
        || (data.length === 0 && lista.length < count)) throw new Error("No se confirmó la lista completa de procedimientos. Reintenta la carga.");
    total = count;
    const recibidos = data.map(procedimientoDesdeFila);
    for (const p of recibidos) contexto(p, planId, clinicaId);
    lista.push(...recibidos);
    if (new Set(lista.map((p) => p.id)).size !== lista.length) throw new Error("Se recibieron procedimientos duplicados.");
  } while (lista.length < total);
  return lista;
}

async function confirmar(consulta: PromiseLike<{ data: unknown; error: unknown }>, destino: DestinoProcedimiento, id?: string) {
  let respuesta;
  try { respuesta = await consulta; } catch (causa) { throw errorProcedimiento(causa); }
  if (respuesta.error) throw errorProcedimiento(respuesta.error);
  if (!respuesta.data) throw new Error("No se confirmó una fila afectada. Revisa permisos y el procedimiento seleccionado.");
  const p = procedimientoDesdeFila(respuesta.data);
  contexto(p, destino.planTratamientoId, destino.clinicaId, id);
  return p;
}
function confirmarContenido(p: ProcedimientoTratamiento, contenido: ReturnType<typeof procedimientoParaGuardar>) {
  if (!p.actualizadoEn || p.descripcion !== contenido.descripcion || p.numeroPieza !== contenido.numero_pieza
      || p.prioridad !== contenido.prioridad || p.costo !== contenido.costo || p.estado !== contenido.estado) {
    throw new Error("La respuesta no confirmó el contenido o actualización del procedimiento. Recarga antes de reintentar.");
  }
}

export async function crearProcedimiento(destino: DestinoProcedimiento, datos: NuevoProcedimiento, cliente?: SupabaseClient) {
  validarDestino(destino);
  const contenido = procedimientoParaGuardar({ ...datos, estado: "pendiente" });
  const servicioId = datos.servicioId ?? null;
  if (servicioId !== null) exigirUuid(servicioId, "servicioId");
  const p = await confirmar(tabla(cliente ?? obtenerSupabase()).insert({ ...contenido, servicio_id: servicioId,
    plan_tratamiento_id: destino.planTratamientoId, clinica_id: destino.clinicaId }).select(COLUMNAS).single(), destino);
  confirmarContenido(p, contenido);
  if (!p.creadoEn || p.servicioId !== (servicioId?.toLowerCase() ?? null)) throw new Error("No se confirmó el servicio o fecha de creación.");
  return p;
}

export async function actualizarProcedimiento(id: string, destino: DestinoProcedimiento, datos: ContenidoProcedimiento, cliente?: SupabaseClient) {
  exigirUuid(id, "procedimientoId"); validarDestino(destino);
  const contenido = procedimientoParaGuardar(datos);
  const p = await confirmar(tabla(cliente ?? obtenerSupabase()).update(contenido).eq("id", id)
    .eq("plan_tratamiento_id", destino.planTratamientoId).eq("clinica_id", destino.clinicaId).select(COLUMNAS).single(), destino, id);
  confirmarContenido(p, contenido);
  return p;
}

/** DELETE devuelve y confirma exactamente la fila eliminada, sin éxito optimista. */
export async function eliminarProcedimiento(id: string, destino: DestinoProcedimiento, cliente?: SupabaseClient) {
  exigirUuid(id, "procedimientoId"); validarDestino(destino);
  return confirmar(tabla(cliente ?? obtenerSupabase()).delete().eq("id", id).eq("plan_tratamiento_id", destino.planTratamientoId)
    .eq("clinica_id", destino.clinicaId).select(COLUMNAS).single(), destino, id);
}

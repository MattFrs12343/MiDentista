import type { SupabaseClient } from "@supabase/supabase-js";
import { obtenerSupabase } from "../../lib/supabase.ts";
import { itemsConSubtotal, totalPresupuesto } from "./calculoTotal.ts";
import {
  completarPresupuesto,
  esUuid,
  itemDesdeFila,
  itemParaGuardar,
  presupuestoDesdeFila,
  presupuestoParaActualizar,
  presupuestoParaGuardar,
  type ItemPresupuestoFila,
  type PresupuestoFila,
} from "./presupuestoMapper.ts";
import type {
  EstadoPresupuesto,
  ItemPresupuesto,
  ItemPresupuestoNuevo,
  Presupuesto,
  PresupuestoCompleto,
  PresupuestoNuevo,
} from "./tipos.ts";
import { transicionValida } from "./tipos.ts";

const COLUMNAS_PRESUPUESTO =
  "id,clinica_id,paciente_id,odontologo_id,titulo,descuento,total,estado,valido_hasta,notas,creado_en,actualizado_en";
const COLUMNAS_ITEM =
  "id,clinica_id,presupuesto_id,servicio_id,descripcion,numero_pieza,cantidad,precio_unitario,subtotal,creado_en";

function exigirUuid(valor: string, campo: string) {
  if (!esUuid(valor)) {
    throw new Error(`${campo} debe ser un UUID real de Supabase; no se admiten IDs de demo.`);
  }
}

function tablaPresupuestos(cliente: SupabaseClient) {
  return cliente.schema("public").from("presupuestos");
}

function tablaItems(cliente: SupabaseClient) {
  return cliente.schema("public").from("items_presupuesto");
}

async function itemsDe(
  presupuestoId: string,
  cliente: SupabaseClient,
): Promise<ItemPresupuesto[]> {
  const { data, error } = await tablaItems(cliente)
    .select(COLUMNAS_ITEM)
    .eq("presupuesto_id", presupuestoId)
    .order("creado_en", { ascending: true });
  if (error) throw new Error(`No se pudieron cargar las partidas: ${error.message}`);
  if (!data) throw new Error("Supabase no devolvio un resultado de consulta valido.");
  return data.map((fila) => itemDesdeFila(fila as ItemPresupuestoFila));
}

/**
 * Listado de presupuestos de un paciente (US-8.1).
 *
 * Un array vacio puede deberse a RLS, no a que el paciente no tenga
 * presupuestos. La UI no debe concluir "no hay presupuestos" sin distinguirlo.
 */
export async function cargarPresupuestos(
  pacienteId: string,
  cliente?: SupabaseClient,
): Promise<PresupuestoCompleto[]> {
  exigirUuid(pacienteId, "pacienteId");
  const supabase = cliente ?? obtenerSupabase();

  const { data, error } = await tablaPresupuestos(supabase)
    .select(COLUMNAS_PRESUPUESTO)
    .eq("paciente_id", pacienteId)
    .order("creado_en", { ascending: false });

  if (error) throw new Error(`No se pudieron cargar los presupuestos: ${error.message}`);
  if (!data) throw new Error("Supabase no devolvio un resultado de consulta valido.");

  const presupuestos = data.map((fila) => presupuestoDesdeFila(fila as PresupuestoFila));
  return Promise.all(
    presupuestos.map(async (presupuesto) =>
      completarPresupuesto(presupuesto, await itemsDe(presupuesto.id, supabase)),
    ),
  );
}

/** Listado transversal de la clínica, que es lo que necesita recepción. */
export async function cargarPresupuestosClinica(
  clinicaId: string,
  cliente?: SupabaseClient,
): Promise<Presupuesto[]> {
  exigirUuid(clinicaId, "clinicaId");
  const { data, error } = await tablaPresupuestos(cliente ?? obtenerSupabase())
    .select(COLUMNAS_PRESUPUESTO)
    .eq("clinica_id", clinicaId)
    .order("creado_en", { ascending: false });

  if (error) throw new Error(`No se pudieron cargar los presupuestos: ${error.message}`);
  if (!data) throw new Error("Supabase no devolvio un resultado de consulta valido.");
  return data.map((fila) => presupuestoDesdeFila(fila as PresupuestoFila));
}

/**
 * Crea un presupuesto con sus partidas (US-8.2).
 *
 * El total lo calcula `calculoTotal.ts` a partir de las partidas, nunca se
 * recibe como parametro. Si se calculara en la UI, el módulo 09 veria otro
 * saldo.
 */
export async function guardarPresupuesto(
  nuevo: PresupuestoNuevo,
  items: readonly ItemPresupuestoNuevo[],
  cliente?: SupabaseClient,
): Promise<PresupuestoCompleto> {
  exigirUuid(nuevo.clinicaId, "clinicaId");
  exigirUuid(nuevo.pacienteId, "pacienteId");
  exigirUuid(nuevo.odontologoId, "odontologoId");

  const supabase = cliente ?? obtenerSupabase();
  const partidas = itemsConSubtotal(items);
  const total = totalPresupuesto(partidas, nuevo.descuento);

  const { data, error } = await tablaPresupuestos(supabase)
    .insert(presupuestoParaGuardar(nuevo, total))
    .select(COLUMNAS_PRESUPUESTO)
    .single();

  if (error) throw new Error(`No se pudo guardar el presupuesto: ${error.message}`);
  if (!data) throw new Error("El presupuesto no devolvio la fila guardada.");

  const presupuesto = presupuestoDesdeFila(data as PresupuestoFila);

  if (partidas.length > 0) {
    const filas = partidas.map((item) => itemParaGuardar(item, presupuesto.id));

    const { error: errorItems } = await tablaItems(supabase).insert(filas);
    if (errorItems) {
      // El presupuesto ya existe: se avisa sin borrar nada para no perderlo.
      throw new Error(
        `El presupuesto ${presupuesto.id} se guardo pero sus partidas no. No lo borres: avisa a Matias para limpiarlo a mano. Detalle: ${errorItems.message}`,
      );
    }
  }

  return completarPresupuesto(presupuesto, await itemsDe(presupuesto.id, supabase));
}

/**
 * Cambia el estado del presupuesto (US-8.4).
 *
 * Valida la transición con `transicionValida` antes de tocar la red: los estados
 * solo avanzan (`borrador → enviado → aceptado | rechazado`) y `rechazado` es
 * terminal. No se arrastra un estado hacia atrás.
 *
 * Devuelve `null` si la fila no se actualizo, lo que con RLS activo es
 * indistinguible de un fallo silencioso. No se confunde con exito.
 */
export async function cambiarEstadoPresupuesto(
  presupuesto: Presupuesto,
  hacia: EstadoPresupuesto,
  cliente?: SupabaseClient,
): Promise<Presupuesto | null> {
  if (!transicionValida(presupuesto.estado, hacia)) {
    throw new Error(
      `No se permite pasar de "${presupuesto.estado}" a "${hacia}". Revisa el ciclo de vida del presupuesto.`,
    );
  }

  exigirUuid(presupuesto.id, "id");
  exigirUuid(presupuesto.pacienteId, "pacienteId");
  exigirUuid(presupuesto.clinicaId, "clinicaId");

  const { data, error } = await tablaPresupuestos(cliente ?? obtenerSupabase())
    .update(presupuestoParaActualizar({ ...presupuesto, estado: hacia }))
    .eq("id", presupuesto.id)
    .eq("clinica_id", presupuesto.clinicaId)
    .select(COLUMNAS_PRESUPUESTO)
    .maybeSingle();

  if (error) throw new Error(`No se pudo actualizar el presupuesto: ${error.message}`);
  if (!data) return null;
  return presupuestoDesdeFila(data as PresupuestoFila);
}

/**
 * Un presupuesto con sus partidas, por `id` (US-8.4, edición).
 *
 * Devuelve `null` si no existe o si RLS no lo deja ver; la UI debe tratar ese
 * `null` como "no disponible", nunca como un presupuesto vacío.
 */
export async function cargarPresupuesto(
  presupuestoId: string,
  cliente?: SupabaseClient,
): Promise<PresupuestoCompleto | null> {
  exigirUuid(presupuestoId, "presupuestoId");
  const supabase = cliente ?? obtenerSupabase();

  const { data, error } = await tablaPresupuestos(supabase)
    .select(COLUMNAS_PRESUPUESTO)
    .eq("id", presupuestoId)
    .maybeSingle();

  if (error) throw new Error(`No se pudo cargar el presupuesto: ${error.message}`);
  if (!data) return null;

  const presupuesto = presupuestoDesdeFila(data as PresupuestoFila);
  return completarPresupuesto(presupuesto, await itemsDe(presupuesto.id, supabase));
}

/**
 * Modifica un presupuesto y reemplaza sus partidas (US-8.4).
 *
 * El total se recalcula aqui, igual que en el alta; nunca llega desde la UI. El
 * reemplazo de partidas es deliberadamente "insertar primero, borrar despues":
 * si el INSERT falla, las partidas viejas siguen guardadas y el peor caso es un
 * duplicado visible que se reintenta, en vez de un presupuesto sin partidas.
 *
 * Devuelve `null` si la fila no se actualizo (no existe o RLS no lo permite).
 */
export async function actualizarPresupuesto(
  presupuesto: Presupuesto,
  items: readonly ItemPresupuestoNuevo[],
  cliente?: SupabaseClient,
): Promise<PresupuestoCompleto | null> {
  exigirUuid(presupuesto.id, "id");
  exigirUuid(presupuesto.clinicaId, "clinicaId");
  exigirUuid(presupuesto.pacienteId, "pacienteId");
  exigirUuid(presupuesto.odontologoId, "odontologoId");

  const supabase = cliente ?? obtenerSupabase();
  const partidas = itemsConSubtotal(items);
  const total = totalPresupuesto(partidas, presupuesto.descuento);

  const { data, error } = await tablaPresupuestos(supabase)
    .update(presupuestoParaActualizar({ ...presupuesto, total }))
    .eq("id", presupuesto.id)
    .eq("clinica_id", presupuesto.clinicaId)
    .select(COLUMNAS_PRESUPUESTO)
    .maybeSingle();

  if (error) throw new Error(`No se pudo actualizar el presupuesto: ${error.message}`);
  if (!data) return null;

  const actualizado = presupuestoDesdeFila(data as PresupuestoFila);

  // Se leen las partidas actuales antes de tocar nada: sus `id` son los que hay
  // que retirar despues de dejar guardadas las nuevas.
  const previas = await itemsDe(actualizado.id, supabase);

  if (partidas.length > 0) {
    const filas = partidas.map((item) => itemParaGuardar(item, actualizado.id));
    const { error: errorItems } = await tablaItems(supabase).insert(filas);
    if (errorItems) {
      throw new Error(
        `No se pudieron guardar las partidas nuevas: ${errorItems.message}. Las partidas anteriores siguen guardadas; reintenta la edición.`,
      );
    }
  }

  if (previas.length > 0) {
    const { error: errorBorrado } = await tablaItems(supabase)
      .delete()
      .in(
        "id",
        previas.map((item) => item.id),
      );
    if (errorBorrado) {
      throw new Error(
        `Las partidas nuevas se guardaron pero no se pudieron retirar las anteriores: ${errorBorrado.message}. Revisa el presupuesto antes de continuar.`,
      );
    }
  }

  return completarPresupuesto(actualizado, await itemsDe(actualizado.id, supabase));
}

/**
 * Elimina un presupuesto. Sus partidas caen por `on delete cascade`.
 *
 * Devuelve `false` si no se borro ninguna fila (no existe, ya no está, o RLS no
 * lo permite); eso no es éxito y la UI no debe anunciarlo como tal.
 */
export async function eliminarPresupuesto(
  presupuesto: Presupuesto,
  cliente?: SupabaseClient,
): Promise<boolean> {
  exigirUuid(presupuesto.id, "id");
  exigirUuid(presupuesto.clinicaId, "clinicaId");

  const { data, error } = await tablaPresupuestos(cliente ?? obtenerSupabase())
    .delete()
    .eq("id", presupuesto.id)
    .eq("clinica_id", presupuesto.clinicaId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(`No se pudo eliminar el presupuesto: ${error.message}`);
  return data !== null;
}

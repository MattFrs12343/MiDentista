import type { SupabaseClient } from "@supabase/supabase-js";
import { obtenerSupabase } from "../../lib/supabase.ts";
import { esUuid } from "./presupuestoMapper.ts";
import type { Decimal } from "./tipos.ts";

/**
 * Catálogo de servicios de la clínica (T-8.7).
 *
 * Vive dentro del módulo 08 y no en `features/treatment/` por una razón de
 * propiedad: `treatment` ya está construido y no se edita. Esta es la única
 * superficie que el módulo 08 necesita para armar partidas desde el catálogo, y
 * respeta la regla de "cada módulo con su propio servicio".
 *
 * Tabla `public.servicios` (docs/DATABASE.md sección 14). Es de solo lectura
 * aquí: el alta y la edición del catálogo son del módulo de gestión de clínica.
 */

export interface Servicio {
  id: string;
  clinicaId: string;
  nombre: string;
  descripcion: string;
  precioPorDefecto: Decimal;
  duracionMinutos: number | null;
  activo: boolean;
}

/** Fila de `public.servicios`. */
export interface ServicioFila {
  id: string;
  clinica_id: string;
  nombre: string;
  descripcion: string | null;
  precio_por_defecto: Decimal;
  duracion_minutos: number | null;
  activo: boolean | null;
}

const COLUMNAS_SERVICIO =
  "id,clinica_id,nombre,descripcion,precio_por_defecto,duracion_minutos,activo";

function exigirUuid(valor: string, campo: string) {
  if (!esUuid(valor)) {
    throw new Error(`${campo} debe ser un UUID real de Supabase; no se admiten IDs de demo.`);
  }
}

function servicioDesdeFila(fila: ServicioFila): Servicio {
  return {
    id: fila.id,
    clinicaId: fila.clinica_id,
    nombre: fila.nombre,
    descripcion: fila.descripcion ?? "",
    precioPorDefecto: fila.precio_por_defecto,
    duracionMinutos: fila.duracion_minutos,
    activo: fila.activo ?? true,
  };
}

/**
 * Servicios activos de la clínica, ordenados por nombre.
 *
 * Solo los `activo`: un servicio desactivado no debe poder agregarse a un
 * presupuesto nuevo, pero las partidas que ya lo referencian siguen intactas.
 */
export async function cargarServicios(
  clinicaId: string,
  cliente?: SupabaseClient,
): Promise<Servicio[]> {
  exigirUuid(clinicaId, "clinicaId");

  const { data, error } = await (cliente ?? obtenerSupabase())
    .schema("public")
    .from("servicios")
    .select(COLUMNAS_SERVICIO)
    .eq("clinica_id", clinicaId)
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) throw new Error(`No se pudieron cargar los servicios: ${error.message}`);
  if (!data) throw new Error("Supabase no devolvio un resultado de consulta valido.");
  return data.map((fila) => servicioDesdeFila(fila as ServicioFila));
}

/**
 * Servicio de `zonas_clinica`. Sigue el patron de
 * `features/clinical/clinicalHistoryService.ts`:
 *
 *  - Solo acepta UUIDs reales. Los ids de demo (`p1`, `clinica1`) se rechazan
 *    antes de tocar la red.
 *  - Un `SELECT` vacio puede deberse a RLS, no a que la clinica no tenga zonas.
 *  - Nunca se confunde `null` con exito: una escritura exige la fila devuelta.
 *  - Las escrituras concurrentes del mismo hook se rechazan, no se encolan
 *    (ver `plantaService` + `PlantaPage`).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { obtenerSupabase } from "../../lib/supabase.ts";
import {
  citaDePlantaDesdeFila,
  esUuid,
  zonaDesdeFila,
  zonaParaGuardar,
  type CitaDePlantaFila,
  type ZonaFila,
} from "./plantaMapper.ts";
import type { CitaDePlanta, Zona } from "./tipos.ts";

const COLUMNAS =
  "id,clinica_id,nombre,tipo,piso,x,y,ancho,alto,capacidad,odontologo_id,activa,orden,notas,creado_en,actualizado_en";

const COLUMNAS_CITA =
  "id,paciente_id,odontologo_id,zona_id,fecha_cita,hora_inicio,hora_fin,estado,motivo_consulta";

function exigirUuid(valor: string, campo: string) {
  if (!esUuid(valor)) {
    throw new Error(`${campo} debe ser un UUID real de Supabase; no se admiten IDs de demo.`);
  }
}

function tabla(cliente: SupabaseClient) {
  return cliente.schema("public").from("zonas_clinica");
}

function tablaCitas(cliente: SupabaseClient) {
  return cliente.schema("public").from("citas");
}

/**
 * Zonas de una clinica, ya mapeadas y ordenadas como se leen en el plano.
 *
 * Una lista vacia puede ser RLS o una clinica que todavia no dibujo su planta;
 * quien llama decide, no esta funcion.
 */
export async function cargarPlanta(
  clinicaId: string,
  cliente?: SupabaseClient,
): Promise<Zona[]> {
  exigirUuid(clinicaId, "clinicaId");
  const { data, error } = await tabla(cliente ?? obtenerSupabase())
    .select(COLUMNAS)
    .eq("clinica_id", clinicaId)
    .order("piso", { ascending: true })
    .order("orden", { ascending: true });

  if (error) throw new Error(`No se pudo cargar la planta de la clinica: ${error.message}`);
  if (!data) throw new Error("Supabase no devolvio un resultado de consulta valido.");

  return data
    .map((fila) => zonaDesdeFila(fila as ZonaFila))
    .sort((a, b) => a.piso - b.piso || a.orden - b.orden || a.nombre.localeCompare(b.nombre, "es"));
}

/** Alta o edicion de una zona. Exige recuperar la fila guardada. */
export async function guardarZona(zona: Zona, cliente?: SupabaseClient): Promise<Zona> {
  exigirUuid(zona.clinicaId, "clinicaId");
  const contenido = zonaParaGuardar(zona);
  const supabase = cliente ?? obtenerSupabase();

  // Una zona con id tiene que ser un UUID de verdad: si fuera un id local, el
  // UPDATE no encontraria nada y se anunciaria como guardado.
  if (zona.id) exigirUuid(zona.id, "id");

  const operacion = zona.id
    ? tabla(supabase).update(contenido).eq("id", zona.id).eq("clinica_id", zona.clinicaId)
    : tabla(supabase).insert(contenido);

  const { data, error } = await operacion.select(COLUMNAS).single();
  if (error) throw new Error(`No se pudo guardar la zona: ${error.message}`);
  if (!data) throw new Error("No se confirmo el guardado de la zona. Revisa permisos y RLS.");

  const fila = data as ZonaFila;
  if (fila.clinica_id !== zona.clinicaId) {
    throw new Error("La respuesta de Supabase no corresponde a la clinica indicada.");
  }
  return zonaDesdeFila(fila);
}

/**
 * Da de baja una zona. Es borrado logico (`activa = false`), no fisico: el plano
 * de una clinica tiene historial (una sala que se cerro sigue formando parte
 * del edificio) y las citas viejas apuntan a esas zonas.
 *
 * Se relee la fila porque un `UPDATE` que no encuentra nada (id equivocado, RLS)
 * tambien devuelve `error: null`: sin la lectura, un `true` aqui seria mentira.
 */
export async function desactivarZona(zona: Zona, cliente?: SupabaseClient): Promise<boolean> {
  exigirUuid(zona.id, "id");
  exigirUuid(zona.clinicaId, "clinicaId");

  const { data, error } = await tabla(cliente ?? obtenerSupabase())
    .update({ activa: false })
    .eq("id", zona.id)
    .eq("clinica_id", zona.clinicaId)
    .select("id,activa")
    .maybeSingle();
  if (error) throw new Error(`No se pudo desactivar la zona: ${error.message}`);
  if (!data) {
    throw new Error(
      `La zona ${zona.id} no se desactivo. Revisa que exista y que tus permisos la alcancen.`,
    );
  }
  if (data.activa !== false) {
    throw new Error("La zona sigue activa despues de la baja. Revisa los permisos de escritura.");
  }
  return true;
}

/**
 * Agenda del dia con el vinculo a la zona.
 *
 * Se lee desde `citas` y no desde el store porque el store mapea a la `Cita` de
 * `@/types`, que descarta `odontologo_id` y `zona_id`: sin esas columnas el
 * plano no puede saber que consultorio esta ocupado. Un `SELECT` vacio puede
 * deberse a RLS, no a que no haya citas.
 *
 * Las citas con estado desconocido se descartan y no se cuentan: no se puede
 * dibujar una cita que no se sabe si ocupa el consultorio.
 */
export async function cargarAgendaDePlanta(
  clinicaId: string,
  fecha: string,
  cliente?: SupabaseClient,
): Promise<CitaDePlanta[]> {
  exigirUuid(clinicaId, "clinicaId");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw new Error(`La fecha "${fecha}" debe ir en formato YYYY-MM-DD.`);
  }

  const { data, error } = await tablaCitas(cliente ?? obtenerSupabase())
    .select(COLUMNAS_CITA)
    .eq("clinica_id", clinicaId)
    .eq("fecha_cita", fecha)
    .order("hora_inicio", { ascending: true });

  if (error) throw new Error(`No se pudo cargar la agenda del dia: ${error.message}`);
  if (!data) throw new Error("Supabase no devolvio un resultado de consulta valido.");

  return data
    .map((fila) => citaDePlantaDesdeFila(fila as CitaDePlantaFila))
    .filter((cita): cita is CitaDePlanta => cita !== null);
}

/**
 * Clinica del usuario autenticado, para no tener que pasar el UUID a mano.
 *
 * `sesion.clinica` es el *nombre* de la clinica, no su id, asi que se resuelve
 * por el perfil. Devuelve `null` si no hay sesion de Supabase o el perfil no
 * tiene clinica (el superadmin no pertenece a ninguna): en ese caso la vista
 * trabaja con el plano de demostracion en vez de inventarse un id.
 */
export async function obtenerClinicaIdPropia(cliente?: SupabaseClient): Promise<string | null> {
  const supabase = cliente ?? obtenerSupabase();
  const { data: userData, error: errorUser } = await supabase.auth.getUser();
  if (errorUser || !userData.user) return null;

  const { data, error } = await supabase
    .from("perfiles")
    .select("clinica_id")
    .eq("auth_user_id", userData.user.id)
    .limit(1);
  if (error || !data || data.length === 0) return null;

  const clinicaId = (data[0] as { clinica_id: string | null }).clinica_id;
  return clinicaId && esUuid(clinicaId) ? clinicaId : null;
}
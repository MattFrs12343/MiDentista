/**
 * Lectura de datos del panel del superadministrador (T-13.2).
 *
 * Se evaluó reutilizar los servicios de solo lectura ya existentes en
 * `data/api.ts`:
 *   - `listarClinicas()` filtra `.eq("activo", true)`, así que NO puede
 *     informar el total de clínicas (solo las activas). No sirve para el
 *     requisito "clínicas totales y activas".
 *   - `listarPersonalApi()` devuelve la tabla Personal vía Edge Function; sirve
 *     para usuarios, pero obliga a que la función esté desplegada y mezcla dos
 *     fuentes distintas para un mismo resumen.
 *
 * Por eso el módulo usa un servicio propio, como pide AGENTS.md §4: lee
 * `public.clinicas` y `public.perfiles` con el cliente normal (`anon` +
 * sesión del superadmin). No usa credenciales privilegiadas ni elude RLS: la
 * lectura de `perfiles` solo devuelve todos los usuarios si la sesión es de un
 * superadmin (`es_superadmin()`), y `clinicas` es de lectura pública.
 *
 * Un SELECT vacío puede deberse a RLS, no a que no existan filas: por eso el
 * error se propaga y el hook lo distingue de un cero real.
 *
 * Las importaciones usan rutas relativas con extensión `.ts`, igual que
 * `features/clinical/clinicalHistoryService.ts`, para poder ejecutar las
 * pruebas con `node --test` sin resolver los alias de Vite.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { obtenerSupabase } from "../../lib/supabase.ts";
import {
  contarUsuariosPorRol,
  distribuirClinicasPorEstado,
  resumirSuperadmin,
  type FilaClinica,
  type FilaPerfil,
  type ResumenSuperadmin,
} from "./superadminResumen.ts";

/** Lee el resumen del sistema. Acepta un cliente ya configurado (pruebas). */
export async function cargarResumenSuperadmin(
  cliente?: SupabaseClient,
): Promise<ResumenSuperadmin> {
  const supabase = cliente ?? obtenerSupabase();

  const clinicas = await supabase.from("clinicas").select("activo");
  if (clinicas.error) {
    throw new Error(`No se pudieron consultar las clínicas: ${clinicas.error.message}`);
  }
  if (!clinicas.data) {
    throw new Error("Supabase no devolvió un resultado de clínicas válido.");
  }

  const perfiles = await supabase.from("perfiles").select("rol, activo");
  if (perfiles.error) {
    throw new Error(`No se pudieron consultar los usuarios: ${perfiles.error.message}`);
  }
  if (!perfiles.data) {
    throw new Error("Supabase no devolvió un resultado de usuarios válido.");
  }

  // Las agregaciones de los gráficos (T-13.7) se calculan sobre estas mismas
  // filas: ni una consulta más, para no duplicar lecturas ni cargar dos veces
  // las tablas.
  const filasClinicas = clinicas.data as FilaClinica[];
  const filasPerfiles = perfiles.data as FilaPerfil[];

  return {
    ...resumirSuperadmin(filasClinicas, filasPerfiles),
    usuariosPorRol: contarUsuariosPorRol(filasPerfiles),
    clinicasPorEstado: distribuirClinicasPorEstado(filasClinicas),
  };
}

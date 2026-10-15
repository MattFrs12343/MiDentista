/**
 * Lógica pura de las tarjetas del módulo 13 (T-13.6).
 *
 * Este archivo no importa React ni ningún `.tsx`: separa la transformación de
 * datos del render para poder probarla con `node --test`, igual que
 * `pagoCalculo.ts` o `clinicalHistoryMapper.ts`. Los componentes
 * `DashboardStatCard` y `DashboardEmptyState` consumen estas funciones.
 *
 * Los tipos `StatTileTone` y `StatDelta` viven en `components/ui/stat-tile.tsx`
 * y `TonoIndicador`, `Indicador` y `DatosDashboard` en `tipos.ts`. Se importan
 * solo como tipos: no se edita ningún archivo fuera del módulo.
 */

import type { StatDelta, StatTileTone } from "@/components/ui/stat-tile";
import type { DatosDashboard, Indicador, TonoIndicador } from "./tipos";

/**
 * Traducción del tono del indicador al tono que admite `StatTile`.
 *
 * `StatTileTone` no tiene `yellow`: el pastel amarillo del tema se llama
 * `orange`. El resto coincide uno a uno. Sin tono, `neutral`.
 */
const TONO_A_STAT_TILE: Record<TonoIndicador, StatTileTone> = {
  neutral: "neutral",
  blue: "blue",
  green: "green",
  violet: "violet",
  red: "red",
  yellow: "orange",
};

export function tonoStatTile(tono?: TonoIndicador): StatTileTone {
  return tono ? TONO_A_STAT_TILE[tono] : "neutral";
}

/**
 * Convierte el delta textual del `Indicador` en el `StatDelta` de `StatTile`.
 *
 * `deltaPositivo` es el único dato disponible sobre el signo del cambio, así
 * que decide tanto la dirección (ícono) como el sentimiento (color):
 *   - `true`  -> subió / positivo
 *   - `false` -> bajó / negativo
 *   - ausente -> sin cambio / neutral
 *
 * El texto se respeta tal cual (no se reescribe ni se le antepone signo): el
 * valor viene ya formateado por quien produce el indicador.
 */
export function deltaDesdeIndicador(
  indicador: Pick<Indicador, "delta" | "deltaPositivo">,
): StatDelta | undefined {
  const { delta, deltaPositivo } = indicador;
  if (!delta) return undefined;
  if (deltaPositivo === undefined) {
    return { value: delta, trend: "flat", sentiment: "neutral" };
  }
  return deltaPositivo
    ? { value: delta, trend: "up", sentiment: "positive" }
    : { value: delta, trend: "down", sentiment: "negative" };
}

/** Estados posibles de un bloque alimentado por `DatosDashboard<T>`. */
export type EstadoDashboard = "cargando" | "error" | "sinPermiso" | "vacio" | "listo";

/**
 * ¿El valor es "nada que mostrar"?
 *
 * Por defecto solo se considera vacío `null`, `undefined` o un arreglo sin
 * elementos. Un objeto con campos (aunque sean ceros) no se trata como vacío:
 * para eso quien consume puede pasar su propio predicado. No se convierte un
 * vacío en el número cero ni en un error.
 */
export function estaVacioPorDefecto(valor: unknown): boolean {
  if (valor === null || valor === undefined) return true;
  if (Array.isArray(valor)) return valor.length === 0;
  return false;
}

/**
 * Decide qué cara mostrar a partir de `DatosDashboard<T>`.
 *
 * Precedencia (de mayor a menor): `error` > `cargando` > `sinPermiso` > `vacio`
 * > `listo`. Un `error` explícito nunca se oculta; un `sinPermiso` (RLS) no se
 * degrada a "vacío"; y un vacío legítimo no se confunde con falta de permiso,
 * porque ambos son banderas distintas que pone quien carga los datos.
 */
export function estadoDashboard<T>(
  datos: DatosDashboard<T>,
  estaVacio: (valor: T) => boolean = estaVacioPorDefecto as (valor: T) => boolean,
): EstadoDashboard {
  if (datos.error) return "error";
  if (datos.cargando) return "cargando";
  if (datos.sinPermiso) return "sinPermiso";
  if (estaVacio(datos.valor)) return "vacio";
  return "listo";
}

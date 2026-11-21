import type { SupabaseClient } from "@supabase/supabase-js";
import { obtenerSupabase } from "../../lib/supabase.ts";
import { esUuid } from "./archivoMapper.ts";

export type CuotaArchivos = {
  clinicaId: string; limiteBytes: number; bytesOcupados: number; bytesReservados: number; actualizadoEn: string;
};
export function disponibleCuota(cuota: CuotaArchivos): number {
  return Math.max(0, cuota.limiteBytes - cuota.bytesOcupados - cuota.bytesReservados);
}
export function formatearBytesCuota(bytes: number): string {
  const unidad = bytes >= 1_000_000_000 ? "GB" : bytes >= 1_000_000 ? "MB" : bytes >= 1000 ? "kB" : "bytes";
  const divisor = unidad === "GB" ? 1_000_000_000 : unidad === "MB" ? 1_000_000 : unidad === "kB" ? 1000 : 1;
  return `${new Intl.NumberFormat("es", { maximumFractionDigits: 2 }).format(bytes / divisor)} ${unidad}`;
}
export function validarCuota(valor: unknown, clinicaId: string): CuotaArchivos {
  if (!valor || typeof valor !== "object") throw new Error("Cuota no disponible.");
  const cuota = valor as CuotaArchivos;
  if (!esUuid(cuota.clinicaId) || cuota.clinicaId.toLowerCase() !== clinicaId.toLowerCase()
      || ![cuota.limiteBytes, cuota.bytesOcupados, cuota.bytesReservados].every((v) => Number.isSafeInteger(v) && v >= 0)
      || cuota.limiteBytes === 0 || !Number.isFinite(Date.parse(cuota.actualizadoEn))) throw new Error("Cuota no disponible.");
  return cuota;
}
export async function cargarCuotaArchivos(clinicaId: string, cliente?: SupabaseClient): Promise<CuotaArchivos> {
  if (!esUuid(clinicaId)) throw new Error("La clínica requiere UUID real.");
  const { data, error } = await (cliente ?? obtenerSupabase()).rpc("archivos_c4_cuota", { p_clinica: clinicaId.toLowerCase() });
  if (error) throw new Error("No pudimos consultar el almacenamiento de la clínica.");
  return validarCuota(data, clinicaId);
}

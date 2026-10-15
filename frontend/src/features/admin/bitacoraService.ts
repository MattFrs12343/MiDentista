import { obtenerSupabase } from "@/lib/supabase";

/** Acción registrada por el trigger `registrar_bitacora()` (módulo 16). */
export type AccionBitacora = "INSERT" | "UPDATE" | "DELETE";

export interface EntradaBitacora {
  id: string;
  clinicaId: string | null;
  clinicaNombre: string | null;
  perfilId: string | null;
  rol: string | null;
  accion: AccionBitacora;
  tablaAfectada: string;
  registroId: string | null;
  detalle: { antes: Record<string, unknown> | null; despues: Record<string, unknown> | null };
  ipAddress: string | null;
  creadoEn: string;
}

interface FilaBitacora {
  id: string;
  clinica_id: string | null;
  perfil_id: string | null;
  rol: string | null;
  accion: string;
  tabla_afectada: string;
  registro_id: string | null;
  detalle: { antes: Record<string, unknown> | null; despues: Record<string, unknown> | null };
  ip_address: string | null;
  creado_en: string;
  clinicas: { nombre: string } | null;
}

const COLUMNAS =
  "id,clinica_id,perfil_id,rol,accion,tabla_afectada,registro_id,detalle,ip_address,creado_en,clinicas(nombre)";

const POR_PAGINA = 30;

function desdeFila(fila: FilaBitacora): EntradaBitacora {
  return {
    id: fila.id,
    clinicaId: fila.clinica_id,
    clinicaNombre: fila.clinicas?.nombre ?? null,
    perfilId: fila.perfil_id,
    rol: fila.rol,
    accion: fila.accion as AccionBitacora,
    tablaAfectada: fila.tabla_afectada,
    registroId: fila.registro_id,
    detalle: fila.detalle ?? { antes: null, despues: null },
    ipAddress: fila.ip_address,
    creadoEn: fila.creado_en,
  };
}

/**
 * Página de la bitácora de auditoría (módulo 16), más reciente primero.
 *
 * Solo lectura: la tabla rechaza INSERT/UPDATE/DELETE directo desde el
 * cliente (solo el trigger `security definer` escribe). RLS acota lo que
 * cada quien ve (superadmin: todo; `odontologo_admin`: su propia clínica,
 * rol todavía no activo — ver `docs/modules/16-bitacora/sql.sql`).
 */
export async function listarBitacora(pagina = 0): Promise<{ entradas: EntradaBitacora[]; haySiguiente: boolean }> {
  const desde = pagina * POR_PAGINA;
  const hasta = desde + POR_PAGINA; // una de más, para saber si hay siguiente página

  const { data, error } = await obtenerSupabase()
    .schema("public")
    .from("bitacora")
    .select(COLUMNAS)
    .order("creado_en", { ascending: false })
    .range(desde, hasta);

  if (error) throw new Error(`No se pudo cargar la bitácora: ${error.message}`);
  if (!data) throw new Error("Supabase no devolvió un resultado de consulta válido.");

  const haySiguiente = data.length > POR_PAGINA;
  const filas = (haySiguiente ? data.slice(0, POR_PAGINA) : data) as unknown as FilaBitacora[];
  return { entradas: filas.map(desdeFila), haySiguiente };
}

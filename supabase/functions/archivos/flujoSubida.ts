import type { DatosArchivo } from "./contrato.ts";

export type Intento = { actor: string; paciente: string; operacion: string; bytes: Uint8Array; sha256: string; datos: DatosArchivo };
export type Operacion = { id: string; ruta: string; estado: "reservada" | "subiendo" | "incierta" | "confirmada" | "cancelada" };
export type ResultadoSubida = { archivo: Record<string, unknown>; operacionId: string }
  | { codigo: "CUOTA_EXCEDIDA" | "ACCESO_DENEGADO" | "SUBIDA_RECHAZADA" | "OPERACION_INCIERTA" | "IDEMPOTENCIA_INCOMPATIBLE"; requiereRevision: boolean; operacionId: string };
export type DependenciasSubida = {
  reservar: (intento: Intento) => Promise<Operacion>;
  iniciar: (intento: Intento) => Promise<boolean>;
  subir: (ruta: string, intento: Intento) => Promise<void>;
  confirmar: (intento: Intento) => Promise<Record<string, unknown>>;
  rechazoDefinitivo: (intento: Intento, status: number) => Promise<boolean>;
  marcarIncierta: (intento: Intento) => Promise<void>;
};

function mensaje(error: unknown): string {
  return error && typeof error === "object" && "message" in error ? String(error.message) : "";
}
function statusDe(error: unknown): number {
  return error && typeof error === "object" && "statusCode" in error ? Number(error.statusCode) : NaN;
}

/** Un solo upload por operación. No hay compensación destructiva: NO remove(). */
export async function ejecutarSubida(intento: Intento, deps: DependenciasSubida): Promise<ResultadoSubida> {
  const fallo = (codigo: Extract<ResultadoSubida, { codigo: string }>["codigo"], requiereRevision: boolean): ResultadoSubida =>
    ({ codigo, requiereRevision, operacionId: intento.operacion });
  let op: Operacion;
  try { op = await deps.reservar(intento); }
  catch (error) {
    if (mensaje(error) === "CUOTA_EXCEDIDA") return fallo("CUOTA_EXCEDIDA", false);
    if (mensaje(error) === "IDEMPOTENCIA_INCOMPATIBLE") return fallo("IDEMPOTENCIA_INCOMPATIBLE", true);
    if (error && typeof error === "object" && "code" in error && error.code === "42501") return fallo("ACCESO_DENEGADO", false);
    return fallo("OPERACION_INCIERTA", true);
  }
  if (op.estado === "cancelada") return fallo("SUBIDA_RECHAZADA", false);
  try {
    if (op.estado === "confirmada") return { archivo: await deps.confirmar(intento), operacionId: op.id };
    const ganador = await deps.iniciar(intento);
    if (ganador) {
      try { await deps.subir(op.ruta, intento); }
      catch (error) {
        const status = statusDe(error);
        if ([400,401,403,404,413,415,422].includes(status)) {
          try { if (await deps.rechazoDefinitivo(intento, status)) return fallo("SUBIDA_RECHAZADA", false); }
          catch { /* Sin confirmación SQL se conserva la reserva. */ }
        }
        throw error;
      }
    }
    // También recupera una operación anterior incierta si el objeto ya apareció.
    return { archivo: await deps.confirmar(intento), operacionId: op.id };
  } catch {
    try { await deps.marcarIncierta(intento); } catch { /* El estado subiendo ya conserva bytes. */ }
    return fallo("OPERACION_INCIERTA", true);
  }
}

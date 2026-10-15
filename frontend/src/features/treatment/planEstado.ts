import type { EstadoPlanTratamiento } from "./tipos.ts";

const TRANSICIONES: Record<EstadoPlanTratamiento, readonly EstadoPlanTratamiento[]> = {
  propuesto: ["aceptado", "cancelado"], aceptado: ["en_proceso"],
  en_proceso: ["completado", "cancelado"], completado: [], cancelado: [],
};
export const ACCIONES_ESTADO: Partial<Record<EstadoPlanTratamiento, string>> = {
  aceptado: "Aceptar plan", en_proceso: "Iniciar tratamiento", completado: "Completar plan", cancelado: "Cancelar plan",
};
export function transicionesPlan(estado: EstadoPlanTratamiento): readonly EstadoPlanTratamiento[] {
  return Object.hasOwn(TRANSICIONES, estado) ? TRANSICIONES[estado] : [];
}
export function exigirTransicionPlan(anterior: EstadoPlanTratamiento, nuevo: EstadoPlanTratamiento) {
  if (!transicionesPlan(anterior).includes(nuevo)) throw new Error(`Transición del plan no permitida: ${anterior} → ${nuevo}.`);
}
export const requiereConfirmacionEstado = (estado: EstadoPlanTratamiento) => estado === "completado" || estado === "cancelado";

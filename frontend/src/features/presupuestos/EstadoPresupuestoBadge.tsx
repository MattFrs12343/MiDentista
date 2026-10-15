import { Badge } from "@/components/ui/badge";
import { ETIQUETA_ESTADO } from "./presupuestoFormato.ts";
import type { EstadoPresupuesto } from "./tipos.ts";

/** El tono comunica el estado sin leer la etiqueta. */
const TONE: Record<EstadoPresupuesto, "neutral" | "blue" | "green" | "red"> = {
  borrador: "neutral",
  enviado: "blue",
  aceptado: "green",
  rechazado: "red",
};

export function EstadoPresupuestoBadge({ estado }: { estado: EstadoPresupuesto }) {
  return <Badge tone={TONE[estado]}>{ETIQUETA_ESTADO[estado]}</Badge>;
}

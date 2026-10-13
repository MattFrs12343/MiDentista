import type { CondicionDiente } from "@/types";

/**
 * Etiqueta y color de cada condición en el portal.
 *
 * Vive en su propio módulo porque ahora lo consumen dos vistas: la lista de
 * piezas y la vista 3D. Antes estaba declarado dentro de la página y la segunda
 *consumería habría tenido que duplicarlo.
 */
export const CONDICION_LABEL: Record<CondicionDiente, string> = {
  sano: "Sano",
  caries: "Caries",
  obturado: "Obturado",
  corona: "Corona",
  endodoncia: "Endodoncia",
  ausente: "Ausente",
  extraccion_indicada: "Extracción indicada",
  implante: "Implante",
};

/** Color por condición: solo se pintan las piezas que requieren atención. */
export const CONDICION_CLASE: Record<CondicionDiente, string> = {
  sano: "bg-surface-sunken text-ink-soft",
  caries: "bg-pastel-red-bg text-pastel-red-fg",
  obturado: "bg-pastel-blue-bg text-pastel-blue-fg",
  corona: "bg-pastel-yellow-bg text-pastel-yellow-fg",
  endodoncia: "bg-pastel-violet-bg text-pastel-violet-fg",
  ausente: "bg-surface-sunken text-ink-muted",
  extraccion_indicada: "bg-pastel-red-bg text-pastel-red-fg",
  implante: "bg-pastel-green-bg text-pastel-green-fg",
};

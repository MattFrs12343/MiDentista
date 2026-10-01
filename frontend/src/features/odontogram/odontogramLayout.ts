import type { CondicionDiente } from "@/types";

export const CUADRANTE_SUPERIOR_DERECHO = [18, 17, 16, 15, 14, 13, 12, 11];
export const CUADRANTE_SUPERIOR_IZQUIERDO = [21, 22, 23, 24, 25, 26, 27, 28];
export const CUADRANTE_INFERIOR_DERECHO = [48, 47, 46, 45, 44, 43, 42, 41];
export const CUADRANTE_INFERIOR_IZQUIERDO = [31, 32, 33, 34, 35, 36, 37, 38];

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

export const CONDICION_ESTILO: Record<CondicionDiente, string> = {
  sano: "bg-surface border-line-strong text-ink-soft",
  caries: "bg-pastel-red-bg border-pastel-red-fg/30 text-pastel-red-fg",
  obturado: "bg-pastel-blue-bg border-pastel-blue-fg/30 text-pastel-blue-fg",
  corona: "bg-pastel-yellow-bg border-pastel-yellow-fg/30 text-pastel-yellow-fg",
  endodoncia: "bg-pastel-violet-bg border-pastel-violet-fg/30 text-pastel-violet-fg",
  ausente: "bg-surface-sunken border-dashed border-line-strong text-ink-muted/60",
  extraccion_indicada: "bg-surface border-dashed border-pastel-red-fg text-pastel-red-fg",
  implante: "bg-pastel-green-bg border-pastel-green-fg/30 text-pastel-green-fg",
};

/** Colores sólidos para el material 3D del arco dental (equivalentes a CONDICION_ESTILO). */
export const CONDICION_COLOR_3D: Record<CondicionDiente, string> = {
  sano: "#f4f1ea",
  caries: "#c2453f",
  obturado: "#4a90c2",
  corona: "#d4af37",
  endodoncia: "#8b5fbf",
  ausente: "#c9c4b8",
  extraccion_indicada: "#c2453f",
  implante: "#4caf6d",
};

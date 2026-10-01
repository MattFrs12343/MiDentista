export type TabValue = "datos" | "historia" | "odontograma" | "tratamiento";

export function esTabValida(valor: string | null): valor is TabValue {
  return valor === "datos" || valor === "historia" || valor === "odontograma" || valor === "tratamiento";
}

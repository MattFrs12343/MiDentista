export type TabValue = "datos" | "historia" | "odontograma" | "tratamiento" | "evolucion" | "pagos";

export function esTabValida(valor: string | null): valor is TabValue {
  return (
    valor === "datos" ||
    valor === "historia" ||
    valor === "odontograma" ||
    valor === "tratamiento" ||
    valor === "evolucion" ||
    valor === "pagos"
  );
}

import { cn } from "@/lib/cn";
import type { CondicionPieza } from "@/types";
import { CONDICION_ESTILO, CONDICION_LABEL } from "@/features/odontogram/odontogramLayout";
import { nombrePieza } from "@/features/odontogram/toothNames";

export function ToothButton({
  pieza,
  condicion,
  seleccionada,
  onSelect,
}: {
  pieza: number;
  condicion?: CondicionPieza;
  seleccionada: boolean;
  onSelect: (pieza: number) => void;
}) {
  const estado = condicion?.condicion ?? "sano";

  return (
    <button
      type="button"
      onClick={() => onSelect(pieza)}
      className={cn(
        "tooth-hover flex h-11 w-11 flex-col items-center justify-center rounded-lg border text-[11px] font-semibold transition-[transform,background-color,color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200",
        seleccionada
          ? "border-brand-700 bg-brand-600 text-white shadow-diffuse ring-2 ring-brand-300 ring-offset-1"
          : CONDICION_ESTILO[estado],
      )}
      title={`${pieza} · ${nombrePieza(pieza)} · ${CONDICION_LABEL[estado]}`}
    >
      {pieza}
    </button>
  );
}

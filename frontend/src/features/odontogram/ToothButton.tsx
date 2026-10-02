import { cn } from "@/lib/cn";
import type { CondicionPieza } from "@/types";
import { CONDICION_ESTILO, CONDICION_LABEL } from "@/features/odontogram/odontogramLayout";
import { nombrePieza, claseDePieza } from "@/features/odontogram/toothNames";
import { DienteSvg } from "@/features/odontogram/DienteSvg";

export function ToothButton({
  pieza,
  condicion,
  seleccionada,
  arcada = "inferior",
  onSelect,
}: {
  pieza: number;
  condicion?: CondicionPieza;
  seleccionada: boolean;
  /** invierte la silueta en el maxilar superior */
  arcada?: "superior" | "inferior";
  onSelect: (pieza: number) => void;
}) {
  const estado = condicion?.condicion ?? "sano";
  const clase = claseDePieza(pieza);

  return (
    <button
      type="button"
      onClick={() => onSelect(pieza)}
      aria-pressed={seleccionada}
      aria-label={`Pieza ${pieza}, ${nombrePieza(pieza)}, ${CONDICION_LABEL[estado]}`}
      className={cn(
        "tooth-hover group relative flex h-12 w-11 flex-col items-center justify-center gap-0.5 rounded-xl border transition-[transform,background-color,color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200",
        seleccionada
          ? "border-brand-700 bg-brand-600 text-white shadow-diffuse ring-2 ring-brand-300 ring-offset-1"
          : CONDICION_ESTILO[estado],
      )}
      title={`${pieza} · ${nombrePieza(pieza)} · ${CONDICION_LABEL[estado]}`}
      data-clase={clase}
    >
      <DienteSvg
        pieza={pieza}
        arcada={arcada}
        className="h-8 w-7 shrink-0 transition-transform duration-150 ease-out group-hover:scale-105"
      />
      <span className="text-[9px] font-bold leading-none tabular-nums">{pieza}</span>
    </button>
  );
}

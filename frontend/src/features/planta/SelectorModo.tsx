import { Cube, MapTrifold } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import type { ModoVista } from "./tipos";

/**
 * Selector 2D / 3D.
 *
 * El 2D es el modo por defecto y el que nunca falla: el 3D es una mejora
 * opcional. Por eso el control no esconde el 2D ni lo llama "avanzado": son
 * dos lecturas del mismo plano y el odontologo elige.
 */
export function SelectorModo({
  modo,
  onChange,
  tresDesactivado = false,
}: {
  modo: ModoVista;
  onChange: (modo: ModoVista) => void;
  /** El 3D se apaga si no hay WebGL: no tiene sentido ofrecer un modo roto. */
  tresDesactivado?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Modo de vista de la planta"
      className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-black/[0.04] p-0.5"
    >
      <Opcion
        activo={modo === "2d"}
        etiqueta="Plano 2D"
        onClick={() => onChange("2d")}
        icono={<MapTrifold size={14} weight="bold" />}
      />
      <Opcion
        activo={modo === "3d"}
        etiqueta={tresDesactivado ? "3D no disponible" : "Vista 3D"}
        onClick={() => onChange("3d")}
        icono={<Cube size={14} weight="bold" />}
        deshabilitado={tresDesactivado}
      />
    </div>
  );
}

function Opcion({
  activo,
  etiqueta,
  onClick,
  icono,
  deshabilitado = false,
}: {
  activo: boolean;
  etiqueta: string;
  onClick: () => void;
  icono: React.ReactNode;
  deshabilitado?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={activo}
      disabled={deshabilitado}
      title={etiqueta}
      onClick={onClick}
      className={cn(
        "press flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors duration-150 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
        activo
          ? "bg-surface text-ink shadow-diffuse"
          : deshabilitado
            ? "text-ink-muted/50"
            : "text-ink-muted hover:text-ink",
      )}
    >
      {icono}
      <span className="hidden sm:inline">{etiqueta}</span>
    </button>
  );
}
import { cn } from "@/lib/cn";
import { COLOR_TIPO } from "@/features/planta/plantaLayout";
import { UMBRAL_LLENA, UMBRAL_OCUPADA } from "@/features/planta/plantaAgenda";
import { ETIQUETA_TIPO, TIPOS_ZONA, type NivelOcupacion, type Zona } from "./tipos";

const NIVEL: Record<NivelOcupacion, { etiqueta: string; clase: string; color: string }> = {
  libre: { etiqueta: "Libre", clase: "bg-surface-sunken", color: "#f5f3ef" },
  ocupada: { etiqueta: "Con citas", clase: "bg-pastel-blue-bg", color: "#e1f3fe" },
  llena: { etiqueta: "Al tope", clase: "bg-pastel-yellow-bg", color: "#fbf3db" },
};

/** Relleno de cada nivel, para el SVG y la mini planta de la agenda. */
export const COLOR_NIVEL: Record<NivelOcupacion, string> = {
  libre: NIVEL.libre.color,
  ocupada: NIVEL.ocupada.color,
  llena: NIVEL.llena.color,
};

/**
 * Leyenda de la planta.
 *
 * Sin leyenda un plano con nueve colores es un dibujo bonito que nadie sabe
 * leer. Las dos escalas van separadas porque dicen cosas distintas: el color
 * identifica el tipo de zona y el relleno dice cuanto se ocupa hoy.
 */
export function LeyendaZonas({ zonas }: { zonas: Zona[] }) {
  const presentes = TIPOS_ZONA.filter((tipo) => zonas.some((z) => z.tipo === tipo));

  return (
    <div className="flex flex-col gap-2.5 border-t border-line pt-3">
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {presentes.map((tipo) => (
          <li key={tipo} className="flex items-center gap-1.5 text-[11px] text-ink-soft">
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-full border"
              style={{ backgroundColor: COLOR_TIPO[tipo], borderColor: COLOR_TIPO[tipo] }}
            />
            {ETIQUETA_TIPO[tipo]}
          </li>
        ))}
      </ul>
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {(Object.keys(NIVEL) as NivelOcupacion[]).map((nivel) => (
          <li key={nivel} className="flex items-center gap-1.5 text-[11px] text-ink-muted">
            <span
              aria-hidden
              className={cn("h-2.5 w-2.5 rounded-sm border border-line-strong", NIVEL[nivel].clase)}
            />
            {NIVEL[nivel].etiqueta}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Umbrales de ocupacion, expuestos para el texto de la leyenda y el detalle. */
export const UMBRALES = {
  ocupada: UMBRAL_OCUPADA,
  llena: UMBRAL_LLENA,
} as const;
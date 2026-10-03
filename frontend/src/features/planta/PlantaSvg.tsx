import { useMemo } from "react";
import { cn } from "@/lib/cn";
import {
  COLOR_PLANO,
  COLOR_TIPO,
  RELLENO_POR_NIVEL,
  UNIDADES_POR_METRO,
  area,
  encuadre,
  vistaDe,
} from "@/features/planta/plantaLayout";
import type { EjeDia, OcupacionZona } from "@/features/planta/plantaAgenda";
import { OverlayAgenda } from "@/features/planta/OverlayAgenda";
import { ETIQUETA_TIPO, type Zona } from "@/features/planta/tipos";

/**
 * Planta en SVG puro.
 *
 * Esta vista no importa three ni pide WebGL: es la que tiene que funcionar
 * siempre, en un celular sin aceleracion y con el 3D apagado. El SVG ademas
 * aporta lo que el 3D no da bien: texto real seleccionable, zonas que el motor
 * de busqueda del navegador puede leer y un tooltip nativo por zona.
 */

const RADIO = 6;

export function PlantaSvg({
  zonas,
  ocupacion,
  eje,
  ahora,
  seleccionada,
  encuadrada,
  onSelect,
  onHover,
  mostrarAgenda = true,
  className,
}: {
  zonas: Zona[];
  ocupacion: Map<string, OcupacionZona>;
  /** Eje de la jornada del dia, para dibujar la agenda sobre la zona. */
  eje: EjeDia;
  /** Minutos desde medianoche. Todas las zonas dibujan la misma marca de ahora. */
  ahora: number;
  seleccionada: string | null;
  encuadrada: string | null;
  onSelect: (zonaId: string) => void;
  onHover: (zonaId: string | null) => void;
  mostrarAgenda?: boolean;
  className?: string;
}) {
  const marco = useMemo(() => vistaDe(encuadre(zonas)), [zonas]);
  const unidades = (metros: number) => metros * UNIDADES_POR_METRO;

  return (
    <div className={cn("w-full", className)}>
      <svg
        viewBox={`${marco.x} ${marco.y} ${marco.ancho} ${marco.alto}`}
        role="group"
        aria-label="Planta de la clínica"
        className="h-auto w-full touch-manipulation select-none"
      >
        {/* el suelo: da el plano de referencia contra el que se leen las zonas */}
        <rect
          x={marco.x}
          y={marco.y}
          width={marco.ancho}
          height={marco.alto}
          fill={COLOR_PLANO.suelo}
          stroke={COLOR_PLANO.muro}
          strokeWidth={1.5}
          rx={10}
        />

        {zonas.map((zona) => {
          const x = zona.x * UNIDADES_POR_METRO;
          const y = zona.y * UNIDADES_POR_METRO;
          const ancho = unidades(zona.ancho);
          const alto = unidades(zona.alto);
          const color = COLOR_TIPO[zona.tipo] ?? COLOR_PLANO.texto;
          const dato = ocupacion.get(zona.id);
          const relleno = RELLENO_POR_NIVEL[dato?.nivel ?? "libre"] ?? 0.12;
          const activa = zona.id === seleccionada;
          const enfocada = zona.id === encuadrada;
          const textoGrande = ancho > 150 && alto > 90;

          return (
            <g
              key={zona.id}
              role="button"
              tabIndex={0}
              aria-label={`${zona.nombre}, ${ETIQUETA_TIPO[zona.tipo]}, ${area(zona)} metros cuadrados, ${zona.capacidad} ${zona.capacidad === 1 ? "profesional" : "profesionales"}. ${dato?.activas ?? 0} citas hoy.`}
              aria-pressed={activa}
              onClick={() => onSelect(zona.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(zona.id);
                }
              }}
              onPointerEnter={() => onHover(zona.id)}
              onPointerLeave={() => onHover(null)}
              onFocus={() => onHover(zona.id)}
              onBlur={() => onHover(null)}
              className="cursor-pointer focus:outline-none [&:focus-visible>rect]:stroke-[#3d84b8]"
            >
              <rect
                x={x}
                y={y}
                width={ancho}
                height={alto}
                rx={RADIO}
                fill={color}
                fillOpacity={activa ? Math.min(0.9, relleno + 0.28) : relleno}
                stroke={activa ? COLOR_PLANO.texto : color}
                strokeWidth={activa ? 3 : 1.5}
                className="transition-[fill-opacity] duration-150 ease-out"
              />

              {/* el nombre va centrado y recortado al ancho de la zona: un texto
                  que se sale de la sala se lee sobre la pared de al lado */}
              {textoGrande ? (
                <text
                  x={x + ancho / 2}
                  y={y + alto / 2 - (mostrarAgenda && dato?.activas ? 10 : 0)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={COLOR_PLANO.texto}
                  fontSize={13}
                  fontWeight={600}
                  className="pointer-events-none"
                >
                  {recortar(zona.nombre, ancho)}
                </text>
              ) : null}
              {textoGrande ? (
                <text
                  x={x + ancho / 2}
                  y={y + alto / 2 + 10}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={COLOR_PLANO.textoTenue}
                  fontSize={11}
                  className="pointer-events-none"
                >
                  {`${ETIQUETA_TIPO[zona.tipo]} · ${area(zona)} m²`}
                </text>
              ) : null}

              {mostrarAgenda && dato && dato.activas > 0 ? (
                <OverlayAgenda zona={zona} dato={dato} eje={eje} ahora={ahora} ancho={ancho} alto={alto} x={x} y={y} />
              ) : null}

              {/* el foco del teclado se dibuja aparte del borde de seleccion:
                  son dos cosas distintas y un solo trazo las confunde */}
              <rect
                x={x - 2}
                y={y - 2}
                width={ancho + 4}
                height={alto + 4}
                rx={RADIO + 2}
                fill="none"
                stroke={enfocada ? COLOR_PLANO.texto : "none"}
                strokeWidth={enfocada ? 1 : 0}
                strokeDasharray={enfocada ? "4 3" : undefined}
                className="pointer-events-none"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Cuanto texto cabe en el ancho de la zona.
 *
 * El nombre de una zona se corta con puntos suspensivos en vez de desbordarse:
 * un texto que invade la zona vecina hace ilegible el plano entero.
 */
export function recortar(texto: string, anchoUnidades: number, porCaracter = 7.4): string {
  const maximo = Math.max(4, Math.floor((anchoUnidades - 16) / porCaracter));
  if (texto.length <= maximo) return texto;
  return `${texto.slice(0, Math.max(1, maximo - 1)).trimEnd()}…`;
}
/**
 * Siluetas de pieza dental para la notacion FDI.
 *
 * Antes cada pieza era un cuadrado con el numero. Ahora se dibuja la forma
 * anatomica segun la posicion dentro del cuadrante (1-8), que es como se
 * lee de verdad un odontograma: los incisivos son angostos y de borde recto,
 * el canino termina en punta, los premolares tienen dos cuspides y los
 * molares son los mas anchos con cuatro.
 *
 * El trazo se genera por geometria (no a mano) para que las cuatro formas
 * salgan simetricas y con el mismo origen, y para que cambiar el tamano de
 * un grupo no desalinee al resto.
 */

import { claseDePieza, type ClaseDiente } from "@/features/odontogram/toothNames";

/** viewBox fijo: todos los dientes se dibujan en el mismo lienzo. */
const ANCHO_LIENZO = 44;
const ALTO_LIENZO = 52;
const CENTRO_X = ANCHO_LIENZO / 2;
const Y_CUELLO = 6;

interface Perfil {
  /** ancho maximo del cuerpo, en unidades del lienzo */
  ancho: number;
  /** largo desde el cuello hasta el borde oclusal */
  largo: number;
  /** cuspides del borde oclusal: [] recto, [0] punta, varios = multiples */
  puntas: number[];
}

const PERFIL: Record<ClaseDiente, Perfil> = {
  incisivo: { ancho: 19, largo: 40, puntas: [] },
  canino: { ancho: 17, largo: 45, puntas: [0] },
  premolar: { ancho: 23, largo: 41, puntas: [-0.25, 0.25] },
  molar: { ancho: 29, largo: 42, puntas: [-0.66, -0.22, 0.22, 0.66] },
};

/** La posicion FDI (1..8) decide la clase de pieza (ver toothNames.ts). */

function trazoDePieza({ ancho, largo, puntas }: Perfil): string {
  const half = ancho / 2;
  const halfCuello = half * 0.52;
  const xIzq = CENTRO_X - half * 0.94;
  const xDer = CENTRO_X + half * 0.94;
  const yOclusal = largo * 0.72;
  const xCuelloIzq = CENTRO_X - halfCuello;
  const xCuelloDer = CENTRO_X + halfCuello;

  let d = `M ${xCuelloIzq} ${Y_CUELLO}`;

  // cuello -> cuerpo (lado izquierdo): se abre hacia el ancho maximo
  d += ` C ${CENTRO_X - half} ${Y_CUELLO + largo * 0.3} ${CENTRO_X - half} ${largo * 0.52} ${xIzq} ${yOclusal}`;

  // borde oclusal: recto en el incisivo, con cuspides en el resto
  if (puntas.length === 0) {
    d += ` Q ${CENTRO_X} ${largo + 4} ${xDer} ${yOclusal}`;
  } else {
    for (let i = 0; i < puntas.length; i++) {
      const puntaX = CENTRO_X + half * puntas[i];
      const siguienteX = xIzq + (xDer - xIzq) * ((i + 1) / (puntas.length + 1));
      d += ` Q ${puntaX} ${largo + 5} ${siguienteX} ${yOclusal}`;
    }
    d += ` L ${xDer} ${yOclusal}`;
  }

  // cuerpo -> cuello (lado derecho)
  d += ` C ${CENTRO_X + half} ${largo * 0.52} ${CENTRO_X + half} ${Y_CUELLO + largo * 0.3} ${xCuelloDer} ${Y_CUELLO}`;
  d += " Z";

  return d;
}

export function DienteSvg({
  pieza,
  arcada,
  className,
}: {
  pieza: number;
  /** "superior" invierte el diente para que la corona apunte al centro */
  arcada: "superior" | "inferior";
  className?: string;
}) {
  const clase = claseDePieza(pieza);
  const d = trazoDePieza(PERFIL[clase]);

  return (
    <svg
      viewBox={`0 0 ${ANCHO_LIENZO} ${ALTO_LIENZO}`}
      aria-hidden="true"
      focusable="false"
      className={className}
      style={
        arcada === "superior"
          ? { transform: `scaleY(-1) translateY(-${ALTO_LIENZO}px)` }
          : undefined
      }
    >
      <path
        d={d}
        fill="currentColor"
        fillOpacity="0.16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

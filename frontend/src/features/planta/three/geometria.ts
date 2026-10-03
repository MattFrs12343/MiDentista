/**
 * Geometria de la planta, en metros y sin three.
 *
 * La planta NO usa un `.glb`: un consultorio es una caja y un plano es un
 * rectangulo. Modelarlo con geometria procedural evita un archivo binario que
 * hay que mantener y versionar, y ademas es lo que permite garantizar el
 * presupuesto de triangulos y de draw calls.
 *
 * Sistema de coordenadas: se mantiene el de `plantaLayout.ts` (x a la derecha, y
 * hacia abajo, con el origen en la esquina superior izquierda) y se traduce al
 * de three aqui, en un solo punto. Si la traduccion viviera en cada componente,
 * el 3D terminaria reflejado respecto del 2D y el consultorio 1 apareceria al
 * lado del 3.
 */

import { TIPOS_ZONA, type TipoZona } from "../tipos.ts";

/** Altura de una zona, en metros: un consultorio tiene unos 2.6 m de alto. */
export const ALTURA_ZONA = 2.6;

/** Espesor del suelo de la planta, en metros. */
export const ESPESOR_SUELO = 0.12;

/** Triangulos de una caja: 12 (6 caras de dos triangulos). */
export const TRIANGULOS_CAJA = 12;

/** Triangulos del suelo: 12 tambien, porque es una caja plana. */
export const TRIANGULOS_PLANO = 12;

/** Barras del perimetro del edificio. Van en un solo grupo, pero cada una es un draw call. */
export const MUROS = 4;

/**
 * Presupuesto de la vista 3D.
 *
 * No es un capricho: una planta son 10-20 cajas, y con un `instancedMesh` por
 * tipo eso son menos de 10 draw calls. El techo existe para que, si manana la
 * planta crece o se le anade detalle, salte el numero en desarrollo en vez de
 * descubrirse en un celular viejo. `metricasDeEscena` lo comprueba.
 */
export const PRESUPUESTO = {
  triangulos: 12_000,
  drawCalls: 25,
} as const;

/** Zona como la necesita three: centro y medidas, no esquina superior izquierda. */
export interface ZonaEnEscena {
  id: string;
  tipo: TipoZona;
  /** Centro en el plano de la planta, en metros. */
  cx: number;
  cy: number;
  ancho: number;
  alto: number;
}

/** Traduccion de una zona al espacio de three (Y arriba, origen en el centro). */
export interface GeometriaDeZona {
  /** Centro de la caja en el espacio de three. */
  posicion: [number, number, number];
  /** Medidas de la caja. */
  escala: [number, number, number];
}

/**
 * Recentra las zonas respecto del encuadre.
 *
 * three mira al origen, y el plano tiene su origen en la esquina superior
 * izquierda: sin restar el centro, la planta aparece desplazada fuera del
 * encuadre y el `viewBox` del 2D y el 3D no coinciden.
 */
export function prepararZonas(
  zonas: ReadonlyArray<{ id: string; tipo: TipoZona; cx: number; cy: number; ancho: number; alto: number }>,
  centro: { x: number; y: number },
): ZonaEnEscena[] {
  return zonas.map((z) => ({ ...z, cx: z.cx - centro.x, cy: z.cy - centro.y }));
}

/**
 * Caja de una zona en el espacio de three.
 *
 * El eje Y del plano (que crece hacia abajo) se mapea a **-Z**, no a +Z: con la
 * camara detras del origen, +Z queda hacia el espectador y el plano se veria al
 * reves. El alto va en el centro, no en la base, para que las cajas se puedan
 * escalar sin que se hundan en el suelo.
 */
export function geometriaDeZona(zona: ZonaEnEscena, altura = ALTURA_ZONA): GeometriaDeZona {
  return {
    posicion: [zona.cx, altura / 2, -zona.cy],
    escala: [zona.ancho, altura, zona.alto],
  };
}

/** Cuantas instancias hay por tipo: un `instancedMesh` por cada clave. */
export function instanciasPorTipo(zonas: ReadonlyArray<ZonaEnEscena>): Map<string, ZonaEnEscena[]> {
  const grupos = new Map<string, ZonaEnEscena[]>();
  for (const zona of zonas) {
    const lista = grupos.get(zona.tipo) ?? [];
    lista.push(zona);
    grupos.set(zona.tipo, lista);
  }
  return grupos;
}

/**
 * Triangulos y draw calls de la escena.
 *
 * `drawCalls` se cuenta asi: un `instancedMesh` por tipo, mas el suelo, mas los
 * cuatro muros del perimetro y mas el marco de la zona seleccionada. Las luces
 * no cuentan: no son draw calls.
 */
export function metricasDeEscena(zonas: ReadonlyArray<ZonaEnEscena>): {
  triangulos: number;
  drawCalls: number;
  instancias: number;
  dentroDePresupuesto: boolean;
} {
  const tipos = instanciasPorTipo(zonas).size;
  // suelo + 4 muros + marco de seleccion
  const drawCalls = tipos + 1 + MUROS + 1;
  const triangulos = zonas.length * TRIANGULOS_CAJA + TRIANGULOS_PLANO + MUROS * TRIANGULOS_CAJA;
  return {
    triangulos,
    drawCalls,
    instancias: zonas.length,
    dentroDePresupuesto: triangulos <= PRESUPUESTO.triangulos && drawCalls <= PRESUPUESTO.drawCalls,
  };
}

/**
 * Cuantas zonas caben en el presupuesto antes de pasarse.
 *
 * Se descuentan tambien el suelo y los muros: si solo se contaran las cajas, el
 * limite prometeria una zona de mas que despues haria fallar la escena. La
 * vista usa esto para avisar, no para recortar zonas en pantalla: mostrar una
 * planta incompleta sin decirlo seria peor que mostrar los triangulos de mas.
 */
export function maximoDeZonas(): number {
  return Math.floor((PRESUPUESTO.triangulos - TRIANGULOS_PLANO - MUROS * TRIANGULOS_CAJA) / TRIANGULOS_CAJA);
}

/**
 * Radio de la esfera que envuelve la planta, en metros: es la distancia minima
 * a la que cabe todo el plano.
 */
export function radioDeEscena(zonas: ReadonlyArray<ZonaEnEscena>): number {
  if (!zonas.length) return 8;
  let maximo = 0;
  for (const z of zonas) {
    maximo = Math.max(maximo, Math.abs(z.cx) + z.ancho / 2, Math.abs(z.cy) + z.alto / 2);
  }
  return Math.max(4, maximo);
}

/** Tipo de zona desconocido: se avisa en vez de inventar un color. */
export function esTipoDeZona(valor: string): valor is TipoZona {
  return (TIPOS_ZONA as readonly string[]).includes(valor);
}

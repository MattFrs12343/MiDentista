/**
 * Geometria de la planta, sin React y sin three.
 *
 * Aqui vive todo lo que se puede probar: el encuadre del plano, las colisiones,
 * el area, la capacidad y los colores. Las vistas 2D y 3D consumen estas
 * funciones, de modo que un consultorio se ve igual en las dos y el plano no
 * puede quedar desalineado entre vistas.
 *
 * Sistema de coordenadas: metros, con el origen en la esquina superior
 * izquierda, `x` a la derecha e `y` hacia abajo. Se elige igual que el SVG
 * para que el rectangulo de la zona se pase tal cual al `rect`.
 */

import type { TipoZona, Zona } from "./tipos.ts";

/** Medidas de referencia de un consultorio pequeño, para dibujar sin datos. */
export const ANCHO_PLANTA = 18;
export const ALTO_PLANTA = 12;

/** Margen en metros alrededor del encuadre, para que ninguna zona toque el borde. */
export const MARGEN = 0.6;

/** Escala de referencia: 1 metro del plano se dibuja a 40 unidades de viewBox. */
export const UNIDADES_POR_METRO = 40;

export interface Rectangulo {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

export interface Encuadre extends Rectangulo {
  /** Unidades de dibujo por metro. */
  escala: number;
}

/** Encuadre en unidades de dibujo, que es lo que necesita el `viewBox`. */
export interface Vista extends Rectangulo {
  escala: number;
}

/**
 * Rectangulo que envuelve a todas las zonas, mas el margen, en metros.
 *
 * El plano nunca mide cero: si no hay zonas se devuelve la lamina de referencia
 * para que la vista muestre el suelo en vez de un `viewBox` degenerado que deja
 * la pagina en blanco sin explicar por que.
 */
export function encuadre(zonas: Rectangulo[]): Encuadre {
  if (!zonas.length) {
    return {
      x: -MARGEN,
      y: -MARGEN,
      ancho: ANCHO_PLANTA + MARGEN * 2,
      alto: ALTO_PLANTA + MARGEN * 2,
      escala: UNIDADES_POR_METRO,
    };
  }

  const minX = Math.min(...zonas.map((z) => z.x));
  const minY = Math.min(...zonas.map((z) => z.y));
  const maxX = Math.max(...zonas.map((z) => z.x + z.ancho));
  const maxY = Math.max(...zonas.map((z) => z.y + z.alto));

  return {
    x: minX - MARGEN,
    y: minY - MARGEN,
    ancho: Math.max(1, maxX - minX + MARGEN * 2),
    alto: Math.max(1, maxY - minY + MARGEN * 2),
    escala: UNIDADES_POR_METRO,
  };
}

/** El mismo encuadre pasado a unidades de dibujo, para el `viewBox`. */
export function vistaDe(marco: Encuadre): Vista {
  return {
    x: marco.x * UNIDADES_POR_METRO,
    y: marco.y * UNIDADES_POR_METRO,
    ancho: marco.ancho * UNIDADES_POR_METRO,
    alto: marco.alto * UNIDADES_POR_METRO,
    escala: UNIDADES_POR_METRO,
  };
}

/** Centro de una zona, en metros. */
export function centro(zona: Rectangulo): { x: number; y: number } {
  return { x: zona.x + zona.ancho / 2, y: zona.y + zona.alto / 2 };
}

/** Superficie en metros cuadrados, con un decimal: 3.2 x 4.5 son 14.4 m2. */
export function area(zona: Rectangulo): number {
  return Math.round(zona.ancho * zona.alto * 10) / 10;
}

/**
 * Tolerancia de contacto, en metros.
 *
 * Sin ella, dos zonas que comparten muro se declaran superpuestas: `6.4 + 3.2`
 * da `9.600000000000001` en IEEE 754, no `9.6`, y el plano terminaba avisando
 * de colisiones que no existen. Un muro compartido es lo normal en una planta.
 */
const EPSILON = 1e-9;

export function solapan(a: Rectangulo, b: Rectangulo): boolean {
  return (
    a.x < b.x + b.ancho - EPSILON &&
    b.x < a.x + a.ancho - EPSILON &&
    a.y < b.y + b.alto - EPSILON &&
    b.y < a.y + a.alto - EPSILON
  );
}

/**
 * Zonas que se pisan con `zona`.
 *
 * Dos consultorios superpuestos quiere decir que el plano esta mal, no que la
 * clinica tenga dos salas en el mismo metro cuadrado. Quien lo use lo muestra
 * como aviso: el plano sigue dibujandose, porque Borrar datos de produccion
 * requiere confirmacion de Matias.
 */
export function colisiones(zona: Rectangulo, zonas: Rectangulo[]): Rectangulo[] {
  return zonas.filter((otra) => otra !== zona && solapan(zona, otra));
}

/**
 * Colores de zona en hexadecimal.
 *
 * Todos son valores que YA existen como tokens en `index.css`; aqui se
 * escriben en hex porque SVG y three necesitan un color, no una clase. Si se
 * agrega un color nuevo, se agrega antes el token y despues esta entrada.
 */
export const COLOR_TIPO: Record<string, string> = {
  consultorio: "#3d84b8", // brand-500
  esterilizacion: "#30b0c7", // ios-teal
  recepcion: "#956400", // pastel-yellow-fg
  sala_espera: "#5856d6", // ios-indigo
  laboratorio: "#5b3f9f", // pastel-violet-fg
  almacen: "#ff9500", // ios-orange
  administracion: "#1f6c9f", // pastel-blue-fg
  pasillo: "#d9d5cc", // line-strong
  bano: "#346538", // pastel-green-fg
};

/** Texto e ink del plano, tambien tomados de `index.css`. */
export const COLOR_PLANO = {
  suelo: "#f5f3ef", // surface-sunken
  muro: "#aea89a", // line-field
  texto: "#16233a", // ink
  textoTenue: "#6b6659", // ink-muted
} as const;

/** Opacidad del relleno de la zona segun cuanto esta ocupada. */
export const RELLENO_POR_NIVEL: Record<string, number> = {
  libre: 0.12,
  ocupada: 0.24,
  llena: 0.36,
};

/**
 * Planta de demostracion.
 *
 * Es lo que se ve cuando la clinica todavia no dibujo su planta: una recepcion,
 * tres consultorios, esterilizacion, sala de espera y los servicios de fondo.
 * Las medidas coinciden con consultorios reales de 3.2 x 4.5 m, asi que el plano
 * se lee igual que uno de verdad. Las citas de la demo no tienen `zona_id`, asi
 * que se reparten por `odontologo_id` (ver `plantaAgenda.ts`).
 *
 * Los ids son locales (`demo-...`) a proposito: `plantaService` los rechaza, de
 * modo que la demo nunca se pueda guardar por accidente.
 */
export const ZONAS_DEMO: ReadonlyArray<{
  id: string;
  nombre: string;
  tipo: TipoZona;
  x: number;
  y: number;
  ancho: number;
  alto: number;
  capacidad: number;
  odontologoId: string | null;
  orden: number;
}> = [
  { id: "demo-recepcion", nombre: "Recepción", tipo: "recepcion", x: 0, y: 0, ancho: 5.4, alto: 4, capacidad: 2, odontologoId: null, orden: 1 },
  { id: "demo-espera", nombre: "Sala de espera", tipo: "sala_espera", x: 5.4, y: 0, ancho: 6.6, alto: 4, capacidad: 6, odontologoId: null, orden: 2 },
  { id: "demo-pasillo", nombre: "Pasillo", tipo: "pasillo", x: 0, y: 4, ancho: 12, alto: 2, capacidad: 1, odontologoId: null, orden: 3 },
  { id: "demo-cons-1", nombre: "Consultorio 1", tipo: "consultorio", x: 0, y: 6, ancho: 3.2, alto: 4.5, capacidad: 1, odontologoId: "p1", orden: 4 },
  { id: "demo-cons-2", nombre: "Consultorio 2", tipo: "consultorio", x: 3.2, y: 6, ancho: 3.2, alto: 4.5, capacidad: 1, odontologoId: "p2", orden: 5 },
  { id: "demo-cons-3", nombre: "Consultorio 3", tipo: "consultorio", x: 6.4, y: 6, ancho: 3.2, alto: 4.5, capacidad: 1, odontologoId: "p3", orden: 6 },
  { id: "demo-esterilizacion", nombre: "Esterilización", tipo: "esterilizacion", x: 9.6, y: 6, ancho: 2.4, alto: 4.5, capacidad: 1, odontologoId: null, orden: 7 },
  { id: "demo-laboratorio", nombre: "Laboratorio", tipo: "laboratorio", x: 12, y: 0, ancho: 3, alto: 3, capacidad: 2, odontologoId: null, orden: 8 },
  { id: "demo-almacen", nombre: "Almacén", tipo: "almacen", x: 12, y: 3, ancho: 3, alto: 1, capacidad: 1, odontologoId: null, orden: 9 },
  { id: "demo-bano", nombre: "Baño", tipo: "bano", x: 15, y: 0, ancho: 1.6, alto: 2.2, capacidad: 1, odontologoId: null, orden: 10 },
];

/** Zonas de demostracion ya con la forma de `Zona`. Sin clinica: es una demo. */
export function zonasDemo(): Zona[] {
  return ZONAS_DEMO.map((z) => ({
    id: z.id,
    clinicaId: "",
    nombre: z.nombre,
    tipo: z.tipo,
    piso: 0,
    x: z.x,
    y: z.y,
    ancho: z.ancho,
    alto: z.alto,
    capacidad: z.capacidad,
    odontologoId: z.odontologoId,
    activa: true,
    orden: z.orden,
    notas: "",
  }));
}
/**
 * Motor de interpretación de texto/voz — ver
 * docs/modules/17-asistente-ia/motor-interpretacion.md (fuente de verdad del
 * pipeline). Lógica pura, sin React ni Supabase: corre bajo `node --test`
 * plano, igual que `sintomasArbol.ts`.
 */

/** Minúsculas, sin tildes/diacríticos, sin puntuación, espacios colapsados. */
export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Iguala sonidos que el español confunde todo el tiempo al hablar (seseo,
 * yeísmo, b/v, consonantes dobles) — ataca los errores de *voz*, no los de
 * tipeo. Se aplica sobre texto ya normalizado con `normalizarTexto`.
 */
export function normalizarFonetica(textoNormalizado: string): string {
  return textoNormalizado
    .replace(/ll/g, "y")
    .replace(/rr/g, "r")
    .replace(/v/g, "b")
    .replace(/ce/g, "se")
    .replace(/ci/g, "si")
    .replace(/z/g, "s");
}

/** Las dos normalizaciones juntas: la clave interna de comparación. */
export function clavesDe(texto: string): string {
  return normalizarFonetica(normalizarTexto(texto));
}

/** Distancia de edición (Levenshtein) clásica — ataca los errores de *tipeo*. */
export function distanciaEdicion(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const filas = a.length + 1;
  const columnas = b.length + 1;
  const matriz: number[][] = [];
  for (let i = 0; i < filas; i++) {
    matriz.push(new Array<number>(columnas).fill(0));
    matriz[i][0] = i;
  }
  for (let j = 0; j < columnas; j++) matriz[0][j] = j;

  for (let i = 1; i < filas; i++) {
    for (let j = 1; j < columnas; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      matriz[i][j] = Math.min(
        matriz[i - 1][j] + 1,
        matriz[i][j - 1] + 1,
        matriz[i - 1][j - 1] + costo,
      );
    }
  }
  return matriz[filas - 1][columnas - 1];
}

/** ~1 error tolerado cada 5 caracteres, al menos 1 — evita que palabras muy
 * cortas (2-3 letras) matcheen con cualquier cosa. */
function toleranciaPara(palabra: string): number {
  return Math.max(1, Math.floor(palabra.length / 5));
}

export interface Intencion {
  id: string;
  etiqueta: string;
  /** Palabras o frases clave, en español natural (se normalizan acá adentro). */
  palabrasClave: string[];
}

export interface Candidato {
  id: string;
  etiqueta: string;
  puntaje: number;
}

/**
 * Puntúa cada intención contra el texto del usuario: 1 punto por
 * coincidencia exacta (tras normalizar), 0.6 por coincidencia difusa
 * (distancia de edición dentro de tolerancia). Frases de varias palabras
 * matchean por inclusión en vez de token a token.
 */
export function puntuarIntenciones(textoUsuario: string, intenciones: readonly Intencion[]): Candidato[] {
  const fraseUsuario = clavesDe(textoUsuario);
  const palabrasUsuario = fraseUsuario.split(" ").filter(Boolean);

  return intenciones
    .map((intencion) => {
      let puntaje = 0;
      for (const clave of intencion.palabrasClave) {
        const claveNormalizada = clavesDe(clave);
        if (!claveNormalizada) continue;

        if (claveNormalizada.includes(" ")) {
          if (fraseUsuario.includes(claveNormalizada)) puntaje += 1;
          continue;
        }
        if (palabrasUsuario.includes(claveNormalizada)) {
          puntaje += 1;
          continue;
        }
        const tolerancia = toleranciaPara(claveNormalizada);
        const matcheaDifuso = palabrasUsuario.some(
          (palabra) => distanciaEdicion(palabra, claveNormalizada) <= tolerancia,
        );
        if (matcheaDifuso) puntaje += 0.6;
      }
      return { id: intencion.id, etiqueta: intencion.etiqueta, puntaje };
    })
    .filter((candidato) => candidato.puntaje > 0)
    .sort((a, b) => b.puntaje - a.puntaje);
}

export type ResultadoInterpretacion =
  | { tipo: "ejecutar"; intencionId: string }
  | { tipo: "desambiguar"; opciones: Candidato[] }
  | { tipo: "no_entendido" };

/** Por debajo de esto, ni el mejor candidato alcanza para actuar. */
const UMBRAL_MINIMO = 0.6;
/** Si el segundo candidato queda a menos de este margen del primero, no se
 * adivina: se pregunta. Es la barrera de seguridad central del asistente
 * (ver "Alcance B2" en README.md — nunca actuar con baja confianza). */
const MARGEN_DESAMBIGUACION = 0.4;

export function resolverIntencion(textoUsuario: string, intenciones: readonly Intencion[]): ResultadoInterpretacion {
  const candidatos = puntuarIntenciones(textoUsuario, intenciones);
  if (candidatos.length === 0 || candidatos[0].puntaje < UMBRAL_MINIMO) {
    return { tipo: "no_entendido" };
  }
  const [mejor, segundo] = candidatos;
  if (segundo && mejor.puntaje - segundo.puntaje < MARGEN_DESAMBIGUACION) {
    return { tipo: "desambiguar", opciones: candidatos.slice(0, 3) };
  }
  return { tipo: "ejecutar", intencionId: mejor.id };
}

/**
 * Extrae un nombre buscado de frases como "buscar paciente Juan Pérez" o
 * "abrir a María Gómez". Heurística simple a propósito: si no encuentra
 * nada reconocible, devuelve `null` y el llamador debe caer al
 * comportamiento por defecto (navegar al listado), nunca inventar un nombre.
 */
export function extraerNombreBuscado(textoUsuario: string): string | null {
  const normalizado = normalizarTexto(textoUsuario);
  const patrones = [/paciente(?:s)?\s+(?:de\s+|a\s+)?(.+)/, /\ba\s+(.+)/];
  for (const patron of patrones) {
    const coincidencia = normalizado.match(patron);
    const resto = coincidencia?.[1]?.trim();
    if (resto && resto.length >= 3) return resto;
  }
  return null;
}

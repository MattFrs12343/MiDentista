import { clavesDe } from "./interprete.ts";

/**
 * Capa conversacional del asistente — se evalúa *antes* de intentar
 * resolver una intención de navegación, para que saludos/despedidas/
 * agradecimientos tengan una respuesta cálida en vez de caer en
 * "no entendí". Ver docs/modules/17-asistente-ia/motor-interpretacion.md.
 */

const SALUDOS = ["hola", "buenas", "buenos dias", "buenas tardes", "buenas noches", "que tal", "hey", "ola"];
const DESPEDIDAS = ["chau", "adios", "nos vemos", "hasta luego", "bye", "me voy"];
const AGRADECIMIENTOS = ["gracias", "muchas gracias", "te agradezco", "mil gracias"];
const AFIRMACIONES = ["si", "sisi", "correcto", "exacto", "asi es", "eso es", "eso", "afirmativo", "claro", "dale", "de acuerdo"];

function palabrasClave(texto: string): string[] {
  return clavesDe(texto).split(" ").filter(Boolean);
}

/**
 * Matchea por prefijo, no por igualdad exacta, para tolerar "hola!",
 * "buenas, como estas" — pero exige que el mensaje sea *corto* en total
 * (como mucho 2 palabras más que la frase) para no confundir un saludo al
 * paso ("hola, quiero ver mis pacientes") con un saludo puro: ahí lo que
 * importa es el pedido real, no la cortesía.
 */
function esFraseCorta(texto: string, frases: readonly string[], margenPalabras = 2): boolean {
  const palabras = palabrasClave(texto);
  return frases.some((frase) => {
    const palabrasFrase = palabrasClave(frase);
    if (palabras.length < palabrasFrase.length || palabras.length > palabrasFrase.length + margenPalabras) {
      return false;
    }
    return palabrasFrase.every((palabra, indice) => palabras[indice] === palabra);
  });
}

export function esSaludo(texto: string): boolean {
  return esFraseCorta(texto, SALUDOS);
}

export function esDespedida(texto: string): boolean {
  return esFraseCorta(texto, DESPEDIDAS);
}

export function esAgradecimiento(texto: string): boolean {
  return esFraseCorta(texto, AGRADECIMIENTOS);
}

/** Un "sí" / "así es" / "correcto" sin nombrar ninguna opción — solo tiene
 * sentido chequearlo mientras hay una desambiguación pendiente; ver
 * `AsistenteFlotante.tsx`. */
export function esAfirmacion(texto: string): boolean {
  return esFraseCorta(texto, AFIRMACIONES);
}

/** Primer nombre, para que suene a alguien saludando y no a un formulario. */
function primerNombre(nombreCompleto: string): string {
  return nombreCompleto.trim().split(/\s+/)[0] ?? nombreCompleto;
}

export function generarSaludo(nombre: string, etiquetasIntenciones: readonly string[]): string {
  return `¡Hola, ${primerNombre(nombre)}! Soy MiDentista IA. Puedo ayudarte con ${etiquetasIntenciones.join(", ")}. ¿Qué necesitás?`;
}

export function generarRespuestaDespedida(): string {
  return "¡Que tengas un buen día! Acá voy a estar si necesitás algo más.";
}

export function generarRespuestaAgradecimiento(): string {
  return "¡De nada! ¿Te ayudo con algo más?";
}

export function generarNoEntendido(etiquetasIntenciones: readonly string[]): string {
  return `No alcancé a entender eso. Puedo ayudarte con: ${etiquetasIntenciones.join(", ")}. Decime con otras palabras qué necesitás.`;
}

export function generarPreguntaDesambiguacion(etiquetas: readonly string[]): string {
  return `¿Quisiste decir ${etiquetas.join(" o ")}?`;
}

/** Cuando confirma con un "sí" en vez de repetir el nombre de ninguna de
 * las opciones: no hay (sin un LLM) forma de saber a cuál se refería, así
 * que se lo vuelve a preguntar en vez de caer en "no entendí" — un "sí" sin
 * más contexto no es un error del usuario, es una pregunta nuestra que no
 * dejaba claro cómo contestar con una sola palabra. */
export function generarRespuestaAfirmacionAmbigua(etiquetas: readonly string[]): string {
  return `Necesito que me digas cuál de las dos, para no equivocarme: ${etiquetas.join(" o ")}?`;
}

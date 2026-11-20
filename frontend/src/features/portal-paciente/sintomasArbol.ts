/**
 * Árbol de síntomas del paciente — ver
 * `docs/modules/17-asistente-ia/arbol-sintomas.md` (fuente de verdad de las
 * 15 tarjetas y la regla de severidad). Lógica pura, sin imágenes ni UI:
 * las imágenes se resuelven en `SintomasWizardPage.tsx` (necesitan el
 * bundler de Vite; este archivo corre también bajo `node --test` plano).
 */

export type SintomaId =
  | "dolor_muela"
  | "dolor_mandibula"
  | "sangrado"
  | "inflamacion"
  | "fiebre"
  | "trauma_dental"
  | "sensibilidad"
  | "pus_mal_aliento"
  | "ninguno";

export type Intensidad = "leve" | "moderado" | "severo";
export type Duracion = "horas" | "dias" | "mas_dias";
export type Severidad = "emergencia" | "urgente" | "rutina";

export interface TarjetaSintoma {
  id: SintomaId;
  etiqueta: string;
}

export interface TarjetaOpcion<T extends string> {
  id: T;
  etiqueta: string;
}

/** Paso 1. `ninguno` es excluyente: ver `alSeleccionarSintoma`. */
export const TARJETAS_SINTOMAS: TarjetaSintoma[] = [
  { id: "dolor_muela", etiqueta: "Dolor de muela o diente" },
  { id: "dolor_mandibula", etiqueta: "Dolor de mandíbula o al morder" },
  { id: "sangrado", etiqueta: "Sangrado en la boca o encías" },
  { id: "inflamacion", etiqueta: "Inflamación o hinchazón en la cara/encía" },
  { id: "fiebre", etiqueta: "Fiebre" },
  { id: "trauma_dental", etiqueta: "Diente roto, flojo o que se cayó" },
  { id: "sensibilidad", etiqueta: "Sensibilidad al frío, calor o dulce" },
  { id: "pus_mal_aliento", etiqueta: "Pus, mal sabor o mal aliento fuerte" },
  { id: "ninguno", etiqueta: "Ninguno de estos / no estoy seguro" },
];

export const TARJETAS_INTENSIDAD: TarjetaOpcion<Intensidad>[] = [
  { id: "leve", etiqueta: "Leve" },
  { id: "moderado", etiqueta: "Moderado" },
  { id: "severo", etiqueta: "Severo" },
];

export const TARJETAS_DURACION: TarjetaOpcion<Duracion>[] = [
  { id: "horas", etiqueta: "Hace unas horas" },
  { id: "dias", etiqueta: "Hace 1–2 días" },
  { id: "mas_dias", etiqueta: "Hace más de 3 días" },
];

/** Las tarjetas que disparan los pasos 2 y 3 (ver `arbol-sintomas.md`). */
const SINTOMAS_DE_DOLOR: SintomaId[] = ["dolor_muela", "dolor_mandibula"];

export function requiereIntensidadYDuracion(sintomas: SintomaId[]): boolean {
  return sintomas.some((s) => SINTOMAS_DE_DOLOR.includes(s));
}

/**
 * Selección del paso 1. "Ninguno / no estoy seguro" es excluyente con el
 * resto: marcarlo limpia cualquier otra selección, y marcar cualquier otro
 * síntoma lo desmarca a él.
 */
export function alSeleccionarSintoma(actuales: SintomaId[], id: SintomaId): SintomaId[] {
  if (id === "ninguno") {
    return actuales.includes("ninguno") ? [] : ["ninguno"];
  }
  const sinNinguno = actuales.filter((s) => s !== "ninguno");
  return sinNinguno.includes(id) ? sinNinguno.filter((s) => s !== id) : [...sinNinguno, id];
}

/**
 * Regla de severidad — ver `arbol-sintomas.md`. Se evalúa en orden; el
 * primer caso que matchea define el resultado. La duración no entra en la
 * fórmula: es contexto para el odontólogo, no cambia la clasificación.
 */
export function calcularSeveridad(sintomas: SintomaId[], intensidad: Intensidad | null): Severidad {
  const tiene = (id: SintomaId) => sintomas.includes(id);
  const esSevero = intensidad === "severo";

  if (esSevero && (tiene("fiebre") || tiene("inflamacion"))) return "emergencia";
  if (tiene("trauma_dental") && tiene("sangrado")) return "emergencia";
  if (esSevero) return "urgente";
  if (tiene("pus_mal_aliento") && intensidad === "moderado") return "urgente";
  return "rutina";
}

export interface CondicionPosible {
  nombre: string;
  descripcion: string;
}

/**
 * Posible condición dental — orientativa, nunca un diagnóstico. Se evalúa en
 * orden, igual que `calcularSeveridad`; el primer caso que matchea define el
 * resultado. Es 100% derivada de `sintomas`/`intensidad` (ya guardados): no
 * agrega ninguna columna nueva, se recalcula al mostrarla.
 */
export function calcularCondicionPosible(
  sintomas: SintomaId[],
  intensidad: Intensidad | null,
): CondicionPosible | null {
  const tiene = (id: SintomaId) => sintomas.includes(id);
  const esSevero = intensidad === "severo";
  const tieneDolor = tiene("dolor_muela") || tiene("dolor_mandibula");

  if (tiene("trauma_dental") && tiene("sangrado")) {
    return {
      nombre: "Posible fractura o luxación dental",
      descripcion: "Un golpe reciente con sangrado puede indicar un diente roto, flojo o desplazado de su lugar.",
    };
  }
  if (tiene("trauma_dental")) {
    return {
      nombre: "Posible fractura o aflojamiento dental",
      descripcion: "Un golpe reciente puede haber dañado la estructura del diente, aunque no sangre.",
    };
  }
  if (tieneDolor && esSevero && (tiene("fiebre") || tiene("inflamacion"))) {
    return {
      nombre: "Posible absceso dental",
      descripcion: "Dolor intenso junto con fiebre o hinchazón suele indicar una infección con acumulación de pus.",
    };
  }
  if (tiene("inflamacion") && (tiene("fiebre") || tiene("pus_mal_aliento"))) {
    return {
      nombre: "Posible infección dental",
      descripcion: "La hinchazón junto con fiebre o mal aliento es compatible con una infección activa.",
    };
  }
  if (tieneDolor && esSevero) {
    return {
      nombre: "Posible pulpitis",
      descripcion: "Un dolor dental intenso y persistente suele indicar que el nervio del diente está inflamado.",
    };
  }
  if (tiene("sangrado") && tiene("inflamacion")) {
    return {
      nombre: "Posible enfermedad de las encías (gingivitis o periodontitis)",
      descripcion: "El sangrado junto con inflamación de encías es típico de una enfermedad periodontal.",
    };
  }
  if (tiene("sangrado")) {
    return {
      nombre: "Posible gingivitis",
      descripcion: "El sangrado de encías sin otra causa evidente suele ser el primer signo de gingivitis.",
    };
  }
  if (tiene("pus_mal_aliento")) {
    return {
      nombre: "Posible infección o caries avanzada",
      descripcion: "El mal sabor o aliento persistente puede indicar una infección o una caries sin tratar.",
    };
  }
  if (tieneDolor) {
    return {
      nombre: "Posible caries dental",
      descripcion: "El dolor de diente sin otros signos de alarma suele estar asociado a una caries.",
    };
  }
  if (tiene("sensibilidad")) {
    return {
      nombre: "Posible desgaste de esmalte o caries incipiente",
      descripcion: "La sensibilidad al frío, calor o dulce suele ser una señal temprana de desgaste o caries.",
    };
  }
  return null;
}

export const MENSAJE_SEVERIDAD: Record<Severidad, string> = {
  emergencia:
    "Esto podría ser una urgencia dental. Te recomendamos contactar a tu clínica lo antes posible, sin esperar un turno normal.",
  urgente:
    "Convendría que te atiendas pronto. Te recomendamos pedir un turno a la brevedad en vez de esperar.",
  rutina:
    "Por lo que contaste, parece una consulta de rutina. Podés agendar tu cita con tranquilidad.",
};

import type { Duracion, Intensidad, Severidad, SintomaId } from "./sintomasArbol.ts";

export interface PrediagnosticoFila {
  id: string;
  clinica_id: string;
  paciente_id: string;
  sintomas: unknown;
  intensidad: string | null;
  duracion: string | null;
  severidad: string;
  creado_en: string | null;
}

export interface PrediagnosticoContenido {
  sintomas: SintomaId[];
  intensidad: Intensidad | null;
  duracion: Duracion | null;
  severidad: Severidad;
}

export function esUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);
}

const SINTOMA_IDS: readonly SintomaId[] = [
  "dolor_muela",
  "dolor_mandibula",
  "sangrado",
  "inflamacion",
  "fiebre",
  "trauma_dental",
  "sensibilidad",
  "pus_mal_aliento",
  "ninguno",
];
const INTENSIDADES: readonly Intensidad[] = ["leve", "moderado", "severo"];
const DURACIONES: readonly Duracion[] = ["horas", "dias", "mas_dias"];
const SEVERIDADES: readonly Severidad[] = ["emergencia", "urgente", "rutina"];

function esSintomaId(valor: unknown): valor is SintomaId {
  return typeof valor === "string" && (SINTOMA_IDS as readonly string[]).includes(valor);
}

/** Datos viejos o corruptos no se descartan en silencio: un valor fuera de
 * las listas conocidas es un bug a investigar, no un "sin dato". */
function leerSintomas(valor: unknown, columna: string): SintomaId[] {
  if (!Array.isArray(valor)) {
    throw new Error(`La columna ${columna} debe contener un arreglo JSON de síntomas.`);
  }
  return valor.map((item) => {
    if (!esSintomaId(item)) throw new Error(`La columna ${columna} contiene un síntoma desconocido: ${String(item)}.`);
    return item;
  });
}

function leerIntensidad(valor: string | null): Intensidad | null {
  if (valor === null) return null;
  if (!(INTENSIDADES as readonly string[]).includes(valor)) {
    throw new Error(`intensidad contiene un valor desconocido: ${valor}.`);
  }
  return valor as Intensidad;
}

function leerDuracion(valor: string | null): Duracion | null {
  if (valor === null) return null;
  if (!(DURACIONES as readonly string[]).includes(valor)) {
    throw new Error(`duracion contiene un valor desconocido: ${valor}.`);
  }
  return valor as Duracion;
}

function leerSeveridad(valor: string): Severidad {
  if (!(SEVERIDADES as readonly string[]).includes(valor)) {
    throw new Error(`severidad contiene un valor desconocido: ${valor}.`);
  }
  return valor as Severidad;
}

export function prediagnosticoDesdeFila(fila: PrediagnosticoFila): PrediagnosticoContenido {
  return {
    sintomas: leerSintomas(fila.sintomas, "sintomas"),
    intensidad: leerIntensidad(fila.intensidad),
    duracion: leerDuracion(fila.duracion),
    severidad: leerSeveridad(fila.severidad),
  };
}

export function prediagnosticoParaGuardar(
  contenido: PrediagnosticoContenido,
): Pick<PrediagnosticoFila, "sintomas" | "intensidad" | "duracion" | "severidad"> {
  return {
    sintomas: contenido.sintomas,
    intensidad: contenido.intensidad,
    duracion: contenido.duracion,
    severidad: contenido.severidad,
  };
}

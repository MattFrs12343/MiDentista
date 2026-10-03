/**
 * Mapper de `zonas_clinica`: tipos de fila, validacion y traduccion en las dos
 * direcciones. Sigue el patron de `features/clinical/clinicalHistoryMapper.ts`:
 * lo que no se puede traducir con certeza lanza error, no se convierte en
 * silencio en un valor por defecto.
 */

import {
  TIPOS_ZONA,
  type CitaDePlanta,
  type TipoZona,
  type Zona,
} from "./tipos.ts";

/** Fila de `citas` con las dos columnas que conectan la agenda con la planta. */
export interface CitaDePlantaFila {
  id: string;
  paciente_id: string;
  odontologo_id: string | null;
  zona_id: string | null;
  fecha_cita: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  motivo_consulta: string | null;
}

const ESTADOS = new Set<CitaDePlanta["estado"]>(["reservada", "confirmada", "atendida", "cancelada"]);

/**
 * Cita de la planta.
 *
 * A diferencia de `mapaCita` del store, aqui un estado desconocido no se pasa
 * como si fuera "reservada": una cita con estado raro no se puede dibujar en el
 * plano sin saber si ocupa el consultorio, asi que se descarta y se cuenta en
 * `sinZona`.
 */
export function citaDePlantaDesdeFila(fila: CitaDePlantaFila): CitaDePlanta | null {
  const estado = fila.estado as CitaDePlanta["estado"];
  if (!ESTADOS.has(estado)) return null;
  return {
    id: fila.id,
    pacienteId: fila.paciente_id,
    odontologoId: fila.odontologo_id ?? null,
    zonaId: fila.zona_id ?? null,
    fechaCita: String(fila.fecha_cita).slice(0, 10),
    horaInicio: String(fila.hora_inicio).slice(0, 5),
    horaFin: String(fila.hora_fin).slice(0, 5),
    estado,
    motivoConsulta: fila.motivo_consulta ?? "",
  };
}

/** Fila tal como la devuelve PostgREST. Solo las columnas que se piden. */
export interface ZonaFila {
  id: string;
  clinica_id: string;
  nombre: string;
  tipo: string;
  piso: number;
  x: number;
  y: number;
  ancho: number;
  alto: number;
  capacidad: number;
  odontologo_id: string | null;
  activa: boolean;
  orden: number;
  notas: string | null;
  creado_en: string | null;
  actualizado_en: string | null;
}

export function esUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);
}

export function esTipoZonaValido(valor: unknown): valor is TipoZona {
  return typeof valor === "string" && (TIPOS_ZONA as readonly string[]).includes(valor);
}

/**
 * Postgres devuelve los `numeric` como cadena para no perder precision. Un
 * numero de la base que no se puede leer no se redondea a 0: eso pondria una
 * zona de 4x5 metros en el origen y la superpondria con otra.
 */
function numero(valor: unknown, columna: string): number {
  const n = typeof valor === "number" ? valor : Number(String(valor ?? "").trim());
  if (!Number.isFinite(n)) {
    throw new Error(`La columna ${columna} no es un numero valido. Revisa el registro existente.`);
  }
  return n;
}

function enteroNoNegativo(valor: unknown, columna: string): number {
  const n = numero(valor, columna);
  if (n < 0 || !Number.isInteger(n)) {
    throw new Error(`La columna ${columna} debe ser un entero no negativo.`);
  }
  return n;
}

/**
 * Una zona con superficie positiva. Un rectangulo de ancho 0 no se puede
 * seleccionar ni occupationar, asi que se considera dato corruptos y no una
 * zona vacia.
 */
function medidas(fila: ZonaFila): { x: number; y: number; ancho: number; alto: number } {
  const medidas = {
    x: numero(fila.x, "x"),
    y: numero(fila.y, "y"),
    ancho: numero(fila.ancho, "ancho"),
    alto: numero(fila.alto, "alto"),
  };
  if (medidas.ancho <= 0 || medidas.alto <= 0) {
    throw new Error(`La zona "${fila.nombre}" no tiene superficie (${medidas.ancho} x ${medidas.alto}).`);
  }
  return medidas;
}

export function zonaDesdeFila(fila: ZonaFila): Zona {
  if (!esTipoZonaValido(fila.tipo)) {
    throw new Error(
      `La zona "${fila.nombre}" tiene un tipo desconocido ("${fila.tipo}"). Revisa el registro antes de dibujarla.`,
    );
  }
  if (!fila.nombre.trim()) {
    throw new Error("Hay una zona sin nombre. El plano necesita un nombre para poder leerla.");
  }

  const { x, y, ancho, alto } = medidas(fila);
  return {
    id: fila.id,
    clinicaId: fila.clinica_id,
    nombre: fila.nombre.trim(),
    tipo: fila.tipo,
    piso: enteroNoNegativo(fila.piso, "piso"),
    x,
    y,
    ancho,
    alto,
    capacidad: Math.max(1, enteroNoNegativo(fila.capacidad, "capacidad")),
    odontologoId: fila.odontologo_id ?? null,
    activa: fila.activa !== false,
    orden: enteroNoNegativo(fila.orden, "orden"),
    notas: fila.notas ?? "",
    ...(fila.creado_en ? { creadoEn: fila.creado_en } : {}),
  };
}

/**
 * Contenido de una zona en columnas de la tabla, tal como lo espera PostgREST.
 *
 * No se devuelve el `Zona` de la app porque los nombres son distintos
 * (`odontologoId` en el dominio, `odontologo_id` en la base): mezclar los dos
 * niveles en un solo objeto es como aparecen los errores de "columna no existe"
 * que solo se ven en produccion.
 */
export interface ZonaContenidoFila {
  nombre: string;
  tipo: TipoZona;
  piso: number;
  x: number;
  y: number;
  ancho: number;
  alto: number;
  capacidad: number;
  odontologo_id: string | null;
  activa: boolean;
  orden: number;
  notas: string;
}

/**
 * Fila de escritura completa, con las columnas que solo fija la base de datos.
 * El `clinica_id` va explicito en vez de deducirse de la sesion para que un
 * `UPDATE` no pueda tocar las zonas de otra clinica por un forgot de filtro.
 */
export interface ZonaFilaGuardar extends ZonaContenidoFila {
  clinica_id: string;
}

export function zonaParaGuardar(zona: Zona): ZonaFilaGuardar {
  return {
    clinica_id: zona.clinicaId,
    nombre: zona.nombre.trim(),
    tipo: zona.tipo,
    piso: zona.piso,
    x: zona.x,
    y: zona.y,
    ancho: zona.ancho,
    alto: zona.alto,
    capacidad: zona.capacidad,
    odontologo_id: zona.odontologoId,
    activa: zona.activa,
    orden: zona.orden,
    notas: zona.notas,
  };
}

/** Zona en blanco para el formulario de alta. Sin id: lo aporta la BD. */
export function crearZonaVacia(
  clinicaId: string,
  tipo: TipoZona = "consultorio",
  geometria: { x: number; y: number; ancho: number; alto: number } = {
    x: 0,
    y: 0,
    ancho: 3.2,
    alto: 4.5,
  },
): Zona {
  return {
    id: "",
    clinicaId,
    nombre: "",
    tipo,
    piso: 0,
    x: geometria.x,
    y: geometria.y,
    ancho: geometria.ancho,
    alto: geometria.alto,
    capacidad: 1,
    odontologoId: null,
    activa: true,
    orden: 0,
    notas: "",
  };
}
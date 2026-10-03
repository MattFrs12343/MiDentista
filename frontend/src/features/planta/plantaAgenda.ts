/**
 * Agenda sobre la planta: que zona esta ocupada y cuando.
 *
 * Reutiliza la logica de `features/agenda/agenda.ts` en vez de duplicarla:
 * `minutosDe` (HH:MM -> minutos) y `ejeDelDia` (la jornada del odontologo, no
 * la de las citas). Si el eje se calculara aqui con las citas, un dia con una
 * sola cita de 10:00 a 11:00 llenaria el plano y se perderia la referencia de
 * la jornada. El filtro por fecha se reimplementa en `delDia` porque el de la
 * agenda devuelve `Cita[]` y al pasar por el se pierden `odontologoId` y
 * `zonaId`.
 *
 * La cita que se dibuja sobre la planta es `CitaDePlanta` (ver `tipos.ts`), no
 * la `Cita` del store: el store mapea las filas y descarta `odontologo_id` y
 * `zona_id`, que son justamente las columnas que dicen en que consultorio se
 * atiende. Quien use el store tiene que aceptar que esas citas no se pueden
 * ubicar.
 */

import type { Horario } from "../../types/index.ts";
// Ruta relativa y no alias `@/`: este archivo se ejercita con `node --test`, que
// no resuelve el alias de Vite. Los tipos si pueden usar `@/`, porque `import
// type` se borra al compilar y nunca llega a ejecutarse.
import { ejeDelDia, minutosDe, rangoHorario } from "../agenda/agenda.ts";
import type { CitaDePlanta, NivelOcupacion, Zona } from "./tipos.ts";

export interface EjeDia {
  inicio: number;
  fin: number;
}

/** Desde este porcentaje de jornada ocupada la zona se ve "ocupada". */
export const UMBRAL_OCUPADA = 0.4;

/** A este porcentaje ya no cabe mas gente: la zona esta al tope. */
export const UMBRAL_LLENA = 0.85;

export interface OcupacionZona {
  /** Todas las citas del dia en la zona, incluidas las canceladas. */
  citas: CitaDePlanta[];
  /** Cuantas ocupan el turno de verdad: una reserva cancelada no ocupa nada. */
  activas: number;
  /** Minutos de la jornada con alguna cita encima, ya sin solapes. */
  minutosOcupados: number;
  /** 0..1 sobre la jornada del dia. */
  proporcion: number;
  nivel: NivelOcupacion;
  /** La cita que esta en curso ahora, si la hay. */
  enCurso: CitaDePlanta | null;
  /** La proxima cita que todavia no empezo. */
  siguiente: CitaDePlanta | null;
}

/** Zona sin citas. Se devuelve el mismo objeto para no crear uno por render. */
export const OCUPACION_VACIA: OcupacionZona = {
  citas: [],
  activas: 0,
  minutosOcupados: 0,
  proporcion: 0,
  nivel: "libre",
  enCurso: null,
  siguiente: null,
};

/**
 * Dia de la semana de una fecha ISO, con la convencion de `agenda.ts`
 * (0 domingo .. 6 sabado). Se ancla al mediodia para que el cambio de hora de
 * Bolivia no mueva el dia de la cita.
 */
export function diaDe(iso: string): number {
  const [anio, mes, dia] = iso.split("-").map(Number);
  return new Date(anio, mes - 1, dia, 12, 0, 0, 0).getDay();
}

/** Eje de la jornada de esa fecha, derivado de los horarios del odontologo. */
export function ejeDe(horarios: Horario[], fecha: string): EjeDia {
  return ejeDelDia(horarios, diaDe(fecha));
}

/** Minutos desde medianoche en este momento. */
export function minutosDeAhora(ahora = new Date()): number {
  return ahora.getHours() * 60 + ahora.getMinutes();
}

/** Indice odontologo -> zona, para las citas que aun no declaran `zona_id`. */
export function indicePorOdontologo(zonas: Zona[]): Map<string, Zona> {
  const indice = new Map<string, Zona>();
  for (const zona of zonas) {
    if (!zona.odontologoId || indice.has(zona.odontologoId)) continue;
    indice.set(zona.odontologoId, zona);
  }
  return indice;
}

/** Zona donde se atiende una cita: la que declara, o la del odontologo. */
export function zonaDeCita(
  cita: CitaDePlanta,
  zonasPorId: Map<string, Zona>,
  zonasPorOdontologo: Map<string, Zona>,
): Zona | null {
  if (cita.zonaId) return zonasPorId.get(cita.zonaId) ?? null;
  return zonasPorOdontologo.get(cita.odontologoId ?? "") ?? null;
}

/**
 * Citas del dia repartidas por zona.
 *
 * Una cita que no se puede ubicar no se descarta en silencio: va a `sinZona`,
 * para que la vista pueda decir "hay 2 citas que el plano no muestra" en vez de
 * dibujar un plano que parece completo y no lo es.
 */
export function citasPorZona(
  citas: CitaDePlanta[],
  fecha: string,
  zonas: Zona[],
): { porZona: Map<string, CitaDePlanta[]>; sinZona: CitaDePlanta[] } {
  const porZona = new Map<string, CitaDePlanta[]>();
  const sinZona: CitaDePlanta[] = [];
  const zonasPorId = new Map(zonas.map((z) => [z.id, z]));
  const zonasPorOdontologo = indicePorOdontologo(zonas);

  for (const cita of delDia(citas, fecha)) {
    const zona = zonaDeCita(cita, zonasPorId, zonasPorOdontologo);
    if (!zona) {
      sinZona.push(cita);
      continue;
    }
    const lista = porZona.get(zona.id) ?? [];
    lista.push(cita);
    porZona.set(zona.id, lista);
  }

  return { porZona, sinZona };
}

/**
 * Citas de una fecha, ordenadas por hora de inicio.
 *
 * Es el mismo criterio que `citasDeFecha` de `agenda.ts` (mismo filtro, mismo
 * orden por hora y desempate por id), pero tipado con `CitaDePlanta`. No se
 * reusa el de la agenda porque devuelve `Cita[]`: al pasar por el, el
 * compilador tira las dos columnas que dicen en que zona se atiende la cita y
 * el plano deja de poder ubicarla.
 */
function delDia(citas: ReadonlyArray<CitaDePlanta>, fecha: string): CitaDePlanta[] {
  return citas
    .filter((c) => String(c.fechaCita).slice(0, 10) === fecha)
    .sort((a, b) => minutosDe(a.horaInicio) - minutosDe(b.horaInicio) || a.id.localeCompare(b.id));
}

/**
 * Ocupacion de una zona en el dia.
 *
 * Los minutos se cuentan por minuto marcado y no sumando la duracion de cada
 * cita: dos citas encimadas ocupan el consultorio una vez, no el doble. Sin
 * esto un consultorio con un solape se marcaria lleno.
 *
 * Ademas cada cita se recorta al eje de la jornada. Una cita de 07:30 a 19:00
 * en una jornada de 08:00 a 18:00 no puede "ocupar" 690 minutos de un eje de
 * 600: eso marcaria como lleno un consultorio que estuvo libre dos horas.
 */
export function ocupacionDeZona(
  citas: CitaDePlanta[],
  eje: EjeDia,
  ahora = minutosDeAhora(),
): OcupacionZona {
  const total = Math.max(1, eje.fin - eje.inicio);
  const delDia = [...citas].sort((a, b) => minutosDe(a.horaInicio) - minutosDe(b.horaInicio));
  const activas = delDia.filter((c) => c.estado !== "cancelada");

  const minutos = new Set<number>();
  let enCurso: CitaDePlanta | null = null;
  let siguiente: CitaDePlanta | null = null;

  for (const cita of activas) {
    const inicio = minutosDe(cita.horaInicio);
    const fin = minutosDe(cita.horaFin);
    // una cita con horas invalidas o invertidas no ocupa nada y se ignora: es un
    // dato roto de la agenda, no una zona ocupada
    if (Number.isNaN(inicio) || Number.isNaN(fin) || fin <= inicio) continue;
    for (let m = Math.max(inicio, eje.inicio); m < Math.min(fin, eje.fin); m++) minutos.add(m);
    if (inicio <= ahora && ahora < fin) enCurso = cita;
    if (inicio > ahora && siguiente === null) siguiente = cita;
  }

  const minutosOcupados = minutos.size;
  const proporcion = Math.min(1, minutosOcupados / total);
  const nivel: NivelOcupacion =
    proporcion >= UMBRAL_LLENA ? "llena" : proporcion >= UMBRAL_OCUPADA ? "ocupada" : "libre";

  return { citas: delDia, activas: activas.length, minutosOcupados, proporcion, nivel, enCurso, siguiente };
}

/**
 * Ocupacion de todo el plano en un dia.
 *
 * Devuelve tambien las citas que no se pudieron ubicar, para que la vista no
 * finja que el plano muestra toda la agenda.
 */
export function ocupacionDePlanta(
  citas: CitaDePlanta[],
  horarios: Horario[],
  fecha: string,
  zonas: Zona[],
  ahora = minutosDeAhora(),
): {
  eje: EjeDia;
  porZona: Map<string, OcupacionZona>;
  sinZona: CitaDePlanta[];
  totalCitas: number;
  zonasEnCurso: number;
} {
  const eje = ejeDe(horarios, fecha);
  const { porZona, sinZona } = citasPorZona(citas, fecha, zonas);

  const ocupacion = new Map<string, OcupacionZona>();
  let zonasEnCurso = 0;
  for (const zona of zonas) {
    const dato = ocupacionDeZona(porZona.get(zona.id) ?? [], eje, ahora);
    ocupacion.set(zona.id, dato);
    if (dato.enCurso) zonasEnCurso++;
  }

  const totalCitas = [...ocupacion.values()].reduce((n, o) => n + o.activas, 0);
  return { eje, porZona: ocupacion, sinZona, totalCitas, zonasEnCurso };
}

/**
 * Posicion del "ahora" en el eje, como fraccion 0..1, o `null` fuera de la
 * jornada: antes de abrir o despues de cerrar no se dibuja la linea, porque una
 * marca en el extremo engaña sobre si el consultorio esta trabajando.
 */
export function fraccionDeAhora(eje: EjeDia, ahora = minutosDeAhora()): number | null {
  if (ahora < eje.inicio || ahora > eje.fin) return null;
  return (ahora - eje.inicio) / Math.max(1, eje.fin - eje.inicio);
}

/** Fraccion 0..1 de un instante dentro de la jornada, recortada al eje. */
export function fraccion(eje: EjeDia, minutos: number): number {
  const total = Math.max(1, eje.fin - eje.inicio);
  return Math.min(1, Math.max(0, (minutos - eje.inicio) / total));
}

/** "9:00 - 9:30 · Limpieza", para el detalle de zona. */
export function lineaDeCita(cita: CitaDePlanta): string {
  return `${rangoHorario(cita.horaInicio, cita.horaFin)} · ${cita.motivoConsulta || "Consulta"}`;
}

/** Minutos ocupados de todo el plano. */
export function minutosTotales(porZona: Map<string, OcupacionZona>): number {
  let total = 0;
  for (const zona of porZona.values()) total += zona.minutosOcupados;
  return total;
}

/**
 * Citas del store como `CitaDePlanta`, sin `odontologo_id` ni `zona_id`.
 *
 * El store mapea las filas a la `Cita` de `@/types`, que no tiene esas
 * columnas, asi que la unica forma de no inventar el vinculo es devolverlas
 * con el vinculo en null. `citasPorZona` las manda a `sinZona` y la vista lo
 * dice en pantalla en vez de dibujar un plano que parece completo.
 */
export function citasComoDePlanta(
  citas: ReadonlyArray<{
    id: string;
    pacienteId: string;
    fechaCita: string;
    horaInicio: string;
    horaFin: string;
    estado: CitaDePlanta["estado"];
    motivoConsulta: string;
  }>,
): CitaDePlanta[] {
  return citas.map((c) => ({
    id: c.id,
    pacienteId: c.pacienteId,
    odontologoId: null,
    zonaId: null,
    fechaCita: c.fechaCita,
    horaInicio: c.horaInicio,
    horaFin: c.horaFin,
    estado: c.estado,
    motivoConsulta: c.motivoConsulta,
  }));
}
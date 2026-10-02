/**
 * Logica de agenda, sin React y sin librerias de fechas (el proyecto no tiene
 * date-fns/dayjs/luxon, asi que las utilidades de fecha viven aqui y se prueban
 * aparte).
 *
 * Decisiones que importan:
 *
 *  - Las fechas se manejan como cadenas `YYYY-MM-DD`, no como `Date`. Dos motivos:
 *    comparar fechas con `<` es exacto, y un `Date` arrastra zona horaria y
 *    horario de verano, que en un turno de 08:00 a 18:00 no puede cambiar la
 *    agenda. `new Date("2026-03-08")` se interpreta en UTC y en Bolivia puede
 *    caer en el dia anterior.
 *
 *  - Cuando hace falta un `Date` (para `getDay()`), se ancla al mediodia. El
 *    cambio de hora en Bolivia ocurre de madrugada, asi que el mediodia siempre
 *    pertenece al dia que se quiere consultar.
 */

import type { Cita, EstadoCita, Horario } from "@/types";

export const MIN_POR_HORA = 60;

/** Etiqueta de estado, en el vocabulario del dominio y no en el del codigo. */
export const ETIQUETA_ESTADO: Record<EstadoCita, string> = {
  reservada: "Reservada",
  confirmada: "Confirmada",
  atendida: "Atendida",
  cancelada: "Cancelada",
};

/** Colores alineados con los tokens iOS ya definidos en index.css. */
export const COLOR_ESTADO: Record<EstadoCita, string> = {
  reservada: "bg-[#eef2f8] text-[#3d648b] border-[#cfdeef]",
  confirmada: "bg-[#e7f0fa] text-[#2b5c8f] border-[#bcd6f0]",
  atendida: "bg-[#e6f4ea] text-[#2f6b48] border-[#bfe0ca]",
  cancelada: "bg-[#f2f1ef] text-[#8e8e93] border-[#e0dedb] line-through",
};

export const DIAS_CORTO = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const DIAS_LARGO = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

// --- fechas como cadena -------------------------------------------------------

export function hoyISO(): string {
  return aISO(new Date());
}

/** YYYY-MM-DD a partir de las partes locales, nunca de `toISOString()`. */
export function aISO(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** Ancla al mediodia para que getDay() no cambie por el horario de verano. */
function desdeISO(iso: string): Date {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d, 12, 0, 0, 0);
}

/** Suma dias a una fecha ISO. Acepta negativos para retroceder. */
export function sumaDias(iso: string, dias: number): string {
  const d = desdeISO(iso);
  d.setDate(d.getDate() + dias);
  return aISO(d);
}

/** 0 domingo .. 6 sabado, igual que `Date.getDay()`. */
export function diaSemana(iso: string): number {
  return desdeISO(iso).getDay();
}

/** Lunes de la semana a la que pertenece `iso`. */
export function inicioDeSemana(iso: string): string {
  const dow = diaSemana(iso);
  // el domingo es dia 0 y en un consultorio cierra: el lunes es el inicio, y la
  // semana va de lunes a domingo. Se retrocede `dow === 0 ? 6 : dow - 1`.
  return sumaDias(iso, dow === 0 ? -6 : 1 - dow);
}

/** Lunes a sabado de la semana de `iso`, como el inicio semanal mas los 6 dias. */
export function diasLaborables(semanaISO: string): string[] {
  return Array.from({ length: 6 }, (_, i) => sumaDias(semanaISO, i));
}

export function esHoy(iso: string, hoy = hoyISO()): boolean {
  return iso === hoy;
}

/** "2026-03-09" -> "9 mar" */
export function etiquetaCorta(iso: string): string {
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const d = desdeISO(iso);
  return `${d.getDate()} ${meses[d.getMonth()]}`;
}

/** "2026-03-09" -> "Lunes 9 de marzo" */
export function etiquetaLarga(iso: string): string {
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  const d = desdeISO(iso);
  return `${DIAS_LARGO[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]}`;
}

// --- horas como HH:MM ---------------------------------------------------------

/** "09:30" -> 570. Devuelve NaN si el formato no es HH:MM valido. */
export function minutosDe(hora: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hora);
  if (!m) return NaN;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return NaN;
  return h * MIN_POR_HORA + min;
}

/** "08:00" -> "8:00". Los minutos en cero no se muestran: "09:00" -> "9:00". */
export function formatoHora(hora: string): string {
  const min = minutosDe(hora);
  if (Number.isNaN(min)) return hora;
  const h = Math.floor(min / MIN_POR_HORA);
  const m = min % MIN_POR_HORA;
  return m === 0 ? `${h}:00` : `${h}:${String(m).padStart(2, "0")}`;
}

export function rangoHorario(horaInicio: string, horaFin: string): string {
  return `${formatoHora(horaInicio)} - ${formatoHora(horaFin)}`;
}

export function duracionMinutos(horaInicio: string, horaFin: string): number {
  return minutosDe(horaFin) - minutosDe(horaInicio);
}

// --- citas ---------------------------------------------------------------------

export function citasDeFecha(citas: Cita[], fecha: string): Cita[] {
  return citas
    .filter((c) => c.fechaCita === fecha)
    .sort((a, b) => minutosDe(a.horaInicio) - minutosDe(b.horaInicio) || a.id.localeCompare(b.id));
}

/** Cuenta por estado para un dia. Las canceladas no cuentan como ocupacion. */
export function estadisticasDelDia(
  citas: Cita[],
  fecha: string,
): Record<EstadoCita, number> & { total: number } {
  const base: Record<EstadoCita, number> = { reservada: 0, confirmada: 0, atendida: 0, cancelada: 0 };
  for (const c of citasDeFecha(citas, fecha)) base[c.estado]++;
  return { ...base, total: base.reservada + base.confirmada + base.atendida };
}

/** Citas ya atendidas de un dia, en orden de hora. */
export function atendidasDe(citas: Cita[], fecha: string): Cita[] {
  return citasDeFecha(citas, fecha).filter((c) => c.estado === "atendida");
}

/** Lo que queda por atender hoy: reservada + confirmada, sin las ya atendidas. */
export function pendientesDe(citas: Cita[], fecha: string): Cita[] {
  return citasDeFecha(citas, fecha).filter(
    (c) => c.estado === "reservada" || c.estado === "confirmada",
  );
}

/**
 * Transiciones permitidas del ciclo de vida, segun
 * `docs/figuras_monografia/estado_cita.puml`:
 *
 *   reservada -> confirmada -> atendida
 *   reservada   -> cancelada
 *   confirmada  -> cancelada
 *
 * `atendida` y `cancelada` son terminales. No hay regreso: una consulta
 * realizada no vuelve a estar pendiente, y reabrir una cita cancelada se hace
 * reservando de nuevo, no reviviendo el mismo registro.
 */
const TRANSICIONES: Record<EstadoCita, EstadoCita[]> = {
  reservada: ["confirmada", "cancelada"],
  confirmada: ["atendida", "cancelada"],
  atendida: [],
  cancelada: [],
};

export function puedeTransicionar(desde: EstadoCita, hacia: EstadoCita): boolean {
  return desde === hacia || TRANSICIONES[desde].includes(hacia);
}

/** Siguiente paso natural del ciclo, o null si ya llego a un estado terminal. */
export function siguienteEstado(estado: EstadoCita): EstadoCita | null {
  if (estado === "reservada") return "confirmada";
  if (estado === "confirmada") return "atendida";
  return null;
}

/**
 * Dos citas se pisan si comparten minutos. Devuelve los pares que se solapan
 * dentro del mismo dia, ignorando las canceladas: un hueco reservado que el
 * paciente cancelo no genera conflicto.
 */
export function solapes(citas: Cita[]): [Cita, Cita][] {
  const pares: [Cita, Cita][] = [];
  const porDia = new Map<string, Cita[]>();
  for (const c of citas) {
    if (c.estado === "cancelada") continue;
    const lista = porDia.get(c.fechaCita) ?? [];
    lista.push(c);
    porDia.set(c.fechaCita, lista);
  }
  for (const lista of porDia.values()) {
    const ordenadas = [...lista].sort(
      (a, b) => minutosDe(a.horaInicio) - minutosDe(b.horaInicio),
    );
    for (let i = 0; i < ordenadas.length; i++) {
      for (let j = i + 1; j < ordenadas.length; j++) {
        if (minutosDe(ordenadas[j].horaInicio) < minutosDe(ordenadas[i].horaFin)) {
          pares.push([ordenadas[i], ordenadas[j]]);
        } else {
          // ordenadas por inicio: si esta empieza despues de que termina la
          // anterior, no puede pisar a ninguna de las que quedan
          break;
        }
      }
    }
  }
  return pares;
}

// --- rejilla del calendario ----------------------------------------------------

export interface Franja {
  hora: string;
  /** porcentaje 0..100 dentro del eje del dia */
  top: number;
  /** porcentaje 0..100 dentro del eje del dia */
  height: number;
  /** indice de columna dentro del dia, para separar citas solapadas */
  columna: number;
  /** cuantas citas comparten esa misma columna */
  columnas: number;
}

/**
 * Alto minimo de una cita, en porcentaje del eje. Una cita de 15 minutos en una
 * jornada de 10 horas ocupa el 2,5% real, que en una rejilla de 500px son 12px:
 * ilegible y sin area tactil. El suelo se aplica sobre el PORCENTAJE, no sobre
 * los minutos, porque lo que importa es el alto final en pantalla. El `top` se
 * respeta tal cual, asi que la cita no se corre de su hora.
 */
export const MIN_ALTO_FRANJA = 4;

/**
 * Eje vertical del dia, derivado de los horarios del odontologo y no de las
 * citas: si el eje se calculara con las citas, un dia con una sola cita de 10:00
 * a 11:00 llenaria la pantalla entera y perderia la referencia de la jornada.
 */
export function ejeDelDia(horarios: Horario[], dia: number): {
  inicio: number;
  fin: number;
} {
  const delDia = horarios.filter((h) => h.activo && h.diaSemana === dia);
  if (!delDia.length) return { inicio: 8 * 60, fin: 18 * 60 };
  const inicio = Math.min(...delDia.map((h) => minutosDe(h.horaInicio)));
  const fin = Math.max(...delDia.map((h) => minutosDe(h.horaFin)));
  // se redondea a horas para que las lineas de la rejilla caigan en :00 y no en
  // una hora y cuarto, que es donde el consultorio no trabaja
  return {
    inicio: Math.floor(inicio / 60) * 60,
    fin: Math.ceil(fin / 60) * 60,
  };
}

/** Horas redondas que se dibujan como linea de fondo del eje. */
export function lineasDeRejilla(eje: { inicio: number; fin: number }): number[] {
  const horas: number[] = [];
  for (let m = eje.inicio; m <= eje.fin; m += 60) horas.push(m);
  return horas;
}

/**
 * Coloca cada cita dentro del eje del dia en porcentajes, separando en columnas
 * las que se solapan. Devuelve la cita junto a su franja para que quien lo use
 * no tenga que volver a emparejar por indice, que es donde se puede meter un
 * error en cuanto dos citas se pisan.
 */
export function ubicaEnEje(
  citas: Cita[],
  eje: { inicio: number; fin: number },
): { cita: Cita; franja: Franja }[] {
  const total = Math.max(1, eje.fin - eje.inicio);
  const activas = citas.filter((c) => c.estado !== "cancelada");
  const ordenadas = [...activas].sort(
    (a, b) => minutosDe(a.horaInicio) - minutosDe(b.horaInicio),
  );

  const salida: { cita: Cita; franja: Franja }[] = [];
  let grupo: Cita[] = [];
  let finDeGrupo = -Infinity;

  const cerrarGrupo = () => {
    if (!grupo.length) return;
    // dentro de un grupo que se pisa, cada cita se reparte el ancho en partes
    // iguales segun el orden en que empieza
    grupo.forEach((cita, i) => {
      const ini = minutosDe(cita.horaInicio);
      const fin = minutosDe(cita.horaFin);
      salida.push({
        cita,
        franja: {
          hora: cita.horaInicio,
          top: ((ini - eje.inicio) / total) * 100,
          height: Math.max(MIN_ALTO_FRANJA, ((fin - ini) / total) * 100),
          columna: i,
          columnas: grupo.length,
        },
      });
    });
    grupo = [];
    finDeGrupo = -Infinity;
  };

  for (const cita of ordenadas) {
    const inicio = minutosDe(cita.horaInicio);
    if (grupo.length && inicio >= finDeGrupo) cerrarGrupo();
    grupo.push(cita);
    finDeGrupo = Math.max(finDeGrupo, minutosDe(cita.horaFin));
  }
  cerrarGrupo();

  return salida;
}

/** Las citas con su franja, indexadas por id de cita. */
export function franjasPorCita(
  citas: Cita[],
  eje: { inicio: number; fin: number },
): Map<string, Franja> {
  return new Map(ubicaEnEje(citas, eje).map(({ cita, franja }) => [cita.id, franja]));
}

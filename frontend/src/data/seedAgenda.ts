import type { Cita, Horario } from "@/types";
import { hoyISO, inicioDeSemana, sumaDias } from "@/features/agenda/agenda";

/**
 * Agenda de demostracion.
 *
 * A diferencia del resto del seed, las fechas NO son fijas: se calculan
 * relativas a la semana en curso. Con fechas literales el calendario se
 * vaciaria a la semana siguiente y la pantalla principal quedaria con un bloque
 * en blanco justo en la parte que el odontologo mira primero. Los offsets estan
 * todos en un solo sitio, en `citasSeed`, para que cambiar el escenario de
 * demostracion sea editar una linea.
 *
 * El estado de cada cita depende de en que parte de la semana caiga hoy: lo que
 * ya paso esta `atendida`, lo que viene sigue `confirmada` o `reservada`. Asi el
 * panel siempre muestra las cuatro secciones con contenido coherente entre si.
 */

const HOY = hoyISO();
const LUNES = inicioDeSemana(HOY);

/** Dia de la semana actual en el calendario (0 lunes .. 6 domingo). */
function diaDelCalendario(fecha: string): number {
  const dow = new Date(fecha + "T12:00:00").getDay();
  return dow === 0 ? 6 : dow - 1;
}

/**
 * El estado que tendra la cita segun el momento de la semana. Si el dia ya paso
 * se dio la consulta; si es hoy, la primera parte del dia esta atendida y lo que
 * viene sigue pendiente; si es futuro, se reserva o se confirma.
 */
function estadoSegunMomento(
  fecha: string,
  orden: number,
  totalDelDia: number,
): Cita["estado"] {
  const dia = diaDelCalendario(fecha);
  const hoy = diaDelCalendario(HOY);

  if (dia < hoy) return "atendida";
  if (dia > hoy) return orden % 3 === 0 ? "reservada" : "confirmada";

  // hoy: las primeras dos horas del turno ya ocurrieron
  if (orden >= totalDelDia - 1) return "reservada";
  if (orden < 2) return "atendida";
  return orden % 2 === 0 ? "confirmada" : "reservada";
}

/**
 * Horario del odontologo: lunes a viernes de 08:00 a 13:00 y de 15:00 a 18:00,
 * sabado de 09:00 a 13:00. Los bloques de la tarde son la consulta de
 * complejidad alta, que es donde se llevan los tratamientos largos.
 */
export const horariosSeed: Horario[] = [
  ...[1, 2, 3, 4, 5].map((dia) => ({ id: `h-m-${dia}`, diaSemana: dia, horaInicio: "08:00", horaFin: "13:00", activo: true })),
  ...[1, 2, 3, 4, 5].map((dia) => ({ id: `h-t-${dia}`, diaSemana: dia, horaInicio: "15:00", horaFin: "18:00", activo: true })),
  { id: "h-s-6", diaSemana: 6, horaInicio: "09:00", horaFin: "13:00", activo: true },
];

/** Cita base + estado y fecha calculados. */
function cita(
  id: string,
  pacienteId: string,
  dia: number,
  horaInicio: string,
  horaFin: string,
  motivoConsulta: string,
  orden: number,
  totalDelDia: number,
): Cita {
  const fechaCita = sumaDias(LUNES, dia);
  return {
    id,
    pacienteId,
    fechaCita,
    horaInicio,
    horaFin,
    estado: estadoSegunMomento(fechaCita, orden, totalDelDia),
    motivoConsulta,
  };
}

export const citasSeed: Cita[] = [
  // --- lunes ---
  cita("c-lu-1", "p1", 0, "08:00", "09:30", "Endodoncia pieza 46, segunda sesión", 0, 5),
  cita("c-lu-2", "p2", 0, "09:45", "10:30", "Evaluación de extracción pieza 48", 1, 5),
  cita("c-lu-3", "p3", 0, "11:00", "12:00", "Control de obturación pieza 26", 2, 5),
  cita("c-lu-4", "p4", 0, "15:00", "16:30", "CBCT y planificación de extracción 38", 3, 5),
  cita("c-lu-5", "p6", 0, "16:45", "17:45", "Valoración de edentulismo parcial", 4, 5),

  // --- martes ---
  cita("c-ma-1", "p5", 1, "08:00", "09:00", "Obturación pieza 46", 0, 4),
  cita("c-ma-2", "p7", 1, "09:30", "10:15", "Obturación pieza 22", 1, 4),
  cita("c-ma-3", "p8", 1, "15:00", "16:30", "Obturación pieza 21 y control de reflujo", 2, 4),
  cita("c-ma-4", "p2", 1, "16:45", "17:30", "Obturación pieza 34", 3, 4),

  // --- miercoles ---
  cita("c-mi-1", "p6", 2, "08:00", "09:30", "Extracción pieza 28", 0, 4),
  cita("c-mi-2", "p4", 2, "10:00", "11:00", "Implantación pieza 42", 1, 4),
  cita("c-mi-3", "p5", 2, "15:00", "16:00", "Restauración pieza 15", 2, 4),
  cita("c-mi-4", "p1", 2, "16:15", "17:15", "Corona de porcelana pieza 16", 3, 4),

  // --- jueves ---
  cita("c-ju-1", "p7", 3, "08:30", "09:15", "Control de ortodoncia", 0, 4),
  cita("c-ju-2", "p3", 3, "09:30", "10:30", "Evaluación de endodoncia pieza 21", 1, 4),
  cita("c-ju-3", "p6", 3, "15:00", "16:30", "Extracciones 24 y 28, segunda sesión", 2, 4),
  cita("c-ju-4", "p8", 3, "17:00", "17:45", "Obturación pieza 24", 3, 4),

  // --- viernes ---
  cita("c-vi-1", "p5", 4, "08:00", "09:00", "Profilaxis y refuerzo de higiene", 0, 4),
  cita("c-vi-2", "p2", 4, "09:30", "10:30", "Control de healing tras extracción 48", 1, 4),
  cita("c-vi-3", "p7", 4, "15:00", "16:00", "Obturación pieza 43", 2, 4),
  cita("c-vi-4", "p4", 4, "16:30", "17:30", "Control post-implante pieza 12", 3, 4),

  // --- sabado: consulta de morning ---
  cita("c-sa-1", "p1", 5, "09:00", "10:00", "Ajuste de coronas", 0, 2),
  cita("c-sa-2", "p3", 5, "10:30", "11:30", "Profilaxis", 1, 2),

  // --- semana anterior, ya ocurrio: todo atendido ---
  cita("c-1-1", "p6", -7, "08:00", "09:30", "Extracción pieza 28", 0, 4),
  cita("c-1-2", "p4", -7, "10:00", "11:30", "Implantación pieza 42", 1, 4),
  cita("c-1-3", "p2", -6, "09:00", "10:00", "Obturación pieza 34", 0, 4),
  cita("c-1-4", "p1", -5, "15:00", "16:30", "Corona de porcelana pieza 16", 0, 4),
  cita("c-1-5", "p8", -5, "17:00", "17:45", "Obturación pieza 24", 1, 4),

  // --- semana siguiente: aun sin confirmar en su mayoria ---
  cita("c1-1", "p5", 7, "08:00", "09:00", "Control de obturación pieza 46", 0, 4),
  cita("c1-2", "p6", 7, "09:30", "11:00", "Reevaluación post-extracción", 1, 4),
  cita("c1-3", "p3", 8, "15:00", "16:00", "Endodoncia pieza 21", 0, 4),
  cita("c1-4", "p7", 9, "09:00", "10:00", "Obturación pieza 32", 0, 4),
  cita("c1-5", "p2", 10, "16:00", "17:00", "Control periodontal", 0, 4),
];

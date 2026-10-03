/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import type { Horario } from "@/types";
import {
  OCUPACION_VACIA,
  UMBRAL_LLENA,
  UMBRAL_OCUPADA,
  citasPorZona,
  diaDe,
  ejeDe,
  fraccion,
  fraccionDeAhora,
  lineaDeCita,
  minutosDeAhora,
  ocupacionDePlanta,
  ocupacionDeZona,
  zonaDeCita,
  indicePorOdontologo,
} from "./plantaAgenda.ts";
import { citaDePlantaDesdeFila, type CitaDePlantaFila } from "./plantaMapper.ts";
import type { CitaDePlanta, Zona } from "./tipos.ts";

const FECHA = "2026-03-09"; // lunes
const P1 = "11111111-1111-4111-8111-111111111111";
const P2 = "22222222-2222-4222-8222-222222222222";

/** Lunes a sabado de 08:00 a 18:00, que es la jornada del eje por defecto. */
const HORARIOS: Horario[] = [1].map((diaSemana) => ({
  id: "h1",
  diaSemana,
  horaInicio: "08:00",
  horaFin: "18:00",
  activo: true,
}));

function zona(over: Partial<Zona> = {}): Zona {
  return {
    id: "z1",
    clinicaId: "33333333-3333-4333-8333-333333333333",
    nombre: "Consultorio 1",
    tipo: "consultorio",
    piso: 0,
    x: 0,
    y: 0,
    ancho: 3.2,
    alto: 4.5,
    capacidad: 1,
    odontologoId: "p1",
    activa: true,
    orden: 1,
    notas: "",
    ...over,
  };
}

function cita(over: Partial<CitaDePlanta> = {}): CitaDePlanta {
  return {
    id: "c1",
    pacienteId: P1,
    odontologoId: "p1",
    zonaId: null,
    fechaCita: FECHA,
    horaInicio: "09:00",
    horaFin: "10:00",
    estado: "confirmada",
    motivoConsulta: "Limpieza",
    ...over,
  };
}

const EJE = { inicio: 8 * 60, fin: 18 * 60 };

test("el dia de la semana y el eje vienen de agenda.ts, no de las citas", () => {
  assert.equal(diaDe("2026-03-09"), 1);
  assert.equal(diaDe("2026-03-08"), 0);
  assert.deepEqual(ejeDe(HORARIOS, FECHA), EJE);
  // domingo no tiene horario: se cae a la jornada por defecto de agenda.ts
  assert.deepEqual(ejeDe(HORARIOS, "2026-03-08"), EJE);
});

test("una cita se ubica por zona_id y, si no lo tiene, por odontologo_id", () => {
  const zonas = [zona(), zona({ id: "z2", odontologoId: "p2" })];
  const porId = new Map(zonas.map((z) => [z.id, z]));
  const porOdontologo = indicePorOdontologo(zonas);

  assert.equal(zonaDeCita(cita({ zonaId: "z2" }), porId, porOdontologo)?.id, "z2");
  assert.equal(zonaDeCita(cita(), porId, porOdontologo)?.id, "z1");
  assert.equal(zonaDeCita(cita({ odontologoId: "p9" }), porId, porOdontologo), null);
  // un id de zona que ya no existe NO cae al odontologo: la cita apuntaba ahi
  assert.equal(zonaDeCita(cita({ zonaId: "z-borrada" }), porId, porOdontologo), null);
});

test("un odontologo con dos zonas no duplica la cita", () => {
  const zonas = [zona(), zona({ id: "z2", odontologoId: "p1" })];
  const { porZona } = citasPorZona([cita()], FECHA, zonas);
  const conCitas = [...porZona.entries()].filter(([, lista]) => lista.length > 0);
  assert.equal(conCitas.length, 1);
  assert.equal(conCitas[0][0], "z1");
});

test("las citas sin zona se devuelven aparte en vez de desaparecer", () => {
  const zonas = [zona({ odontologoId: null })];
  const { porZona, sinZona } = citasPorZona([cita(), cita({ id: "c2" })], FECHA, zonas);
  assert.equal(porZona.size, 0);
  assert.equal(sinZona.length, 2);
});

test("la ocupacion cuenta minutos sin solapar y excluye las canceladas", () => {
  const dosJuntas = [cita({ horaInicio: "09:00", horaFin: "10:00" }), cita({ id: "c2", horaInicio: "10:00", horaFin: "11:00" })];
  const Occupation = ocupacionDeZona(dosJuntas, EJE, 9 * 60 + 30);
  assert.equal(Occupation.minutosOcupados, 120);
  assert.equal(Occupation.activas, 2);
  assert.ok(Math.abs(Occupation.proporcion - 120 / 600) < 1e-9);

  const encimadas = [cita({ horaInicio: "09:00", horaFin: "11:00" }), cita({ id: "c2", horaInicio: "10:00", horaFin: "12:00" })];
  assert.equal(ocupacionDeZona(encimadas, EJE, 9 * 60).minutosOcupados, 180);

  const conCancelada = [cita(), cita({ id: "c2", horaInicio: "11:00", horaFin: "12:00", estado: "cancelada" })];
  const resultado = ocupacionDeZona(conCancelada, EJE, 9 * 60 + 30);
  assert.equal(resultado.activas, 1);
  assert.equal(resultado.minutosOcupados, 60);
});

test("una cita se recorta a la jornada: no puede ocupar mas horas de las que hay", () => {
  const larga = [cita({ horaInicio: "07:00", horaFin: "19:00" })];
  const resultado = ocupacionDeZona(larga, EJE, 9 * 60);
  assert.equal(resultado.minutosOcupados, EJE.fin - EJE.inicio);
  assert.equal(resultado.proporcion, 1);
});

test("una cita con horas rotas o invertidas no ocupa nada", () => {
  const rotas = [cita({ horaInicio: "noche", horaFin: "10:00" }), cita({ id: "c2", horaInicio: "11:00", horaFin: "10:00" })];
  const resultado = ocupacionDeZona(rotas, EJE, 9 * 60);
  assert.equal(resultado.minutosOcupados, 0);
  assert.equal(resultado.nivel, "libre");
});

test("el nivel sale de los umbrales y la proporcion nunca pasa de 1", () => {
  const nivel = (inicio: string, fin: string) => ocupacionDeZona([cita({ horaInicio: inicio, horaFin: fin })], EJE, 0).nivel;
  // 30 min de 600 = 5%
  assert.equal(nivel("08:00", "08:30"), "libre");
  // 240 min de 600 = 40%, justo el umbral de "ocupada"
  assert.equal(nivel("09:00", "13:00"), "ocupada");
  // 510 min de 600 = 85%, justo el umbral de "llena"
  assert.equal(nivel("08:00", "16:30"), "llena");
  assert.equal(UMBRAL_OCUPADA, 0.4);
  assert.equal(UMBRAL_LLENA, 0.85);
  assert.equal(ocupacionDeZona([cita({ horaInicio: "00:00", horaFin: "23:59" })], EJE, 0).proporcion, 1);
});

test("en curso y siguiente se eligen por la hora actual", () => {
  const citas = [
    cita({ id: "pasada", horaInicio: "08:00", horaFin: "09:00" }),
    cita({ id: "actual", horaInicio: "09:00", horaFin: "10:00" }),
    cita({ id: "futura", horaInicio: "10:00", horaFin: "11:00" }),
    cita({ id: "lejana", horaInicio: "15:00", horaFin: "16:00" }),
  ];
  const resultado = ocupacionDeZona(citas, EJE, 9 * 60 + 30);
  assert.equal(resultado.enCurso?.id, "actual");
  assert.equal(resultado.siguiente?.id, "futura");

  const antesDeTodo = ocupacionDeZona(citas, EJE, 7 * 60);
  assert.equal(antesDeTodo.enCurso, null);
  assert.equal(antesDeTodo.siguiente?.id, "pasada");

  const despues = ocupacionDeZona(citas, EJE, 17 * 60);
  assert.equal(despues.enCurso, null);
  assert.equal(despues.siguiente, null);
});

test("la marca de ahora solo existe dentro de la jornada", () => {
  assert.equal(fraccionDeAhora(EJE, 8 * 60), 0);
  assert.equal(fraccionDeAhora(EJE, 13 * 60), 0.5);
  assert.equal(fraccionDeAhora(EJE, 18 * 60), 1);
  assert.equal(fraccionDeAhora(EJE, 7 * 60), null);
  assert.equal(fraccionDeAhora(EJE, 19 * 60), null);
  assert.equal(fraccion(EJE, 5 * 60), 0, "se recorta al inicio del eje");
  assert.equal(fraccion(EJE, 23 * 60), 1, "se recorta al final del eje");
  assert.equal(typeof minutosDeAhora(new Date(2026, 0, 1, 14, 45)), "number");
});

test("la ocupacion de la planta cubre todas las zonas y avisa las citas sin ubicar", () => {
  const zonas = [zona(), zona({ id: "z2", odontologoId: "p2", nombre: "Consultorio 2" }), zona({ id: "z3", odontologoId: null, nombre: "Recepción" })];
  const citas = [
    cita({ odontologoId: "p1" }),
    cita({ id: "c2", odontologoId: "p2", horaInicio: "14:00", horaFin: "15:00" }),
    cita({ id: "c3", odontologoId: null, horaInicio: "16:00", horaFin: "16:30" }),
  ];
  const resultado = ocupacionDePlanta(citas, HORARIOS, FECHA, zonas, 9 * 60 + 30);

  assert.equal(resultado.porZona.size, 3);
  assert.equal(resultado.totalCitas, 2, "la cita sin zona no cuenta como ocupada");
  assert.equal(resultado.sinZona.length, 1);
  assert.equal(resultado.zonasEnCurso, 1);
  assert.equal(resultado.porZona.get("z1")?.enCurso?.id, "c1");
  assert.deepEqual(resultado.porZona.get("z3"), OCUPACION_VACIA);
});

test("la agenda de la planta mapea las dos columnas que launen con la zona", () => {
  const fila: CitaDePlantaFila = {
    id: "c1",
    paciente_id: P1,
    odontologo_id: "p1",
    zona_id: "z2",
    fecha_cita: "2026-03-09",
    hora_inicio: "09:00:00",
    hora_fin: "10:30:00",
    estado: "confirmada",
    motivo_consulta: "Limpieza",
  };
  assert.deepEqual(citaDePlantaDesdeFila(fila), {
    id: "c1",
    pacienteId: P1,
    odontologoId: "p1",
    zonaId: "z2",
    fechaCita: FECHA,
    horaInicio: "09:00",
    horaFin: "10:30",
    estado: "confirmada",
    motivoConsulta: "Limpieza",
  });
  // estado desconocido: se descarta, no se pasa por reservada
  assert.equal(citaDePlantaDesdeFila({ ...fila, estado: "pendiente" }), null);
});

test("lineaDeCita cae a un texto util cuando la cita no tiene motivo", () => {
  assert.equal(lineaDeCita(cita()), "9:00 - 10:00 · Limpieza");
  assert.equal(lineaDeCita(cita({ motivoConsulta: "" })), "9:00 - 10:00 · Consulta");
  assert.equal(P2.length, 36);
});
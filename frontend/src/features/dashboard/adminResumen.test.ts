/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import type { Cita, EstadoCita } from "@/types";
import {
  SECCIONES_PENDIENTES,
  indicadoresActividadAdmin,
  indicadoresTratamientos,
  resumenActividadAdmin,
} from "./adminResumen.ts";

const HOY = "2026-10-14";
const MANANA = "2026-10-15";

function cita(
  id: string,
  horaInicio: string,
  estado: EstadoCita,
  extra: Partial<Cita> = {},
): Cita {
  const [h, m] = horaInicio.split(":").map(Number);
  const fin = `${String(h).padStart(2, "0")}:${String((m + 30) % 60).padStart(2, "0")}`;
  return {
    id,
    pacienteId: extra.pacienteId ?? `pac-${id}`,
    fechaCita: extra.fechaCita ?? HOY,
    horaInicio,
    horaFin: extra.horaFin ?? fin,
    estado,
    motivoConsulta: extra.motivoConsulta ?? "Consulta",
  };
}

test("resumenActividadAdmin reúne citas del día, conteo por estado y pacientes únicos", () => {
  const citas = [
    cita("a", "09:00", "confirmada", { pacienteId: "p1" }),
    cita("b", "10:00", "reservada", { pacienteId: "p2" }),
    cita("c", "11:00", "confirmada", { pacienteId: "p1" }),
    cita("d", "12:00", "cancelada", { pacienteId: "p3" }),
    cita("e", "13:00", "atendida", { fechaCita: MANANA, pacienteId: "p4" }),
  ];

  const actividad = resumenActividadAdmin(citas, HOY);

  assert.deepEqual(actividad.citasHoy.map((c) => c.id), ["a", "b", "c", "d"]);
  assert.deepEqual(actividad.resumen, {
    reservada: 1,
    confirmada: 2,
    atendida: 0,
    cancelada: 1,
    total: 3,
  });
  // p3 solo tiene una cita cancelada: no cuenta como paciente del día.
  assert.equal(actividad.pacientes, 2);
});

test("resumenActividadAdmin sin citas deja todo en cero", () => {
  const actividad = resumenActividadAdmin([cita("a", "09:00", "confirmada")], MANANA);
  assert.deepEqual(actividad.citasHoy, []);
  assert.equal(actividad.resumen.total, 0);
  assert.equal(actividad.pacientes, 0);
});

test("indicadoresActividadAdmin arma las tarjetas de pacientes y citas del día", () => {
  const indicadores = indicadoresActividadAdmin({ pacientes: 12, citasHoy: 4 });
  assert.deepEqual(
    indicadores.map((i) => i.id),
    ["pacientes-registrados", "citas-hoy"],
  );
  assert.equal(indicadores[0].valor, "12");
  assert.equal(indicadores[1].valor, "4");
  assert.equal(indicadores[0].icono, "UsersThree");
  assert.equal(indicadores[1].icono, "CalendarDots");
});

test("indicadoresTratamientos muestra las cifras reales cuando está listo", () => {
  const indicadores = indicadoresTratamientos(3, 5, "listo");
  assert.deepEqual(
    indicadores.map((i) => i.id),
    ["tratamientos-activos", "tratamientos-pendientes"],
  );
  assert.equal(indicadores[0].valor, "3");
  assert.equal(indicadores[1].valor, "5");
});

test("indicadoresTratamientos no convierte un fallo en cero (cargando y bloqueado)", () => {
  assert.equal(indicadoresTratamientos(0, 0, "cargando")[0].valor, "…");
  assert.equal(indicadoresTratamientos(0, 0, "bloqueado")[0].valor, "—");
  assert.equal(indicadoresTratamientos(0, 0, "bloqueado")[1].valor, "—");
});

test("SECCIONES_PENDIENTES cubre ocupación, ingresos y deuda con ids únicos", () => {
  const ids = SECCIONES_PENDIENTES.map((s) => s.id);
  assert.deepEqual(ids, ["ocupacion", "ingresos", "deuda"]);
  assert.equal(new Set(ids).size, ids.length);
  for (const seccion of SECCIONES_PENDIENTES) {
    assert.ok(seccion.titulo.length > 0);
    assert.ok(seccion.detalle.length > 0);
  }
});

/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import type { Cita, EstadoCita } from "@/types";
import {
  crearResumenTratamientosVacio,
  proximaActividad,
  resumirTratamientos,
  type PlanFila,
  type ProcedimientoFila,
} from "./odontologoResumen.ts";

const HOY = "2026-10-14";

function cita(
  id: string,
  fechaCita: string,
  horaInicio: string,
  estado: EstadoCita,
): Cita {
  return {
    id,
    pacienteId: `pac-${id}`,
    fechaCita,
    horaInicio,
    horaFin: "10:00",
    estado,
    motivoConsulta: "Consulta",
  };
}

function plan(id: string, estado: string): PlanFila {
  return { id, estado };
}

function proc(planTratamientoId: string): ProcedimientoFila {
  return { planTratamientoId };
}

test("proximaActividad devuelve null sin citas", () => {
  assert.equal(proximaActividad([], HOY), null);
});

test("proximaActividad ignora el pasado y los estados terminales", () => {
  const citas = [
    cita("pasada", "2026-10-10", "09:00", "confirmada"),
    cita("cancelada", "2026-10-20", "09:00", "cancelada"),
    cita("atendida", "2026-10-20", "10:00", "atendida"),
  ];
  assert.equal(proximaActividad(citas, HOY), null);
});

test("proximaActividad toma la futura más cercana por fecha", () => {
  const citas = [
    cita("lejos", "2026-10-30", "09:00", "confirmada"),
    cita("cerca", "2026-10-15", "11:00", "reservada"),
  ];
  assert.equal(proximaActividad(citas, HOY)?.id, "cerca");
});

test("proximaActividad desempata por hora el mismo día", () => {
  const citas = [
    cita("tarde", HOY, "15:00", "confirmada"),
    cita("manana", HOY, "08:30", "reservada"),
  ];
  assert.equal(proximaActividad(citas, HOY)?.id, "manana");
});

test("proximaActividad con hora descarta la cita de hoy ya pasada", () => {
  const citas = [
    cita("ya-paso", HOY, "09:00", "confirmada"),
    cita("mas-tarde", HOY, "16:00", "confirmada"),
    cita("otro-dia", "2026-10-16", "08:00", "reservada"),
  ];
  assert.equal(proximaActividad(citas, HOY, "14:30")?.id, "mas-tarde");
  // Sin la de hoy a las 16:00, cae en la del día siguiente.
  assert.equal(
    proximaActividad(citas.filter((c) => c.id !== "mas-tarde"), HOY, "14:30")?.id,
    "otro-dia",
  );
});

test("resumirTratamientos clasifica por el estado real del plan", () => {
  const planes = [
    plan("p1", "propuesto"),
    plan("p2", "aceptado"),
    plan("p3", "en_proceso"),
    plan("p4", "completado"),
    plan("p5", "cancelado"),
  ];
  const procedimientos = planes.map((p) => proc(p.id));
  const r = resumirTratamientos(planes, procedimientos);
  assert.deepEqual(r, { activos: 2, pendientes: 1, total: 3 });
});

test("resumirTratamientos no cuenta planes sin procedimientos (plan auto-creado)", () => {
  const planes = [plan("vacio", "propuesto"), plan("con-items", "propuesto")];
  const procedimientos = [proc("con-items")];
  assert.deepEqual(resumirTratamientos(planes, procedimientos), {
    activos: 0,
    pendientes: 1,
    total: 1,
  });
});

test("resumirTratamientos ignora estados desconocidos y devuelve ceros sin datos", () => {
  assert.deepEqual(resumirTratamientos([], []), { activos: 0, pendientes: 0, total: 0 });
  assert.deepEqual(
    resumirTratamientos([plan("x", "raro")], [proc("x")]),
    { activos: 0, pendientes: 0, total: 0 },
  );
});

test("crearResumenTratamientosVacio devuelve referencias independientes", () => {
  const a = crearResumenTratamientosVacio();
  const b = crearResumenTratamientosVacio();
  a.activos = 5;
  assert.equal(b.activos, 0);
});

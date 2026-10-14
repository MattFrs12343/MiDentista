/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import type { Cita, EstadoCita } from "@/types";
import {
  citasDelDia,
  indicadoresRecepcion,
  pacientesDelDia,
  resumenDelDia,
  totalPendiente,
} from "./recepcionResumen.ts";

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

test("citasDelDia filtra por fecha y ordena por hora", () => {
  const citas = [
    cita("b", "11:00", "confirmada"),
    cita("a", "09:00", "reservada"),
    cita("c", "10:00", "atendida", { fechaCita: MANANA }),
  ];
  const delDia = citasDelDia(citas, HOY);
  assert.deepEqual(delDia.map((c) => c.id), ["a", "b"]);
});

test("resumenDelDia cuenta por estado y excluye canceladas del total", () => {
  const citas = [
    cita("a", "09:00", "reservada"),
    cita("b", "10:00", "confirmada"),
    cita("c", "11:00", "confirmada"),
    cita("d", "12:00", "atendida"),
    cita("e", "13:00", "cancelada"),
  ];
  const r = resumenDelDia(citas, HOY);
  assert.deepEqual(r, { reservada: 1, confirmada: 2, atendida: 1, cancelada: 1, total: 4 });
});

test("pacientesDelDia deduplica, excluye canceladas y respeta el orden de la primera cita", () => {
  const citas = [
    cita("a", "09:00", "confirmada", { pacienteId: "p1" }),
    cita("b", "09:30", "reservada", { pacienteId: "p2" }),
    cita("c", "10:00", "confirmada", { pacienteId: "p1" }),
    cita("d", "10:30", "cancelada", { pacienteId: "p3" }),
  ];
  assert.deepEqual(pacientesDelDia(citas, HOY), ["p1", "p2"]);
});

test("pacientesDelDia: un día sin citas no tiene pacientes", () => {
  assert.deepEqual(pacientesDelDia([cita("a", "09:00", "confirmada")], MANANA), []);
});

test("totalPendiente suma números y textos NUMERIC y redondea a dos decimales", () => {
  assert.equal(totalPendiente([]), 0);
  assert.equal(
    totalPendiente([{ monto: 100 }, { monto: "50.25" }, { monto: null }]),
    150.25,
  );
  assert.equal(totalPendiente([{ monto: "0.1" }, { monto: "0.2" }]), 0.3);
});

test("indicadoresRecepcion arma las cinco tarjetas del flujo diario", () => {
  const resumen = { reservada: 2, confirmada: 3, atendida: 1, cancelada: 0, total: 6 };
  const indicadores = indicadoresRecepcion({ resumen, pacientes: 5, pagosPendientes: 4 });

  assert.deepEqual(
    indicadores.map((i) => i.id),
    ["citas-hoy", "citas-confirmadas", "citas-por-confirmar", "pacientes-hoy", "pagos-pendientes"],
  );
  assert.equal(indicadores[0].valor, "6");
  assert.equal(indicadores[1].valor, "3");
  assert.equal(indicadores[2].valor, "2");
  assert.equal(indicadores[3].valor, "5");
  assert.equal(indicadores[4].valor, "4");
});

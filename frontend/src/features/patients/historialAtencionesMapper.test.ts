/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import {
  atencionDesdeCita,
  atencionDesdeEvolucion,
  construirHistorialAtenciones,
  contarAtenciones,
} from "./historialAtencionesMapper.ts";
import type { Cita } from "@/types";
import type { EvolucionClinica } from "@/features/evolucion/tipos.ts";

function cita(cambios: Partial<Cita> = {}): Cita {
  return {
    id: "c1",
    pacienteId: "p1",
    fechaCita: "2026-10-10",
    horaInicio: "09:00",
    horaFin: "09:30",
    estado: "confirmada",
    motivoConsulta: "Control",
    notas: undefined,
    ...cambios,
  };
}

function evolucion(cambios: Partial<EvolucionClinica> = {}): EvolucionClinica {
  return {
    id: "e1",
    clinicaId: "cli",
    pacienteId: "p1",
    odontologoId: "odo",
    planTratamientoId: null,
    procedimientoId: null,
    numeroPieza: null,
    fechaConsulta: "2026-10-12",
    motivoConsulta: "Dolor",
    procedimientoRealizado: "Obturación",
    observaciones: "",
    indicaciones: "",
    proximaAtencion: null,
    creadoEn: "2026-10-12T10:00:00Z",
    ...cambios,
  };
}

test("una cita se normaliza con su motivo, estado y horario", () => {
  const atencion = atencionDesdeCita(cita());
  assert.equal(atencion.tipo, "cita");
  assert.equal(atencion.titulo, "Control");
  assert.equal(atencion.estado, "confirmada");
  assert.equal(atencion.hora, "09:00");
  assert.ok(atencion.detalles.some((d) => d.etiqueta === "Horario"));
  // Las notas vacías no dejan un renglón sin valor.
  assert.equal(atencion.detalles.some((d) => d.etiqueta === "Notas"), false);
});

test("una cita sin motivo cae al título por defecto", () => {
  const atencion = atencionDesdeCita(cita({ motivoConsulta: "   " }));
  assert.equal(atencion.titulo, "Cita odontológica");
});

test("una evolución se normaliza con su procedimiento y la pieza", () => {
  const atencion = atencionDesdeEvolucion(
    evolucion({ numeroPieza: 46, procedimientoRealizado: "Endodoncia" }),
  );
  assert.equal(atencion.tipo, "evolucion");
  assert.equal(atencion.titulo, "Endodoncia");
  assert.equal(atencion.hora, null);
  assert.equal(atencion.estado, null);
  assert.ok(atencion.detalles.some((d) => d.valor === "Pieza 46"));
});

test("el historial mezcla las dos fuentes y ordena de lo más nuevo a lo más viejo", () => {
  const historial = construirHistorialAtenciones(
    [cita({ id: "c1", fechaCita: "2026-10-01" }), cita({ id: "c2", fechaCita: "2026-10-20" })],
    [evolucion({ id: "e1", fechaConsulta: "2026-10-10" })],
  );
  assert.deepEqual(
    historial.map((a) => a.fecha),
    ["2026-10-20", "2026-10-10", "2026-10-01"],
  );
});

test("a igual fecha, la hora más tarde va primero", () => {
  const historial = construirHistorialAtenciones(
    [
      cita({ id: "manana", fechaCita: "2026-10-10", horaInicio: "08:00" }),
      cita({ id: "tarde", fechaCita: "2026-10-10", horaInicio: "16:00" }),
    ],
    [],
  );
  assert.equal(historial[0]?.id, "cita-tarde");
});

test("contarAtenciones separa citas de evoluciones", () => {
  const historial = construirHistorialAtenciones(
    [cita({ id: "c1" })],
    [evolucion({ id: "e1" }), evolucion({ id: "e2" })],
  );
  assert.deepEqual(contarAtenciones(historial), { total: 3, citas: 1, evoluciones: 2 });
});

test("sin datos, el historial es una lista vacía", () => {
  assert.deepEqual(construirHistorialAtenciones([], []), []);
  assert.deepEqual(contarAtenciones([]), { total: 0, citas: 0, evoluciones: 0 });
});

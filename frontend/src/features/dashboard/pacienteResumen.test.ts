/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import type { CitaPortal, PagoPortal, PlanPortal } from "@/data/api";
import {
  avancePlan,
  indicadoresPaciente,
  pagosPendientes,
  planActual,
  planesVigentes,
  proximaCita,
} from "./pacienteResumen.ts";

const HOY = "2026-10-14";

function cita(
  id: string,
  fechaCita: string,
  horaInicio: string,
  estado: CitaPortal["estado"],
  extra: Partial<CitaPortal> = {},
): CitaPortal {
  return {
    id,
    fechaCita,
    horaInicio,
    horaFin: extra.horaFin ?? "10:00:00",
    estado,
    motivoConsulta: extra.motivoConsulta ?? "Consulta",
    notas: extra.notas ?? null,
  };
}

function plan(estado: string, items: Partial<PlanPortal["items"][number]>[], extra: Partial<PlanPortal> = {}): PlanPortal {
  return {
    id: extra.id ?? "plan-1",
    titulo: extra.titulo ?? "Plan de tratamiento",
    estado,
    costoTotal: extra.costoTotal ?? 0,
    notas: extra.notas ?? null,
    creadoEl: extra.creadoEl ?? "2026-10-01",
    items: items.map((item, i) => ({
      id: item.id ?? `item-${i}`,
      descripcion: item.descripcion ?? `Procedimiento ${i}`,
      numeroPieza: item.numeroPieza ?? null,
      costo: item.costo ?? 0,
      estado: item.estado ?? "pendiente",
      prioridad: item.prioridad ?? "normal",
    })),
  };
}

function pago(id: string, estado: string, monto = 100): PagoPortal {
  return {
    id,
    monto,
    metodoPago: "efectivo",
    fechaPago: "2026-10-01",
    estado,
    codigoReferencia: null,
    notas: null,
  };
}

test("proximaCita toma la futura más cercana y descarta pasadas y no vigentes", () => {
  const citas = [
    cita("a", "2026-10-20", "09:00:00", "confirmada"),
    cita("b", "2026-10-15", "11:00:00", "reservada"),
    cita("c", "2026-10-10", "08:00:00", "confirmada"), // pasada
    cita("d", "2026-10-16", "10:00:00", "cancelada"), // cancelada
    cita("e", "2026-10-17", "10:00:00", "atendida"), // atendida
  ];
  assert.equal(proximaCita(citas, HOY)?.id, "b");
});

test("proximaCita desempata por hora el mismo día", () => {
  const citas = [
    cita("tarde", "2026-10-15", "15:00:00", "confirmada"),
    cita("manana", "2026-10-15", "08:30:00", "reservada"),
  ];
  assert.equal(proximaCita(citas, HOY)?.id, "manana");
});

test("proximaCita devuelve null sin citas vigentes futuras", () => {
  const citas = [cita("a", "2026-10-10", "09:00:00", "confirmada")];
  assert.equal(proximaCita(citas, HOY), null);
  assert.equal(proximaCita([], HOY), null);
});

test("planesVigentes excluye completados y cancelados", () => {
  const planes = [
    plan("completado", []),
    plan("cancelado", []),
    plan("propuesto", [], { id: "p" }),
    plan("en_proceso", [], { id: "e" }),
  ];
  assert.deepEqual(
    planesVigentes(planes).map((p) => p.id),
    ["p", "e"],
  );
});

test("planActual prefiere en_proceso, luego aceptado, luego propuesto", () => {
  const planes = [
    plan("propuesto", [], { id: "prop", creadoEl: "2026-09-01" }),
    plan("aceptado", [], { id: "acep", creadoEl: "2026-09-02" }),
    plan("en_proceso", [], { id: "proc", creadoEl: "2026-09-03" }),
  ];
  assert.equal(planActual(planes)?.id, "proc");
  assert.equal(planActual(planes.filter((p) => p.estado !== "en_proceso"))?.id, "acep");
  assert.equal(planActual(planes.filter((p) => p.estado === "propuesto"))?.id, "prop");
});

test("planActual desempata por el más reciente y devuelve null sin vigentes", () => {
  const planes = [
    plan("aceptado", [], { id: "viejo", creadoEl: "2026-09-01" }),
    plan("aceptado", [], { id: "nuevo", creadoEl: "2026-10-01" }),
  ];
  assert.equal(planActual(planes)?.id, "nuevo");
  assert.equal(planActual([plan("completado", [])]), null);
});

test("avancePlan cuenta completados sobre no cancelados y redondea", () => {
  const p = plan("en_proceso", [
    { estado: "completado" },
    { estado: "completado" },
    { estado: "pendiente" },
    { estado: "cancelado" },
  ]);
  assert.deepEqual(avancePlan(p), { completados: 2, total: 3, porcentaje: 67 });
  assert.deepEqual(avancePlan(plan("propuesto", [])), {
    completados: 0,
    total: 0,
    porcentaje: 0,
  });
});

test("pagosPendientes deja solo los de estado pendiente", () => {
  const pagos = [pago("a", "pendiente"), pago("b", "confirmado"), pago("c", "rechazado")];
  assert.deepEqual(
    pagosPendientes(pagos).map((p) => p.id),
    ["a"],
  );
});

test("indicadoresPaciente arma las cuatro tarjetas y colorea el saldo", () => {
  const conDeuda = indicadoresPaciente({
    proximaFecha: "15/10/2026",
    planPorcentaje: 40,
    saldoTexto: "Bs 550,00",
    saldoPendiente: 550,
  });
  assert.deepEqual(
    conDeuda.map((i) => i.id),
    ["proxima-cita", "tratamiento-actual", "pagos-pendientes", "documentos"],
  );
  assert.equal(conDeuda[0].valor, "15/10/2026");
  assert.equal(conDeuda[1].valor, "40%");
  assert.equal(conDeuda[2].valor, "Bs 550,00");
  assert.equal(conDeuda[2].tono, "red");
  assert.equal(conDeuda[3].valor, "—");

  const alDia = indicadoresPaciente({
    proximaFecha: "—",
    planPorcentaje: null,
    saldoTexto: "Bs 0,00",
    saldoPendiente: 0,
  });
  assert.equal(alDia[1].valor, "—");
  assert.equal(alDia[2].tono, "green");
});

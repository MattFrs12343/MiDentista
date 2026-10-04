/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import {
  compararEvoluciones,
  esFechaIso,
  esHoy,
  fechaDesdeIso,
  formatearFechaCorta,
  formatearFechaLarga,
  hoyEnIso,
  trozosDeFecha,
} from "./fechasEvolucion.ts";
import type { EvolucionClinica } from "./tipos.ts";

function evolucion(sobrescritas: Partial<EvolucionClinica>): EvolucionClinica {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    clinicaId: "11111111-1111-4111-8111-111111111111",
    pacienteId: "22222222-2222-4222-8222-222222222222",
    odontologoId: "33333333-3333-4333-8333-333333333333",
    planTratamientoId: null,
    procedimientoId: null,
    numeroPieza: null,
    fechaConsulta: "2026-10-03",
    motivoConsulta: "",
    procedimientoRealizado: "",
    observaciones: "",
    indicaciones: "",
    proximaAtencion: null,
    creadoEn: "",
    ...sobrescritas,
  };
}

test("hoyEnIso devuelve el día local, no el día UTC", () => {
  const instante = new Date(2026, 9, 3, 23, 30);
  assert.equal(hoyEnIso(instante), "2026-10-03");
  // Año y mes con dos dígitos, para que el texto sea siempre `YYYY-MM-DD`.
  assert.match(hoyEnIso(new Date(2026, 0, 5, 8, 0)), /^2026-01-05$/);
});

test("fechaDesdeIso construye la fecha en hora local", () => {
  // Si se usara `new Date("2026-10-03")` (medianoche UTC) en una zona con
  // desfase negativo, el día local sería el 2 y la línea de tiempo mentiría.
  const fecha = fechaDesdeIso("2026-10-03");
  assert.ok(fecha);
  assert.equal(fecha.getFullYear(), 2026);
  assert.equal(fecha.getMonth(), 9);
  assert.equal(fecha.getDate(), 3);
  assert.equal(fecha.getHours(), 0);
});

test("una fecha que no existe en el calendario se rechaza", () => {
  for (const valor of ["2026-02-31", "2026-13-01", "2026-00-10", "2026-10-00", "2026-11-31"]) {
    assert.equal(esFechaIso(valor), false, `debería rechazar ${valor}`);
  }
  for (const valor of ["03/10/2026", "2026-10-3", "03-10-2026", "hoy", "", "  "]) {
    assert.equal(esFechaIso(valor), false, `debería rechazar ${JSON.stringify(valor)}`);
  }
  assert.equal(esFechaIso("2026-02-28"), true);
  assert.equal(esFechaIso("2024-02-29"), true);
  assert.equal(esFechaIso("2026-02-29"), false);
});

test("el formateo devuelve el texto original si la fecha es ilegible", () => {
  // Es preferible ver `2026-13-40` en pantalla que inventar un día o imprimir
  // "Invalid Date" en la historia clínica de un paciente.
  assert.equal(formatearFechaCorta("2026-13-40"), "2026-13-40");
  assert.equal(formatearFechaCorta(null), "Sin fecha");
  assert.equal(formatearFechaCorta(""), "Sin fecha");
  const corta = formatearFechaCorta("2026-10-03");
  assert.match(corta, /^03/);
  assert.match(corta, /2026$/);
  const larga = formatearFechaLarga("2026-10-03");
  assert.match(larga, /octubre/);
  assert.equal(formatearFechaLarga(null), "Sin fecha");
});

test("trozosDeFecha separa día, mes y año, y marca el día de hoy", () => {
  // Una fecha fija lejana: el resultado de `hoy` no puede depender del día en
  // que se ejecute la prueba.
  const trozos = trozosDeFecha("2019-05-17");
  assert.equal(trozos?.dia, "17");
  assert.equal(trozos?.anio, "2019");
  assert.equal(trozos?.mes, "may");
  assert.equal(trozos?.hoy, false);
  assert.equal(trozosDeFecha(null), null);
  assert.equal(trozosDeFecha("no-es-fecha"), null);

  const hoy = hoyEnIso();
  assert.equal(trozosDeFecha(hoy)?.hoy, true);
  assert.equal(esHoy(hoy), true);
  assert.equal(esHoy("2019-05-17"), false);
  assert.equal(esHoy(null), false);
});

test("compararEvoluciones ordena de la atención más reciente a la más antigua", () => {
  const lista = [
    evolucion({ id: "a", fechaConsulta: "2026-09-01" }),
    evolucion({ id: "b", fechaConsulta: "2026-10-03" }),
    evolucion({ id: "c", fechaConsulta: "2026-01-15" }),
  ];
  assert.deepEqual(
    [...lista].sort(compararEvoluciones).map((e) => e.id),
    ["b", "a", "c"],
  );
});

test("dos atenciones del mismo día se ordenan por fecha de creación", () => {
  const antigua = evolucion({ id: "a", fechaConsulta: "2026-10-03", creadoEn: "2026-10-03T09:00:00Z" });
  const nueva = evolucion({ id: "b", fechaConsulta: "2026-10-03", creadoEn: "2026-10-03T18:00:00Z" });
  assert.deepEqual([antigua, nueva].sort(compararEvoluciones).map((e) => e.id), ["b", "a"]);
  // Mismo día y mismo `creado_en`: el desempate por id evita reordenar la lista
  // sin motivo al guardar otra fila.
  const gemela = evolucion({ id: "a", fechaConsulta: "2026-10-03", creadoEn: "2026-10-03T18:00:00Z" });
  assert.equal(compararEvoluciones(nueva, nueva), 0);
  assert.notEqual(compararEvoluciones(gemela, nueva), 0);
});

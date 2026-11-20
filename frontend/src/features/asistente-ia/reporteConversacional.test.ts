/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import {
  dentroDeRango,
  detectarFormato,
  esRespuestaTodos,
  interpretarRangoFechas,
  preguntaDelPaso,
} from "./reporteConversacional.ts";

test("detectarFormato: reconoce 'csv' y 'pdf' exactos", () => {
  assert.equal(detectarFormato("csv"), "csv");
  assert.equal(detectarFormato("en pdf por favor"), "pdf");
});

test("detectarFormato: tolera CSV mal transcrito por voz (deletreado)", () => {
  assert.equal(detectarFormato("ccb"), "csv");
  assert.equal(detectarFormato("ssb"), "csv");
  assert.equal(detectarFormato("ssv"), "csv");
});

test("detectarFormato: sin ninguna coincidencia devuelve null, no inventa", () => {
  assert.equal(detectarFormato("no sé, lo que sea mejor"), null);
});

test("esRespuestaTodos: reconoce variantes de 'todos' y pedidos de lista completa", () => {
  assert.equal(esRespuestaTodos("todos"), true);
  assert.equal(esRespuestaTodos("de todas"), true);
  assert.equal(esRespuestaTodos("dame la lista de los pacientes"), true);
  assert.equal(esRespuestaTodos("cualquiera"), true);
});

test("esRespuestaTodos: un nombre real no cuenta como 'todos'", () => {
  assert.equal(esRespuestaTodos("Juan Pérez"), false);
});

test("interpretarRangoFechas: reconoce 'ultimos N dias/semanas/meses'", () => {
  assert.equal(interpretarRangoFechas("ultimos 10 dias"), 10);
  assert.equal(interpretarRangoFechas("ultimas 2 semanas"), 14);
  assert.equal(interpretarRangoFechas("ultimos 3 meses"), 90);
  assert.equal(interpretarRangoFechas("todos"), null);
  assert.equal(interpretarRangoFechas("no se, cualquier cosa"), null);
});

test("dentroDeRango: fecha reciente entra, fecha vieja no, sin fecha no entra", () => {
  const hoy = new Date().toISOString();
  const haceUnAnio = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(dentroDeRango(hoy, 30), true);
  assert.equal(dentroDeRango(haceUnAnio, 30), false);
  assert.equal(dentroDeRango(null, 30), false);
  assert.equal(dentroDeRango("fecha-invalida", 30), false);
});

test("preguntaDelPaso: cada paso tiene su propia pregunta no vacia", () => {
  for (const paso of ["formato", "fechas", "paciente", "area", "clinica"] as const) {
    assert.ok(preguntaDelPaso(paso).length > 0);
  }
});

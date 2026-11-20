/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import {
  esAfirmacion,
  esAgradecimiento,
  esDespedida,
  esSaludo,
  generarNoEntendido,
  generarPreguntaDesambiguacion,
  generarRespuestaAfirmacionAmbigua,
  generarSaludo,
} from "./conversacion.ts";

test("esSaludo: reconoce variantes cortas con o sin puntuacion", () => {
  assert.equal(esSaludo("hola"), true);
  assert.equal(esSaludo("Hola!"), true);
  assert.equal(esSaludo("buenas tardes"), true);
  assert.equal(esSaludo("hola, como estas"), true);
});

test("esSaludo: un pedido real que empieza con saludo no cuenta como saludo puro", () => {
  assert.equal(esSaludo("hola quiero ver mis pacientes por favor"), false);
});

test("esDespedida: reconoce variantes cortas", () => {
  assert.equal(esDespedida("chau"), true);
  assert.equal(esDespedida("hasta luego"), true);
  assert.equal(esDespedida("quiero ver pagos"), false);
});

test("esAgradecimiento: reconoce variantes cortas", () => {
  assert.equal(esAgradecimiento("gracias"), true);
  assert.equal(esAgradecimiento("muchas gracias!"), true);
  assert.equal(esAgradecimiento("quiero ver pagos"), false);
});

test("generarSaludo: usa el primer nombre y menciona las intenciones", () => {
  const saludo = generarSaludo("Ana María Pérez", ["Pacientes", "Pagos y cuentas"]);
  assert.match(saludo, /Ana/);
  assert.doesNotMatch(saludo, /María/);
  assert.match(saludo, /Pacientes/);
  assert.match(saludo, /Pagos y cuentas/);
});

test("generarNoEntendido: lista las intenciones disponibles", () => {
  const mensaje = generarNoEntendido(["Pacientes", "Pagos y cuentas"]);
  assert.match(mensaje, /Pacientes/);
  assert.match(mensaje, /Pagos y cuentas/);
});

test("esAfirmacion: reconoce variantes cortas de confirmacion", () => {
  assert.equal(esAfirmacion("si"), true);
  assert.equal(esAfirmacion("Sí, así es"), true);
  assert.equal(esAfirmacion("correcto"), true);
  assert.equal(esAfirmacion("exacto!"), true);
});

test("esAfirmacion: un pedido real no cuenta como afirmacion", () => {
  assert.equal(esAfirmacion("quiero ver pagos"), false);
  assert.equal(esAfirmacion("reporte de pacientes"), false);
});

test("generarPreguntaDesambiguacion y generarRespuestaAfirmacionAmbigua mencionan las opciones", () => {
  const pregunta = generarPreguntaDesambiguacion(["Pacientes", "Reporte de pacientes"]);
  assert.match(pregunta, /Pacientes/);
  assert.match(pregunta, /Reporte de pacientes/);
  const respuesta = generarRespuestaAfirmacionAmbigua(["Pacientes", "Reporte de pacientes"]);
  assert.match(respuesta, /Pacientes/);
  assert.match(respuesta, /Reporte de pacientes/);
});

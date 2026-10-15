/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import { esPiezaFdiValida, PIEZA_FDI_MAXIMA, PIEZA_FDI_MINIMA } from "./validacionEvolucion.ts";

test("acepta piezas FDI permanentes válidas", () => {
  for (const pieza of [36, 26, 48]) {
    assert.equal(esPiezaFdiValida(pieza), true, `${pieza} debería ser válida`);
  }
});

test("rechaza piezas que no existen en la notación FDI", () => {
  for (const pieza of [0, 19, 49]) {
    assert.equal(esPiezaFdiValida(pieza), false, `${pieza} debería ser inválida`);
  }
});

test("rechaza las posiciones huecas de cada cuadrante (9 y 0)", () => {
  for (const pieza of [19, 20, 29, 30, 39, 40]) {
    assert.equal(esPiezaFdiValida(pieza), false, `${pieza} no es una pieza real`);
  }
});

test("rechaza valores no enteros", () => {
  assert.equal(esPiezaFdiValida(16.5), false);
  assert.equal(esPiezaFdiValida(Number.NaN), false);
});

test("los límites publicados coinciden con el rango aceptado", () => {
  assert.equal(esPiezaFdiValida(PIEZA_FDI_MINIMA), true);
  assert.equal(esPiezaFdiValida(PIEZA_FDI_MAXIMA), true);
  assert.equal(esPiezaFdiValida(PIEZA_FDI_MINIMA - 1), false);
  assert.equal(esPiezaFdiValida(PIEZA_FDI_MAXIMA + 1), false);
});

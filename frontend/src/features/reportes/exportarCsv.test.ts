/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import { construirCsv } from "./exportarCsv.ts";

test("construirCsv: encabezado + filas, separadas por coma", () => {
  const csv = construirCsv(["Nombre", "CI"], [["Juan Pérez", "1234567"]]);
  assert.equal(csv, "Nombre,CI\r\nJuan Pérez,1234567");
});

test("construirCsv: entrecomilla un campo que trae una coma", () => {
  const csv = construirCsv(["Dirección"], [["Calle 1, Zona Sur"]]);
  assert.equal(csv, 'Dirección\r\n"Calle 1, Zona Sur"');
});

test("construirCsv: duplica comillas internas", () => {
  const csv = construirCsv(["Nota"], [['Dijo "hola"']]);
  assert.equal(csv, 'Nota\r\n"Dijo ""hola"""');
});

test("construirCsv: numeros se convierten a texto sin comillas", () => {
  const csv = construirCsv(["Total"], [[1500]]);
  assert.equal(csv, "Total\r\n1500");
});

test("construirCsv: sin filas deja solo el encabezado", () => {
  assert.equal(construirCsv(["A", "B"], []), "A,B");
});

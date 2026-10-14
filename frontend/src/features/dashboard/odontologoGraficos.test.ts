/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import { contarHallazgos, totalHallazgos } from "./odontologoGraficos.ts";

type Condicion = "sano" | "caries" | "obturado" | "corona" | "endodoncia" | "ausente" | "extraccion_indicada" | "implante";

function pieza(piezaNum: number, condicion: Condicion) {
  return { pieza: piezaNum, condicion, actualizadoEl: "2026-01-01" };
}

test("contarHallazgos: sin pacientes devuelve un objeto vacío", () => {
  assert.deepEqual(contarHallazgos({}), {});
});

test("contarHallazgos: un paciente sin piezas no aporta conteos", () => {
  assert.deepEqual(contarHallazgos({ p1: [] }), {});
});

test("contarHallazgos: excluye la condición `sano`", () => {
  const conteos = contarHallazgos({
    p1: [pieza(11, "sano"), pieza(12, "caries")],
  });
  // Se comprueba antes del deepEqual porque `assert.deepEqual` estrecha el tipo.
  assert.equal(conteos.sano, undefined);
  assert.deepEqual(conteos, { caries: 1 });
});

test("contarHallazgos: suma condiciones de varios pacientes", () => {
  const conteos = contarHallazgos({
    p1: [pieza(11, "caries"), pieza(12, "obturado")],
    p2: [pieza(21, "caries"), pieza(22, "corona")],
    p3: [pieza(31, "caries"), pieza(32, "sano")],
  });
  assert.deepEqual(conteos, { caries: 3, obturado: 1, corona: 1 });
  assert.equal(totalHallazgos(conteos), 5);
});

test("contarHallazgos: la misma condición en la misma pieza cuenta una vez por registro", () => {
  const conteos = contarHallazgos({
    p1: [pieza(11, "endodoncia"), pieza(11, "endodoncia")],
  });
  assert.deepEqual(conteos, { endodoncia: 2 });
});

test("contarHallazgos: cubre todas las condiciones no sanas", () => {
  const conteos = contarHallazgos({
    p1: [
      pieza(11, "caries"),
      pieza(12, "obturado"),
      pieza(13, "corona"),
      pieza(14, "endodoncia"),
      pieza(15, "ausente"),
      pieza(16, "extraccion_indicada"),
      pieza(17, "implante"),
      pieza(18, "sano"),
    ],
  });
  assert.equal(totalHallazgos(conteos), 7);
  assert.equal(conteos.sano, undefined);
});

test("totalHallazgos: objeto vacío es cero y no muta la entrada", () => {
  assert.equal(totalHallazgos({}), 0);
  const conteos = { caries: 2, obturado: 3 };
  assert.equal(totalHallazgos(conteos), 5);
  assert.deepEqual(conteos, { caries: 2, obturado: 3 });
});

/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import {
  aNumero,
  esPresupuestoEnviable,
  itemsConSubtotal,
  redondear,
  saldoPresupuesto,
  subtotalItem,
  subtotalPartidas,
  totalPresupuestado,
  totalPresupuesto,
} from "./calculoTotal.ts";
import type { ItemPresupuesto, ItemPresupuestoNuevo, Presupuesto } from "./tipos.ts";

const CLINICA = "33333333-3333-4333-8333-333333333333";
const PRESUPUESTO = "55555555-5555-4555-8555-555555555555";

/** Solo cantidad y precio unitario: es lo único que mira la aritmética. */
function partida(cantidad: number, precioUnitario: number) {
  return { cantidad, precioUnitario };
}

function partidaNueva(descripcion: string, cantidad: number, precioUnitario: number): ItemPresupuestoNuevo {
  return {
    clinicaId: CLINICA,
    presupuestoId: PRESUPUESTO,
    servicioId: null,
    descripcion,
    numeroPieza: null,
    cantidad,
    precioUnitario,
  };
}

test("aNumero tolera el NUMERIC de Postgres como texto y null", () => {
  assert.equal(aNumero("123.45"), 123.45);
  assert.equal(aNumero(null), 0);
  assert.equal(aNumero(""), 0);
  assert.equal(aNumero("no-numero"), 0);
});

test("redondear deja dos decimales, como el NUMERIC(10,2) de la base", () => {
  assert.equal(redondear(10.005), 10.01);
  assert.equal(redondear(10.004), 10);
  assert.equal(redondear(1.239), 1.24);
});

test("subtotalItem multiplica cantidad por precio y redondea", () => {
  assert.equal(subtotalItem(partida(3, 100)), 300);
  assert.equal(subtotalItem(partida(2, 10.555)), 21.11);
});

test("subtotalPartidas suma los subtotales de todas las líneas", () => {
  assert.equal(subtotalPartidas([partida(1, 100), partida(2, 50), partida(3, 10)]), 230);
});

test("totalPresupuesto resta el descuento del subtotal", () => {
  assert.equal(totalPresupuesto([partida(1, 1000)], 150), 850);
});

test("un descuento mayor que el subtotal deja el total en cero, nunca negativo", () => {
  assert.equal(totalPresupuesto([partida(1, 100)], 500), 0);
});

test("itemsConSubtotal calcula y adjunta el subtotal de cada partida", () => {
  const resultado = itemsConSubtotal([partidaNueva("Limpieza", 2, 120)]);
  assert.equal(resultado.length, 1);
  assert.equal(resultado[0]?.subtotal, 240);
  assert.equal(resultado[0]?.descripcion, "Limpieza");
});

test("esPresupuestoEnviable exige al menos una partida con descripción", () => {
  const conDescripcion: ItemPresupuesto[] = [
    {
      id: "i1",
      clinicaId: CLINICA,
      presupuestoId: PRESUPUESTO,
      servicioId: null,
      descripcion: "Obturación",
      numeroPieza: 16,
      cantidad: 1,
      precioUnitario: 250,
      subtotal: 250,
    },
  ];
  assert.equal(esPresupuestoEnviable(conDescripcion), true);
  assert.equal(esPresupuestoEnviable([]), false);
  assert.equal(
    esPresupuestoEnviable([{ ...conDescripcion[0]!, descripcion: "   " }]),
    false,
  );
});

test("totalPresupuestado suma los presupuestos vigentes y omite los rechazados", () => {
  const presupuestos: Pick<Presupuesto, "total" | "estado">[] = [
    { total: 1000, estado: "borrador" },
    { total: 500, estado: "enviado" },
    { total: 2000, estado: "aceptado" },
    { total: 9999, estado: "rechazado" },
  ];
  assert.equal(totalPresupuestado(presupuestos), 3500);
});

test("sin presupuestos, el total presupuestado es cero", () => {
  assert.equal(totalPresupuestado([]), 0);
});

test("el saldo pendiente de un módulo sigue sin poder ser negativo", () => {
  assert.equal(saldoPresupuesto(100, 150), 0);
  assert.equal(saldoPresupuesto(100, 30), 70);
});

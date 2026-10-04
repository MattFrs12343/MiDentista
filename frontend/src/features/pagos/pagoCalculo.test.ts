/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import { aNumero, montoAceptable, redondear, saldoPresupuesto, totalConfirmado } from "./pagoCalculo.ts";
import { calcularEstadoCuenta } from "./pagoService.ts";
import type { Decimal, EstadoPago, Pago } from "./tipos.ts";

const PACIENTE = "11111111-1111-4111-8111-111111111111";
const CLINICA = "33333333-3333-4333-8333-333333333333";

/** `pagoCalculo` solo necesita monto y estado: no se montan objetos completos. */
function pago(monto: Decimal, estado: string) {
  return { monto, estado };
}

/** `calcularEstadoCuenta` si exige `Pago` completos. */
function fila(monto: Decimal, estado: EstadoPago): Pago {
  return {
    id: `pago-${estado}-${String(monto)}`,
    clinicaId: CLINICA,
    pacienteId: PACIENTE,
    presupuestoId: null,
    monto,
    metodoPago: "efectivo",
    fechaPago: "2026-10-01",
    codigoReferencia: null,
    notas: "",
    estado,
    registradoPor: null,
    creadoEl: "2026-10-01T10:00:00Z",
  };
}

test("saldoPresupuesto descuenta solo los pagos confirmados", () => {
  const pagos = [
    pago(100, "confirmado"),
    pago(50, "pendiente"),
    pago(30, "rechazado"),
  ];
  assert.equal(saldoPresupuesto(500, pagos), 400);
});

test("totalConfirmado ignora pendiente y rechazado", () => {
  const pagos = [
    pago(100, "confirmado"),
    pago(999.99, "pendiente"),
    pago(999.99, "rechazado"),
  ];
  assert.equal(totalConfirmado(pagos), 100);
});

test("un estado desconocido no se cuenta como dinero recibido", () => {
  // `pagoDesdeFila` degrada lo desconocido a `confirmado`; si algo se colara
  // con otro texto, la aritmetica no lo asumira pagado.
  assert.equal(totalConfirmado([pago(70, "CONFIRMADO")]), 0);
  assert.equal(totalConfirmado([pago(70, "")]), 0);
});

test("el saldo pendiente nunca es negativo", () => {
  assert.equal(saldoPresupuesto(100, [pago(150, "confirmado")]), 0);
  assert.equal(saldoPresupuesto(0, [pago(10, "confirmado")]), 0);
});

test("el saldo de un presupuesto sin pagos es el total completo", () => {
  assert.equal(saldoPresupuesto(250.5, []), 250.5);
});

test("montoAceptable limita al saldo pendiente y no baja de cero", () => {
  assert.equal(montoAceptable(100, 40), 40);
  assert.equal(montoAceptable(100, 180), 100);
  assert.equal(montoAceptable(0, 50), 0);
  assert.equal(montoAceptable(100, 0), 0);
  assert.equal(montoAceptable(100, -25), 0);
});

test("aNumero tolera el NUMERIC de Postgres como texto y null", () => {
  assert.equal(aNumero(12.5), 12.5);
  assert.equal(aNumero("12.50"), 12.5);
  assert.equal(aNumero(null), 0);
  assert.equal(aNumero(""), 0);
  assert.equal(aNumero("no es un numero"), 0);
});

test("redondear deja dos decimales, como el NUMERIC(10,2) de la base", () => {
  assert.equal(redondear(10.005), 10.01);
  assert.equal(redondear(0.1 + 0.2), 0.3);
  assert.equal(redondear(33.333333), 33.33);
});

test("calcularEstadoCuenta aplica la misma regla de confirmados", () => {
  const pagos = [fila(120, "confirmado"), fila(80, "pendiente"), fila(200, "rechazado")];
  const estado = calcularEstadoCuenta(PACIENTE, pagos, 500);
  assert.equal(estado.pacienteId, PACIENTE);
  assert.equal(estado.totalPagado, 120);
  assert.equal(estado.totalPresupuestado, 500);
  assert.equal(estado.saldoPendiente, 380);
  assert.equal(estado.pagos.length, 3);
});

test("un presupuesto en cero deja el saldo en cero, sin inventar saldo", () => {
  const estado = calcularEstadoCuenta(PACIENTE, [fila(120, "confirmado")], 0);
  assert.equal(estado.totalPresupuestado, 0);
  assert.equal(estado.saldoPendiente, 0);
  assert.equal(estado.totalPagado, 120);
});

test("pagar de mas no deja un saldo negativo", () => {
  const estado = calcularEstadoCuenta(PACIENTE, [fila(600, "confirmado")], 500);
  assert.equal(estado.saldoPendiente, 0);
});
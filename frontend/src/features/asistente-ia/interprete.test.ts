/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import {
  distanciaEdicion,
  extraerNombreBuscado,
  normalizarFonetica,
  normalizarTexto,
  puntuarIntenciones,
  resolverIntencion,
  type Intencion,
} from "./interprete.ts";

test("normalizarTexto: minusculas, sin tildes, sin puntuacion", () => {
  assert.equal(normalizarTexto("¿Dónde Están Mis Pacientes?"), "donde estan mis pacientes");
});

test("normalizarTexto: colapsa espacios múltiples", () => {
  assert.equal(normalizarTexto("pagos   y    cuentas"), "pagos y cuentas");
});

test("normalizarFonetica: seseo (s/z/c suave) y yeismo (ll/y) se igualan", () => {
  assert.equal(normalizarFonetica("sita"), normalizarFonetica("cita"));
  assert.equal(normalizarFonetica("poyo"), normalizarFonetica("pollo"));
});

test("normalizarFonetica: b/v se igualan", () => {
  assert.equal(normalizarFonetica("vagos"), normalizarFonetica("bagos"));
});

test("distanciaEdicion: identico es 0, una letra de mas es 1", () => {
  assert.equal(distanciaEdicion("presupuesto", "presupuesto"), 0);
  assert.equal(distanciaEdicion("presupuesto", "presupuestoo"), 1);
});

const INTENCIONES_PRUEBA: Intencion[] = [
  { id: "pacientes", etiqueta: "Pacientes", palabrasClave: ["paciente", "pacientes", "lista de pacientes"] },
  { id: "presupuestos", etiqueta: "Presupuestos", palabrasClave: ["presupuesto", "presupuestos", "cotizacion"] },
  { id: "pagos", etiqueta: "Pagos", palabrasClave: ["pago", "pagos", "cobro"] },
];

test("puntuarIntenciones: coincidencia exacta puntua mas que no decir nada", () => {
  const candidatos = puntuarIntenciones("quiero ver mis pacientes", INTENCIONES_PRUEBA);
  assert.equal(candidatos[0].id, "pacientes");
});

test("puntuarIntenciones: tolera un error de tipeo", () => {
  const candidatos = puntuarIntenciones("quiero ver el presupesto", INTENCIONES_PRUEBA);
  assert.equal(candidatos[0].id, "presupuestos");
});

test("puntuarIntenciones: tolera una transcripcion de voz con seseo", () => {
  // El reconocimiento de voz a veces transcribe "cotización" como
  // "cotisasion" (seseo + ausencia de tilde) sin que el usuario haya dicho
  // nada "mal": normalizarFonetica iguala ambas formas, matchea exacto.
  const candidatos = puntuarIntenciones("quiero ver la cotisasion", INTENCIONES_PRUEBA);
  assert.equal(candidatos[0].id, "presupuestos");
});

test("resolverIntencion: texto claro ejecuta directo", () => {
  const resultado = resolverIntencion("abrime pacientes", INTENCIONES_PRUEBA);
  assert.deepEqual(resultado, { tipo: "ejecutar", intencionId: "pacientes" });
});

test("resolverIntencion: texto sin relacion no entiende nada", () => {
  const resultado = resolverIntencion("cuantos grados hace hoy", INTENCIONES_PRUEBA);
  assert.deepEqual(resultado, { tipo: "no_entendido" });
});

test("resolverIntencion: empate cercano pide desambiguar en vez de adivinar", () => {
  // "pago" matchea pagos (exacto) y, por tipeo, no debería matchear pacientes:
  // se fuerza el empate pasando dos intenciones con la misma palabra clave.
  const empatadas: Intencion[] = [
    { id: "a", etiqueta: "A", palabrasClave: ["pago"] },
    { id: "b", etiqueta: "B", palabrasClave: ["pago"] },
  ];
  const resultado = resolverIntencion("pago", empatadas);
  assert.equal(resultado.tipo, "desambiguar");
});

test("extraerNombreBuscado: reconoce 'paciente <nombre>'", () => {
  assert.equal(extraerNombreBuscado("buscar paciente Juan Perez"), "juan perez");
});

test("extraerNombreBuscado: reconoce 'a <nombre>'", () => {
  assert.equal(extraerNombreBuscado("abrir a Maria Gomez"), "maria gomez");
});

test("extraerNombreBuscado: sin nombre reconocible devuelve null, no inventa", () => {
  assert.equal(extraerNombreBuscado("quiero ver pacientes"), null);
  assert.equal(extraerNombreBuscado("hola"), null);
});

/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import {
  deltaDesdeIndicador,
  estaVacioPorDefecto,
  estadoDashboard,
  tonoStatTile,
} from "./dashboardCards.ts";
import type { DatosDashboard, Indicador, TonoIndicador } from "./tipos.ts";

/** `DatosDashboard` con valores por defecto: cada prueba cambia solo lo suyo. */
function datos<T>(
  valor: T,
  extra: Partial<Omit<DatosDashboard<T>, "valor">> = {},
): DatosDashboard<T> {
  return { valor, cargando: false, sinPermiso: false, error: null, ...extra };
}

test("tonoStatTile traduce todos los tonos y resuelve yellow como orange", () => {
  const esperado: Record<TonoIndicador, string> = {
    neutral: "neutral",
    blue: "blue",
    green: "green",
    violet: "violet",
    red: "red",
    yellow: "orange",
  };
  for (const [tono, statTile] of Object.entries(esperado)) {
    assert.equal(tonoStatTile(tono as TonoIndicador), statTile);
  }
  // Sin tono el tile no se colorea de más.
  assert.equal(tonoStatTile(), "neutral");
  assert.equal(tonoStatTile(undefined), "neutral");
});

test("deltaDesdeIndicador: sin delta no hay píldora", () => {
  assert.equal(deltaDesdeIndicador({}), undefined);
  assert.equal(deltaDesdeIndicador({ delta: "" }), undefined);
});

test("deltaDesdeIndicador respeta el texto y deduce dirección y color", () => {
  assert.deepEqual(deltaDesdeIndicador({ delta: "+12 %", deltaPositivo: true }), {
    value: "+12 %",
    trend: "up",
    sentiment: "positive",
  });
  assert.deepEqual(deltaDesdeIndicador({ delta: "-3", deltaPositivo: false }), {
    value: "-3",
    trend: "down",
    sentiment: "negative",
  });
  // Sin signo declarado no se inventa una dirección.
  assert.deepEqual(deltaDesdeIndicador({ delta: "$ 1.200" }), {
    value: "$ 1.200",
    trend: "flat",
    sentiment: "neutral",
  });
});

test("estaVacioPorDefecto: un objeto con campos no es vacío, y el cero no es vacío", () => {
  assert.equal(estaVacioPorDefecto(null), true);
  assert.equal(estaVacioPorDefecto(undefined), true);
  assert.equal(estaVacioPorDefecto([]), true);
  assert.equal(estaVacioPorDefecto([1]), false);
  assert.equal(estaVacioPorDefecto({ total: 0 }), false);
  // Los valores "falsy" legítimos no se confunden con ausencia de datos.
  assert.equal(estaVacioPorDefecto(0), false);
  assert.equal(estaVacioPorDefecto(false), false);
  assert.equal(estaVacioPorDefecto(""), false);
});

test("estadoDashboard: un error explícito nunca se oculta", () => {
  assert.equal(estadoDashboard(datos([1, 2], { error: "falló" })), "error");
  // Aunque además se esté cargando, el error manda.
  assert.equal(estadoDashboard(datos<number[]>([], { error: "falló", cargando: true })), "error");
});

test("estadoDashboard: cargando se distingue antes de mirar el valor", () => {
  assert.equal(estadoDashboard(datos<number[]>([], { cargando: true })), "cargando");
  assert.equal(estadoDashboard(datos([1], { cargando: true })), "cargando");
});

test("estadoDashboard: sinPermiso no se degrada a vacío", () => {
  assert.equal(estadoDashboard(datos<number[]>([], { sinPermiso: true })), "sinPermiso");
});

test("estadoDashboard: un vacío legítimo no es error ni falta de permiso", () => {
  assert.equal(estadoDashboard(datos<number[]>([])), "vacio");
  assert.equal(estadoDashboard(datos<number[] | null>(null)), "vacio");
});

test("estadoDashboard: con valor no vacío el bloque está listo", () => {
  assert.equal(estadoDashboard(datos([1])), "listo");
  assert.equal(estadoDashboard(datos({ total: 5 })), "listo");
});

test("estadoDashboard acepta un predicado propio para decidir el vacío", () => {
  // Un objeto con `total: 0` es "listo" por defecto, pero un módulo puede
  // decidir que total 0 no cuenta como contenido.
  const sinContenido = (valor: { total: number }) => valor.total === 0;
  assert.equal(estadoDashboard(datos({ total: 0 }), sinContenido), "vacio");
  assert.equal(estadoDashboard(datos({ total: 4 }), sinContenido), "listo");
});

test("el indicador de tipo se conserva (compilación) sin inventar campos", () => {
  const indicador: Indicador = {
    id: "pacientes-registrados",
    etiqueta: "Pacientes registrados",
    valor: "14",
    icono: "UsersThree",
    tono: "blue",
  };
  assert.equal(deltaDesdeIndicador(indicador), undefined);
  assert.equal(tonoStatTile(indicador.tono), "blue");
});

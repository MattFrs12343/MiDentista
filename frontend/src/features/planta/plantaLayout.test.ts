/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import {
  ALTO_PLANTA,
  ANCHO_PLANTA,
  COLOR_TIPO,
  MARGEN,
  RELLENO_POR_NIVEL,
  UNIDADES_POR_METRO,
  area,
  centro,
  colisiones,
  encuadre,
  solapan,
  vistaDe,
  zonasDemo,
} from "./plantaLayout.ts";
import { TIPOS_ZONA, type TipoZona } from "./tipos.ts";

function zona(x: number, y: number, ancho: number, alto: number) {
  return { x, y, ancho, alto };
}

test("el encuadre envuelve todas las zonas con margen y no degenera sin zonas", () => {
  const zonas = [zona(0, 0, 5.4, 4), zona(6.4, 6, 3.2, 4.5)];
  const marco = encuadre(zonas);
  assert.equal(marco.x, -MARGEN);
  assert.equal(marco.y, -MARGEN);
  // el borde derecho del consultorio mas a la derecha + margen
  assert.ok(Math.abs(marco.x + marco.ancho - (9.6 + MARGEN)) < 1e-9);
  assert.ok(Math.abs(marco.y + marco.alto - (10.5 + MARGEN)) < 1e-9);
  assert.equal(marco.escala, UNIDADES_POR_METRO);

  const vacio = encuadre([]);
  assert.ok(vacio.ancho > 0 && vacio.alto > 0);
  assert.equal(vacio.x, -MARGEN);
  assert.ok(vacio.ancho >= ANCHO_PLANTA);
  assert.ok(vacio.alto >= ALTO_PLANTA);
});

test("la vista multiplica por la escala y el viewBox nunca es degenerado", () => {
  const marco = encuadre([zona(-4, -2, 2, 2)]);
  assert.equal(marco.x, -4 - MARGEN);
  assert.equal(marco.y, -2 - MARGEN);

  const vista = vistaDe(marco);
  assert.equal(vista.x, marco.x * UNIDADES_POR_METRO);
  assert.equal(vista.ancho, marco.ancho * UNIDADES_POR_METRO);
  assert.ok(vista.ancho > 0 && vista.alto > 0);

  const vacia = vistaDe(encuadre([]));
  assert.ok(vacia.ancho > 0 && vacia.alto > 0);
});

test("centro y superficie en metros, con un decimal y sin flotante sucio", () => {
  assert.deepEqual(centro(zona(0, 0, 3.2, 4.5)), { x: 1.6, y: 2.25 });
  assert.equal(area(zona(0, 0, 3.2, 4.5)), 14.4);
  assert.equal(area(zona(0, 0, 0.1, 0.1)), 0);
});

test("solapan distingue el contacto de la superposicion real", () => {
  const a = zona(0, 0, 3, 3);
  assert.equal(solapan(a, zona(2, 2, 3, 3)), true);
  // solo se tocan en el borde: no es una zona encima de otra
  assert.equal(solapan(a, zona(3, 0, 3, 3)), false);
  assert.equal(solapan(a, zona(3.5, 0, 3, 3)), false);
});

test("colisiones excluye la propia zona y encuentra solo las que se pisan", () => {
  const a = zona(0, 0, 3, 3);
  const propia = zona(0, 0, 3, 3);
  const encima = zona(2, 2, 3, 3);
  const lejos = zona(10, 10, 1, 1);
  const lista = [propia, encima, lejos];
  // la zona se excluye por referencia, que es como la llama la vista
  assert.deepEqual(colisiones(propia, lista), [encima]);
  assert.deepEqual(colisiones(encima, lista), [propia]);
  assert.deepEqual(colisiones(lejos, lista), []);
  assert.deepEqual(colisiones(a, [encima]), [encima]);
});

test("toda zona tiene color y todo color es de un tipo declarado", () => {
  for (const tipo of TIPOS_ZONA) {
    assert.match(COLOR_TIPO[tipo], /^#[0-9a-f]{6}$/i, `falta color para ${tipo}`);
  }
  const huerfanos = Object.keys(COLOR_TIPO).filter((t) => !TIPOS_ZONA.includes(t as TipoZona));
  assert.deepEqual(huerfanos, []);
  for (const nivel of Object.keys(RELLENO_POR_NIVEL)) {
    const opacidad = RELLENO_POR_NIVEL[nivel];
    assert.ok(opacidad > 0 && opacidad <= 1, `relleno invalido para ${nivel}`);
  }
});

test("la planta de demostracion no tiene zonas superpuestas ni medidas invalidas", () => {
  const zonas = zonasDemo();
  assert.equal(zonas.length, ZONAS_DEMO_CANTIDAD);
  for (const z of zonas) {
    assert.ok(z.ancho > 0 && z.alto > 0, `${z.nombre} sin superficie`);
    assert.ok(z.capacidad >= 1, `${z.nombre} sin capacidad`);
    assert.ok(z.x >= 0 && z.y >= 0, `${z.nombre} fuera de la lamina`);
    assert.equal(z.clinicaId, "", "la demo no debe parecer una clinica real");
    assert.deepEqual(colisiones(z, zonas), [], `${z.nombre} se pisa con otra zona`);
  }
  const consultorios = zonas.filter((z) => z.tipo === "consultorio");
  assert.equal(consultorios.length, 3);
  // cada consultorio tiene un odontologo distinto, que es como se reparten las
  // citas de la agenda cuando la cita no trae zona_id
  const odontologos = consultorios.map((z) => z.odontologoId);
  assert.equal(new Set(odontologos).size, consultorios.length);
});

const ZONAS_DEMO_CANTIDAD = 10;
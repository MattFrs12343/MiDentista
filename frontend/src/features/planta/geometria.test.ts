import test from "node:test";
import assert from "node:assert/strict";
import { encuadre, zonasDemo } from "./plantaLayout.ts";import {
  ALTURA_ZONA,
  MUROS,
  PRESUPUESTO,
  geometriaDeZona,
  instanciasPorTipo,
  maximoDeZonas,
  metricasDeEscena,
  prepararZonas,
  radioDeEscena,
  type ZonaEnEscena,
} from "./three/geometria.ts";

/**
 * El 3D tiene la misma regla que el resto: lo que se puede comprobar sin
 * navegador vive en un modulo puro y se prueba con `node --test`. Aqui no se
 * comprueba que se vea bonito, sino que las tres cosas que pueden salir mal sin
 * que se note mirando la pantalla estan bien:
 *
 *  - que la zona no se refleje respecto del 2D,
 *  - que la escala de la instancia sea la medida real de la sala,
 *  - que la escena no se pase del presupuesto de render.
 */

function zonasDemoEnEscena(): ZonaEnEscena[] {
  return zonasDemo().map((z) => ({
    id: z.id,
    tipo: z.tipo,
    cx: z.x + z.ancho / 2,
    cy: z.y + z.alto / 2,
    ancho: z.ancho,
    alto: z.alto,
  }));
}

test("prepararZonas deja el centro de la planta en el origen", () => {
  const zonas = zonasDemoEnEscena();
  // El centro que usa la vista es el del encuadre, que es el del rectangulo que
  // envuelve las zonas mas un margen simetrico: los dos coinciden.
  const marco = encuadre(zonasDemo());
  const preparadas = prepararZonas(zonas, {
    x: marco.x + marco.ancho / 2,
    y: marco.y + marco.alto / 2,
  });

  const minX = Math.min(...preparadas.map((z) => z.cx - z.ancho / 2));
  const maxX = Math.max(...preparadas.map((z) => z.cx + z.ancho / 2));
  const minY = Math.min(...preparadas.map((z) => z.cy - z.alto / 2));
  const maxY = Math.max(...preparadas.map((z) => z.cy + z.alto / 2));

  assert.ok(Math.abs((minX + maxX) / 2) < 1e-9, "la planta no queda centrada en X");
  assert.ok(Math.abs((minY + maxY) / 2) < 1e-9, "la planta no queda centrada en Y");
});

test("prepararZonas no cambia el tamano de las zonas", () => {
  const zonas = zonasDemoEnEscena();
  const preparadas = prepararZonas(zonas, { x: 8, y: 3 });
  for (const antes of zonas) {
    const despues = preparadas.find((z) => z.id === antes.id);
    assert.ok(despues, `la zona ${antes.id} desaparecio`);
    assert.equal(despues.ancho, antes.ancho);
    assert.equal(despues.alto, antes.alto);
  }
});

test("el eje Y del plano se mapea a -Z, para que el 3D no salga al reves", () => {
  // Una zona mas abajo en el plano (y mayor) tiene que quedar mas lejos de la
  // camara. Con +Z el consultorio se veria reflejado respecto del 2D.
  const arriba: ZonaEnEscena = { id: "a", tipo: "consultorio", cx: 0, cy: -2, ancho: 3.2, alto: 4.5 };
  const abajo: ZonaEnEscena = { id: "b", tipo: "consultorio", cx: 0, cy: 2, ancho: 3.2, alto: 4.5 };

  assert.equal(geometriaDeZona(arriba).posicion[2], 2);
  assert.equal(geometriaDeZona(abajo).posicion[2], -2);
});

test("la caja de una zona lleva las medidas reales, no una caja unidad", () => {
  const zona: ZonaEnEscena = { id: "c1", tipo: "consultorio", cx: 1, cy: -1, ancho: 3.2, alto: 4.5 };
  const geo = geometriaDeZona(zona);

  assert.deepEqual(geo.escala, [3.2, ALTURA_ZONA, 4.5]);
  // la caja se apoya en el suelo: su centro va a media altura
  assert.equal(geo.posicion[1], ALTURA_ZONA / 2);
  assert.equal(geo.posicion[0], 1);
});

test("una instancia por zona y un grupo por tipo", () => {
  const zonas = zonasDemoEnEscena();
  const grupos = instanciasPorTipo(zonas);

  const total = [...grupos.values()].reduce((n, lista) => n + lista.length, 0);
  assert.equal(total, zonas.length, "se perdio alguna zona al agrupar por tipo");
  assert.ok(grupos.size < zonas.length, "con el demo deberia haber menos grupos que zonas");
});

test("las metricas de la demo quedan dentro del presupuesto de render", () => {
  const metricas = metricasDeEscena(zonasDemoEnEscena());

  assert.equal(metricas.instancias, 10);
  assert.ok(
    metricas.triangulos <= PRESUPUESTO.triangulos,
    `triangulos (${metricas.triangulos}) por encima del presupuesto`,
  );
  assert.ok(
    metricas.drawCalls <= PRESUPUESTO.drawCalls,
    `draw calls (${metricas.drawCalls}) por encima del presupuesto`,
  );
  assert.equal(metricas.dentroDePresupuesto, true);
});

test("los draw calls se cuentan por tipo, no por zona", () => {
  const zonas = zonasDemoEnEscena();
  const metricas = metricasDeEscena(zonas);
  const tipos = instanciasPorTipo(zonas).size;

  // suelo + 4 muros + marco de seleccion
  assert.equal(metricas.drawCalls, tipos + 1 + MUROS + 1);
});

test("maximoDeZonas avisa antes de pasarse del presupuesto", () => {
  const maximo = maximoDeZonas();
  assert.ok(maximo > 10, "el presupuesto deberia admitir la planta de una clinica real");

  const dentro = metricasDeEscena(
    Array.from({ length: maximo }, (_, i) => ({
      id: `z${i}`,
      tipo: "consultorio" as const,
      cx: 0,
      cy: 0,
      ancho: 3,
      alto: 4,
    })),
  );
  assert.equal(dentro.dentroDePresupuesto, true);

  const pasado = metricasDeEscena(
    Array.from({ length: maximo + 1 }, (_, i) => ({
      id: `z${i}`,
      tipo: "consultorio" as const,
      cx: 0,
      cy: 0,
      ancho: 3,
      alto: 4,
    })),
  );
  assert.equal(pasado.dentroDePresupuesto, false);
});

test("el radio de escena cubre la planta entera con un minimo util", () => {
  const radio = radioDeEscena(zonasDemoEnEscena());
  const zonas = zonasDemoEnEscena();

  for (const z of zonas) {
    const distancia = Math.hypot(z.cx, z.cy);
    assert.ok(
      radio >= distancia,
      `la zona ${z.id} queda fuera del encuadre: necesita ${distancia} y hay ${radio}`,
    );
  }
  assert.equal(radioDeEscena([]), 8, "sin zonas el encuadre no puede ser cero");
});

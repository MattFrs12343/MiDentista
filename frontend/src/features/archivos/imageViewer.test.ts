/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import {
  acercar, alejar, altImagen, dimensionesImagen, estadoVisor, fuenteImagen,
  limitarZoom, puedeAbrirImagen, restablecerZoom, viewportDesdeContenido,
} from "./imageViewer.ts";
import type { EstadoMiniatura } from "./tipos.ts";

test("visor admite JPG, PNG y WEBP por MIME y excluye PDF y otros formatos", () => {
  for (const mime of ["image/jpeg", "image/png", "image/webp"]) assert.equal(puedeAbrirImagen({ mime }), true);
  for (const mime of ["application/pdf", "image/gif", "image/svg+xml", ""]) assert.equal(puedeAbrirImagen({ mime }), false);
});

test("documento escaneado admite imagen y alt conserva clasificación y nombre", () => {
  const documento = { nombre: "Escaneo clínico.png", tipoArchivo: "documento" as const, mime: "image/png" };
  assert.equal(puedeAbrirImagen(documento), true);
  assert.equal(altImagen(documento), "Documento: Escaneo clínico.png");
  assert.equal(altImagen({ ...documento, tipoArchivo: "radiografia" }), "Radiografía: Escaneo clínico.png");
  assert.equal(altImagen({ ...documento, tipoArchivo: "fotografia" }), "Fotografía clínica: Escaneo clínico.png");
});

test("zoom inicia en 1x, cambia de 0.5 en 0.5 y restablece", () => {
  assert.equal(restablecerZoom(), 1);
  assert.equal(acercar(1), 1.5);
  assert.equal(acercar(1.5), 2);
  assert.equal(alejar(2), 1.5);
  assert.equal(alejar(1.5), 1);
  assert.equal(restablecerZoom(), 1);
});

test("zoom nunca supera 4x ni baja de 1x", () => {
  assert.equal(acercar(4), 4);
  assert.equal(alejar(1), 1);
  assert.equal(limitarZoom(10), 4);
  assert.equal(limitarZoom(-10), 1);
  assert.equal(limitarZoom(NaN), 1);
  assert.equal(limitarZoom(Infinity), 1);
});

test("dimensiones mantienen proporción y crecen en layout para scroll en ambos ejes", () => {
  const natural = { ancho: 2000, alto: 1000 };
  const viewport = { ancho: 600, alto: 400 };
  assert.deepEqual(dimensionesImagen(natural, viewport, 1), { ancho: 600, alto: 300 });
  assert.deepEqual(dimensionesImagen(natural, viewport, 4), { ancho: 2400, alto: 1200 });
  assert.deepEqual(dimensionesImagen({ ancho: 100, alto: 50 }, viewport, 1), { ancho: 100, alto: 50 });
  assert.deepEqual(dimensionesImagen({ ancho: 0, alto: 100 }, viewport, 1), { ancho: 0, alto: 0 });
  assert.deepEqual(dimensionesImagen(natural, { ancho: 0, alto: 0 }, 1), { ancho: 0, alto: 0 });
});

test("visor distingue firma pendiente, ausente, fallida y carga visible/error", () => {
  const miniatura: EstadoMiniatura = { estado: "disponible", url: "url", venceEn: 270000 };
  const fuente = fuenteImagen(miniatura)!;
  assert.equal(estadoVisor(undefined, null), "error");
  assert.equal(estadoVisor({ estado: "fallida" }, null), "error");
  assert.equal(estadoVisor({ estado: "pendiente" }, null), "cargando");
  assert.equal(estadoVisor(miniatura, null), "cargando");
  assert.equal(estadoVisor(miniatura, { fuente, estado: "visible" }), "visible");
  assert.equal(estadoVisor(miniatura, { fuente, estado: "error" }), "error");
});

test("a 100% el lienzo cabe en content boxes fraccionarios sin el desborde de clientWidth redondeado", () => {
  for (const contenido of [{ ancho: 599.75, alto: 399.75 }, { ancho: 320.5, alto: 213.5 }]) {
    const viewport = viewportDesdeContenido(contenido.ancho, contenido.alto);
    for (const natural of [{ ancho: 2000, alto: 1000 }, { ancho: 1000, alto: 2000 }, { ancho: 100, alto: 50 }]) {
      const imagen = dimensionesImagen(natural, viewport, 1);
      assert.ok(Math.max(viewport.ancho, imagen.ancho) <= contenido.ancho);
      assert.ok(Math.max(viewport.alto, imagen.alto) <= contenido.alto);
      assert.equal(imagen.ancho / imagen.alto, natural.ancho / natural.alto);
    }
    assert.ok(Math.round(contenido.ancho) > contenido.ancho);
    const ampliada = dimensionesImagen({ ancho: 2000, alto: 1000 }, viewport, 4);
    assert.ok(ampliada.ancho > viewport.ancho);
    assert.ok(ampliada.alto > viewport.alto);
  }
});

test("medición del viewport descarta dimensiones inválidas y estabiliza variaciones subpíxel", () => {
  assert.deepEqual(viewportDesdeContenido(NaN, -1), { ancho: 0, alto: 0 });
  assert.deepEqual(viewportDesdeContenido(Infinity, 0), { ancho: 0, alto: 0 });
  assert.deepEqual(viewportDesdeContenido(599.75, 399.75), viewportDesdeContenido(599.9, 399.9));
});

test("renovación y reintento con igual URL invalidan la carga de la fuente anterior", () => {
  const anterior: EstadoMiniatura = { estado: "disponible", url: "url", venceEn: 270000 };
  const renovada: EstadoMiniatura = { estado: "disponible", url: "url", venceEn: 540000 };
  const carga = { fuente: fuenteImagen(anterior)!, estado: "visible" as const };
  assert.notEqual(fuenteImagen(anterior), fuenteImagen(renovada));
  assert.equal(estadoVisor(renovada, carga), "cargando");
  assert.equal(estadoVisor(renovada, { ...carga, fuente: fuenteImagen(renovada)! }), "visible");
});

/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import { distanciaKm } from "./haversine.ts";
import { generarClinicasDemo } from "./clinicasDemo.ts";
import type { ClinicaDemo } from "./clinicasDemo.ts";

const CENTRO_LA_PAZ = { lat: -16.4897, lon: -68.1193 };
const CENTRO_SANTA_CRUZ = { lat: -17.7833, lon: -63.1821 };

/** Tolerancia de las comparaciones de distancia: el redondeo a seis decimales
 * mueve el punto ~11 cm, un milésimo de kilómetro. */
const TOLERANCIA_KM = 0.001;

function distancias(clinicas: ClinicaDemo[], centro = CENTRO_LA_PAZ): number[] {
  return clinicas.map((c) => distanciaKm(centro.lat, centro.lon, c.latitud, c.longitud));
}

test("devuelve cinco clinicas de demostracion con todos los campos completos", () => {
  const clinicas = generarClinicasDemo(CENTRO_LA_PAZ);
  assert.equal(clinicas.length, 5);
  for (const clinica of clinicas) {
    assert.equal(clinica.demo, true);
    assert.ok(clinica.nombre.length > 0);
    assert.ok(clinica.ciudad.length > 0);
    assert.ok(clinica.direccion.length > 0);
    assert.ok(clinica.telefono.length > 0);
    assert.ok(Number.isFinite(clinica.latitud));
    assert.ok(Number.isFinite(clinica.longitud));
  }
});

test("es determinista: dos llamadas con el mismo centro dan lo mismo", () => {
  const primera = generarClinicasDemo(CENTRO_LA_PAZ);
  const segunda = generarClinicasDemo(CENTRO_LA_PAZ);
  assert.deepEqual(primera, segunda);
  // Otras entradas también son estables, y el resultado no se pisa entre llamadas.
  assert.deepEqual(generarClinicasDemo(CENTRO_SANTA_CRUZ), generarClinicasDemo(CENTRO_SANTA_CRUZ));
  assert.notDeepEqual(generarClinicasDemo(CENTRO_SANTA_CRUZ), primera);
});

test("los ids empiezan con demo- y no se repiten", () => {
  const clinicas = generarClinicasDemo(CENTRO_LA_PAZ);
  const ids = clinicas.map((c) => c.id);
  assert.deepEqual(ids, ["demo-1", "demo-2", "demo-3", "demo-4", "demo-5"]);
  assert.equal(new Set(ids).size, clinicas.length);
  // Un id de demo nunca puede confundirse con un UUID de Supabase.
  for (const id of ids) assert.ok(!/^[0-9a-f-]{36}$/i.test(id));
});

test("sin radio explicito quedan dentro del filtro de 5 km y lejos del punto", () => {
  const clinicas = generarClinicasDemo(CENTRO_LA_PAZ);
  for (const distancia of distancias(clinicas)) {
    assert.ok(distancia > 0, "ninguna clinica se pega al centro");
    assert.ok(distancia <= 5, `queda fuera del filtro de 5 km: ${distancia}`);
    assert.ok(distancia >= 0.4 - TOLERANCIA_KM, `demasiado cerca: ${distancia}`);
    assert.ok(distancia <= 3.8 + TOLERANCIA_KM, `demasiado lejos: ${distancia}`);
  }
});

test("las distancias son distintas entre si: no se apilan en el mismo punto", () => {
  const valores = distancias(generarClinicasDemo(CENTRO_LA_PAZ));
  const ordenados = [...valores].sort((a, b) => a - b);
  for (let i = 1; i < ordenados.length; i += 1) {
    assert.ok(ordenados[i] - ordenados[i - 1] > TOLERANCIA_KM, "dos clinicas a la misma distancia");
  }
});

test("con radio de 2 km se respeta el radio pedido", () => {
  const radioKm = 2;
  const clinicas = generarClinicasDemo(CENTRO_LA_PAZ, radioKm);
  assert.equal(clinicas.length, 5);
  for (const distancia of distancias(clinicas)) {
    assert.ok(distancia <= radioKm + TOLERANCIA_KM, `fuera del radio pedido: ${distancia}`);
    assert.ok(distancia > 0);
  }
});

test("con un radio menor a 0.4 km se devuelven las cinco, dentro del radio", () => {
  // Decisión documentada: el radio manda sobre la distancia mínima. Ganar el
  // filtro de la pantalla vale más que separlas, así que quedan sobre un anillo
  // a exactamente 0.2 km; los rumbos siguen siendo distintos.
  const radioKm = 0.2;
  const clinicas = generarClinicasDemo(CENTRO_LA_PAZ, radioKm);
  assert.equal(clinicas.length, 5);
  const valores = distancias(clinicas);
  for (const distancia of valores) {
    assert.ok(distancia > 0);
    assert.ok(distancia <= radioKm + TOLERANCIA_KM);
  }
  assert.equal(new Set(clinicas.map((c) => `${c.latitud},${c.longitud}`)).size, 5);
});

test("un radio no usable cae al radio por defecto", () => {
  const esperado = generarClinicasDemo(CENTRO_LA_PAZ);
  assert.deepEqual(generarClinicasDemo(CENTRO_LA_PAZ, 0), esperado);
  assert.deepEqual(generarClinicasDemo(CENTRO_LA_PAZ, -3), esperado);
  assert.deepEqual(generarClinicasDemo(CENTRO_LA_PAZ, Number.NaN), esperado);
  assert.deepEqual(generarClinicasDemo(CENTRO_LA_PAZ, Number.POSITIVE_INFINITY), esperado);
});

test("devuelve lista vacia si la ubicacion no tiene numeros finitos", () => {
  assert.deepEqual(generarClinicasDemo({ lat: Number.NaN, lon: -68.1193 }), []);
  assert.deepEqual(generarClinicasDemo({ lat: -16.4897, lon: Number.NaN }), []);
  assert.deepEqual(generarClinicasDemo({ lat: Number.POSITIVE_INFINITY, lon: 0 }), []);
  assert.deepEqual(generarClinicasDemo({ lat: 0, lon: Number.NEGATIVE_INFINITY }), []);
  // Un centro ausente o con valores que no son números tampoco genera basura.
  assert.deepEqual(generarClinicasDemo({} as { lat: number; lon: number }), []);
  assert.deepEqual(generarClinicasDemo(undefined as unknown as { lat: number; lon: number }), []);
});

test("los datosdemo son distintos entre si y corresponden a una ciudad de Bolivia", () => {
  const clinicas = generarClinicasDemo(CENTRO_LA_PAZ);
  const nombres = clinicas.map((c) => c.nombre);
  assert.equal(new Set(nombres).size, clinicas.length);
  assert.equal(new Set(clinicas.map((c) => c.telefono)).size, clinicas.length);
  for (const clinica of clinicas) {
    assert.equal(clinica.ciudad, "La Paz");
    assert.ok(clinica.direccion.includes(clinica.ciudad));
    assert.match(clinica.telefono, /^[67]\d{7}$/);
  }
  // La demo se adapta a la ciudad del paciente: en Santa Cruz cambia el nombre.
  const santaCruz = generarClinicasDemo(CENTRO_SANTA_CRUZ);
  assert.equal(santaCruz[0].ciudad, "Santa Cruz de la Sierra");
  assert.notDeepEqual(santaCruz[0].direccion, clinicas[0].direccion);
});
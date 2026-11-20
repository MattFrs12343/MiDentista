/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import { prediagnosticoDesdeFila, prediagnosticoParaGuardar, type PrediagnosticoFila } from "./sintomasMapper.ts";

const PACIENTE = "11111111-1111-4111-8111-111111111111";
const CLINICA = "33333333-3333-4333-8333-333333333333";

function fila(extra: Partial<PrediagnosticoFila> = {}): PrediagnosticoFila {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    clinica_id: CLINICA,
    paciente_id: PACIENTE,
    sintomas: ["dolor_muela", "fiebre"],
    intensidad: "severo",
    duracion: "horas",
    severidad: "emergencia",
    creado_en: "2026-11-20T10:00:00Z",
    ...extra,
  };
}

test("prediagnosticoDesdeFila mapea una fila válida", () => {
  const contenido = prediagnosticoDesdeFila(fila());
  assert.deepEqual(contenido, {
    sintomas: ["dolor_muela", "fiebre"],
    intensidad: "severo",
    duracion: "horas",
    severidad: "emergencia",
  });
});

test("prediagnosticoDesdeFila acepta intensidad/duracion null (rutina sin dolor)", () => {
  const contenido = prediagnosticoDesdeFila(
    fila({ sintomas: ["sensibilidad"], intensidad: null, duracion: null, severidad: "rutina" }),
  );
  assert.equal(contenido.intensidad, null);
  assert.equal(contenido.duracion, null);
});

test("prediagnosticoDesdeFila rechaza un síntoma desconocido en vez de ignorarlo", () => {
  assert.throws(() => prediagnosticoDesdeFila(fila({ sintomas: ["dolor_muela", "algo_random"] })), /síntoma desconocido/);
});

test("prediagnosticoDesdeFila rechaza severidad fuera de las tres conocidas", () => {
  assert.throws(() => prediagnosticoDesdeFila(fila({ severidad: "grave" })), /severidad contiene un valor desconocido/);
});

test("prediagnosticoDesdeFila rechaza sintomas que no sea un arreglo", () => {
  assert.throws(() => prediagnosticoDesdeFila(fila({ sintomas: "dolor_muela" })), /debe contener un arreglo/);
});

test("prediagnosticoParaGuardar no incluye paciente_id/clinica_id (los pone el servicio)", () => {
  const contenido = prediagnosticoDesdeFila(fila());
  const paraGuardar = prediagnosticoParaGuardar(contenido);
  assert.equal("paciente_id" in paraGuardar, false);
  assert.equal("clinica_id" in paraGuardar, false);
  assert.deepEqual(paraGuardar.sintomas, contenido.sintomas);
});

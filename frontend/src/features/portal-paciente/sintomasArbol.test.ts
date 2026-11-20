/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import {
  alSeleccionarSintoma,
  calcularCondicionPosible,
  calcularSeveridad,
  requiereIntensidadYDuracion,
  type SintomaId,
} from "./sintomasArbol.ts";

test("severidad: dolor severo + fiebre es emergencia", () => {
  assert.equal(calcularSeveridad(["fiebre"], "severo"), "emergencia");
});

test("severidad: dolor severo + inflamacion es emergencia", () => {
  assert.equal(calcularSeveridad(["inflamacion"], "severo"), "emergencia");
});

test("severidad: trauma dental + sangrado es emergencia, incluso sin dolor", () => {
  assert.equal(calcularSeveridad(["trauma_dental", "sangrado"], null), "emergencia");
});

test("severidad: dolor severo solo (sin fiebre/inflamacion) es urgente", () => {
  assert.equal(calcularSeveridad([], "severo"), "urgente");
});

test("severidad: pus + dolor moderado es urgente", () => {
  assert.equal(calcularSeveridad(["pus_mal_aliento"], "moderado"), "urgente");
});

test("severidad: pus sin dolor (intensidad null) no es urgente por si solo", () => {
  assert.equal(calcularSeveridad(["pus_mal_aliento"], null), "rutina");
});

test("severidad: sensibilidad sola es rutina", () => {
  assert.equal(calcularSeveridad(["sensibilidad"], null), "rutina");
});

test("severidad: dolor leve sin otros sintomas es rutina", () => {
  assert.equal(calcularSeveridad(["dolor_muela"], "leve"), "rutina");
});

test("severidad: ningun sintoma marcado es rutina", () => {
  assert.equal(calcularSeveridad([], null), "rutina");
});

test("requiereIntensidadYDuracion: true si hay dolor de muela o mandibula", () => {
  assert.equal(requiereIntensidadYDuracion(["dolor_muela"]), true);
  assert.equal(requiereIntensidadYDuracion(["dolor_mandibula"]), true);
});

test("requiereIntensidadYDuracion: false sin dolor", () => {
  assert.equal(requiereIntensidadYDuracion(["fiebre", "sensibilidad"]), false);
  assert.equal(requiereIntensidadYDuracion([]), false);
});

test("alSeleccionarSintoma: marcar ninguno limpia el resto", () => {
  const actuales: SintomaId[] = ["fiebre", "sangrado"];
  assert.deepEqual(alSeleccionarSintoma(actuales, "ninguno"), ["ninguno"]);
});

test("alSeleccionarSintoma: marcar otro sintoma desmarca ninguno", () => {
  const actuales: SintomaId[] = ["ninguno"];
  assert.deepEqual(alSeleccionarSintoma(actuales, "fiebre"), ["fiebre"]);
});

test("alSeleccionarSintoma: marcar un sintoma ya marcado lo desmarca (toggle)", () => {
  const actuales: SintomaId[] = ["fiebre", "sangrado"];
  assert.deepEqual(alSeleccionarSintoma(actuales, "fiebre"), ["sangrado"]);
});

test("alSeleccionarSintoma: marcar ninguno de nuevo lo desmarca (toggle)", () => {
  const actuales: SintomaId[] = ["ninguno"];
  assert.deepEqual(alSeleccionarSintoma(actuales, "ninguno"), []);
});

test("condicion posible: trauma + sangrado es fractura/luxacion", () => {
  assert.equal(calcularCondicionPosible(["trauma_dental", "sangrado"], null)?.nombre, "Posible fractura o luxación dental");
});

test("condicion posible: trauma solo, sin sangrado", () => {
  assert.equal(calcularCondicionPosible(["trauma_dental"], null)?.nombre, "Posible fractura o aflojamiento dental");
});

test("condicion posible: dolor severo + fiebre es absceso", () => {
  assert.equal(calcularCondicionPosible(["dolor_muela", "fiebre"], "severo")?.nombre, "Posible absceso dental");
});

test("condicion posible: inflamacion + fiebre (sin dolor) es infeccion dental", () => {
  assert.equal(calcularCondicionPosible(["inflamacion", "fiebre"], null)?.nombre, "Posible infección dental");
});

test("condicion posible: dolor severo solo (sin fiebre/inflamacion) es pulpitis", () => {
  assert.equal(calcularCondicionPosible(["dolor_mandibula"], "severo")?.nombre, "Posible pulpitis");
});

test("condicion posible: sangrado + inflamacion es enfermedad de encias", () => {
  assert.equal(
    calcularCondicionPosible(["sangrado", "inflamacion"], null)?.nombre,
    "Posible enfermedad de las encías (gingivitis o periodontitis)",
  );
});

test("condicion posible: sangrado solo es gingivitis", () => {
  assert.equal(calcularCondicionPosible(["sangrado"], null)?.nombre, "Posible gingivitis");
});

test("condicion posible: pus/mal aliento solo", () => {
  assert.equal(calcularCondicionPosible(["pus_mal_aliento"], null)?.nombre, "Posible infección o caries avanzada");
});

test("condicion posible: dolor leve/moderado solo es caries", () => {
  assert.equal(calcularCondicionPosible(["dolor_muela"], "leve")?.nombre, "Posible caries dental");
});

test("condicion posible: sensibilidad sola", () => {
  assert.equal(
    calcularCondicionPosible(["sensibilidad"], null)?.nombre,
    "Posible desgaste de esmalte o caries incipiente",
  );
});

test("condicion posible: ninguno o sin sintomas no sugiere nada", () => {
  assert.equal(calcularCondicionPosible(["ninguno"], null), null);
  assert.equal(calcularCondicionPosible([], null), null);
});

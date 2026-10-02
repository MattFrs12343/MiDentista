/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import {
  crearHistoriaClinicaVacia,
  esUuid,
  historiaDesdeFila,
  historiaParaGuardar,
  type HistorialClinicoFila,
} from "./clinicalHistoryMapper.ts";

const PACIENTE = "11111111-1111-4111-8111-111111111111";

function filaVacia(): HistorialClinicoFila {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    clinica_id: "33333333-3333-4333-8333-333333333333",
    paciente_id: PACIENTE,
    motivo_consulta: null,
    antecedentes_medicos: null,
    antecedentes_odontologicos: null,
    alergias: null,
    medicamentos: null,
    enfermedades: null,
    habitos: null,
    observaciones: null,
    creado_en: null,
    actualizado_en: null,
  };
}

test("JSON conserva textos, listas, alergias y antecedentes sin separadores ambiguos", () => {
  const historia = {
    ...crearHistoriaClinicaVacia(PACIENTE),
    motivoConsulta: "Dolor al frío\nDesde ayer",
    antecedentesPersonales: 'Texto con comas; y "comillas"',
    antecedentesFamiliares: "Madre: hipertensión\nPadre: diabetes",
    antecedentesOdontologicos: "Endodoncia previa",
    medicamentosActuales: ["Medicamento A, 50 mg; diario", "Medicamento B\n2 veces"],
    enfermedadesBase: ["Diabetes", "Hipertensión"],
    habitos: ["Consumo frecuente de azúcar"],
    alergias: [{ id: "a1", sustancia: "Penicilina", severidad: "grave" as const }],
    observacionesGenerales: "Reevaluar en una semana.",
  };
  const contenido = historiaParaGuardar(historia);
  assert.deepEqual(historiaDesdeFila({ ...filaVacia(), ...contenido }), historia);
  assert.deepEqual(JSON.parse(contenido.antecedentes_medicos!), {
    personales: historia.antecedentesPersonales,
    familiares: historia.antecedentesFamiliares,
  });
  assert.equal("actualizado_en" in contenido, false);
  assert.equal("actualizado_por" in contenido, false);
});

test("columnas null devuelven una historia vacía válida", () => {
  assert.deepEqual(historiaDesdeFila(filaVacia()), crearHistoriaClinicaVacia(PACIENTE));
});

test("texto legado se conserva en antecedentes y como un único elemento de lista", () => {
  const resultado = historiaDesdeFila({
    ...filaVacia(),
    antecedentes_medicos: "Bruxismo nocturno.",
    medicamentos: "Losartán 50 mg, al día; después de comer",
  });
  assert.equal(resultado.antecedentesPersonales, "Bruxismo nocturno.");
  assert.equal(resultado.antecedentesFamiliares, "");
  assert.deepEqual(resultado.medicamentosActuales, ["Losartán 50 mg, al día; después de comer"]);
});

test("JSON inválido o con tipos incorrectos produce error, no datos vacíos", () => {
  assert.throws(() => historiaDesdeFila({ ...filaVacia(), medicamentos: '["sin cerrar"' }), /JSON válido/);
  assert.throws(() => historiaDesdeFila({ ...filaVacia(), enfermedades: '[42]' }), /lista JSON/);
  assert.throws(() => historiaDesdeFila({ ...filaVacia(), antecedentes_medicos: '{"personales":42}' }), /personales y familiares/);
});

test("no se inventa la severidad de alergias antiguas", () => {
  assert.throws(() => historiaDesdeFila({ ...filaVacia(), alergias: "Penicilina" }), /no se asignará una severidad/);
  assert.throws(() => historiaDesdeFila({ ...filaVacia(), alergias: '[{"sustancia":"Látex"}]' }), /datos inválidos/);
});

test("alergias JSON sin id reciben solo un identificador local y conservan severidad", () => {
  const resultado = historiaDesdeFila({ ...filaVacia(), alergias: '[{"sustancia":"Látex","severidad":"leve"}]' });
  assert.deepEqual(resultado.alergias, [{ id: "alergia-local-0", sustancia: "Látex", severidad: "leve" }]);
});

test("trazabilidad lee la fecha del servidor sin fabricar responsable", () => {
  const resultado = historiaDesdeFila({ ...filaVacia(), actualizado_en: "2026-10-01T12:30:00Z" });
  assert.equal(resultado.actualizadoEl, "2026-10-01T12:30:00Z");
  assert.equal(resultado.actualizadoPor, undefined);
});

test("IDs locales no pasan la validación de UUID", () => {
  assert.equal(esUuid(PACIENTE), true);
  for (const valor of ["p1", "p2", "p3", "p_123", "Dental Cristo Rey", ""]) {
    assert.equal(esUuid(valor), false);
  }
});

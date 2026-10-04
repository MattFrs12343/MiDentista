/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import {
  esUuid,
  evolucionDesdeFila,
  evolucionParaActualizar,
  evolucionParaGuardar,
  tieneProximaAtencion,
  type EvolucionClinicaFila,
} from "./evolucionMapper.ts";
import type { EvolucionClinica, EvolucionNueva } from "./tipos.ts";

const CLINICA = "11111111-1111-4111-8111-111111111111";
const PACIENTE = "22222222-2222-4222-8222-222222222222";
const ODONTOLOGO = "33333333-3333-4333-8333-333333333333";
const EVOLUCION = "44444444-4444-4444-8444-444444444444";
const PLAN = "55555555-5555-4555-8555-555555555555";
const PROCEDIMIENTO = "66666666-6666-4666-8666-666666666666";

function nueva(): EvolucionNueva {
  return {
    clinicaId: CLINICA,
    pacienteId: PACIENTE,
    odontologoId: ODONTOLOGO,
    planTratamientoId: PLAN,
    procedimientoId: PROCEDIMIENTO,
    numeroPieza: 16,
    fechaConsulta: "2026-10-03",
    motivoConsulta: "Dolor al masticar, desde dos días",
    procedimientoRealizado: "Obturación con resina en molar superior derecho",
    observaciones: "Caries oclusal profunda\nSin compromiso pulpar",
    indicaciones: "Higiene con hilo dental; evitar dulces duros por una semana",
    proximaAtencion: "2026-11-03",
  };
}

function fila(): EvolucionClinicaFila {
  return { id: EVOLUCION, creado_en: "2026-10-03T15:20:00Z", ...evolucionParaGuardar(nueva(), CLINICA) };
}

function evolucion(): EvolucionClinica {
  return evolucionDesdeFila(fila());
}

test("esUuid acepta UUIDs reales y rechaza los ids de la demo", () => {
  assert.equal(esUuid(PACIENTE), true);
  assert.equal(esUuid("A1B2C3D4-E5F6-4789-ABCD-0123456789EF"), true);
  for (const valor of ["p1", "p2", "p_123", "p-abc", "Dental Cristo Rey", "", "  "]) {
    assert.equal(esUuid(valor), false, `debería rechazar ${JSON.stringify(valor)}`);
  }
});

test("el mapper ida y vuelta conserva todos los campos, incluidos los null", () => {
  const contenido = nueva();
  const reconstruida = evolucionDesdeFila({
    id: EVOLUCION,
    creado_en: "2026-10-03T15:20:00Z",
    ...evolucionParaGuardar(contenido, CLINICA),
  });
  assert.equal(reconstruida.motivoConsulta, contenido.motivoConsulta);
  assert.equal(reconstruida.procedimientoRealizado, contenido.procedimientoRealizado);
  assert.equal(reconstruida.observaciones, contenido.observaciones);
  assert.equal(reconstruida.indicaciones, contenido.indicaciones);
  assert.equal(reconstruida.numeroPieza, 16);
  assert.equal(reconstruida.fechaConsulta, "2026-10-03");
  assert.equal(reconstruida.proximaAtencion, "2026-11-03");
  assert.equal(reconstruida.planTratamientoId, PLAN);
  assert.equal(reconstruida.procedimientoId, PROCEDIMIENTO);
  assert.equal(reconstruida.creadoEn, "2026-10-03T15:20:00Z");

  const sinOpcionales = evolucionDesdeFila({
    ...fila(),
    plan_tratamiento_id: null,
    procedimiento_id: null,
    numero_pieza: null,
    proxima_atencion: null,
  });
  assert.equal(sinOpcionales.planTratamientoId, null);
  assert.equal(sinOpcionales.procedimientoId, null);
  assert.equal(sinOpcionales.numeroPieza, null);
  assert.equal(sinOpcionales.proximaAtencion, null);
});

test("textos con saltos de línea y separadores no se reinterpretan", () => {
  const conSaltos = evolucionDesdeFila({
    ...fila(),
    motivo_consulta: "Primera línea\nSegunda línea",
    indicaciones: 'Comas; punto y coma "comillas" y 1,5 ml',
  });
  assert.equal(conSaltos.motivoConsulta, "Primera línea\nSegunda línea");
  assert.equal(conSaltos.indicaciones, 'Comas; punto y coma "comillas" y 1,5 ml');
});

test("columnas null devuelven cadenas vacías, no 'null' ni una fecha inventada", () => {
  const vacia = evolucionDesdeFila({
    ...fila(),
    fecha_consulta: null,
    motivo_consulta: null,
    procedimiento_realizado: null,
    observaciones: null,
    indicaciones: null,
    creado_en: null,
  });
  assert.equal(vacia.motivoConsulta, "");
  assert.equal(vacia.procedimientoRealizado, "");
  assert.equal(vacia.observaciones, "");
  assert.equal(vacia.indicaciones, "");
  assert.equal(vacia.creadoEn, "");
  // `fecha_consulta` tiene DEFAULT CURRENT_DATE, así que un null significa fila
  // vieja: se usa hoy, pero siempre como `YYYY-MM-DD`.
  assert.match(vacia.fechaConsulta, /^\d{4}-\d{2}-\d{2}$/);
});

test("el INSERT no envía `id` ni `creado_en`, y usa el UUID de clínica recibido", () => {
  const contenido = evolucionParaGuardar(nueva(), CLINICA);
  assert.equal("id" in contenido, false);
  assert.equal("creado_en" in contenido, false);
  assert.equal(contenido.clinica_id, CLINICA);
  assert.equal(contenido.paciente_id, PACIENTE);
  assert.equal(contenido.odontologo_id, ODONTOLOGO);
  // Sin clave en la fila: la genera la base de datos.
  assert.deepEqual(Object.keys(contenido).sort(), [
    "clinica_id",
    "fecha_consulta",
    "indicaciones",
    "motivo_consulta",
    "numero_pieza",
    "observaciones",
    "paciente_id",
    "plan_tratamiento_id",
    "procedimiento_id",
    "procedimiento_realizado",
    "proxima_atencion",
    "odontologo_id",
  ].sort());
});

test("el UPDATE conserva los identificadores de la fila ya guardada", () => {
  const actual = evolucion();
  const contenido = evolucionParaActualizar({
    ...actual,
    motivoConsulta: "Motivo corregido",
    proximaAtencion: null,
  });
  assert.equal(contenido.motivo_consulta, "Motivo corregido");
  assert.equal(contenido.proxima_atencion, null);
  assert.equal(contenido.clinica_id, CLINICA);
  assert.equal(contenido.paciente_id, PACIENTE);
  assert.equal(contenido.odontologo_id, ODONTOLOGO);
  assert.equal(contenido.observaciones, actual.observaciones);
});

test("tieneProximaAtencion distingue la fecha real de null y de cadena vacía", () => {
  assert.equal(tieneProximaAtencion(evolucion()), true);
  assert.equal(tieneProximaAtencion({ ...evolucion(), proximaAtencion: null }), false);
  assert.equal(tieneProximaAtencion({ ...evolucion(), proximaAtencion: "" }), false);
});

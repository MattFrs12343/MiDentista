/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import { diagnosticoDesdeFila, diagnosticoParaGuardar, esEstadoDiagnostico, esPiezaDiagnostico, piezaDesdeTexto } from "./diagnosticoMapper.ts";
import { puedeCrearDiagnostico, puedeEditarDiagnostico, puedeLeerDiagnosticos } from "./diagnosticoPermisos.ts";

const ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PACIENTE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CLINICA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const AUTOR = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
function fila(cambios: Record<string, unknown> = {}) {
  return { id: ID, paciente_id: PACIENTE, clinica_id: CLINICA, odontologo_id: AUTOR, descripcion: "Caries",
    numero_pieza: 54, observaciones: "  Control\npendiente  ", estado: "activo", fecha_diagnostico: "2026-10-11",
    creado_en: "2026-10-11T10:00:00+00:00", actualizado_en: "2026-10-11T12:00:00+00:00", ...cambios };
}

test("mapper conserva contexto, observaciones, estado y timestamps del servidor", () => {
  assert.deepEqual(diagnosticoDesdeFila(fila()), { id: ID, pacienteId: PACIENTE, clinicaId: CLINICA, odontologoId: AUTOR,
    descripcion: "Caries", numeroPieza: 54, observaciones: "  Control\npendiente  ", estado: "activo", fechaDiagnostico: "2026-10-11",
    creadoEn: "2026-10-11T10:00:00+00:00", actualizadoEn: "2026-10-11T12:00:00+00:00" });
  const legado = diagnosticoDesdeFila(fila({ numero_pieza: null, observaciones: null, fecha_diagnostico: null, creado_en: null, actualizado_en: null }));
  assert.equal(legado.observaciones, "");
  assert.equal(legado.numeroPieza, null);
  assert.equal(legado.actualizadoEn, null);
});

test("filas malformadas no se convierten silenciosamente en diagnósticos válidos", () => {
  for (const valor of [null, [], {}, fila({ id: "p1" }), fila({ paciente_id: "p2" }), fila({ clinica_id: "cl1" }),
    fila({ odontologo_id: "doctor" }), fila({ estado: "pendiente" }), fila({ descripcion: " \t\n" }),
    fila({ numero_pieza: NaN }), fila({ observaciones: 2 }), fila({ actualizado_en: "ayer" }), fila({ creado_en: undefined })]) {
    assert.throws(() => diagnosticoDesdeFila(valor));
  }
});

test("piezas coinciden con todos los rangos FDI de SQL, incluidas las temporales", () => {
  const validas = [11,12,13,14,15,16,17,18,21,22,23,24,25,26,27,28,31,32,33,34,35,36,37,38,41,42,43,44,45,46,47,48,
    51,52,53,54,55,61,62,63,64,65,71,72,73,74,75,81,82,83,84,85];
  for (let pieza = 0; pieza <= 100; pieza++) assert.equal(esPiezaDiagnostico(pieza), validas.includes(pieza), `Pieza ${pieza}`);
  for (const valor of [NaN, Infinity, -11, 11.5, "11", undefined]) assert.equal(esPiezaDiagnostico(valor), false);
  assert.equal(esPiezaDiagnostico(null), true);
});

test("pieza de formulario admite vacío pero rechaza coerciones de Number y texto libre", () => {
  assert.equal(piezaDesdeTexto(" \t"), null);
  assert.equal(piezaDesdeTexto(" 54 "), 54);
  for (const valor of ["NaN", "Infinity", "abc", "1e1", "0x11", "+11", "11.0", "011", "11 piezas", "56", "19", "-11"]) {
    assert.throws(() => piezaDesdeTexto(valor), /FDI válido/);
  }
});

test("payload de contenido es lista blanca y exige descripción/pieza válidas", () => {
  const datos = { descripcion: "  Caries  ", numeroPieza: null, observaciones: "  preservar  ",
    id: ID, clinica_id: CLINICA, paciente_id: PACIENTE, odontologo_id: AUTOR, estado: "resuelto", creado_en: "2000-01-01", actualizado_en: "2000-01-01" };
  assert.deepEqual(diagnosticoParaGuardar(datos), { descripcion: "Caries", numero_pieza: null, observaciones: "  preservar  " });
  assert.throws(() => diagnosticoParaGuardar({ ...datos, descripcion: " \n" }), /obligatoria/);
  assert.throws(() => diagnosticoParaGuardar({ ...datos, numeroPieza: 19 }), /pieza dental/);
  assert.deepEqual(["activo", "inactivo", "resuelto"].map(esEstadoDiagnostico), [true, true, true]);
  for (const estado of ["pendiente", "completado", "", null]) assert.equal(esEstadoDiagnostico(estado), false);
});

test("permisos visuales distinguen autor, colega, clínica, recepcionista y auditoría", () => {
  const diagnostico = diagnosticoDesdeFila(fila());
  const perfil = { id: AUTOR, clinicaId: CLINICA, rol: "odontologo", activo: true };
  assert.equal(puedeCrearDiagnostico(perfil), true);
  assert.equal(puedeEditarDiagnostico(perfil, diagnostico), true);
  assert.equal(puedeEditarDiagnostico({ ...perfil, id: ID }, diagnostico), false);
  assert.equal(puedeEditarDiagnostico({ ...perfil, clinicaId: PACIENTE }, diagnostico), false);
  // odontologo_admin (módulo 17): mismo permiso que odontologo, no un rol aparte.
  const perfilAdmin = { ...perfil, rol: "odontologo_admin" };
  assert.equal(puedeCrearDiagnostico(perfilAdmin), true);
  assert.equal(puedeEditarDiagnostico(perfilAdmin, diagnostico), true);
  for (const rol of ["recepcionista", "superadmin", "paciente", "otro"]) {
    const actor = { ...perfil, rol };
    assert.equal(puedeCrearDiagnostico(actor), false);
    assert.equal(puedeEditarDiagnostico(actor, diagnostico), false);
    assert.equal(puedeLeerDiagnosticos(actor), rol === "recepcionista" || rol === "superadmin");
  }
  assert.equal(puedeLeerDiagnosticos({ ...perfil, rol: "superadmin", clinicaId: null }), true);
  assert.equal(puedeCrearDiagnostico({ ...perfil, activo: false }), false);
  assert.equal(puedeLeerDiagnosticos({ ...perfil, activo: false }), false);
  assert.equal(puedeLeerDiagnosticos(null), false);
});

/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import type { Paciente } from "../../types/index.ts";
import { buscarPacientePorNombre } from "./buscarPaciente.ts";

function paciente(extra: Partial<Paciente>): Paciente {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    nombres: "Juan",
    apellidos: "Pérez",
    ci: "1234567",
    fechaNacimiento: "1990-01-01",
    sexo: "masculino",
    telefono: "70000000",
    email: "juan@example.com",
    direccion: "Calle 1",
    creadoEl: "2026-01-01T00:00:00Z",
    ...extra,
  };
}

test("encuentra una coincidencia unica, ignorando tildes y mayusculas", () => {
  const pacientes = [paciente({}), paciente({ id: "2", nombres: "María", apellidos: "Gómez" })];
  const resultado = buscarPacientePorNombre(pacientes, "maria gomez");
  assert.equal(resultado?.id, "2");
});

test("coincidencia parcial (solo nombre) tambien funciona si es unica", () => {
  const pacientes = [paciente({}), paciente({ id: "2", nombres: "María", apellidos: "Gómez" })];
  assert.equal(buscarPacientePorNombre(pacientes, "maria")?.id, "2");
});

test("mas de una coincidencia no elige por vos: devuelve null", () => {
  const pacientes = [
    paciente({ id: "1", nombres: "Juan", apellidos: "Pérez" }),
    paciente({ id: "2", nombres: "Juan", apellidos: "Gómez" }),
  ];
  assert.equal(buscarPacientePorNombre(pacientes, "juan"), null);
});

test("sin coincidencias devuelve null", () => {
  assert.equal(buscarPacientePorNombre([paciente({})], "nombre inexistente"), null);
});

test("nombre buscado vacio devuelve null sin recorrer nada raro", () => {
  assert.equal(buscarPacientePorNombre([paciente({})], "   "), null);
});

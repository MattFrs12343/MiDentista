/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import {
  contarUsuariosPorRol,
  distribuirClinicasPorEstado,
} from "./superadminResumen.ts";
import {
  serieClinicasPorEstado,
  serieUsuariosPorRol,
} from "./superadminGraficos.ts";
import type { FilaClinica, FilaPerfil } from "./superadminResumen.ts";

function clinica(activo: boolean): FilaClinica {
  return { activo };
}

function perfil(rol: string, activo: boolean): FilaPerfil {
  return { rol, activo };
}

test("contarUsuariosPorRol: lista vacía devuelve total 0 y sin ítems", () => {
  const r = contarUsuariosPorRol([]);
  assert.equal(r.total, 0);
  assert.deepEqual(r.items, []);
});

test("contarUsuariosPorRol: ignora roles nulos/vacíos y cuenta todos los perfiles", () => {
  const r = contarUsuariosPorRol([
    perfil("superadmin", true),
    perfil("odontologo", true),
    { rol: "", activo: true } as unknown as FilaPerfil,
    { rol: null, activo: false } as unknown as FilaPerfil,
    perfil("recepcionista", false),
  ]);
  assert.equal(r.total, 5);
  assert.deepEqual(r.items, [
    { rol: "odontologo", cantidad: 1 },
    { rol: "recepcionista", cantidad: 1 },
    { rol: "superadmin", cantidad: 1 },
  ]);
});

test("contarUsuariosPorRol: agrupa por rol y ordena desc por cantidad", () => {
  const r = contarUsuariosPorRol([
    perfil("odontologo", true),
    perfil("odontologo", false),
    perfil("superadmin", true),
    perfil("paciente", true),
  ]);
  assert.equal(r.total, 4);
  assert.deepEqual(r.items[0], { rol: "odontologo", cantidad: 2 });
});

test("distribuirClinicasPorEstado: todas activas", () => {
  const d = distribuirClinicasPorEstado([clinica(true), clinica(true)]);
  assert.deepEqual(d, { activas: 2, inactivas: 0, total: 2 });
});

test("distribuirClinicasPorEstado: activas e inactivas", () => {
  const d = distribuirClinicasPorEstado([clinica(true), clinica(false), clinica(false)]);
  assert.deepEqual(d, { activas: 1, inactivas: 2, total: 3 });
});

test("distribuirClinicasPorEstado: solo inactivas cuenta totales", () => {
  const d = distribuirClinicasPorEstado([clinica(false)]);
  assert.deepEqual(d, { activas: 0, inactivas: 1, total: 1 });
});

test("distribuirClinicasPorEstado: vacío devuelve ceros", () => {
  const d = distribuirClinicasPorEstado([]);
  assert.deepEqual(d, { activas: 0, inactivas: 0, total: 0 });
});

test("serieUsuariosPorRol: arma los puntos desde la agregación", () => {
  const conteo = contarUsuariosPorRol([
    perfil("odontologo", true),
    perfil("odontologo", true),
    perfil("superadmin", true),
  ]);
  const serie = serieUsuariosPorRol(conteo);
  assert.equal(serie.id, "usuarios-por-rol");
  assert.equal(serie.titulo, "Usuarios por rol");
  assert.equal(serie.unidad, "usuarios");
  assert.deepEqual(serie.puntos, [
    { etiqueta: "odontologo", valor: 2 },
    { etiqueta: "superadmin", valor: 1 },
  ]);
});

test("serieUsuariosPorRol: agregación vacía deja la serie sin puntos", () => {
  const serie = serieUsuariosPorRol(contarUsuariosPorRol([]));
  assert.deepEqual(serie.puntos, []);
  assert.equal(serie.unidad, "usuarios");
});

test("serieClinicasPorEstado: arma puntos Activas/Inactivas", () => {
  const serie = serieClinicasPorEstado(
    distribuirClinicasPorEstado([clinica(true), clinica(false), clinica(false)]),
  );
  assert.equal(serie.id, "clinicas-por-estado");
  assert.deepEqual(serie.puntos, [
    { etiqueta: "Activas", valor: 1 },
    { etiqueta: "Inactivas", valor: 2 },
  ]);
  assert.equal(serie.unidad, "clínicas");
});

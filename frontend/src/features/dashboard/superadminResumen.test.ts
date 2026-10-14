/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import {
  contarClinicas,
  contarUsuarios,
  crearResumenVacio,
  estaVacioResumen,
  indicadoresSuperadmin,
  resumirSuperadmin,
  type FilaClinica,
  type FilaPerfil,
} from "./superadminResumen.ts";

/** Fila de clínica con `activo` explícito. */
function clinica(activo: boolean): FilaClinica {
  return { activo };
}

/** Fila de perfil con `rol` y `activo` explícitos. */
function perfil(rol: string, activo: boolean): FilaPerfil {
  return { rol, activo };
}

test("contarClinicas: sin filas el total y las activas son cero", () => {
  assert.deepEqual(contarClinicas([]), { total: 0, activas: 0 });
});

test("contarClinicas cuenta total y activas por separado", () => {
  const clinicas = [clinica(true), clinica(true), clinica(false)];
  assert.deepEqual(contarClinicas(clinicas), { total: 3, activas: 2 });
});

test("contarClinicas: todas inactivas deja el total intacto", () => {
  assert.deepEqual(contarClinicas([clinica(false), clinica(false)]), { total: 2, activas: 0 });
});

test("contarClinicas: un `activo` nulo o ausente no cuenta como activa", () => {
  const sucias = [{ activo: null }, { activo: undefined }, {}] as unknown as FilaClinica[];
  assert.deepEqual(contarClinicas(sucias), { total: 3, activas: 0 });
});

test("contarUsuarios cuenta total y activos por separado", () => {
  const usuarios = [
    perfil("superadmin", true),
    perfil("odontologo", true),
    perfil("recepcionista", false),
    perfil("paciente", false),
  ];
  assert.deepEqual(contarUsuarios(usuarios), { total: 4, activos: 2 });
});

test("contarUsuarios: sin filas devuelve ceros", () => {
  assert.deepEqual(contarUsuarios([]), { total: 0, activos: 0 });
});

test("resumirSuperadmin combina ambos conteos sin cruzarlos", () => {
  const resumen = resumirSuperadmin(
    [clinica(true), clinica(false)],
    [perfil("superadmin", true), perfil("paciente", false), perfil("odontologo", true)],
  );
  assert.deepEqual(resumen, {
    clinicas: { total: 2, activas: 1 },
    usuarios: { total: 3, activos: 2 },
  });
});

test("estaVacioResumen: solo vacío si no hay ni clínicas ni usuarios", () => {
  assert.equal(estaVacioResumen(crearResumenVacio()), true);
  // Aunque todas estén inactivas, existir una fila no es "vacío".
  assert.equal(
    estaVacioResumen(resumirSuperadmin([clinica(false)], [])),
    false,
  );
  assert.equal(
    estaVacioResumen(resumirSuperadmin([], [perfil("paciente", false)])),
    false,
  );
});

test("indicadoresSuperadmin arma cuatro tarjetas con los conteos reales", () => {
  const resumen = resumirSuperadmin(
    [clinica(true), clinica(true), clinica(false)],
    [perfil("superadmin", true), perfil("paciente", false)],
  );
  const indicadores = indicadoresSuperadmin(resumen);

  assert.equal(indicadores.length, 4);
  assert.deepEqual(
    indicadores.map((i) => i.id),
    ["clinicas-totales", "clinicas-activas", "usuarios-activos", "usuarios-totales"],
  );
  assert.equal(indicadores[0].valor, "3");
  assert.equal(indicadores[1].valor, "2");
  assert.equal(indicadores[2].valor, "1");
  assert.equal(indicadores[3].valor, "2");
});

test("los iconos de los indicadores existen en el registro de DashboardStatCard", () => {
  const permitidos = new Set(["Buildings", "UsersThree", "User", "Tooth", "ClipboardText"]);
  for (const indicador of indicadoresSuperadmin(crearResumenVacio())) {
    assert.ok(indicador.icono && permitidos.has(indicador.icono), `icono ${indicador.icono}`);
  }
});

test("crearResumenVacio no comparte referencias entre campos", () => {
  const a = crearResumenVacio();
  const b = crearResumenVacio();
  a.clinicas.total = 5;
  assert.equal(b.clinicas.total, 0);
  assert.notEqual(a.clinicas, b.clinicas);
});

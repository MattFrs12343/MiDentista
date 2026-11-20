/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import { buscarAccion, intencionesParaRol } from "./intenciones.ts";
import { resolverIntencion } from "./interprete.ts";

test("superadmin ve el panel de administracion y su propio reporte", () => {
  const intenciones = intencionesParaRol("superadmin");
  assert.equal(intenciones.length, 2);
  assert.deepEqual(intenciones.map((i) => i.id), ["panel_admin", "reporte_personal"]);
});

test("staff y superadmin tienen un reporte, con ids distintos", () => {
  const staff = intencionesParaRol("odontologo");
  const admin = intencionesParaRol("superadmin");
  assert.ok(staff.some((i) => i.id === "reporte"));
  assert.ok(admin.some((i) => i.id === "reporte_personal"));
});

test("odontologo, odontologo_admin y recepcionista comparten el mismo catalogo", () => {
  const a = intencionesParaRol("odontologo");
  const b = intencionesParaRol("odontologo_admin");
  const c = intencionesParaRol("recepcionista");
  assert.deepEqual(a, b);
  assert.deepEqual(b, c);
  assert.ok(a.length > 1);
});

test("cada intencion de staff tiene una ruta bajo /app", () => {
  for (const intencion of intencionesParaRol("odontologo")) {
    assert.ok(intencion.ruta.startsWith("/app"));
  }
});

test("buscarAccion encuentra por id y no rompe si no existe", () => {
  const intenciones = intencionesParaRol("odontologo");
  assert.equal(buscarAccion(intenciones, "pagos")?.ruta, "/app/pagos");
  assert.equal(buscarAccion(intenciones, "no_existe"), undefined);
});

// Regresión: "reporte de pacientes" empataba con "pacientes" (ambas
// puntuaban por la palabra suelta "pacientes") y quedaba en loop de
// desambiguación sin poder avanzar nunca — ver intenciones.ts.
test("'reporte de pacientes' resuelve directo a reporte, no empata con pacientes", () => {
  const intenciones = intencionesParaRol("odontologo");
  assert.deepEqual(resolverIntencion("reporte de pacientes", intenciones), { tipo: "ejecutar", intencionId: "reporte" });
  assert.deepEqual(resolverIntencion("hazme un reporte de pacientes", intenciones), {
    tipo: "ejecutar",
    intencionId: "reporte",
  });
});

test("'pacientes' solo sigue resolviendo a la lista de pacientes, no al reporte", () => {
  const intenciones = intencionesParaRol("odontologo");
  assert.deepEqual(resolverIntencion("pacientes", intenciones), { tipo: "ejecutar", intencionId: "pacientes" });
});

test("'reporte de personal' resuelve directo, no empata con panel_admin", () => {
  const intenciones = intencionesParaRol("superadmin");
  assert.deepEqual(resolverIntencion("reporte de personal", intenciones), {
    tipo: "ejecutar",
    intencionId: "reporte_personal",
  });
});

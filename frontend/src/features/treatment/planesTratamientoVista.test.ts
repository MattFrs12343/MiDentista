/// <reference types="node" />
import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer, type ViteDevServer } from "vite";
import type { PlanesTratamientoSection } from "./PlanesTratamientoSection.tsx";
import type { PlanTratamientoForm } from "./PlanTratamientoForm.tsx";
import type { usePlanesTratamiento } from "./usePlanesTratamiento.ts";
import type { PlanTratamientoPaciente } from "./tipos.ts";
import { ETIQUETAS_PLAN } from "./planesPorEstado.ts";

let servidor: ViteDevServer;
let Seccion: typeof PlanesTratamientoSection;
let Formulario: typeof PlanTratamientoForm;
before(async () => {
  servidor = await createServer({ logLevel: "silent", server: { middlewareMode: true, watch: null, hmr: false },
    optimizeDeps: { noDiscovery: true, include: [] } });
  Seccion = (await servidor.ssrLoadModule("/src/features/treatment/PlanesTratamientoSection.tsx")).PlanesTratamientoSection;
  Formulario = (await servidor.ssrLoadModule("/src/features/treatment/PlanTratamientoForm.tsx")).PlanTratamientoForm;
});
after(async () => { await servidor?.close(); });

const ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const AUTOR = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const CLINICA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const plan: PlanTratamientoPaciente = { id: ID, pacienteId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  odontologoId: AUTOR, clinicaId: CLINICA, titulo: "Plan real", notas: "Notas reales precargadas", estado: "en_proceso",
  costoTotal: 456.5, creadoEn: "2026-10-11T10:00:00Z", actualizadoEn: "2026-10-11T12:00:00Z" };
function datos(cambios: Partial<ReturnType<typeof usePlanesTratamiento>> = {}): ReturnType<typeof usePlanesTratamiento> {
  return { clave: "ficha", estado: "success", planes: [plan], perfil: { id: AUTOR, clinicaId: CLINICA, rol: "odontologo", activo: true },
    seleccionadoId: ID, seleccionado: plan, error: null, guardando: false, recargar: async () => {}, seleccionar: () => {},
    crear: async () => plan, guardarTitulo: async () => plan, guardarNotas: async () => plan,
    cambiandoEstado: false, confirmacionEstado: null, errorEstado: null, exitoEstado: null,
    solicitarCambioEstado: async () => {}, confirmarCambioEstado: async () => {}, cancelarConfirmacionEstado: () => {},
    totales: {}, sincronizarTotalPlan: async () => {}, iniciarTotalProcedimiento: () => ({ confirmado: async () => {}, fallido: () => {} }), ...cambios };
}
const renderizar = (d: ReturnType<typeof usePlanesTratamiento>) => renderToStaticMarkup(createElement(Seccion, { datos: d }));

test("UI real muestra selector con varios ids y metadatos del seleccionado, sin selector de estado", () => {
  const html = renderizar(datos({ planes: [plan, { ...plan, id: AUTOR, titulo: "Segundo plan" }] }));
  assert.match(html, /Seleccionar plan de tratamiento \(2\)/);
  assert.match(html, /Segundo plan/); assert.doesNotMatch(html, /Id del plan:/); assert.match(html, /456.50/);
  assert.match(html, /Estado: En proceso/); assert.match(html, /Notas reales precargadas<\/textarea>/);
  assert.match(html, /Guardar título/); assert.match(html, /Guardar notas/); assert.match(html, /Nuevo plan/);
  assert.equal((html.match(/<select /g) ?? []).length, 1);
  assert.doesNotMatch(html, /Agregar procedimiento/);
});

test("UI de permisos: colega lee notas ajenas; recepción/superadmin no tienen formularios ni crear", () => {
  for (const perfil of [{ id: AUTOR, clinicaId: CLINICA, rol: "recepcionista", activo: true },
    { id: AUTOR, clinicaId: null, rol: "superadmin", activo: true },
    { id: plan.pacienteId, clinicaId: CLINICA, rol: "odontologo", activo: true }]) {
    const html = renderizar(datos({ perfil }));
    assert.match(html, /Solo lectura/); assert.match(html, /Notas reales precargadas/);
    assert.doesNotMatch(html, /<form|Guardar notas|Guardar título/);
    if (perfil.rol !== "odontologo") assert.doesNotMatch(html, /Nuevo plan/);
  }
});

test("UI distingue loading/error/vacío sin mostrar selección residual", () => {
  const loading = renderizar(datos({ estado: "loading" }));
  assert.match(loading, /aria-busy="true"/); assert.match(loading, /Cargando planes/);
  assert.doesNotMatch(loading, /Plan real|No hay planes|<form/);
  const error = renderizar(datos({ estado: "error", error: "Fallo de lectura" }));
  assert.match(error, /role="alert"/); assert.match(error, /Reintentar carga de planes/);
  assert.doesNotMatch(error, /No hay planes|Notas reales/);
  const vacio = renderizar(datos({ planes: [], seleccionado: null, seleccionadoId: null }));
  assert.match(vacio, /No hay planes visibles/); assert.doesNotMatch(vacio, /<form/);
});

test("formulario real precarga notas/título según plan seleccionado y bloquea controles en envío", () => {
  const d = datos();
  const renderForm = (p: PlanTratamientoPaciente, bloqueado = false) => renderToStaticMarkup(createElement(Formulario, {
    plan: p, bloqueado, crear: d.crear, guardarNotas: d.guardarNotas, guardarTitulo: d.guardarTitulo,
  }));
  assert.match(renderForm(plan), /Notas reales precargadas<\/textarea>/);
  assert.match(renderForm({ ...plan, id: AUTOR, notas: "Notas del otro plan" }), /Notas del otro plan<\/textarea>/);
  assert.match(renderForm(plan, true), /disabled=""/);
  assert.match(renderForm(plan, true), /Guardando plan/);
});

test("regresión: store no contiene creación automática ni escrituras de planes/procedimientos implícitos", async () => {
  const store = await readFile(new URL("../../data/store.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(store, /obtenerOCrearPlanRow|agregarItemPlan|quitarItemPlan|actualizarObservacionesPlan/);
  const lecturaLegacy = store.slice(store.indexOf("async function obtenerPlanRow"), store.indexOf("async function obtenerHistoriaRowId"));
  assert.doesNotMatch(lecturaLegacy, /\.insert\(|\.update\(|\.delete\(/);
  assert.match(lecturaLegacy, /if \(existente.error\) throw existente.error/);
  const pestaña = await readFile(new URL("./TreatmentTab.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(pestaña, /planDe\(|onBlur|agregarItemPlan/);
});

test("T-5.7 UI real ofrece exactamente botones válidos por estado y ninguno en terminales", () => {
  const acciones = ["Aceptar plan", "Iniciar tratamiento", "Completar plan", "Cancelar plan"];
  const esperadas = { propuesto: ["Aceptar plan", "Cancelar plan"], aceptado: ["Iniciar tratamiento"],
    en_proceso: ["Completar plan", "Cancelar plan"], completado: [], cancelado: [] };
  for (const estado of Object.keys(esperadas) as (keyof typeof esperadas)[]) {
    const p = { ...plan, estado };
    const html = renderizar(datos({ seleccionado: p, planes: [p] }));
    for (const accion of acciones) assert.equal(html.includes(`>${accion}</button>`), (esperadas[estado] as string[]).includes(accion));
    assert.match(html, new RegExp(`Estado: ${ETIQUETAS_PLAN[estado]}`));
  }
});
test("T-5.7 UI no muestra transiciones a perfiles de lectura ni inactivos", () => {
  for (const perfil of [{ id: AUTOR, clinicaId: CLINICA, rol: "recepcionista", activo: true },
    { id: AUTOR, clinicaId: null, rol: "superadmin", activo: true },
    { id: plan.pacienteId, clinicaId: CLINICA, rol: "odontologo", activo: true },
    { id: AUTOR, clinicaId: CLINICA, rol: "odontologo", activo: false }]) {
    assert.doesNotMatch(renderizar(datos({ perfil })), /Aceptar plan|Iniciar tratamiento|Completar plan|Cancelar plan|Confirmación del cambio/);
  }
});
test("T-5.7 UI de confirmar completar/cancelar identifica el plan y permite volver", () => {
  for (const nuevo of ["completado", "cancelado"] as const) {
    const html = renderizar(datos({ confirmacionEstado: { planId: ID, anterior: plan.estado, nuevo } }));
    assert.match(html, /Confirmación del cambio de estado/); assert.match(html, /Plan real/); assert.match(html, /Este estado es terminal/);
    assert.match(html, nuevo === "completado" ? /Confirmar completar plan/ : /Confirmar cancelar plan/);
    assert.match(html, /Volver sin cambiar estado/);
    assert.doesNotMatch(html, />Completar plan<|>Cancelar plan</);
  }
});
test("T-5.7 UI muestra loading y bloqueos, error sin ocultar plan y éxito confirmado", () => {
  const enviando = renderizar(datos({ guardando: true, cambiandoEstado: true }));
  assert.match(enviando, /Cambiando estado del plan/);
  assert.match(enviando, /disabled=""[^>]*>Completar plan/);
  assert.match(enviando, /disabled=""[^>]*>Cancelar plan/);
  const error = renderizar(datos({ errorEstado: "El estado del plan cambió en otra sesión. Recarga." }));
  assert.match(error, /role="alert"/); assert.match(error, /otra sesión/); assert.match(error, /Estado: En proceso/);
  assert.match(error, /Recargar planes/); assert.doesNotMatch(error, /confirmado\./);
  assert.match(renderizar(datos({ exitoEstado: "Estado en_proceso confirmado." })), /role="status">Estado en_proceso confirmado/);
});

test("T-5.10 UI oculta importe previo durante CRUD/relectura y ofrece reintento solo en error", () => {
  for (const estado of ["mutando", "loading", "error"] as const) {
    const html = renderizar(datos({ totales: { [ID]: { estado, error: estado === "error" ? "El procedimiento se confirmó, pero no se pudo actualizar el total mostrado." : null } } }));
    assert.doesNotMatch(html, /Bs 456.50/); assert.match(html, /Plan real/); assert.match(html, /Sincronización del total/);
    if (estado === "error") { assert.match(html, /role="alert"/); assert.match(html, /Reintentar sincronización del total/); }
    else { assert.match(html, /role="status"/); assert.doesNotMatch(html, /Reintentar sincronización del total/); }
  }
});

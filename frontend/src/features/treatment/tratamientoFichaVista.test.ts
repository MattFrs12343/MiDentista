/// <reference types="node" />
import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer, type ViteDevServer } from "vite";
import type { TratamientoFichaSections } from "./TratamientoFichaSections.tsx";
import type { TreatmentPrintContent, TreatmentPrint } from "./TreatmentPrint.tsx";
import type { useDiagnosticos } from "./useDiagnosticos.ts";
import type { usePlanesTratamiento } from "./usePlanesTratamiento.ts";
import type { usePlanesPorEstado } from "./usePlanesPorEstado.ts";
import type { Paciente } from "../../types/index.ts";
import type { DiagnosticoPaciente, PlanTratamientoPaciente } from "./tipos.ts";

let servidor: ViteDevServer; let Secciones: typeof TratamientoFichaSections;
let Impresion: typeof TreatmentPrintContent; let Documento: typeof TreatmentPrint;
before(async () => {
  servidor = await createServer({ logLevel: "silent", server: { middlewareMode: true, watch: null, hmr: false }, optimizeDeps: { noDiscovery: true, include: [] } });
  Secciones = (await servidor.ssrLoadModule("/src/features/treatment/TratamientoFichaSections.tsx")).TratamientoFichaSections;
  const modulo = await servidor.ssrLoadModule("/src/features/treatment/TreatmentPrint.tsx"); Impresion = modulo.TreatmentPrintContent; Documento = modulo.TreatmentPrint;
});
after(async () => { await servidor?.close(); });
const ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", AUTOR = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const PACIENTE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", CLINICA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const paciente: Paciente = { id: PACIENTE, nombres: "Ana real", apellidos: "Prueba", ci: "123", fechaNacimiento: "2000-01-01", sexo: "femenino", telefono: "777", email: "ana@test", direccion: "Domicilio", creadoEl: "2026-10-12" };
const perfil = { id: AUTOR, clinicaId: CLINICA, rol: "odontologo", activo: true };
const plan: PlanTratamientoPaciente = { id: ID, pacienteId: PACIENTE, odontologoId: AUTOR, clinicaId: CLINICA, titulo: "Plan de Ana", notas: "Notas confirmadas", estado: "en_proceso", costoTotal: 912.34, creadoEn: "2026-10-12T12:00:00Z", actualizadoEn: "2026-10-12T13:00:00Z" };
const d: DiagnosticoPaciente = { id: ID, pacienteId: PACIENTE, odontologoId: AUTOR, clinicaId: CLINICA, descripcion: "Diagnóstico de Ana", numeroPieza: 54, observaciones: "Control real", estado: "activo", fechaDiagnostico: "2026-10-12", creadoEn: plan.creadoEn, actualizadoEn: plan.actualizadoEn };
const diagnosticos = (cambios: Partial<ReturnType<typeof useDiagnosticos>> = {}): ReturnType<typeof useDiagnosticos> => ({ clave: "Ana", estado: "success", diagnosticos: [d], perfil, error: null, guardando: false,
  recargar: async () => {}, crear: async () => d, actualizar: async () => d, cambiarEstado: async () => d, ...cambios });
const planes = (cambios: Partial<ReturnType<typeof usePlanesTratamiento>> = {}): ReturnType<typeof usePlanesTratamiento> => ({ clave: "Ana", estado: "success", planes: [plan], seleccionadoId: ID, seleccionado: plan,
  perfil, error: null, guardando: false, cambiandoEstado: false, confirmacionEstado: null, errorEstado: null, exitoEstado: null, recargar: async () => {}, seleccionar: () => {}, crear: async () => plan,
  guardarNotas: async () => plan, guardarTitulo: async () => plan, solicitarCambioEstado: async () => {}, confirmarCambioEstado: async () => {}, cancelarConfirmacionEstado: () => {},
  totales: {}, sincronizarTotalPlan: async () => {}, iniciarTotalProcedimiento: () => ({ confirmado: async () => {}, fallido: () => {} }), ...cambios });
const vista = (cambios: Partial<ReturnType<typeof usePlanesPorEstado>> = {}): ReturnType<typeof usePlanesPorEstado> => ({ estado: "success", filtro: "propuesto", pagina: 1, planes: [], total: 0, error: null,
  filtrar: async () => {}, paginar: async () => {}, recargar: async () => {}, ...cambios });
type Props = Parameters<typeof TratamientoFichaSections>[0];
function render(cambios: Partial<Props> = {}) {
  return renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(Secciones, { paciente, diagnosticos: diagnosticos(), planes: planes(), vista: vista(),
    enlaceInvalido: false, limpiarEnlace: () => {}, abrirPlan: () => {}, listoImprimir: false, imprimir: () => {}, ...cambios })));
}
test("T-5.9 composición real muestra jerarquía diagnósticos/consulta clínica/planes/procedimientos/impresión", () => {
  const html = render();
  assert.match(html, /Ficha de Ana real Prueba/); assert.match(html, /Diagnóstico de Ana/); assert.match(html, /Plan de Ana/);
  assert.ok(html.indexOf("Diagnóstico de Ana") < html.indexOf("Planes de la clínica por estado"));
  assert.ok(html.indexOf("Planes de la clínica por estado") < html.indexOf("Planes del paciente"));
  assert.ok(html.indexOf("Planes del paciente") < html.indexOf("Procedimientos del plan seleccionado"));
  assert.ok(html.indexOf("Procedimientos del plan seleccionado") < html.indexOf("Impresión de diagnóstico"));
  assert.match(html, /min-w-0/); assert.match(html, /Costo total registrado: Bs 912.34/);
});
test("T-5.9 error de diagnóstico deja planes visibles y bloquea solo impresión completa", () => {
  const html = render({ diagnosticos: diagnosticos({ estado: "error", error: "Fallo diagnóstico" }) });
  assert.match(html, /Fallo diagnóstico/); assert.match(html, /Plan de Ana/); assert.match(html, /Guardar notas/);
  assert.match(html, /disabled=""[^>]*>.*Imprimir/);
});
test("T-5.9 error de planes conserva diagnósticos y reintento independiente", () => {
  const html = render({ planes: planes({ estado: "error", error: "Fallo planes", seleccionado: null }) });
  assert.match(html, /Diagnóstico de Ana/); assert.match(html, /Fallo planes/); assert.match(html, /Reintentar carga de planes/);
  assert.doesNotMatch(html, /Plan de Ana|Cargando procedimientos/);
});
test("T-5.9 fallo de vista clínica no rompe planes/diagnósticos del paciente", () => {
  const html = render({ vista: vista({ estado: "error", error: "Fallo filtro clínica" }) });
  assert.match(html, /Fallo filtro clínica/); assert.match(html, /Reintentar consulta/);
  assert.match(html, /Diagnóstico de Ana/); assert.match(html, /Plan de Ana/);
});
test("T-5.9 loading y vacío por sección no muestran selecciones antiguas", () => {
  const loading = render({ diagnosticos: diagnosticos({ estado: "loading" }), planes: planes({ estado: "loading", seleccionado: null }) });
  assert.match(loading, /Cargando diagnósticos/); assert.match(loading, /Cargando planes/); assert.doesNotMatch(loading, /Diagnóstico de Ana|Plan de Ana/);
  const vacio = render({ diagnosticos: diagnosticos({ diagnosticos: [] }), planes: planes({ planes: [], seleccionado: null, seleccionadoId: null }) });
  assert.match(vacio, /No hay diagnósticos visibles/); assert.match(vacio, /No hay planes visibles/); assert.doesNotMatch(vacio, /Cargando procedimientos/);
});
test("T-5.9 plan inválido informa sin ocultar ficha ni habilitar impresión", () => {
  const html = render({ enlaceInvalido: true, planes: planes({ seleccionado: null, seleccionadoId: null }) });
  assert.match(html, /no es válido o no está visible para este paciente/); assert.match(html, /Quitar enlace del plan/);
  assert.match(html, /Diagnóstico de Ana/); assert.match(html, /Seleccionar plan de tratamiento/);
});
test("T-5.9 recepción/colega/superadmin conservan lectura sin formularios ajenos", () => {
  for (const p of [{ ...perfil, rol: "recepcionista" }, { ...perfil, id: PACIENTE }, { ...perfil, rol: "superadmin", clinicaId: null }]) {
    const html = render({ diagnosticos: diagnosticos({ perfil: p }), planes: planes({ perfil: p }) });
    assert.match(html, /Diagnóstico de Ana/); assert.match(html, /Plan de Ana/);
    assert.doesNotMatch(html, /Guardar título|Guardar notas|Editar diagnóstico y estado|>Completar plan<|>Cancelar plan</);
  }
});
test("T-5.9 impresión usa plan seleccionado y costo persistido sin procedimientos ni sumas", () => {
  const html = renderToStaticMarkup(createElement(Impresion, { diagnosticos: [d], plan }));
  assert.match(html, /Diagnóstico de Ana/); assert.match(html, /pieza 54/); assert.match(html, /Plan de Ana/); assert.match(html, /Notas confirmadas/);
  assert.match(html, /912.34/); assert.match(html, /Importe persistido/); assert.doesNotMatch(html, /Procedimientos|Costo calculado/);
  const sinPlan = renderToStaticMarkup(createElement(Impresion, { diagnosticos: [], plan: null }));
  assert.match(sinPlan, /No se seleccionó un plan/); assert.match(sinPlan, /Aún no se registraron diagnósticos/);
});
test("T-5.9 documento rechaza datos de otro paciente antes de montar portal imprimible", () => {
  assert.equal(renderToStaticMarkup(createElement(Documento, { paciente: { ...paciente, id: AUTOR }, diagnosticos: [d], plan })), "");
});
test("T-5.9 integración compartida conserva tab/ruta y remonta contexto de sesión/paciente", async () => {
  const ficha = await readFile(new URL("../patients/PatientProfilePage.tsx", import.meta.url), "utf8");
  assert.match(ficha, /TabsTrigger value="tratamiento"/); assert.match(ficha, /TabsContent value="tratamiento"/);
  assert.match(ficha, /usePacienteTratamiento/); assert.match(ficha, /pacienteId=\{paciente.id\} paciente=\{paciente\}/);
  assert.match(ficha, /key=\{JSON.stringify\(\[paciente.id, sesion\?\.email, sesion\?\.rol/);
  const pestaña = await readFile(new URL("./TreatmentTab.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(pestaña, /useClinicaData|obtenerOCrearPlan|\.insert\(|\.update\(/);
});

test("T-5.10 totales pendientes no muestran importe viejo en ficha ni vista de clínica", () => {
  const html = render({ planes: planes({ totales: { [ID]: { estado: "error", error: "El procedimiento se confirmó; reintenta la sincronización." } } }),
    vista: vista({ planes: [{ ...plan, pacienteNombre: "Ana real", autorNombre: "Autor" }], total: 1 }) });
  assert.doesNotMatch(html, /Bs 912.34/); assert.match(html, /Total pendiente de sincronización en la ficha/);
  assert.match(html, /Reintentar sincronización del total/); assert.match(html, /disabled=""[^>]*>.*Imprimir/);
});
test("T-5.10 impresión comparte formato del total confirmado y bloquea documento pendiente", () => {
  const confirmado = { ...plan, costoTotal: 300.5 };
  const html = renderToStaticMarkup(createElement(Impresion, { diagnosticos: [d], plan: confirmado }));
  assert.match(html, /Costo total registrado: Bs 300.50/); assert.match(html, /Importe persistido/);
  assert.equal(renderToStaticMarkup(createElement(Documento, { paciente, diagnosticos: [d], plan: confirmado, totalConfirmado: false })), "");
});

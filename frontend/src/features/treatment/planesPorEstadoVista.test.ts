/// <reference types="node" />
import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer, type ViteDevServer } from "vite";
import type { PlanesPorEstadoSection } from "./PlanesPorEstadoSection.tsx";
import type { usePlanesPorEstado } from "./usePlanesPorEstado.ts";
import { ESTADOS_PLAN } from "./planTratamientoMapper.ts";

let servidor: ViteDevServer; let Seccion: typeof PlanesPorEstadoSection;
before(async () => {
  servidor = await createServer({ logLevel: "silent",server: { middlewareMode: true,watch: null,hmr: false },optimizeDeps: { noDiscovery: true,include: [] } });
  Seccion = (await servidor.ssrLoadModule("/src/features/treatment/PlanesPorEstadoSection.tsx")).PlanesPorEstadoSection;
});
after(async () => { await servidor?.close(); });
const p = { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", pacienteId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  clinicaId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", odontologoId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  titulo: "Plan integral", pacienteNombre: "Paciente real", autorNombre: "Autor real", estado: "propuesto" as const,
  notas: "",costoTotal: 125.5,creadoEn: "2026-10-12T12:00:00Z",actualizadoEn: "2026-10-12T13:00:00Z" };
function datos(cambios: Partial<ReturnType<typeof usePlanesPorEstado>> = {}): ReturnType<typeof usePlanesPorEstado> {
  return { estado: "success",filtro: "propuesto",pagina: 1,planes: [p],total: 1,error: null,
    filtrar: async () => {},paginar: async () => {},recargar: async () => {}, ...cambios };
}
const render = (d: ReturnType<typeof usePlanesPorEstado>, navegable = true) => renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(Seccion,{ datos: d,navegable })));
test("T-5.8 vista real tiene exactamente cinco filtros, sin Todos ni búsqueda", () => {
  const html = render(datos());
  assert.equal((html.match(/<option /g) ?? []).length,5);
  for (const etiqueta of ["Propuestos","Aceptados","En proceso","Completados","Cancelados"]) assert.match(html,new RegExp(etiqueta));
  assert.doesNotMatch(html,/Todos|type="search"/); assert.match(html,/for="estado-planes-clinica"/);
});
test("T-5.8 cada estado presenta título/paciente/autor/costo/fecha y enlace al plan", () => {
  for (const estado of ESTADOS_PLAN) {
    const html = render(datos({ filtro: estado,planes: [{ ...p,estado }] }));
    assert.match(html,/Plan integral/); assert.match(html,/Paciente: Paciente real/); assert.match(html,/Autor: Autor real/);
    assert.match(html,/125.50/); assert.match(html,/<time dateTime="2026-10-12T12:00:00Z"/i);
    assert.ok(html.includes(`/app/pacientes/${p.pacienteId}?tab=tratamiento&amp;plan=${p.id}`));
  }
});
test("T-5.8 loading/error/vacío son exclusivos aunque hubiera datos anteriores", () => {
  const cargando = render(datos({ estado: "loading" })); assert.match(cargando,/aria-busy="true"/);
  assert.match(cargando,/Cargando planes por estado/); assert.doesNotMatch(cargando,/Plan integral|No hay planes/);
  const error = render(datos({ estado: "error",error: "Sin conexión" })); assert.match(error,/role="alert"/);
  assert.match(error,/Reintentar consulta de planes/); assert.doesNotMatch(error,/Plan integral|No hay planes/);
  const vacio = render(datos({ filtro: "aceptado",planes: [],total: 0 }));
  assert.match(vacio,/No hay planes en estado Aceptado/); assert.doesNotMatch(vacio,/Abrir plan|Plan integral/);
});
test("T-5.8 paginación tiene conteo, botones y límites accesibles", () => {
  const primera = render(datos({ total: 21 })); assert.match(primera,/Página 1 de 2/);
  assert.match(primera,/disabled=""[^>]*>Anterior/); assert.doesNotMatch(primera,/disabled=""[^>]*>Siguiente/);
  const ultima = render(datos({ total: 21,pagina: 2 })); assert.match(ultima,/disabled=""[^>]*>Siguiente/);
  assert.match(ultima,/aria-label="Paginación de planes por estado"/);
});
test("T-5.8 auditoría de lectura no enlaza a rutas staff y relaciones invisibles son explícitas", () => {
  const html = render(datos({ planes: [{ ...p,titulo: null,pacienteNombre: null,autorNombre: null,creadoEn: null }] }),false);
  assert.match(html,/Sin título \(plan histórico\)/); assert.match(html,/Paciente no visible/);
  assert.match(html,/Autor no visible/); assert.match(html,/Sin fecha/); assert.doesNotMatch(html,/Abrir plan|<a /);
  assert.doesNotMatch(html,/Aceptar plan|Cancelar plan|Iniciar tratamiento|Completar plan/);
});

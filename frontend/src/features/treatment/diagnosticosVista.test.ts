/// <reference types="node" />
import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer, type ViteDevServer } from "vite";
import type { DiagnosticosSection } from "./DiagnosticosSection.tsx";
import type { useDiagnosticos } from "./useDiagnosticos.ts";
import type { DiagnosticoPaciente } from "./tipos.ts";

// Vite compila el TSX real con los aliases del proyecto. No abre puerto,
// no monta efectos ni realiza requests de Auth/Supabase.
let servidor: ViteDevServer;
let Seccion: typeof DiagnosticosSection;
before(async () => {
  servidor = await createServer({ logLevel: "silent", server: { middlewareMode: true, watch: null, hmr: false },
    optimizeDeps: { noDiscovery: true, include: [] } });
  Seccion = (await servidor.ssrLoadModule("/src/features/treatment/DiagnosticosSection.tsx")).DiagnosticosSection;
});
after(async () => { await servidor?.close(); });

const AUTOR = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const CLINICA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const diagnostico: DiagnosticoPaciente = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  pacienteId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", odontologoId: AUTOR, clinicaId: CLINICA,
  descripcion: "Caries profunda", numeroPieza: 54, observaciones: "Revisión pendiente", estado: "activo",
  fechaDiagnostico: "2026-10-11", creadoEn: "2026-10-11T10:00:00Z", actualizadoEn: "2026-10-11T12:00:00Z" };

function datos(cambios: Partial<ReturnType<typeof useDiagnosticos>> = {}): ReturnType<typeof useDiagnosticos> {
  return { clave: "ficha", estado: "success", diagnosticos: [diagnostico], perfil: { id: AUTOR, clinicaId: CLINICA, rol: "odontologo", activo: true },
    error: null, guardando: false, recargar: async () => {}, crear: async () => diagnostico, actualizar: async () => diagnostico,
    cambiarEstado: async () => diagnostico, ...cambios };
}
const renderizar = (estado: ReturnType<typeof useDiagnosticos>) => renderToStaticMarkup(createElement(Seccion, { datos: estado }));

test("lista React real muestra datos, observaciones, estados y fechas semánticas", () => {
  const html = renderizar(datos());
  assert.match(html, /<ul[^>]*aria-label="Lista de diagnósticos del paciente"/);
  assert.match(html, /Caries profunda/); assert.match(html, /Pieza 54/); assert.match(html, /Revisión pendiente/);
  assert.match(html, />Activo<\/span>/);
  assert.match(html, /Fecha del diagnóstico:/); assert.match(html, /Última actualización:/);
  assert.match(html, /<time dateTime="2026-10-11">11\/10\/2026<\/time>/i);
  assert.match(html, /Editar diagnóstico y estado: Caries profunda/);
});

test("loading utiliza aria-busy/status sin mostrar resultados viejos ni vacío", () => {
  const html = renderizar(datos({ estado: "loading" }));
  assert.match(html, /aria-busy="true"/); assert.match(html, /role="status"/);
  assert.match(html, /Cargando diagnósticos/);
  assert.doesNotMatch(html, /Caries profunda|No hay diagnósticos|Reintentar carga/);
});

test("error tiene alert y botón de reintento, sin falso vacío ni fila residual", () => {
  const html = renderizar(datos({ estado: "error", error: "La sesión venció" }));
  assert.match(html, /role="alert"/); assert.match(html, /La sesión venció/);
  assert.match(html, /<button[^>]*type="button"[^>]*>Reintentar carga<\/button>/);
  assert.doesNotMatch(html, /No hay diagnósticos|Caries profunda/);
});

test("vacío solo después de consulta correcta y campos opcionales no generan etiquetas vacías", () => {
  const vacio = renderizar(datos({ diagnosticos: [] }));
  assert.match(vacio, /No hay diagnósticos visibles/); assert.doesNotMatch(vacio, /Lista de diagnósticos del paciente/);
  const html = renderizar(datos({ diagnosticos: [{ ...diagnostico, observaciones: " \n", numeroPieza: null, actualizadoEn: null }] }));
  assert.doesNotMatch(html, /Observaciones:|Pieza 54/);
  assert.match(html, /Sin fecha de actualización registrada/);
});

test("colega, recepción y superadmin no reciben botones de edición ni formulario", () => {
  for (const perfil of [{ id: AUTOR, clinicaId: CLINICA, rol: "recepcionista", activo: true },
    { id: AUTOR, clinicaId: null, rol: "superadmin", activo: true },
    { id: diagnostico.pacienteId, clinicaId: CLINICA, rol: "odontologo", activo: true }]) {
    const html = renderizar(datos({ perfil }));
    assert.match(html, /Solo lectura/);
    assert.doesNotMatch(html, /Editar diagnóstico y estado:|Editar \/ cambiar estado/);
    // El colega puede crear, pero nunca editar este diagnóstico ajeno.
    if (perfil.rol !== "odontologo") assert.doesNotMatch(html, /<form/);
  }
});

test("lista React pagina a 20 y navegación tiene nombre y límites accesibles", () => {
  const diagnosticos = Array.from({ length: 21 }, (_, i) => ({ ...diagnostico,
    id: `00000000-0000-4000-8000-${i.toString().padStart(12, "0")}`, descripcion: `Hallazgo ${i}` }));
  const html = renderizar(datos({ diagnosticos }));
  assert.equal((html.match(/<li /g) ?? []).length, 20);
  assert.match(html, /aria-label="Paginación de diagnósticos"/);
  assert.match(html, /Página 1 de 2/); assert.match(html, /Mostrando 1–20 de 21/);
  assert.match(html, /<button[^>]*disabled=""[^>]*>Anterior<\/button>/);
  assert.match(html, />Siguiente<\/button>/);
});

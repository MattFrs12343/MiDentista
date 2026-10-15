/// <reference types="node" />
import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer, type ViteDevServer } from "vite";
import type { ProcedimientosSection } from "./ProcedimientosSection.tsx";
import type { ProcedimientoForm } from "./ProcedimientoForm.tsx";
import type { useProcedimientos } from "./useProcedimientos.ts";
import type { ProcedimientoTratamiento } from "./tipos.ts";

let servidor: ViteDevServer;
let Seccion: typeof ProcedimientosSection;
let Formulario: typeof ProcedimientoForm;
before(async () => {
  servidor = await createServer({ logLevel: "silent", server: { middlewareMode: true, watch: null, hmr: false },
    optimizeDeps: { noDiscovery: true, include: [] } });
  Seccion = (await servidor.ssrLoadModule("/src/features/treatment/ProcedimientosSection.tsx")).ProcedimientosSection;
  Formulario = (await servidor.ssrLoadModule("/src/features/treatment/ProcedimientoForm.tsx")).ProcedimientoForm;
});
after(async () => { await servidor?.close(); });

const ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const p: ProcedimientoTratamiento = { id: ID, planTratamientoId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  clinicaId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", descripcion: "Endodoncia urgente", numeroPieza: 46,
  servicioId: null, prioridad: "urgente", estado: "en_proceso", costo: 125.5, creadoEn: null, actualizadoEn: null };
function datos(cambios: Partial<ReturnType<typeof useProcedimientos>> = {}): ReturnType<typeof useProcedimientos> {
  return { clave: "plan", estado: "success", procedimientos: [p], guardando: false, error: null, confirmacionId: null,
    mensaje: "", editable: true, recargar: async () => {}, crear: async () => p, actualizar: async () => p,
    eliminar: async () => p, solicitarEliminar: () => {}, cancelarEliminar: () => {}, ...cambios };
}
const renderizar = (d: ReturnType<typeof useProcedimientos>) => renderToStaticMarkup(createElement(Seccion, { datos: d }));

test("lista React real muestra descripción/pieza/prioridad/estado/costo exactos y acciones del autor", () => {
  const html = renderizar(datos());
  assert.match(html, /aria-label="Lista de procedimientos"/); assert.match(html, /Endodoncia urgente/);
  assert.match(html, /Pieza FDI: 46/); assert.match(html, /Prioridad: urgente/); assert.match(html, /Estado del procedimiento: en_proceso/);
  assert.match(html, /125.50/); assert.match(html, /Editar procedimiento: Endodoncia urgente/);
  assert.match(html, /Eliminar procedimiento: Endodoncia urgente/); assert.match(html, /Crear procedimiento/);
  assert.doesNotMatch(html, /value="media"|Cambiar estado del plan|Total automático/);
});

test("permisos visuales de lectura no muestran formulario, editar, eliminar ni confirmación", () => {
  const html = renderizar(datos({ editable: false, confirmacionId: ID }));
  assert.match(html, /Solo lectura/); assert.match(html, /Endodoncia urgente/);
  assert.doesNotMatch(html, /<form|Editar procedimiento:|Eliminar procedimiento:|Confirmar eliminación/);
});

test("sin plan/loading/error/vacío son ramas distintas, sin resultados residuales ni alta fuera de success", () => {
  const idle = renderizar(datos({ estado: "idle" }));
  assert.match(idle, /Selecciona un plan/); assert.doesNotMatch(idle, /<form|Endodoncia urgente/);
  const loading = renderizar(datos({ estado: "loading" }));
  assert.match(loading, /Cargando procedimientos/); assert.match(loading, /aria-busy="true"/);
  assert.doesNotMatch(loading, /<form|Endodoncia urgente|No hay procedimientos/);
  const error = renderizar(datos({ estado: "error", error: "Sin conexión" }));
  assert.match(error, /role="alert"/); assert.match(error, /Reintentar carga de procedimientos/);
  assert.doesNotMatch(error, /<form|Endodoncia urgente|No hay procedimientos/);
  const vacio = renderizar(datos({ procedimientos: [] }));
  assert.match(vacio, /No hay procedimientos visibles/); assert.match(vacio, /Crear procedimiento/);
});

test("confirmación de borrado identifica el procedimiento y ofrece cancelar/confirmar sin eliminar al abrir", () => {
  assert.doesNotMatch(renderizar(datos()), /role="alertdialog"|Confirmar eliminación/);
  const html = renderizar(datos({ confirmacionId: ID }));
  assert.match(html, /role="alertdialog"/); assert.match(html, /¿Eliminar este procedimiento\?/);
  assert.match(html, /Cancelar eliminación/); assert.match(html, /Confirmar eliminación/);
  assert.match(html, /no se puede deshacer/);
  const pendiente = renderizar(datos({ confirmacionId: ID, guardando: true }));
  assert.match(pendiente, /<button[^>]*disabled=""[^>]*>Confirmar eliminación<\/button>/);
  assert.match(pendiente, /Endodoncia urgente/);
});

test("formulario de edición precarga urgente y estado real; creación muestra pendiente fijo y servicio opcional", () => {
  const guardar = async () => p;
  const editar = renderToStaticMarkup(createElement(Formulario, { procedimiento: p, bloqueado: false, guardar }));
  assert.match(editar, /value="urgente" selected=""/); assert.match(editar, /value="en_proceso" selected=""/);
  assert.match(editar, /value="125.50"/); assert.match(editar, /Guardar procedimiento/);
  for (const prioridad of ["urgente", "alta", "normal", "baja"]) assert.match(editar, new RegExp(`value="${prioridad}"`));
  for (const estado of ["pendiente", "en_proceso", "completado", "cancelado"]) assert.match(editar, new RegExp(`value="${estado}"`));
  const nuevo = renderToStaticMarkup(createElement(Formulario, { bloqueado: false, guardar }));
  assert.match(nuevo, /Estado inicial: pendiente/); assert.match(nuevo, /UUID opcional/);
  assert.doesNotMatch(nuevo, /Estado del procedimiento<\/label>/);
});

test("paginación real limita a 20 procedimientos y lectura preserva opcionales", () => {
  const procedimientos = Array.from({ length: 21 }, (_, i) => ({ ...p, id: `${ID}-${i}`, descripcion: `Procedimiento ${i}`, numeroPieza: null }));
  const html = renderizar(datos({ procedimientos }));
  assert.equal((html.match(/<li /g) ?? []).length, 20);
  assert.match(html, /Página 1 de 2/); assert.match(html, /21 procedimientos/);
  assert.doesNotMatch(html, /Pieza FDI: 46|Procedimiento 20/);
});

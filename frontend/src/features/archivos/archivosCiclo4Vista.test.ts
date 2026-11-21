import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer, type ViteDevServer } from "vite";
import type { CuotaArchivos } from "./CuotaArchivos.tsx";
import type { ArchivosAuditoriaPanel } from "./ArchivosAuditoriaPanel.tsx";

let servidor: ViteDevServer;
let Cuota: typeof CuotaArchivos;
let Auditoria: typeof ArchivosAuditoriaPanel;
before(async () => {
  servidor = await createServer({ root: fileURLToPath(new URL("../../../", import.meta.url)), logLevel: "silent",
    server: { middlewareMode: true, watch: null, hmr: false }, optimizeDeps: { noDiscovery: true, include: [] } });
  Cuota = (await servidor.ssrLoadModule("/src/features/archivos/CuotaArchivos.tsx")).CuotaArchivos;
  Auditoria = (await servidor.ssrLoadModule("/src/features/archivos/ArchivosAuditoriaPanel.tsx")).ArchivosAuditoriaPanel;
});
after(async () => { await servidor?.close(); });
const cuota = { clinicaId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", limiteBytes: 5_000_000_000,
  bytesOcupados: 1_000_000_000, bytesReservados: 0, actualizadoEn: "2026-11-20T00:00:00Z" };

test("indicador React muestra usados/disponibles, GB decimales y progreso accesible", () => {
  const html = renderToStaticMarkup(createElement(Cuota, { cuota, cargando: false, error: false, onActualizar() {} }));
  assert.match(html, /Usado: 1 GB \/ 5 GB/); assert.match(html, /Disponible: 4 GB/);
  assert.match(html, /<progress/); assert.match(html, /aria-label="Almacenamiento contabilizado y reservado"/);
});
test("actualizar los datos confirmados cambia el uso visible y las reservas reducen disponible", () => {
  const html = renderToStaticMarkup(createElement(Cuota, { cuota: { ...cuota, bytesOcupados: 2_000_000_000, bytesReservados: 1_000_000_000 }, cargando: false, error: false, onActualizar() {} }));
  assert.match(html, /Usado: 2 GB/); assert.match(html, /Disponible: 2 GB/);
  assert.match(html, /Reservado por operaciones pendientes: 1 GB/);
});
test("error/carga de cuota no anuncian éxito vacío ni uso cero", () => {
  const html = renderToStaticMarkup(createElement(Cuota, { cuota: null, cargando: true, error: true, onActualizar() {} }));
  assert.match(html, /role="status"/); assert.match(html, /role="alert"/); assert.doesNotMatch(html, /Usado:/);
});
test("sin espacio hay un mensaje claro y el progreso no supera el máximo", () => {
  const html = renderToStaticMarkup(createElement(Cuota, { cuota: { ...cuota, limiteBytes: 100 }, cargando: false, error: false, onActualizar() {} }));
  assert.match(html, /No hay espacio suficiente/); assert.match(html, /max="100" value="100"/);
});
test("panel preparado solo muestra detectar al superadmin y no tiene acción de borrado", () => {
  for (const rol of [null, "paciente", "recepcionista", "odontologo", "odontologo_admin"]) {
    assert.equal(renderToStaticMarkup(createElement(Auditoria, { rol })), "");
  }
  const html = renderToStaticMarkup(createElement(Auditoria, { rol: "superadmin" }));
  assert.match(html, /Detectar candidatos/);
  assert.doesNotMatch(html, />Eliminar|>Borrar|>Limpiar/);
});

test("integración AdminPage registra auditoría después de Bitácora y conserva pestañas/default", async () => {
  const fuente = await readFile(new URL("../admin/AdminPage.tsx", import.meta.url), "utf8");
  assert.match(fuente, /import \{ ArchivosAuditoriaPanel \} from "@\/features\/archivos\/ArchivosAuditoriaPanel\.tsx"/);
  assert.match(fuente, /<Tabs defaultValue="clinicas"/);
  for (const value of ["clinicas", "administradores", "bitacora"]) {
    assert.match(fuente, new RegExp(`<TabsTrigger value="${value}">`));
    assert.match(fuente, new RegExp(`<TabsContent value="${value}"`));
  }
  assert.ok(fuente.indexOf('<TabsTrigger value="auditoria-archivos">') > fuente.indexOf('<TabsTrigger value="bitacora">'));
});

test("pestaña y montaje de auditoría exigen superadmin sin acciones destructivas nuevas", async () => {
  const fuente = await readFile(new URL("../admin/AdminPage.tsx", import.meta.url), "utf8");
  // Regresión del cableado: el SSR anterior prueba por separado el control real
  // del panel. No simula interacción DOM ni autorización remota.
  assert.match(fuente, /\{sesion\?\.rol === "superadmin" \? \(\s*<TabsTrigger value="auditoria-archivos">Auditoría de archivos<\/TabsTrigger>\s*\) : null\}/);
  assert.match(fuente, /\{sesion\?\.rol === "superadmin" \? \(\s*<TabsContent value="auditoria-archivos" className="flex flex-col gap-4">\s*<ArchivosAuditoriaPanel rol=\{sesion\.rol\} \/>\s*<\/TabsContent>\s*\) : null\}/);
  assert.equal((fuente.match(/<ArchivosAuditoriaPanel\b/g) ?? []).length, 1);
  assert.doesNotMatch(fuente, /Storage\.remove|storage\.remove/);
});

/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { actualizarProcedimiento, crearProcedimiento, eliminarProcedimiento, listarProcedimientosPlan } from "./procedimientoService.ts";
import { compararProcedimientos, ESTADOS_PROCEDIMIENTO, PRIORIDADES_PROCEDIMIENTO, procedimientoDesdeFila, procedimientoParaGuardar } from "./procedimientoMapper.ts";
import type { ContenidoProcedimiento } from "./tipos.ts";

const ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PLAN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CLINICA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const SERVICIO = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const destino = { planTratamientoId: PLAN, clinicaId: CLINICA };
const contenido: ContenidoProcedimiento = { descripcion: "Endodoncia", numeroPieza: 46, prioridad: "urgente", costo: 125.5, estado: "pendiente" };
const fila = (cambios: Record<string, unknown> = {}) => ({ id: ID, plan_tratamiento_id: PLAN, clinica_id: CLINICA,
  servicio_id: null, descripcion: "Endodoncia", numero_pieza: 46, prioridad: "urgente", costo: "125.50", estado: "pendiente",
  creado_en: "2026-10-11T10:00:00Z", actualizado_en: "2026-10-11T12:00:00Z", ...cambios });

function simulado(opciones: { filas?: unknown; respuesta?: unknown; error?: unknown; count?: number | null; rechazo?: boolean; limite?: number } = {}) {
  const llamadas: { tabla: string; operacion: string; contenido?: object; filtros: [string, unknown][]; orden: [string, object][]; rango?: [number, number] }[] = [];
  const cliente = { schema(esquema: string) {
    assert.equal(esquema, "public");
    return { from(nombre: string) {
      assert.equal(nombre, "procedimientos_tratamiento");
      const llamada: typeof llamadas[number] = { tabla: nombre, operacion: "select", filtros: [], orden: [] };
      llamadas.push(llamada);
      const consulta = {
        select(columnas: string) { assert.match(columnas, /servicio_id,numero_pieza,descripcion,prioridad,costo,estado,creado_en,actualizado_en/); return consulta; },
        eq(campo: string, valor: unknown) { llamada.filtros.push([campo, valor]); return consulta; },
        order(campo: string, valor: object) { llamada.orden.push([campo, valor]); return consulta; },
        range(desde: number, hasta: number) { llamada.rango = [desde, hasta]; return consulta; },
        insert(datos: object) { llamada.operacion = "insert"; llamada.contenido = datos; return consulta; },
        update(datos: object) { llamada.operacion = "update"; llamada.contenido = datos; return consulta; },
        delete() { llamada.operacion = "delete"; return consulta; },
        single() { return opciones.rechazo ? Promise.reject(new TypeError("fetch failed"))
          : Promise.resolve({ data: "respuesta" in opciones ? opciones.respuesta : fila(), error: opciones.error ?? null }); },
        then(resolve: (r: { data: unknown; error: unknown; count: number | null }) => unknown, reject: (e: unknown) => unknown) {
          if (opciones.rechazo) return Promise.reject(new TypeError("fetch failed")).then(resolve, reject);
          const filas = "filas" in opciones ? opciones.filas : [fila()];
          const desde = llamada.rango?.[0] ?? 0;
          const hasta = Math.min(llamada.rango?.[1] ?? 199, desde + (opciones.limite ?? 200) - 1);
          return Promise.resolve({ data: Array.isArray(filas) ? filas.slice(desde, hasta + 1) : filas, error: opciones.error ?? null,
            count: "count" in opciones ? opciones.count! : Array.isArray(filas) ? filas.length : null }).then(resolve, reject);
        },
      };
      return consulta;
    } };
  } } as unknown as SupabaseClient;
  return { cliente, llamadas };
}

test("mapper conserva identidad, servicio/pieza opcionales, costo y urgente sin mapear a alta/media", () => {
  const p = procedimientoDesdeFila(fila({ servicio_id: SERVICIO }));
  assert.equal(p.id, ID); assert.equal(p.planTratamientoId, PLAN); assert.equal(p.clinicaId, CLINICA);
  assert.equal(p.servicioId, SERVICIO); assert.equal(p.numeroPieza, 46); assert.equal(p.prioridad, "urgente");
  assert.equal(p.costo, 125.5); assert.equal(p.creadoEn, fila().creado_en); assert.equal(p.actualizadoEn, fila().actualizado_en);
  const legado = procedimientoDesdeFila(fila({ numero_pieza: null, creado_en: null, actualizado_en: null }));
  assert.equal(legado.numeroPieza, null); assert.equal(legado.servicioId, null); assert.equal(legado.creadoEn, null);
});

test("mapper preserva las cuatro prioridades y cuatro estados exactos", () => {
  for (const prioridad of PRIORIDADES_PROCEDIMIENTO) for (const estado of ESTADOS_PROCEDIMIENTO) {
    const p = procedimientoDesdeFila(fila({ prioridad, estado }));
    assert.equal(p.prioridad, prioridad); assert.equal(p.estado, estado);
  }
  for (const cambio of [{ prioridad: "media" }, { prioridad: null }, { estado: "propuesto" }, { estado: null }]) {
    assert.throws(() => procedimientoDesdeFila(fila(cambio)));
  }
});

test("mapper rechaza filas malformadas, UUID demo y valores omitidos", () => {
  for (const f of [null, [], fila({ id: "p1" }), fila({ servicio_id: "s1" }), fila({ servicio_id: undefined }),
    fila({ descripcion: " \n" }), fila({ numero_pieza: 19 }), fila({ numero_pieza: undefined }), fila({ costo: "NaN" }),
    fila({ costo: null }), fila({ costo: -1 }), fila({ actualizado_en: "ayer" })]) assert.throws(() => procedimientoDesdeFila(f));
});

test("FDI admite permanentes/temporales y vacío; costos negativos, NaN, Infinity y exceso de precisión se rechazan", () => {
  for (const numeroPieza of [null, 11, 18, 48, 51, 54, 85]) assert.doesNotThrow(() => procedimientoParaGuardar({ ...contenido, numeroPieza }));
  for (const numeroPieza of [0, 19, 49, 56, 86, NaN, 11.1]) assert.throws(() => procedimientoParaGuardar({ ...contenido, numeroPieza }));
  for (const costo of [-1, NaN, Infinity, 100000000, 1.001, 0.00000001]) assert.throws(() => procedimientoParaGuardar({ ...contenido, costo }));
  for (const costo of [0, 0.01, 125.5, 99999999.99]) assert.doesNotThrow(() => procedimientoParaGuardar({ ...contenido, costo }));
});

test("lista filtra plan/clínica y ordena creado_en ASC e id ASC sin escrituras", async () => {
  const fake = simulado();
  assert.equal((await listarProcedimientosPlan(PLAN, CLINICA, fake.cliente))[0].prioridad, "urgente");
  assert.deepEqual(fake.llamadas[0].filtros, [["plan_tratamiento_id", PLAN], ["clinica_id", CLINICA]]);
  assert.deepEqual(fake.llamadas[0].orden, [["creado_en", { ascending: true, nullsFirst: false }], ["id", { ascending: true }]]);
  assert.equal(fake.llamadas[0].operacion, "select");
  const auditoria = simulado(); await listarProcedimientosPlan(PLAN, null, auditoria.cliente);
  assert.deepEqual(auditoria.llamadas[0].filtros, [["plan_tratamiento_id", PLAN]]);
});

test("lista por lotes recupera todos los procedimientos con límite API menor y no escribe", async () => {
  const filas = Array.from({ length: 205 }, (_, i) => fila({ id: `00000000-0000-4000-8000-${i.toString().padStart(12, "0")}` }));
  const fake = simulado({ filas, limite: 100 });
  assert.equal((await listarProcedimientosPlan(PLAN, CLINICA, fake.cliente)).length, 205);
  assert.deepEqual(fake.llamadas.map((c) => c.rango?.[0]), [0, 100, 200]);
  assert.ok(fake.llamadas.every((c) => c.operacion === "select"));
});

test("cero filas es lista visible vacía; error/NULL/conteo incompleto/contexto ajeno no lo son", async () => {
  assert.deepEqual(await listarProcedimientosPlan(PLAN, CLINICA, simulado({ filas: [] }).cliente), []);
  for (const fake of [simulado({ filas: null }), simulado({ count: null }), simulado({ filas: [], count: 1 }),
    simulado({ error: { message: "Sin conexión" } }), simulado({ rechazo: true }), simulado({ filas: [fila(), fila()] }),
    simulado({ filas: [fila({ plan_tratamiento_id: ID })] }), simulado({ filas: [fila({ clinica_id: ID })] })]) {
    await assert.rejects(listarProcedimientosPlan(PLAN, CLINICA, fake.cliente));
  }
});

test("creación envía pendiente explícito y servicio opcional, conserva urgente y confirma id real", async () => {
  const fake = simulado();
  const p = await crearProcedimiento(destino, { ...contenido, descripcion: " Endodoncia ", estado: "completado" } as typeof contenido, fake.cliente);
  assert.equal(p.id, ID); assert.equal(p.estado, "pendiente"); assert.equal(p.prioridad, "urgente");
  assert.deepEqual(fake.llamadas[0].contenido, { descripcion: "Endodoncia", numero_pieza: 46, prioridad: "urgente", costo: 125.5,
    estado: "pendiente", servicio_id: null, plan_tratamiento_id: PLAN, clinica_id: CLINICA });
  const conServicio = simulado({ respuesta: fila({ servicio_id: SERVICIO }) });
  assert.equal((await crearProcedimiento(destino, { ...contenido, servicioId: SERVICIO }, conServicio.cliente)).servicioId, SERVICIO);
});

test("edición usa lista blanca sin cambiar id, plan, clínica, servicio o creado_en", async () => {
  const datos = { ...contenido, descripcion: "Control", numeroPieza: null, costo: 0, prioridad: "normal", estado: "completado",
    id: SERVICIO, clinica_id: ID, plan_tratamiento_id: ID, servicioId: SERVICIO, creado_en: "ayer" } as ContenidoProcedimiento;
  const fake = simulado({ respuesta: fila({ descripcion: "Control", numero_pieza: null, costo: 0, prioridad: "normal", estado: "completado" }) });
  const p = await actualizarProcedimiento(ID, destino, datos, fake.cliente);
  assert.equal(p.estado, "completado");
  assert.deepEqual(fake.llamadas[0].contenido, { descripcion: "Control", numero_pieza: null, costo: 0, prioridad: "normal", estado: "completado" });
  assert.deepEqual(fake.llamadas[0].filtros, [["id", ID], ["plan_tratamiento_id", PLAN], ["clinica_id", CLINICA]]);
});

test("DELETE confirma una fila real filtrada por id/plan/clínica", async () => {
  const fake = simulado();
  assert.equal((await eliminarProcedimiento(ID, destino, fake.cliente)).id, ID);
  assert.equal(fake.llamadas[0].operacion, "delete");
  assert.deepEqual(fake.llamadas[0].filtros, [["id", ID], ["plan_tratamiento_id", PLAN], ["clinica_id", CLINICA]]);
});

test("UUIDs inválidos y contenido inválido en CRUD se rechazan antes de red", async () => {
  const fake = simulado();
  await assert.rejects(listarProcedimientosPlan("p1", CLINICA, fake.cliente), /UUID/);
  await assert.rejects(listarProcedimientosPlan(PLAN, "c1", fake.cliente), /UUID/);
  for (const d of [{ ...destino, planTratamientoId: "p1" }, { ...destino, clinicaId: "c1" }]) {
    await assert.rejects(crearProcedimiento(d, contenido, fake.cliente), /UUID/);
    await assert.rejects(actualizarProcedimiento(ID, d, contenido, fake.cliente), /UUID/);
    await assert.rejects(eliminarProcedimiento(ID, d, fake.cliente), /UUID/);
  }
  await assert.rejects(actualizarProcedimiento("p1", destino, contenido, fake.cliente), /UUID/);
  await assert.rejects(eliminarProcedimiento("p1", destino, fake.cliente), /UUID/);
  await assert.rejects(crearProcedimiento(destino, { ...contenido, servicioId: "s1" }, fake.cliente), /UUID/);
  for (const cambio of [{ descripcion: " " }, { numeroPieza: 56 }, { costo: NaN }, { costo: -1 }]) {
    await assert.rejects(crearProcedimiento(destino, { ...contenido, ...cambio }, fake.cliente));
    await assert.rejects(actualizarProcedimiento(ID, destino, { ...contenido, ...cambio }, fake.cliente));
  }
  assert.equal(fake.llamadas.length, 0);
});

test("errores Supabase, transporte y cero filas no confirman crear/editar/eliminar", async () => {
  for (const opciones of [{ respuesta: null }, { respuesta: [] }, { error: { code: "42501", message: "sin permiso" } },
    { error: { code: "23503", message: "referenciado" } }, { rechazo: true }, { respuesta: fila({ id: SERVICIO, plan_tratamiento_id: ID }) }]) {
    const fake = simulado(opciones);
    await assert.rejects(crearProcedimiento(destino, contenido, fake.cliente));
    await assert.rejects(actualizarProcedimiento(ID, destino, contenido, fake.cliente));
    await assert.rejects(eliminarProcedimiento(ID, destino, fake.cliente));
  }
  await assert.rejects(eliminarProcedimiento(ID, destino, simulado({ respuesta: fila({ id: SERVICIO }) }).cliente));
});

test("contenido, timestamp y estado inicial no confirmados no anuncian éxito", async () => {
  for (const cambios of [{ prioridad: "alta" }, { costo: 1 }, { descripcion: "Otro" }, { actualizado_en: null }, { estado: "completado" }]) {
    await assert.rejects(crearProcedimiento(destino, contenido, simulado({ respuesta: fila(cambios) }).cliente));
  }
  await assert.rejects(crearProcedimiento(destino, contenido, simulado({ respuesta: fila({ creado_en: null }) }).cliente));
  await assert.rejects(actualizarProcedimiento(ID, destino, contenido, simulado({ respuesta: fila({ numero_pieza: 11 }) }).cliente));
});

test("orden local ASC conserva microsegundos, id ASC y fechas NULL al final", () => {
  const a = procedimientoDesdeFila(fila({ creado_en: "2026-10-11T10:00:00.000001Z" }));
  const b = procedimientoDesdeFila(fila({ id: SERVICIO, creado_en: "2026-10-11T10:00:00.000002Z" }));
  assert.deepEqual([b, a].sort(compararProcedimientos).map((p) => p.id), [ID, SERVICIO]);
  assert.ok(compararProcedimientos({ ...a, creadoEn: null }, b) > 0);
  assert.ok(compararProcedimientos({ ...a, creadoEn: b.creadoEn }, b) < 0);
});

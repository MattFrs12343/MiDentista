/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listarPlanesPorEstado } from "./planesPorEstadoService.ts";
import { clinicaParaVista, enlacePlan, planVisibleDesdeEnlace } from "./planesPorEstado.ts";
import { ESTADOS_PLAN, planDesdeFila } from "./planTratamientoMapper.ts";
import { crearVistaPlanesEstado } from "./planesPorEstadoControlador.ts";
import { crearControladorPlanes } from "./planesTratamientoControlador.ts";
import type { PaginaPlanesEstado } from "./planesPorEstado.ts";

const C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const P = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const perfil = { id: A, clinicaId: C, rol: "odontologo", activo: true };
function fila(cambios: Record<string, unknown> = {}) {
  return { id: ID, clinica_id: C, paciente_id: P, odontologo_id: A, titulo: "Plan real", estado: "propuesto", notas: null,
    costo_total: "10.50", creado_en: "2026-10-12T12:00:00.123456Z", actualizado_en: "2026-10-12T13:00:00Z",
    paciente: { id: P, clinica_id: C, nombre_completo: "Paciente real" },
    autor: { id: A, clinica_id: C, nombre_completo: "Autor real" }, ...cambios };
}
function cliente(respuesta: { data?: unknown; count?: number | null; error?: unknown; rechazo?: boolean } = {}) {
  const filtros: unknown[] = []; const orden: unknown[] = []; const rangos: unknown[] = []; let consultas = 0;
  const q = {
    select(columnas: string, opciones: unknown) { assert.match(columnas, /pacientes!t51_planes_paciente_fk/); assert.match(columnas, /perfiles!t51_planes_odontologo_fk/); assert.deepEqual(opciones, { count: "exact" }); return q; },
    eq(k: string, v: unknown) { filtros.push([k,v]); return q; }, order(k: string, v: unknown) { orden.push([k,v]); return q; },
    range(d: number, h: number) { rangos.push([d,h]); return respuesta.rechazo ? Promise.reject(new Error("Sin red"))
      : Promise.resolve({ data: "data" in respuesta ? respuesta.data : [fila()], count: "count" in respuesta ? respuesta.count : 1, error: respuesta.error ?? null }); },
  };
  const fake = { schema(s: string) { assert.equal(s, "public"); return { from(t: string) { assert.equal(t,"planes_tratamiento"); consultas++; return q; } }; } } as unknown as SupabaseClient;
  return { fake, filtros, orden, rangos, consultas: () => consultas };
}
for (const estado of ESTADOS_PLAN) test(`T-5.8 consulta y filtro ${estado}`, async () => {
  const c = cliente({ data: [fila({ estado })] });
  const pagina = await listarPlanesPorEstado(C, estado, 1, c.fake);
  assert.deepEqual(c.filtros, [["clinica_id", C],["estado", estado]]);
  assert.deepEqual(c.orden, [["creado_en",{ ascending: false, nullsFirst: false }],["id",{ ascending: false }]]);
  assert.deepEqual(c.rangos, [[0,19]]); assert.equal(pagina.planes[0].estado, estado);
  assert.equal(pagina.planes[0].pacienteNombre,"Paciente real"); assert.equal(pagina.planes[0].autorNombre,"Autor real");
  assert.equal(pagina.planes[0].costoTotal,10.5);
});
test("T-5.8 solo lee una página de 20, no descarga indefinidamente", async () => {
  const c = cliente({ data: [fila()], count: 21 });
  assert.equal((await listarPlanesPorEstado(C,"propuesto",2,c.fake)).total,21);
  assert.deepEqual(c.rangos,[[20,39]]); assert.equal(c.consultas(),1);
});
test("T-5.8 vacío confirmado y relaciones RLS invisibles no son errores", async () => {
  assert.deepEqual(await listarPlanesPorEstado(C,"aceptado",1,cliente({ data: [], count: 0 }).fake), { planes: [], total: 0 });
  const pagina = await listarPlanesPorEstado(C,"propuesto",1,cliente({ data: [fila({ paciente: null, autor: null })] }).fake);
  assert.equal(pagina.planes[0].pacienteNombre,null); assert.equal(pagina.planes[0].autorNombre,null);
});
test("T-5.8 errores, NULL, conteo incompleto y duplicados no son vacío", async () => {
  for (const c of [cliente({ error: { message: "RLS" } }),cliente({ rechazo: true }), cliente({ data: null }), cliente({ count: null }),
    cliente({ data: [], count: 1 }),cliente({ data: [fila(),fila()], count: 2 })]) {
    await assert.rejects(listarPlanesPorEstado(C,"propuesto",1,c.fake));
  }
});
test("T-5.8 rechaza clínica, estado o relaciones ajenas", async () => {
  for (const cambios of [{ clinica_id: A },{ estado: "aceptado" },{ paciente: { id: P, clinica_id: A, nombre_completo: "Ajeno" } },
    { autor: { id: P, clinica_id: C, nombre_completo: "Ajeno" } }]) {
    await assert.rejects(listarPlanesPorEstado(C,"propuesto",1,cliente({ data: [fila(cambios)] }).fake));
  }
});
test("T-5.8 valida UUID, estado y página antes de red", async () => {
  const c = cliente();
  await assert.rejects(listarPlanesPorEstado("p1","propuesto",1,c.fake));
  await assert.rejects(listarPlanesPorEstado(C,"otro" as never,1,c.fake));
  for (const pagina of [0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER]) await assert.rejects(listarPlanesPorEstado(C,"propuesto",pagina,c.fake));
  assert.equal(c.consultas(),0);
});
test("T-5.8 orden estable con microsegundos, id y fechas NULL", async () => {
  const c = cliente({ data: [fila({ creado_en: null }),fila({ id: A, creado_en: "2026-10-12T12:00:00.123457Z" })], count: 2 });
  assert.deepEqual((await listarPlanesPorEstado(C,"propuesto",1,c.fake)).planes.map((p) => p.id),[A,ID]);
});
test("T-5.8 permisos exigen clínica propia o auditoría explícita", () => {
  assert.equal(clinicaParaVista(perfil),C); assert.equal(clinicaParaVista({ ...perfil, rol: "recepcionista" }),C);
  assert.equal(clinicaParaVista({ ...perfil, rol: "superadmin", clinicaId: null },C),C);
  for (const p of [null,{ ...perfil, activo: false },{ ...perfil, rol: "paciente" },{ ...perfil, rol: "inventado" }]) assert.throws(() => clinicaParaVista(p,C));
  assert.throws(() => clinicaParaVista(perfil,A)); assert.throws(() => clinicaParaVista({ ...perfil, rol: "superadmin" }));
});
function diferido<T>() { let resolver!: (v: T) => void; const promesa = new Promise<T>((r) => { resolver = r; }); return { resolver,promesa }; }
const vacio = { planes: [], total: 0 };
test("T-5.8 loading, error y reintento no publican falso vacío", async () => {
  const espera = diferido<PaginaPlanesEstado>(); let n = 0;
  const v = crearVistaPlanesEstado(perfil,async () => { if (++n === 1) throw new Error("Sin red"); return espera.promesa; }); v.activar();
  await v.cargar(); assert.equal(v.obtener().estado,"error"); assert.match(v.obtener().error!,/Sin red/);
  const carga = v.cargar(); assert.equal(v.obtener().estado,"loading"); espera.resolver(vacio); await carga;
  assert.equal(v.obtener().estado,"success"); assert.equal(v.obtener().total,0);
});
test("T-5.8 respuestas obsoletas de filtros o contextos no se muestran", async () => {
  const espera = diferido<PaginaPlanesEstado>();
  const v = crearVistaPlanesEstado(perfil,async (_c,e) => e === "propuesto" ? espera.promesa : vacio); v.activar();
  const carga = v.cargar(); await v.filtrar("aceptado"); espera.resolver({ planes: [],total: 99 }); await carga;
  assert.equal(v.obtener().filtro,"aceptado"); assert.equal(v.obtener().total,0);
  v.desactivar(); await v.actualizar(); assert.equal(v.obtener().total,0);
});
test("T-5.8 aislamiento y permisos del controlador antes de consultar", async () => {
  for (const p of [{ ...perfil,rol: "paciente" },{ ...perfil,activo: false },{ ...perfil,rol: "superadmin",clinicaId: null }]) {
    let n = 0; const v = crearVistaPlanesEstado(p,async () => { n++; return vacio; }); v.activar(); await v.cargar();
    assert.equal(n,0); assert.equal(v.obtener().estado,"error");
  }
  const clinicas: string[] = [];
  for (const c of [C,A]) { const v = crearVistaPlanesEstado({ ...perfil,rol: "superadmin",clinicaId: null },async (id) => { clinicas.push(id); return vacio; },c); v.activar(); await v.cargar(); }
  assert.deepEqual(clinicas,[C,A]);
});
test("T-5.8 páginas, reinicio por filtro y última página tras reducción de total", async () => {
  let total = 21; const paginas: number[] = [];
  const v = crearVistaPlanesEstado(perfil,async (_c,_e,p) => { paginas.push(p); return { planes: [],total }; }); v.activar();
  await v.cargar(); await v.paginar(2); assert.equal(v.obtener().pagina,2);
  assert.throws(() => v.paginar(3)); total = 1; await v.actualizar(); assert.equal(v.obtener().pagina,1);
  assert.deepEqual(paginas,[1,2,2,1]); await v.filtrar("cancelado"); assert.equal(v.obtener().pagina,1);
});
test("T-5.8 cambio confirmado T-5.7 desaparece del filtro anterior y aparece en el nuevo", async () => {
  let persistido = planDesdeFila(fila());
  const tratamientos = crearControladorPlanes({ pacienteId: P,email: "autor@test",rol: "odontologo" }, {
    obtener: async () => persistido,
    perfil: async () => perfil,listar: async () => [persistido],crear: async () => persistido,
    notas: async () => persistido,titulo: async () => persistido,
    cambiarEstado: async (_id,_d,_anterior,nuevo) => { persistido = { ...persistido,estado: nuevo }; return persistido; },
  });
  const v = crearVistaPlanesEstado(perfil,async (_c,e) => ({ planes: persistido.estado === e ? [{ ...persistido,pacienteNombre: "Paciente",autorNombre: "Autor" }] : [],total: persistido.estado === e ? 1 : 0 }));
  tratamientos.activar(); v.activar(); await tratamientos.cargar(); await v.cargar(); assert.equal(v.obtener().total,1);
  tratamientos.seleccionar(ID); await tratamientos.solicitarCambioEstado("aceptado"); await v.actualizar();
  assert.equal(v.obtener().total,0); await v.filtrar("aceptado"); assert.equal(v.obtener().planes[0].estado,"aceptado");
});
test("T-5.8 navegación reutiliza ficha y solo selecciona planes visibles", () => {
  const p = planDesdeFila(fila());
  assert.equal(enlacePlan(p),`/app/pacientes/${P}?tab=tratamiento&plan=${ID}`);
  assert.equal(planVisibleDesdeEnlace(ID.toUpperCase(),[p]),ID);
  assert.equal(planVisibleDesdeEnlace(A,[p]),null); assert.equal(planVisibleDesdeEnlace("p1",[p]),null);
});
test("T-5.8 refresco durante lectura descarta resultados anteriores y coalesce reintentos", async () => {
  const anterior = diferido<PaginaPlanesEstado>(); const vigente = diferido<PaginaPlanesEstado>(); let n = 0;
  const v = crearVistaPlanesEstado(perfil,async () => ++n === 1 ? anterior.promesa : vigente.promesa); v.activar();
  const primera = v.cargar(); const segunda = v.actualizar(); const reintento = v.cargar();
  assert.equal(n,2); anterior.resolver({ planes: [],total: 99 }); await primera;
  assert.equal(v.obtener().estado,"loading"); vigente.resolver(vacio); await segunda; await reintento;
  assert.equal(v.obtener().total,0); assert.equal(v.obtener().estado,"success");
});
test("T-5.8 respuesta tardía de otra clínica o sesión desactivada no publica resultados", async () => {
  const espera = diferido<PaginaPlanesEstado>();
  const anterior = crearVistaPlanesEstado(perfil,async () => espera.promesa); anterior.activar(); const carga = anterior.cargar();
  anterior.desactivar();
  const actual = crearVistaPlanesEstado({ ...perfil,clinicaId: A },async (c) => { assert.equal(c,A); return vacio; });
  actual.activar(); await actual.cargar(); espera.resolver({ planes: [],total: 99 }); await carga;
  assert.equal(anterior.obtener().estado,"loading"); assert.equal(actual.obtener().total,0);
});

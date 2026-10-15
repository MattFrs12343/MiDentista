/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { compararPlanes, planDesdeFila, planParaGuardar, ESTADOS_PLAN } from "./planTratamientoMapper.ts";
import { actualizarNotasPlan, actualizarTituloPlan, cambiarEstadoPlan, crearPlanTratamiento, listarPlanesPaciente, obtenerPlanPorId } from "./planTratamientoService.ts";
import { exigirTransicionPlan, transicionesPlan } from "./planEstado.ts";

const ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PACIENTE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CLINICA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const AUTOR = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const destino = { pacienteId: PACIENTE, clinicaId: CLINICA, odontologoId: AUTOR };
const contenido = { titulo: "Plan integral", notas: "Notas reales\nControl" };
const fila = (cambios: Record<string, unknown> = {}) => ({ id: ID, paciente_id: PACIENTE, clinica_id: CLINICA,
  odontologo_id: AUTOR, titulo: contenido.titulo, notas: contenido.notas, estado: "propuesto", costo_total: "125.50",
  creado_en: "2026-10-11T10:00:00Z", actualizado_en: "2026-10-11T12:00:00Z", ...cambios });

function simulado(opciones: { filas?: unknown; respuesta?: unknown; error?: unknown; count?: number | null; rechazo?: boolean } = {}) {
  const llamadas: { operacion: string; contenido?: object; filtros: [string, unknown][]; orden: [string, object][]; rango?: [number, number] }[] = [];
  const cliente = { schema(esquema: string) {
    assert.equal(esquema, "public");
    return { from(nombre: string) {
      assert.equal(nombre, "planes_tratamiento");
      const llamada: typeof llamadas[number] = { operacion: "select", filtros: [], orden: [] };
      llamadas.push(llamada);
      const consulta = {
        select(columnas: string) { assert.match(columnas, /titulo,estado,costo_total,notas,creado_en,actualizado_en/); return consulta; },
        eq(campo: string, valor: unknown) { llamada.filtros.push([campo, valor]); return consulta; },
        order(campo: string, valor: object) { llamada.orden.push([campo, valor]); return consulta; },
        range(desde: number, hasta: number) { llamada.rango = [desde, hasta]; return consulta; },
        insert(datos: object) { llamada.operacion = "insert"; llamada.contenido = datos; return consulta; },
        update(datos: object) { llamada.operacion = "update"; llamada.contenido = datos; return consulta; },
        single() { return opciones.rechazo ? Promise.reject(new TypeError("fetch failed"))
          : Promise.resolve({ data: "respuesta" in opciones ? opciones.respuesta : fila(), error: opciones.error ?? null }); },
        then(resolve: (r: { data: unknown; error: unknown; count: number | null }) => unknown, reject: (e: unknown) => unknown) {
          if (opciones.rechazo) return Promise.reject(new TypeError("fetch failed")).then(resolve, reject);
          const filas = "filas" in opciones ? opciones.filas : [fila()];
          return Promise.resolve({ data: Array.isArray(filas) ? filas.slice(llamada.rango?.[0], (llamada.rango?.[1] ?? 199) + 1) : filas,
            error: opciones.error ?? null, count: "count" in opciones ? opciones.count! : Array.isArray(filas) ? filas.length : null }).then(resolve, reject);
        },
      };
      return consulta;
    } };
  } } as unknown as SupabaseClient;
  return { cliente, llamadas };
}

test("mapper conserva identidad, título legado NULL, notas, costo y los cinco estados reales", () => {
  for (const estado of ESTADOS_PLAN) {
    const p = planDesdeFila(fila({ titulo: null, estado, notas: null }));
    assert.equal(p.id, ID); assert.equal(p.clinicaId, CLINICA); assert.equal(p.pacienteId, PACIENTE);
    assert.equal(p.odontologoId, AUTOR); assert.equal(p.titulo, null); assert.equal(p.estado, estado);
    assert.equal(p.notas, ""); assert.equal(p.costoTotal, 125.5); assert.equal(p.creadoEn, fila().creado_en);
  }
  assert.equal(planDesdeFila(fila()).notas, contenido.notas);
});

test("mapper rechaza filas inválidas, UUID demo, estados desconocidos y costo no finito", () => {
  for (const valor of [null, [], fila({ id: "p1" }), fila({ estado: "borrador" }), fila({ titulo: "  " }),
    fila({ notas: 1 }), fila({ costo_total: null }), fila({ costo_total: "NaN" }), fila({ costo_total: -1 }),
    fila({ actualizado_en: "ayer" })]) assert.throws(() => planDesdeFila(valor));
});

test("orden local de confirmaciones preserva microsegundos, id DESC y NULLS LAST", () => {
  const a = planDesdeFila(fila({ creado_en: "2026-10-11T10:00:00.000001Z" }));
  const b = planDesdeFila(fila({ id: AUTOR, creado_en: "2026-10-11T10:00:00.000002Z" }));
  assert.deepEqual([a, b].sort(compararPlanes).map((p) => p.id), [AUTOR, ID]);
  assert.ok(compararPlanes({ ...a, creadoEn: null }, b) > 0);
  assert.ok(compararPlanes({ ...a, creadoEn: b.creadoEn }, b) > 0);
});

test("payload de creación exige título, conserva notas y usa lista blanca", () => {
  assert.deepEqual(planParaGuardar({ ...contenido, titulo: "  Plan integral  ", estado: "aceptado" } as typeof contenido), contenido);
  for (const titulo of ["", " \t\n"]) assert.throws(() => planParaGuardar({ ...contenido, titulo }), /título/);
});

test("lectura ordena creado_en DESC, id DESC, filtra paciente/clínica y nunca inserta", async () => {
  const fake = simulado({ filas: [fila(), fila({ id: AUTOR, titulo: "Otro plan" })] });
  const planes = await listarPlanesPaciente(PACIENTE, CLINICA, fake.cliente);
  assert.equal(planes.length, 2); assert.equal(planes[1].id, AUTOR);
  assert.deepEqual(fake.llamadas[0].filtros, [["paciente_id", PACIENTE], ["clinica_id", CLINICA]]);
  assert.deepEqual(fake.llamadas[0].orden, [["creado_en", { ascending: false, nullsFirst: false }], ["id", { ascending: false }]]);
  assert.equal(fake.llamadas.every((c) => c.operacion === "select"), true);
  const auditoria = simulado();
  await listarPlanesPaciente(PACIENTE, null, auditoria.cliente);
  assert.deepEqual(auditoria.llamadas[0].filtros, [["paciente_id", PACIENTE]]);
});

test("lectura recupera múltiples lotes sin truncar ni crear automáticamente", async () => {
  const filas = Array.from({ length: 205 }, (_, i) => fila({ id: `00000000-0000-4000-8000-${i.toString().padStart(12, "0")}` }));
  const fake = simulado({ filas });
  assert.equal((await listarPlanesPaciente(PACIENTE, CLINICA, fake.cliente)).length, 205);
  assert.deepEqual(fake.llamadas.map((c) => c.rango), [[0, 199], [200, 399]]);
});

test("0 filas es lectura confirmada; errores/NULL/conteo inconsistente no son vacío ni INSERT", async () => {
  const vacio = simulado({ filas: [] });
  assert.deepEqual(await listarPlanesPaciente(PACIENTE, CLINICA, vacio.cliente), []);
  for (const fake of [simulado({ filas: null }), simulado({ count: null }), simulado({ filas: [], count: 1 }),
    simulado({ error: { message: "RLS denegó" } }), simulado({ rechazo: true }), simulado({ filas: [fila(), fila()] }),
    simulado({ filas: [fila({ paciente_id: AUTOR })] })]) {
    await assert.rejects(listarPlanesPaciente(PACIENTE, CLINICA, fake.cliente));
    assert.equal(fake.llamadas.every((c) => c.operacion === "select"), true);
  }
  assert.equal(vacio.llamadas[0].operacion, "select");
});

test("creación explícita confirma fila real e inicia propuesto sin costo calculado ni timestamps enviados", async () => {
  const fake = simulado();
  const p = await crearPlanTratamiento(destino, { ...contenido, titulo: " Plan integral " }, fake.cliente);
  assert.equal(p.id, ID); assert.equal(p.estado, "propuesto");
  assert.deepEqual(fake.llamadas[0].contenido, { ...contenido, paciente_id: PACIENTE, clinica_id: CLINICA, odontologo_id: AUTOR, estado: "propuesto" });
  assert.equal(fake.llamadas[0].operacion, "insert");
});

test("título vacío y contexto inválido se rechazan antes de la red", async () => {
  const fake = simulado();
  await assert.rejects(crearPlanTratamiento(destino, { ...contenido, titulo: "  " }, fake.cliente), /título/);
  await assert.rejects(actualizarTituloPlan(ID, destino, "\n", fake.cliente), /título/);
  for (const campo of ["pacienteId", "clinicaId", "odontologoId"] as const) {
    await assert.rejects(crearPlanTratamiento({ ...destino, [campo]: "p1" }, contenido, fake.cliente), /UUID/);
  }
  await assert.rejects(listarPlanesPaciente("p1", CLINICA, fake.cliente), /UUID/);
  await assert.rejects(actualizarNotasPlan("p1", destino, "", fake.cliente), /UUID/);
  assert.equal(fake.llamadas.length, 0);
});

test("guardar notas/título envía solo el campo solicitado y filtra por id real, paciente, clínica y autor", async () => {
  const fake = simulado({ respuesta: fila({ notas: "" }) });
  assert.equal((await actualizarNotasPlan(ID, destino, "", fake.cliente)).notas, "");
  assert.deepEqual(fake.llamadas[0].contenido, { notas: "" });
  assert.deepEqual(fake.llamadas[0].filtros, [["id", ID], ["paciente_id", PACIENTE], ["clinica_id", CLINICA], ["odontologo_id", AUTOR]]);
  const titulo = simulado({ respuesta: fila({ titulo: "Nuevo título" }) });
  await actualizarTituloPlan(ID, destino, " Nuevo título ", titulo.cliente);
  assert.deepEqual(titulo.llamadas[0].contenido, { titulo: "Nuevo título" });
});

test("escrituras no confunden error/0 filas/respuesta ajena/contenido no confirmado con éxito", async () => {
  for (const fake of [simulado({ respuesta: null }), simulado({ error: { code: "42501", message: "sin permiso" } }),
    simulado({ rechazo: true }), simulado({ respuesta: fila({ odontologo_id: ID }) }),
    simulado({ respuesta: fila({ notas: "distintas" }) }), simulado({ respuesta: fila({ actualizado_en: null }) })]) {
    await assert.rejects(actualizarNotasPlan(ID, destino, contenido.notas, fake.cliente));
  }
  for (const cambios of [{ estado: "aceptado" }, { creado_en: null }, { titulo: "Otro título" }]) {
    await assert.rejects(crearPlanTratamiento(destino, contenido, simulado({ respuesta: fila(cambios) }).cliente));
  }
  await assert.rejects(actualizarNotasPlan(ID, destino, contenido.notas, simulado({ respuesta: fila({ id: AUTOR }) }).cliente));
});

// Expectativas independientes del mapa usado por servicio y UI.
const parejasValidas = ["propuesto/aceptado", "propuesto/cancelado", "aceptado/en_proceso", "en_proceso/completado", "en_proceso/cancelado"];
for (const anterior of ESTADOS_PLAN) for (const nuevo of ESTADOS_PLAN) {
  test(`T-5.7 servicio ${anterior} -> ${nuevo}`, async () => {
    const fake = simulado({ respuesta: fila({ estado: nuevo, actualizado_en: "2026-10-12T13:00:00.123456Z" }) });
    if (!parejasValidas.includes(`${anterior}/${nuevo}`)) {
      assert.throws(() => exigirTransicionPlan(anterior, nuevo), /no permitida/);
      await assert.rejects(cambiarEstadoPlan(ID, destino, anterior, nuevo, fake.cliente), /no permitida/);
      assert.equal(fake.llamadas.length, 0);
    } else {
      const actualizado = await cambiarEstadoPlan(ID, destino, anterior, nuevo, fake.cliente);
      assert.equal(actualizado.estado, nuevo);
      assert.equal(actualizado.actualizadoEn, "2026-10-12T13:00:00.123456Z");
      assert.equal(actualizado.creadoEn, fila().creado_en);
      assert.equal(actualizado.notas, contenido.notas); assert.equal(actualizado.titulo, contenido.titulo);
      assert.deepEqual(fake.llamadas[0].contenido, { estado: nuevo });
      assert.deepEqual(fake.llamadas[0].filtros, [["id", ID], ["paciente_id", PACIENTE], ["clinica_id", CLINICA], ["odontologo_id", AUTOR], ["estado", anterior]]);
    }
  });
}
test("T-5.7 terminales y estados desconocidos no tienen acciones", () => {
  assert.deepEqual(transicionesPlan("completado"), []); assert.deepEqual(transicionesPlan("cancelado"), []);
  assert.throws(() => exigirTransicionPlan("desconocido" as never, "aceptado"));
  assert.throws(() => exigirTransicionPlan("propuesto", "desconocido" as never));
});
test("T-5.7 valida todos los UUID antes de red", async () => {
  const fake = simulado();
  await assert.rejects(cambiarEstadoPlan("p1", destino, "propuesto", "aceptado", fake.cliente), /UUID/);
  for (const campo of ["pacienteId", "clinicaId", "odontologoId"] as const) {
    await assert.rejects(cambiarEstadoPlan(ID, { ...destino, [campo]: "p1" }, "propuesto", "aceptado", fake.cliente), /UUID/);
  }
  assert.equal(fake.llamadas.length, 0);
});
test("T-5.7 Supabase y transporte fallan sin reintento", async () => {
  for (const fake of [simulado({ error: { code: "23514", message: "Transición rechazada" } }), simulado({ rechazo: true })]) {
    await assert.rejects(cambiarEstadoPlan(ID, destino, "propuesto", "aceptado", fake.cliente));
    assert.equal(fake.llamadas.length, 1);
  }
});
test("T-5.7 cero filas y PGRST116 muestran conflicto o autorización", async () => {
  for (const fake of [simulado({ respuesta: null }), simulado({ respuesta: null, error: { code: "PGRST116", message: "0 rows" } })]) {
    await assert.rejects(cambiarEstadoPlan(ID, destino, "propuesto", "aceptado", fake.cliente), /otra sesión.*autorización.*Recarga/);
    assert.equal(fake.llamadas.length, 1);
  }
});
test("T-5.7 respuesta con estado, contexto o timestamp inesperado no confirma", async () => {
  for (const cambios of [{ estado: "propuesto" }, { estado: "cancelado" }, { actualizado_en: null }, { id: AUTOR },
    { paciente_id: AUTOR }, { clinica_id: AUTOR }, { odontologo_id: ID }]) {
    await assert.rejects(cambiarEstadoPlan(ID, destino, "propuesto", "aceptado", simulado({ respuesta: fila(cambios) }).cliente));
  }
});
test("T-5.7 dos clientes con lectura propuesto: CAS rechaza cancelar después de aceptar", async () => {
  let persistida = fila();
  const cliente = { schema: () => ({ from: () => {
    const filtros = new Map<string, unknown>(); let nuevo = "";
    const q = { update: (v: { estado: string }) => { nuevo = v.estado; return q; },
      eq: (k: string, v: unknown) => { filtros.set(k, v); return q; }, select: () => q,
      single: async () => {
        if ([...filtros].some(([k, v]) => persistida[k as keyof typeof persistida] !== v)) return { data: null, error: null };
        persistida = fila({ estado: nuevo }); return { data: persistida, error: null };
      } };
    return q;
  } }) } as unknown as SupabaseClient;
  await cambiarEstadoPlan(ID, destino, "propuesto", "aceptado", cliente);
  await assert.rejects(cambiarEstadoPlan(ID, destino, "propuesto", "cancelado", cliente), /otra sesión/);
  assert.equal(persistida.estado, "aceptado");
});

test("T-5.10 obtenerPlanPorId solo lee por id/paciente/clínica y conserva total/timestamps reales", async () => {
  const fake = simulado({ respuesta: fila({ costo_total: "300.50", actualizado_en: "2026-10-12T15:00:00.123456Z" }) });
  const p = await obtenerPlanPorId(ID, destino, fake.cliente);
  assert.equal(p.costoTotal, 300.5); assert.equal(p.actualizadoEn, "2026-10-12T15:00:00.123456Z");
  assert.equal(p.titulo, contenido.titulo); assert.equal(p.notas, contenido.notas);
  assert.deepEqual(fake.llamadas[0].filtros, [["id", ID], ["paciente_id", PACIENTE], ["clinica_id", CLINICA]]);
  assert.equal(fake.llamadas[0].operacion, "select"); assert.equal(fake.llamadas.length, 1);
  assert.equal((await obtenerPlanPorId(ID, destino, simulado({ respuesta: fila({ costo_total: "0.00", actualizado_en: null }) }).cliente)).costoTotal, 0);
});
test("T-5.10 relectura valida UUID antes de red y rechaza error/0 filas/contexto/costo inesperado", async () => {
  const fake = simulado();
  await assert.rejects(obtenerPlanPorId("p1", destino, fake.cliente));
  for (const campo of ["pacienteId", "clinicaId"] as const) await assert.rejects(obtenerPlanPorId(ID, { ...destino, [campo]: "p1" }, fake.cliente));
  assert.equal(fake.llamadas.length, 0);
  for (const c of [simulado({ respuesta: null }), simulado({ error: { message: "RLS" } }), simulado({ rechazo: true }),
    simulado({ respuesta: fila({ id: AUTOR }) }), simulado({ respuesta: fila({ paciente_id: AUTOR }) }),
    simulado({ respuesta: fila({ clinica_id: AUTOR }) }), simulado({ respuesta: fila({ costo_total: "NaN" }) })]) {
    await assert.rejects(obtenerPlanPorId(ID, destino, c.cliente)); assert.equal(c.llamadas.length, 1);
  }
});

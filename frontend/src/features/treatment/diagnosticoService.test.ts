/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { actualizarDiagnostico, cambiarEstadoDiagnostico, crearDiagnostico, listarDiagnosticosPaciente, obtenerPerfilDiagnosticos } from "./diagnosticoService.ts";
import type { EstadoDiagnostico } from "./tipos.ts";

const ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PACIENTE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CLINICA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const AUTOR = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const AUTH = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const destino = { pacienteId: PACIENTE, clinicaId: CLINICA, odontologoId: AUTOR };
const contenido = { descripcion: "Caries", numeroPieza: 54, observaciones: "Control" };
const fila = (cambios: Record<string, unknown> = {}) => ({ id: ID, paciente_id: PACIENTE, clinica_id: CLINICA, odontologo_id: AUTOR,
  descripcion: "Caries", numero_pieza: 54, observaciones: "Control", estado: "activo", fecha_diagnostico: "2026-10-11",
  creado_en: "2026-10-11T10:00:00Z", actualizado_en: "2026-10-11T12:00:00Z", ...cambios });

function simulado(opciones: { filas?: unknown; respuesta?: unknown; error?: { code?: string; message: string } | null;
  rechazar?: boolean; perfiles?: unknown; email?: string; sinUsuario?: boolean;
  count?: number | null; limiteRespuesta?: number; countPorConsulta?: number[] } = {}) {
  const llamadas: { tabla: string; operacion: string; contenido?: Record<string, unknown>; columnas?: string;
    filtros: [string, unknown][]; orden: [string, object][]; rango?: [number, number]; conteo?: object }[] = [];
  const error = opciones.error ?? null;
  const cliente = {
    auth: { getUser: async () => ({ data: { user: opciones.sinUsuario ? null : { id: AUTH, email: opciones.email ?? "autor@clinica.test" } }, error: null }) },
    schema(esquema: string) {
      assert.equal(esquema, "public");
      return { from(tabla: string) {
        const llamada: typeof llamadas[number] = { tabla, operacion: "select", filtros: [], orden: [] };
        llamadas.push(llamada);
        const consulta = {
          select(columnas: string, conteo?: object) { llamada.columnas = columnas; llamada.conteo = conteo; return consulta; },
          eq(campo: string, valor: unknown) { llamada.filtros.push([campo, valor]); return consulta; },
          order(campo: string, valor: object) { llamada.orden.push([campo, valor]); return consulta; },
          range(desde: number, hasta: number) { llamada.rango = [desde, hasta]; return consulta; },
          insert(datos: Record<string, unknown>) { llamada.operacion = "insert"; llamada.contenido = datos; return consulta; },
          update(datos: Record<string, unknown>) { llamada.operacion = "update"; llamada.contenido = datos; return consulta; },
          single() { return opciones.rechazar ? Promise.reject(new TypeError("fetch failed")) : Promise.resolve({
            data: "respuesta" in opciones ? opciones.respuesta : fila(), error }); },
          limit(n: number) { assert.equal(n, 2); return Promise.resolve({ data: "perfiles" in opciones ? opciones.perfiles
            : [{ id: AUTOR, clinica_id: CLINICA, rol: "odontologo", activo: true }], error }); },
          then(resolve: (resultado: { data: unknown; error: unknown; count: unknown }) => unknown) {
            const filas = "filas" in opciones ? opciones.filas : [fila()];
            const desde = llamada.rango?.[0] ?? 0;
            const hasta = Math.min(llamada.rango?.[1] ?? 199, desde + (opciones.limiteRespuesta ?? 200) - 1);
            return Promise.resolve({ data: Array.isArray(filas) ? filas.slice(desde, hasta + 1) : filas, error,
              count: opciones.countPorConsulta?.[llamadas.length - 1] ?? ("count" in opciones ? opciones.count : Array.isArray(filas) ? filas.length : null) }).then(resolve);
          },
        };
        return consulta;
      } };
    },
  } as unknown as SupabaseClient;
  return { cliente, llamadas };
}

test("listar filtra paciente y clínica, ordena creado_en DESC y no escribe", async () => {
  const fake = simulado();
  const datos = await listarDiagnosticosPaciente(PACIENTE, CLINICA, fake.cliente);
  assert.equal(datos[0].odontologoId, AUTOR);
  assert.equal(datos[0].actualizadoEn, "2026-10-11T12:00:00Z");
  assert.deepEqual(fake.llamadas[0].filtros, [["paciente_id", PACIENTE], ["clinica_id", CLINICA]]);
  assert.deepEqual(fake.llamadas[0].orden, [["creado_en", { ascending: false, nullsFirst: false }], ["id", { ascending: false }]]);
  assert.equal(fake.llamadas[0].operacion, "select");
  assert.deepEqual(fake.llamadas[0].rango, [0, 199]);
  assert.deepEqual(fake.llamadas[0].conteo, { count: "exact" });
  assert.match(fake.llamadas[0].columnas!, /observaciones,estado,fecha_diagnostico,creado_en,actualizado_en/);
  const auditoria = simulado();
  await listarDiagnosticosPaciente(PACIENTE, null, auditoria.cliente);
  assert.deepEqual(auditoria.llamadas[0].filtros, [["paciente_id", PACIENTE]]);
});

test("lectura por rangos recupera más del límite API sin repetir ni omitir ids", async () => {
  const filas = Array.from({ length: 1005 }, (_, i) => fila({ id: `00000000-0000-4000-8000-${i.toString().padStart(12, "0")}` }));
  const fake = simulado({ filas });
  const lista = await listarDiagnosticosPaciente(PACIENTE, CLINICA, fake.cliente);
  assert.equal(lista.length, 1005);
  assert.equal(new Set(lista.map((d) => d.id)).size, 1005);
  assert.deepEqual(fake.llamadas.map((c) => c.rango), [[0,199], [200,399], [400,599], [600,799], [800,999], [1000,1199]]);
  assert.equal(fake.llamadas.every((c) => c.filtros.some(([campo, valor]) => campo === "paciente_id" && valor === PACIENTE)), true);
});

test("límite configurado menor al lote usa filas reales para avanzar", async () => {
  const filas = Array.from({ length: 25 }, (_, i) => fila({ id: `00000000-0000-4000-8000-${i.toString().padStart(12, "0")}` }));
  const fake = simulado({ filas, limiteRespuesta: 10 });
  assert.equal((await listarDiagnosticosPaciente(PACIENTE, CLINICA, fake.cliente)).length, 25);
  assert.deepEqual(fake.llamadas.map((c) => c.rango?.[0]), [0,10,20]);
});

test("conteo no confirmado o rango incompleto no se convierten en lista vacía", async () => {
  for (const fake of [simulado({ count: null }), simulado({ count: -1 }), simulado({ count: 0.5 }),
    simulado({ filas: [], count: 1 }), simulado({ count: 0 }), simulado({ count: 2 })]) {
    await assert.rejects(listarDiagnosticosPaciente(PACIENTE, CLINICA, fake.cliente), /no confirmó|No se confirmó/);
  }
});

test("cambio de volumen entre rangos solicita reintento sin devolver lista parcial", async () => {
  const filas = Array.from({ length: 21 }, (_, i) => fila({ id: `00000000-0000-4000-8000-${i.toString().padStart(12, "0")}` }));
  const fake = simulado({ filas, limiteRespuesta: 10, countPorConsulta: [21,22] });
  await assert.rejects(listarDiagnosticosPaciente(PACIENTE, CLINICA, fake.cliente), /lista cambió/);
});

test("SELECT vacío es válido, NULL/error/contexto ajeno/duplicados no lo son", async () => {
  assert.deepEqual(await listarDiagnosticosPaciente(PACIENTE, CLINICA, simulado({ filas: [] }).cliente), []);
  await assert.rejects(listarDiagnosticosPaciente(PACIENTE, CLINICA, simulado({ filas: null }).cliente), /no confirmó/);
  await assert.rejects(listarDiagnosticosPaciente(PACIENTE, CLINICA, simulado({ error: { message: "fallo de consulta" } }).cliente), /fallo de consulta/);
  for (const datos of [[fila({ paciente_id: ID })], [fila({ clinica_id: ID })], [fila(), fila()], [fila({ estado: "inventado" })]]) {
    await assert.rejects(listarDiagnosticosPaciente(PACIENTE, CLINICA, simulado({ filas: datos }).cliente));
  }
});

test("UUID inválido en todas las operaciones se rechaza antes de tocar red", async () => {
  const fake = simulado();
  await assert.rejects(listarDiagnosticosPaciente("p1", CLINICA, fake.cliente), /UUID/);
  await assert.rejects(listarDiagnosticosPaciente(PACIENTE, "c1", fake.cliente), /UUID/);
  for (const campo of ["pacienteId", "clinicaId", "odontologoId"] as const) {
    await assert.rejects(crearDiagnostico({ ...destino, [campo]: "p1" }, contenido, fake.cliente), /UUID/);
    await assert.rejects(actualizarDiagnostico(ID, { ...destino, [campo]: "p1" }, contenido, fake.cliente), /UUID/);
    await assert.rejects(cambiarEstadoDiagnostico(ID, { ...destino, [campo]: "p1" }, "activo", fake.cliente), /UUID/);
  }
  await assert.rejects(actualizarDiagnostico("d1", destino, contenido, fake.cliente), /UUID/);
  await assert.rejects(cambiarEstadoDiagnostico("d1", destino, "activo", fake.cliente), /UUID/);
  assert.equal(fake.llamadas.length, 0);
});

test("crear confirma una fila activa y manda observaciones/contexto sin timestamps", async () => {
  const fake = simulado();
  const guardado = await crearDiagnostico(destino, { ...contenido, descripcion: "  Caries  " }, fake.cliente);
  assert.deepEqual(fake.llamadas[0].contenido, { descripcion: "Caries", numero_pieza: 54, observaciones: "Control",
    paciente_id: PACIENTE, clinica_id: CLINICA, odontologo_id: AUTOR });
  assert.equal(fake.llamadas[0].operacion, "insert");
  assert.equal(guardado.estado, "activo");
  assert.equal(guardado.actualizadoEn, fila().actualizado_en);
});

test("actualizar usa filtros completos y solo cambia los tres campos editables", async () => {
  const fake = simulado({ respuesta: fila({ descripcion: "Corregido", numero_pieza: null, observaciones: "" }) });
  const guardado = await actualizarDiagnostico(ID, destino, { descripcion: "Corregido", numeroPieza: null, observaciones: "" }, fake.cliente);
  assert.deepEqual(fake.llamadas[0].filtros, [["id", ID], ["paciente_id", PACIENTE], ["clinica_id", CLINICA], ["odontologo_id", AUTOR]]);
  assert.deepEqual(fake.llamadas[0].contenido, { descripcion: "Corregido", numero_pieza: null, observaciones: "" });
  assert.equal(guardado.numeroPieza, null);
  // creado_en admite NULL legado; UPDATE no puede ni debe inventarlo.
  const legado = await actualizarDiagnostico(ID, destino, contenido, simulado({ respuesta: fila({ creado_en: null }) }).cliente);
  assert.equal(legado.creadoEn, null);
  assert.equal(legado.actualizadoEn, fila().actualizado_en);
});

test("cambio de estado escribe solo estado, verifica respuesta y admite los tres estados", async () => {
  for (const estado of ["activo", "inactivo", "resuelto"] as const) {
    const fake = simulado({ respuesta: fila({ estado }) });
    assert.equal((await cambiarEstadoDiagnostico(ID, destino, estado, fake.cliente)).estado, estado);
    assert.deepEqual(fake.llamadas[0].contenido, { estado });
    assert.equal(fake.llamadas[0].filtros.length, 4);
  }
  const fake = simulado();
  await assert.rejects(cambiarEstadoDiagnostico(ID, destino, "pendiente" as EstadoDiagnostico, fake.cliente), /activo, inactivo o resuelto/);
  assert.equal(fake.llamadas.length, 0);
  await assert.rejects(cambiarEstadoDiagnostico(ID, destino, "resuelto", fake.cliente), /no confirmó el estado/);
});

test("errores Supabase y UPDATE de cero filas no se anuncian como éxito", async () => {
  for (const [code, mensaje] of [["42501", /permiso/], ["23514", /validaciones/], ["23503", /clínica/], ["PGRST116", /fila afectada/]] as const) {
    const fake = simulado({ respuesta: null, error: { code, message: "Detalle SQL" } });
    await assert.rejects(actualizarDiagnostico(ID, destino, contenido, fake.cliente), mensaje);
    await assert.rejects(crearDiagnostico(destino, contenido, fake.cliente), mensaje);
    await assert.rejects(cambiarEstadoDiagnostico(ID, destino, "resuelto", fake.cliente), mensaje);
  }
  for (const operacion of [crearDiagnostico(destino, contenido, simulado({ respuesta: null }).cliente),
    actualizarDiagnostico(ID, destino, contenido, simulado({ respuesta: null }).cliente),
    cambiarEstadoDiagnostico(ID, destino, "resuelto", simulado({ respuesta: null }).cliente)]) {
    await assert.rejects(operacion, /No se confirmó una fila/);
  }
  await assert.rejects(crearDiagnostico(destino, contenido, simulado({ rechazar: true }).cliente), /crear el diagnóstico/);
  await assert.rejects(crearDiagnostico(destino, contenido, simulado({ rechazar: true }).cliente), /Recarga antes de repetir/);
});

test("contenido inválido no llega a red y respuesta no coincidente no confirma éxito", async () => {
  const fake = simulado();
  await assert.rejects(crearDiagnostico(destino, { ...contenido, numeroPieza: NaN }, fake.cliente), /pieza/);
  await assert.rejects(actualizarDiagnostico(ID, destino, { ...contenido, descripcion: " " }, fake.cliente), /obligatoria/);
  assert.equal(fake.llamadas.length, 0);
  for (const cambio of [{ paciente_id: ID }, { clinica_id: ID }, { odontologo_id: ID }, { descripcion: "Otro contenido" }, { actualizado_en: null }]) {
    await assert.rejects(crearDiagnostico(destino, contenido, simulado({ respuesta: fila(cambio) }).cliente));
    await assert.rejects(actualizarDiagnostico(ID, destino, contenido, simulado({ respuesta: fila(cambio) }).cliente));
  }
  await assert.rejects(actualizarDiagnostico(ID, destino, contenido, simulado({ respuesta: fila({ id: AUTH }) }).cliente), /no corresponde/);
  await assert.rejects(crearDiagnostico(destino, contenido, simulado({ respuesta: fila({ estado: "resuelto" }) }).cliente), /inicial activo/);
});

test("perfil visual procede del usuario Auth actual, activo y único", async () => {
  const fake = simulado();
  assert.deepEqual(await obtenerPerfilDiagnosticos("autor@clinica.test", fake.cliente), { id: AUTOR, clinicaId: CLINICA, rol: "odontologo", activo: true });
  assert.deepEqual(fake.llamadas[0].filtros, [["auth_user_id", AUTH], ["activo", true]]);
  assert.equal(fake.llamadas[0].tabla, "perfiles");
  const cambiada = simulado({ email: "otra@clinica.test" });
  await assert.rejects(obtenerPerfilDiagnosticos("autor@clinica.test", cambiada.cliente), /sesión cambió/);
  assert.equal(cambiada.llamadas.length, 0);
  for (const perfiles of [null, [], [{ id: AUTOR, clinica_id: CLINICA, rol: "odontologo", activo: false }],
    [{ id: ID }, { id: AUTOR }], [{ id: "p1", clinica_id: CLINICA, rol: "odontologo", activo: true }]]) {
    await assert.rejects(obtenerPerfilDiagnosticos("autor@clinica.test", simulado({ perfiles }).cliente));
  }
  await assert.rejects(obtenerPerfilDiagnosticos("autor@clinica.test", simulado({ sinUsuario: true }).cliente), /sesión cambió/);
});

/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ASOCIACION_NO_DISPONIBLE, cargarOpcionesEvolucion, cargarOpcionesPlan, cargarResumenesAsociaciones,
  etiquetaEvolucion, etiquetaPlan, puedeElegirAsociacion, type FilaEvolucionOpcion, type FilaPlanOpcion,
} from "./archivoAsociacionService.ts";
import type { Archivo } from "./tipos.ts";

const PACIENTE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CLINICA = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const SEGUNDO = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const evolucion: FilaEvolucionOpcion = { id: ID, paciente_id: PACIENTE, clinica_id: CLINICA,
  fecha_consulta: "2026-10-05", procedimiento_realizado: "Obturación", motivo_consulta: "Control", creado_en: "2026-10-05T10:00:00Z" };
const plan: FilaPlanOpcion = { id: ID, paciente_id: PACIENTE, clinica_id: CLINICA,
  titulo: "Ortodoncia", estado: "en_proceso", creado_en: "2026-10-04T10:00:00Z" };

function simulado(filas: unknown[] | null, error: unknown = null) {
  const llamadas: unknown[][] = [];
  const respuesta = { data: filas, error };
  const consulta = {
    select(valor: string) { llamadas.push(["select", valor]); return consulta; },
    eq(campo: string, valor: string) { llamadas.push(["eq", campo, valor]); return consulta; },
    in(campo: string, valores: string[]) { llamadas.push(["in", campo, valores]); return consulta; },
    returns() { return consulta; },
    order(campo: string, opciones: object) { llamadas.push(["order", campo, opciones]); return consulta; },
    then(resolve: (valor: typeof respuesta) => unknown, reject: (causa: unknown) => unknown) { return Promise.resolve(respuesta).then(resolve, reject); },
  };
  const cliente = {
    schema(esquema: string) {
      llamadas.push(["schema", esquema]);
      return { from(tabla: string) { llamadas.push(["from", tabla]); return consulta; } };
    },
  } as unknown as SupabaseClient;
  return { cliente, llamadas };
}

function archivo(cambios: Partial<Archivo> = {}): Archivo {
  return { id: SEGUNDO, clinicaId: CLINICA, pacienteId: PACIENTE, nombre: "imagen.jpg", ruta: `${CLINICA}/${PACIENTE}/objeto.jpg`,
    mime: "image/jpeg", tamano: 1, categoria: "clinico", tipoArchivo: "fotografia", descripcion: "", subidoPor: ID,
    creadoEl: "2026-10-05T10:00:00Z", evolucionClinicaId: null, planTratamientoId: null, ...cambios };
}

test("opciones evolución filtran paciente/clínica y piden fecha, creación e id descendentes", async () => {
  const fake = simulado([evolucion, { ...evolucion, id: SEGUNDO, fecha_consulta: "2026-10-04" }]);
  const opciones = await cargarOpcionesEvolucion(PACIENTE, CLINICA, fake.cliente);
  assert.deepEqual(fake.llamadas.slice(-5), [
    ["eq", "paciente_id", PACIENTE], ["eq", "clinica_id", CLINICA],
    ["order", "fecha_consulta", { ascending: false }], ["order", "creado_en", { ascending: false }], ["order", "id", { ascending: false }],
  ]);
  assert.deepEqual(opciones.map((opcion) => opcion.id), [ID, SEGUNDO]);
  assert.match(opciones[0].etiqueta, /Obturación/);
  assert.equal(opciones.some((opcion) => opcion.etiqueta.includes(opcion.id)), false);
});

test("planes se leen sin crear y se ordenan por creación/id; fallback no muestra UUID", async () => {
  const fake = simulado([plan, { ...plan, id: SEGUNDO, titulo: null }]);
  const opciones = await cargarOpcionesPlan(PACIENTE, CLINICA, fake.cliente);
  assert.deepEqual(fake.llamadas.slice(-4), [
    ["eq", "paciente_id", PACIENTE], ["eq", "clinica_id", CLINICA],
    ["order", "creado_en", { ascending: false }], ["order", "id", { ascending: false }],
  ]);
  assert.equal(opciones[0].etiqueta, "Ortodoncia · En proceso");
  assert.match(opciones[1].etiqueta, /^Plan del /);
  assert.equal(opciones[1].etiqueta.includes(SEGUNDO), false);
});

test("errores/null no son lista vacía; UUID inválido no toca red; otro contexto se rechaza", async () => {
  const fake = simulado([]);
  await assert.rejects(cargarOpcionesPlan("p1", CLINICA, fake.cliente), /UUID/);
  assert.deepEqual(fake.llamadas, []);
  for (const cargar of [cargarOpcionesPlan, cargarOpcionesEvolucion]) {
    assert.deepEqual(await cargar(PACIENTE, CLINICA, simulado([]).cliente), []);
    await assert.rejects(cargar(PACIENTE, CLINICA, simulado(null).cliente));
    await assert.rejects(cargar(PACIENTE, CLINICA, simulado([], { message: "RLS" }).cliente));
  }
  await assert.rejects(cargarOpcionesEvolucion(PACIENTE, CLINICA, simulado([{ ...evolucion, paciente_id: SEGUNDO }]).cliente), /contexto/);
});

test("etiquetas usan procedimiento o motivo y fallback de plan", () => {
  assert.match(etiquetaEvolucion({ ...evolucion, procedimiento_realizado: null }), /Control/);
  assert.match(etiquetaEvolucion({ ...evolucion, procedimiento_realizado: null, motivo_consulta: null }), /Atención registrada/);
  assert.equal(etiquetaPlan(plan), "Ortodoncia · En proceso");
});

test("galería general no consulta asociaciones; evolución/plan visibles muestran resumen", async () => {
  const general = simulado([]);
  assert.deepEqual(await cargarResumenesAsociaciones([archivo()], general.cliente), {});
  assert.deepEqual(general.llamadas, []);
  const consulta = await cargarResumenesAsociaciones([archivo({ evolucionClinicaId: ID })], simulado([evolucion]).cliente);
  assert.match(consulta[SEGUNDO], /^Consulta: .*Obturación$/);
  assert.equal(consulta[SEGUNDO].includes(ID), false);
  const tratamiento = await cargarResumenesAsociaciones([archivo({ planTratamientoId: ID })], simulado([plan]).cliente);
  assert.equal(tratamiento[SEGUNDO], "Plan de tratamiento: Ortodoncia");
});

test("asociación invisible/error mantiene archivo y muestra texto neutro", async () => {
  const original = archivo({ evolucionClinicaId: ID });
  for (const fake of [simulado([]), simulado(null), simulado([], { message: "denegado" })]) {
    assert.deepEqual(await cargarResumenesAsociaciones([original], fake.cliente), { [SEGUNDO]: ASOCIACION_NO_DISPONIBLE });
    assert.equal(original.evolucionClinicaId, ID);
  }
});

test("selector solo ofrece asociaciones al equipo real activo, no a portal", async () => {
  for (const rol of ["odontologo", "recepcionista", "superadmin", "paciente"]) {
    const filtros: unknown[][] = [];
    const consulta = {
      select() { return consulta; },
      eq(campo: string, valor: unknown) { filtros.push([campo, valor]); return consulta; },
      async maybeSingle() { return { data: { id: ID, auth_user_id: SEGUNDO, activo: true, rol }, error: null }; },
    };
    const cliente = {
      auth: { async getUser() { return { data: { user: { id: SEGUNDO } }, error: null }; } },
      schema(esquema: string) {
        assert.equal(esquema, "public");
        return { from(tabla: string) { assert.equal(tabla, "perfiles"); return consulta; } };
      },
    } as unknown as SupabaseClient;
    assert.equal(await puedeElegirAsociacion(ID, cliente), rol !== "paciente");
    assert.deepEqual(filtros, [["id", ID], ["auth_user_id", SEGUNDO], ["activo", true]]);
  }
});

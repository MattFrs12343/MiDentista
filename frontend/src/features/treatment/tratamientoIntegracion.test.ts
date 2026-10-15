/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { esTabValida } from "../patients/tabValue.ts";
import { obtenerPacienteTratamiento } from "./pacienteTratamientoService.ts";
import { crearContextoPacienteTratamiento } from "./pacienteTratamientoControlador.ts";
import { parametrosPlanFicha, resolverPlanFicha, seleccionUrlResuelta, datosPertenecenFicha } from "./tratamientoIntegracion.ts";
import { crearControladorPlanes } from "./planesTratamientoControlador.ts";
import { crearControladorListaDiagnosticos } from "./diagnosticosListaControlador.ts";
import { crearControladorProcedimientos } from "./procedimientosControlador.ts";
import type { PacienteTratamiento } from "./pacienteTratamientoService.ts";
import type { DiagnosticoPaciente, PlanTratamientoPaciente, ProcedimientoTratamiento } from "./tipos.ts";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc", ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const perfil = { id: B, clinicaId: C, rol: "odontologo", activo: true };
const fila = { id: A, clinica_id: C, nombre_completo: "Paciente A real", nombres: "Paciente", apellidos: "A real",
  ci: "123", fecha_nacimiento: "2000-05-01", genero: "F", telefono: "777", email: "paciente@test", direccion: "Dirección real", creado_en: "2026-10-12T12:00:00Z" };
const plan: PlanTratamientoPaciente = { id: ID, clinicaId: C, pacienteId: A, odontologoId: B, titulo: "Plan A", estado: "propuesto", notas: "Notas reales",
  costoTotal: 999, creadoEn: "2026-10-12T12:00:00Z", actualizadoEn: "2026-10-12T13:00:00Z" };
const diagnostico: DiagnosticoPaciente = { id: ID, clinicaId: C, pacienteId: A, odontologoId: B, descripcion: "Diagnóstico real", numeroPieza: 11,
  observaciones: "Control", estado: "activo", fechaDiagnostico: "2026-10-12", creadoEn: plan.creadoEn, actualizadoEn: plan.actualizadoEn };
function cliente(opciones: { data?: unknown; error?: unknown; rechazo?: boolean } = {}) {
  const filtros: unknown[] = []; let consultas = 0;
  const q = { select(columnas: string) { assert.match(columnas, /nombre_completo,nombres,apellidos/); return q; },
    eq(campo: string, valor: unknown) { filtros.push([campo, valor]); return q; },
    single() { return opciones.rechazo ? Promise.reject(new Error("Sin red")) : Promise.resolve({ data: "data" in opciones ? opciones.data : fila, error: opciones.error ?? null }); },
  };
  return { filtros, consultas: () => consultas, supabase: { schema(nombre: string) { assert.equal(nombre, "public");
    return { from(tabla: string) { assert.equal(tabla, "pacientes"); consultas++; return q; } }; } } as unknown as SupabaseClient };
}
function diferido<T>() { let resolver!: (valor: T) => void; const promesa = new Promise<T>((resolve) => { resolver = resolve; }); return { resolver, promesa }; }
async function pacienteReal() { return obtenerPacienteTratamiento(A, perfil, cliente().supabase); }
function contexto(servicios?: Parameters<typeof crearContextoPacienteTratamiento>[1], cambios = {}) {
  const c = crearContextoPacienteTratamiento({ pacienteId: A, email: "autor@test", rol: "odontologo", habilitado: true, ...cambios },
    servicios ?? { perfil: async () => perfil, paciente: async () => pacienteReal() }); c.activar(); return c;
}
test("T-5.9 contexto paciente hace solo SELECT por id/clínica y conserva datos reales", async () => {
  const c = cliente(); const resultado = await obtenerPacienteTratamiento(A, perfil, c.supabase);
  assert.deepEqual(c.filtros, [["id", A], ["activo", true], ["clinica_id", C]]); assert.equal(c.consultas(), 1);
  assert.equal(resultado.paciente.nombres, "Paciente"); assert.equal(resultado.paciente.apellidos, "A real");
  assert.equal(resultado.paciente.fechaNacimiento, fila.fecha_nacimiento); assert.equal(resultado.clinicaId, C);
  assert.equal(resultado.paciente.ci, "123");
});
test("T-5.9 UUID/permisos se validan antes de consultar paciente", async () => {
  const c = cliente(); await assert.rejects(obtenerPacienteTratamiento("p1", perfil, c.supabase));
  for (const p of [{ ...perfil, rol: "paciente" }, { ...perfil, activo: false }, { ...perfil, rol: "desconocido" }]) await assert.rejects(obtenerPacienteTratamiento(A, p, c.supabase));
  assert.equal(c.consultas(), 0);
});
test("T-5.9 paciente invisible, error o respuesta ajena no permiten imprimir ni montar ficha", async () => {
  for (const c of [cliente({ data: null }), cliente({ error: { message: "RLS" } }), cliente({ rechazo: true }),
    cliente({ data: { ...fila, id: B } }), cliente({ data: { ...fila, clinica_id: B } })]) await assert.rejects(obtenerPacienteTratamiento(A, perfil, c.supabase));
});
test("T-5.9 lectura real de recepción y auditoría conserva RLS/contexto", async () => {
  const recepcion = cliente(); await obtenerPacienteTratamiento(A, { ...perfil, rol: "recepcionista" }, recepcion.supabase);
  assert.deepEqual(recepcion.filtros, [["id", A], ["activo", true], ["clinica_id", C]]);
  const auditor = cliente(); const p = await obtenerPacienteTratamiento(A, { ...perfil, rol: "superadmin", clinicaId: null }, auditor.supabase);
  assert.deepEqual(auditor.filtros, [["id", A], ["activo", true]]); assert.equal(p.clinicaId, C);
});
test("T-5.9 contexto distingue loading/error/reintento y no usa paciente viejo", async () => {
  const pendiente = diferido<PacienteTratamiento>(); let numero = 0;
  const c = contexto({ perfil: async () => perfil, paciente: async () => { if (++numero === 1) throw new Error("Sin red"); return pendiente.promesa; } });
  assert.equal(c.obtener().estado, "loading"); await c.cargar(); assert.equal(c.obtener().estado, "error");
  assert.equal(c.obtener().datos, null); const carga = c.cargar(); assert.equal(c.obtener().estado, "loading");
  pendiente.resolver(await pacienteReal()); await carga; assert.equal(c.obtener().estado, "success"); assert.equal(c.obtener().datos?.paciente.id, A);
});
test("T-5.9 cambiar paciente/sesión descarta respuestas tardías de contexto", async () => {
  const pendiente = diferido<PacienteTratamiento>(); const anterior = contexto({ perfil: async () => perfil, paciente: async () => pendiente.promesa });
  const carga = anterior.cargar(); await Promise.resolve(); anterior.desactivar();
  const datosB = { ...(await pacienteReal()), paciente: { ...(await pacienteReal()).paciente, id: B, nombres: "Paciente B" } };
  const actual = contexto({ perfil: async () => perfil, paciente: async () => datosB }, { pacienteId: B, email: "otra@test" });
  await actual.cargar(); pendiente.resolver(await pacienteReal()); await carga;
  assert.equal(anterior.obtener().datos, null); assert.equal(actual.obtener().datos?.paciente.id, B);
});
test("T-5.9 otra pestaña o sesión paciente no inicia consultas del contexto", async () => {
  let lecturas = 0;
  for (const cambio of [{ habilitado: false }, { rol: "paciente" }, { email: "" }]) {
    const c = contexto({ perfil: async () => { lecturas++; return perfil; }, paciente: async () => pacienteReal() }, cambio);
    await c.cargar(); assert.equal(c.obtener().datos, null);
  }
  assert.equal(lecturas, 0);
});
test("T-5.9 tab tratamiento y selección manual persisten en URL tras F5", () => {
  assert.equal(esTabValida("tratamiento"), true);
  const url = parametrosPlanFicha(new URLSearchParams("tab=tratamiento&print=1&extra=x"), ID);
  const trasF5 = new URLSearchParams(url.toString());
  assert.equal(trasF5.get("tab"), "tratamiento"); assert.equal(trasF5.get("plan"), ID); assert.equal(trasF5.get("extra"), "x");
  assert.deepEqual(resolverPlanFicha(trasF5.get("plan"), A, [plan]), { estado: "visible", id: ID });
  const sinPlan = parametrosPlanFicha(trasF5, null); assert.equal(sinPlan.get("plan"), null); assert.equal(sinPlan.get("tab"), "tratamiento");
});
test("T-5.9 plan URL debe ser UUID y pertenecer al paciente visible", () => {
  assert.equal(resolverPlanFicha("p1", A, [plan]).estado, "invalido");
  assert.equal(resolverPlanFicha(B, A, [plan]).estado, "no_visible");
  assert.equal(resolverPlanFicha(ID, B, [plan]).estado, "no_visible");
  assert.equal(resolverPlanFicha(ID.toUpperCase(), A, [plan]).id, ID);
  assert.equal(resolverPlanFicha(null, A, [plan]).estado, "sin_plan");
});
test("T-5.9 impresión espera que el plan URL esté seleccionado y rechaza datos ajenos", () => {
  assert.equal(seleccionUrlResuelta(ID, A, [plan], null), false);
  assert.equal(seleccionUrlResuelta(ID, A, [plan], ID), true);
  assert.equal(seleccionUrlResuelta(B, A, [plan], ID), false);
  assert.equal(seleccionUrlResuelta(null, A, [plan], ID), false);
  assert.equal(seleccionUrlResuelta(null, A, [plan], null), true);
  assert.equal(datosPertenecenFicha(A, [diagnostico], plan, C), true);
  assert.equal(datosPertenecenFicha(B, [diagnostico], plan, C), false);
  assert.equal(datosPertenecenFicha(A, [{ ...diagnostico, clinicaId: B }], plan, C), false);
});
function planesControlador(fallar = false) {
  let escrituras = 0;
  const escribir = async () => { escrituras++; return plan; };
  const c = crearControladorPlanes({ pacienteId: A, email: "autor@test", rol: "odontologo" }, {
    obtener: async () => plan,
    perfil: async () => perfil, listar: async () => { if (fallar) throw new Error("Error planes"); return [plan]; },
    crear: escribir, notas: escribir, titulo: escribir, cambiarEstado: escribir,
  }); c.activar(); return { c, escrituras: () => escrituras };
}
test("T-5.9 montar lecturas y seleccionar plan no crea ni modifica registros", async () => {
  const ctx = contexto(); const { c, escrituras } = planesControlador();
  const d = crearControladorListaDiagnosticos({ pacienteId: A, email: "autor@test", rol: "odontologo" }, { obtenerPerfil: async () => perfil, listar: async () => [diagnostico] }); d.activar();
  await Promise.all([ctx.cargar(), c.cargar(), d.cargar()]); c.seleccionar(ID);
  assert.equal(escrituras(), 0); assert.equal(c.obtener().seleccionadoId, ID);
});
test("T-5.9 errores de diagnóstico/planes/procedimientos permanecen independientes", async () => {
  const d = crearControladorListaDiagnosticos({ pacienteId: A, email: "autor@test", rol: "odontologo" }, { obtenerPerfil: async () => perfil, listar: async () => { throw new Error("Error diagnóstico"); } }); d.activar();
  const { c } = planesControlador(); await Promise.all([d.cargar(), c.cargar()]); c.seleccionar(ID);
  const proc = crearControladorProcedimientos(plan, perfil, { listar: async () => { throw new Error("Error procedimiento"); },
    crear: async () => { throw new Error("No escribir"); }, actualizar: async () => { throw new Error("No escribir"); }, eliminar: async () => { throw new Error("No escribir"); } }); proc.activar(); await proc.cargar();
  assert.equal(d.obtener().estado, "error"); assert.equal(c.obtener().estado, "success"); assert.equal(c.obtener().seleccionadoId, ID);
  assert.equal(proc.obtener().estado, "error");
  const dCorrecto = crearControladorListaDiagnosticos({ pacienteId: A, email: "autor@test", rol: "odontologo" }, { obtenerPerfil: async () => perfil, listar: async () => [diagnostico] }); dCorrecto.activar();
  const fallo = planesControlador(true); await Promise.all([dCorrecto.cargar(), fallo.c.cargar()]);
  assert.equal(dCorrecto.obtener().diagnosticos[0].id, ID); assert.equal(fallo.c.obtener().estado, "error");
});
test("T-5.9 seleccionar otro plan consulta solo sus procedimientos y descarta carga anterior", async () => {
  const pendiente = diferido<ProcedimientoTratamiento[]>(); const consultas: string[] = [];
  const servicios = { listar: async (id: string) => { consultas.push(id); return id === ID ? pendiente.promesa : []; },
    crear: async (): Promise<ProcedimientoTratamiento> => { throw new Error("No escribir"); }, actualizar: async (): Promise<ProcedimientoTratamiento> => { throw new Error("No escribir"); }, eliminar: async (): Promise<ProcedimientoTratamiento> => { throw new Error("No escribir"); } };
  const anterior = crearControladorProcedimientos(plan, perfil, servicios); anterior.activar(); const carga = anterior.cargar(); anterior.desactivar();
  const nuevo = crearControladorProcedimientos({ ...plan, id: B }, perfil, servicios); nuevo.activar(); await nuevo.cargar();
  pendiente.resolver([]); await carga;
  assert.deepEqual(consultas, [ID, B]); assert.equal(anterior.obtener().estado, "loading"); assert.equal(nuevo.obtener().estado, "success");
});
test("T-5.9 contexto UUID inválido no consulta Auth ni paciente", async () => {
  let consultas = 0;
  const c = contexto({ perfil: async () => { consultas++; return perfil; }, paciente: async () => { consultas++; return pacienteReal(); } }, { pacienteId: "p1" });
  await c.cargar(); assert.equal(c.obtener().estado, "error"); assert.equal(consultas, 0);
});
test("T-5.9 remontaje invalida contexto pendiente y realiza carga vigente", async () => {
  const pendiente = diferido<PacienteTratamiento>(); let lecturas = 0;
  const vigente = diferido<PacienteTratamiento>();
  const c = contexto({ perfil: async () => perfil, paciente: async () => ++lecturas === 1 ? pendiente.promesa : vigente.promesa });
  const carga = c.cargar(); await Promise.resolve(); c.desactivar(); c.activar(); void c.cargar();
  pendiente.resolver(await pacienteReal()); await carga;
  const recarga = c.cargar(); vigente.resolver(await pacienteReal()); await recarga;
  assert.equal(c.obtener().estado, "success"); assert.equal(c.obtener().datos?.paciente.id, A); assert.equal(lecturas, 2);
});

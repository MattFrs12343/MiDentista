/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import { crearControladorProcedimientos, type ServiciosProcedimientos } from "./procedimientosControlador.ts";
import { crearFormularioProcedimiento, procedimientoDesdeBorrador } from "./procedimientoFormulario.ts";
import { puedeEditarProcedimiento, puedeEscribirProcedimientos } from "./procedimientoPermisos.ts";
import type { PerfilDiagnosticos, PlanTratamientoPaciente, ProcedimientoTratamiento } from "./tipos.ts";

const ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PLAN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CLINICA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const AUTOR = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const perfil: PerfilDiagnosticos = { id: AUTOR, clinicaId: CLINICA, rol: "odontologo", activo: true };
const plan: PlanTratamientoPaciente = { id: PLAN, pacienteId: ID, clinicaId: CLINICA, odontologoId: AUTOR,
  titulo: "Plan real", notas: "", estado: "propuesto", costoTotal: 500, creadoEn: null, actualizadoEn: null };
const p: ProcedimientoTratamiento = { id: ID, planTratamientoId: PLAN, clinicaId: CLINICA, servicioId: null,
  descripcion: "Endodoncia", numeroPieza: 46, prioridad: "urgente", costo: 125.5, estado: "pendiente",
  creadoEn: "2026-10-11T10:00:00Z", actualizadoEn: "2026-10-11T12:00:00Z" };
const contenido = { descripcion: p.descripcion, numeroPieza: p.numeroPieza, prioridad: p.prioridad, costo: p.costo, estado: p.estado };
function preparar(cambios: Partial<ServiciosProcedimientos> = {}, seleccionado: PlanTratamientoPaciente | null = plan, usuario = perfil) {
  const llamadas: string[] = [];
  const servicios: ServiciosProcedimientos = {
    listar: async () => { llamadas.push("listar"); return [p]; },
    crear: async (_destino, datos) => { llamadas.push("crear"); return { ...p, ...datos, id: AUTOR, estado: "pendiente" }; },
    actualizar: async (id, _destino, datos) => { llamadas.push("actualizar"); return { ...p, ...datos, id }; },
    eliminar: async () => { llamadas.push("eliminar"); return p; }, ...cambios,
  };
  const controlador = crearControladorProcedimientos(seleccionado, usuario, servicios);
  controlador.activar();
  return { controlador, llamadas };
}
function diferido<T>() {
  let resolver!: (valor: T) => void;
  const promesa = new Promise<T>((resolve) => { resolver = resolve; });
  return { promesa, resolver };
}

test("sin plan seleccionado no carga ni permite altas", async () => {
  const { controlador, llamadas } = preparar({}, null);
  await controlador.cargar(); assert.equal(controlador.obtener().estado, "idle");
  assert.deepEqual(llamadas, []);
  await assert.rejects(controlador.crear(contenido), /plan seleccionado/);
});

test("CRUD reconcilia la lista confirmada sin F5 ni recargas y sin alterar costo/estado del plan", async () => {
  const { controlador, llamadas } = preparar();
  await controlador.cargar();
  await controlador.crear({ ...contenido, descripcion: "Obturación" });
  assert.equal(controlador.obtener().procedimientos.length, 2);
  await controlador.actualizar(ID, { ...contenido, prioridad: "baja", estado: "completado" });
  const editado = controlador.obtener().procedimientos.find((fila) => fila.id === ID)!;
  assert.equal(editado.prioridad, "baja"); assert.equal(editado.estado, "completado");
  controlador.solicitarEliminar(ID); await controlador.eliminar(ID);
  assert.deepEqual(controlador.obtener().procedimientos.map((fila) => fila.id), [AUTOR]);
  assert.deepEqual(llamadas, ["listar", "crear", "actualizar", "eliminar"]);
  assert.equal(plan.costoTotal, 500); assert.equal(plan.estado, "propuesto");
});

test("eliminar exige confirmación y cancelación impide enviar DELETE", async () => {
  const { controlador, llamadas } = preparar(); await controlador.cargar();
  await assert.rejects(controlador.eliminar(ID), /Confirma/);
  controlador.solicitarEliminar(ID); assert.equal(controlador.obtener().confirmacionId, ID);
  controlador.cancelarEliminar(); await assert.rejects(controlador.eliminar(ID), /Confirma/);
  assert.deepEqual(llamadas, ["listar"]);
});

test("eliminación no optimista conserva fila/confirmación si falla, y solo retira después de respuesta", async () => {
  const pendiente = diferido<ProcedimientoTratamiento>();
  const { controlador } = preparar({ eliminar: async () => pendiente.promesa }); await controlador.cargar();
  controlador.solicitarEliminar(ID); const borrado = controlador.eliminar(ID);
  assert.equal(controlador.obtener().procedimientos.length, 1);
  pendiente.resolver(p); await borrado; assert.equal(controlador.obtener().procedimientos.length, 0);
  const fallo = preparar({ eliminar: async () => { throw new Error("Cero filas afectadas"); } });
  await fallo.controlador.cargar(); fallo.controlador.solicitarEliminar(ID);
  await assert.rejects(fallo.controlador.eliminar(ID), /Cero filas/);
  assert.equal(fallo.controlador.obtener().procedimientos.length, 1);
  assert.equal(fallo.controlador.obtener().confirmacionId, ID); assert.match(fallo.controlador.obtener().error!, /Cero filas/);
});

test("permisos autor/plan/clínica: colega, recepción y superadmin leen sin poder escribir", async () => {
  assert.equal(puedeEscribirProcedimientos(perfil, plan), true); assert.equal(puedeEditarProcedimiento(perfil, plan, p), true);
  for (const usuario of [{ ...perfil, rol: "recepcionista" }, { ...perfil, rol: "superadmin", clinicaId: null },
    { ...perfil, id: ID }, { ...perfil, activo: false }, { ...perfil, clinicaId: ID }]) {
    assert.equal(puedeEscribirProcedimientos(usuario, plan), false);
    const { controlador } = preparar({}, plan, usuario); await controlador.cargar();
    await assert.rejects(controlador.crear(contenido));
    await assert.rejects(controlador.actualizar(ID, contenido));
    assert.throws(() => controlador.solicitarEliminar(ID));
  }
  assert.equal(puedeEditarProcedimiento(perfil, plan, { ...p, planTratamientoId: ID }), false);
});

test("error de lectura permite reintento y cero filas confirmado habilita creación explícita", async () => {
  let llamadas = 0;
  const { controlador } = preparar({ listar: async () => { if (++llamadas === 1) throw new Error("Sin conexión"); return []; } });
  await controlador.cargar(); assert.equal(controlador.obtener().estado, "error");
  await assert.rejects(controlador.crear(contenido), /lectura/);
  await controlador.cargar(); assert.equal(controlador.obtener().estado, "success");
  assert.deepEqual(controlador.obtener().procedimientos, []);
  await controlador.crear(contenido); assert.equal(controlador.obtener().procedimientos.length, 1);
});

test("cambio de plan descarta lectura tardía y confirma únicamente filas del plan nuevo", async () => {
  const pendiente = diferido<ProcedimientoTratamiento[]>();
  const anterior = preparar({ listar: async () => pendiente.promesa });
  const carga = anterior.controlador.cargar(); anterior.controlador.desactivar();
  const siguiente = preparar({ listar: async () => [{ ...p, planTratamientoId: AUTOR }] }, { ...plan, id: AUTOR });
  await siguiente.controlador.cargar(); pendiente.resolver([p]); await carga;
  assert.deepEqual(anterior.controlador.obtener().procedimientos, []);
  assert.equal(siguiente.controlador.obtener().procedimientos[0].planTratamientoId, AUTOR);
});

test("respuesta tardía de guardado/eliminación no publica éxito en otro plan", async () => {
  for (const operacion of ["crear", "eliminar"] as const) {
    const pendiente = diferido<ProcedimientoTratamiento>();
    const { controlador } = preparar({ [operacion]: async () => pendiente.promesa }); await controlador.cargar();
    if (operacion === "eliminar") controlador.solicitarEliminar(ID);
    const envio = operacion === "crear" ? controlador.crear(contenido) : controlador.eliminar(ID);
    controlador.desactivar(); pendiente.resolver(p);
    await assert.rejects(envio, /cambió/);
    assert.equal(controlador.obtener().procedimientos.length, 1); assert.equal(controlador.obtener().mensaje, "");
  }
});

test("bloquea escrituras simultáneas y no acepta id de otro plan ni respuesta ajena", async () => {
  const pendiente = diferido<ProcedimientoTratamiento>();
  const { controlador } = preparar({ actualizar: async () => pendiente.promesa }); await controlador.cargar();
  await assert.rejects(controlador.actualizar(AUTOR, contenido), /no pertenece/);
  const guardar = controlador.actualizar(ID, contenido);
  await assert.rejects(controlador.crear(contenido), /en curso/);
  assert.throws(() => controlador.solicitarEliminar(ID), /en curso/);
  pendiente.resolver({ ...p, planTratamientoId: AUTOR }); await assert.rejects(guardar, /no corresponde/);
  assert.equal(controlador.obtener().procedimientos[0].planTratamientoId, PLAN);
});

test("StrictMode invalida lectura anterior y recupera la nueva generación", async () => {
  const pendiente = diferido<ProcedimientoTratamiento[]>(); let veces = 0;
  const { controlador } = preparar({ listar: async () => ++veces === 1 ? pendiente.promesa : [p] });
  const carga = controlador.cargar(); controlador.desactivar(); controlador.activar(); void controlador.cargar();
  pendiente.resolver([]); await carga; await controlador.cargar();
  assert.equal(controlador.obtener().estado, "success"); assert.equal(controlador.obtener().procedimientos.length, 1);
});

test("formulario conserva campos ante fallo y limpia creación solo tras éxito", async () => {
  const form = crearFormularioProcedimiento();
  form.cambiar("descripcion", "Endodoncia"); form.cambiar("pieza", "46"); form.cambiar("costo", "125,50"); form.cambiar("prioridad", "urgente");
  await form.enviar(async () => { throw new Error("Sin permiso"); });
  assert.equal(form.obtener().descripcion, "Endodoncia"); assert.equal(form.obtener().costo, "125,50");
  assert.match(form.obtener().error, /Sin permiso/);
  await form.enviar(async (datos) => { assert.equal(datos.prioridad, "urgente"); assert.equal(datos.costo, 125.5); return p; });
  assert.equal(form.obtener().descripcion, ""); assert.equal(form.obtener().costo, ""); assert.equal(form.obtener().estado, "pendiente");
});

test("formulario valida FDI/costo/UUID/descripcion antes de red y fuerza pendiente al crear", async () => {
  const b = { descripcion: "Endodoncia", pieza: "54", costo: "0", prioridad: "urgente", estado: "pendiente", servicioId: "" } as const;
  assert.equal(procedimientoDesdeBorrador(b).numeroPieza, 54);
  for (const cambio of [{ descripcion: " " }, { pieza: "19" }, { pieza: "1e1" }, { costo: "" }, { costo: "-1" }, { costo: "NaN" }, { costo: "1.001" }]) {
    assert.throws(() => procedimientoDesdeBorrador({ ...b, ...cambio }));
  }
  const form = crearFormularioProcedimiento();
  form.cambiar("descripcion", "Endodoncia"); form.cambiar("costo", "0"); form.cambiar("servicioId", "s1");
  let envios = 0;
  await form.enviar(async () => { envios++; return p; }); assert.equal(envios, 0);
  form.cambiar("servicioId", ""); form.cambiar("estado", "completado");
  await form.enviar(async (datos) => { assert.equal(datos.estado, "pendiente"); return p; });
});

test("edición precarga urgente y los datos reales; error/NULL no limpian; éxito conserva respuesta confirmada", async () => {
  const form = crearFormularioProcedimiento(p);
  assert.equal(form.obtener().prioridad, "urgente"); assert.equal(form.obtener().costo, "125.50"); assert.equal(form.obtener().pieza, "46");
  form.cambiar("estado", "completado"); form.cambiar("prioridad", "baja");
  await form.enviar(async () => null as unknown as ProcedimientoTratamiento);
  assert.equal(form.obtener().estado, "completado"); assert.match(form.obtener().error, /No se confirmó/);
  await form.enviar(async (datos) => ({ ...p, ...datos }));
  assert.equal(form.obtener().estado, "completado"); assert.equal(form.obtener().prioridad, "baja");
});

test("formulario bloquea doble envío y descarta respuesta al desmontar por cambio de plan", async () => {
  const pendiente = diferido<ProcedimientoTratamiento>(); const form = crearFormularioProcedimiento(p);
  const envio = form.enviar(async () => pendiente.promesa);
  assert.equal(await form.enviar(async () => p), false);
  form.desactivar(); pendiente.resolver(p); assert.equal(await envio, false);
  assert.equal(form.obtener().mensaje, "");
});

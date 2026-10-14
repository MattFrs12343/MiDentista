/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import { crearControladorPlanes, type ServiciosPlanes } from "./planesTratamientoControlador.ts";
import { crearFormularioPlan } from "./planTratamientoFormulario.ts";
import { puedeCrearPlan, puedeEditarPlan } from "./planTratamientoPermisos.ts";
import type { PerfilDiagnosticos, PlanTratamientoPaciente } from "./tipos.ts";

const ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PACIENTE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CLINICA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const AUTOR = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const perfil: PerfilDiagnosticos = { id: AUTOR, clinicaId: CLINICA, rol: "odontologo", activo: true };
const plan: PlanTratamientoPaciente = { id: ID, pacienteId: PACIENTE, clinicaId: CLINICA, odontologoId: AUTOR,
  titulo: "Plan uno", notas: "Notas del primero", estado: "aceptado", costoTotal: 100,
  creadoEn: "2026-10-11T10:00:00Z", actualizadoEn: "2026-10-11T12:00:00Z" };
const otro = { ...plan, id: AUTOR, titulo: "Plan dos", notas: "Notas del segundo" };
function preparar(cambios: Partial<ServiciosPlanes> = {}, pacienteId = PACIENTE) {
  const llamadas: string[] = [];
  const servicios: ServiciosPlanes = { perfil: async () => perfil,
    obtener: async (id) => ({ ...plan, id }),
    listar: async () => { llamadas.push("listar"); return [plan, otro]; },
    crear: async (_destino, datos) => { llamadas.push("crear"); return { ...plan, ...datos, estado: "propuesto" }; },
    titulo: async (id, _destino, titulo) => { llamadas.push(id); return { ...plan, id, titulo }; },
    notas: async (id, _destino, notas) => { llamadas.push(id); return { ...plan, id, notas }; },
    cambiarEstado: async (id, _destino, _anterior, nuevo) => ({ ...plan, id, estado: nuevo }), ...cambios };
  const controlador = crearControladorPlanes({ pacienteId, email: "autor@clinica.test", rol: "odontologo" }, servicios);
  controlador.activar();
  return { controlador, llamadas };
}
function diferido<T>() {
  let resolver!: (valor: T) => void;
  const promesa = new Promise<T>((resolve) => { resolver = resolve; });
  return { promesa, resolver };
}

test("abrir ficha lista múltiples planes sin seleccionar último ni crear", async () => {
  const { controlador, llamadas } = preparar();
  await controlador.cargar();
  assert.equal(controlador.obtener().estado, "success");
  assert.equal(controlador.obtener().planes.length, 2);
  assert.equal(controlador.obtener().seleccionadoId, null);
  assert.deepEqual(llamadas, ["listar"]);
  controlador.seleccionar(otro.id);
  assert.equal(controlador.obtener().seleccionadoId, otro.id);
  await controlador.guardarNotas("Notas nuevas");
  assert.equal(llamadas[1], otro.id);
  assert.equal(controlador.obtener().planes.find((p) => p.id === ID)?.notas, plan.notas);
  assert.equal(controlador.obtener().planes.find((p) => p.id === otro.id)?.notas, "Notas nuevas");
  assert.throws(() => controlador.seleccionar(PACIENTE), /no está/);
});

test("0 filas y error conservan ramas distintas y no desencadenan creación", async () => {
  const vacio = preparar({ listar: async () => [] });
  await vacio.controlador.cargar(); assert.equal(vacio.controlador.obtener().estado, "success");
  const fallo = preparar({ listar: async () => { throw new Error("Sin conexión"); } });
  await fallo.controlador.cargar(); assert.equal(fallo.controlador.obtener().estado, "error");
  assert.match(fallo.controlador.obtener().error!, /Sin conexión/);
  await assert.rejects(fallo.controlador.crear({ titulo: "Plan", notas: "" }), /lectura/);
  assert.deepEqual(fallo.llamadas, []);
});

test("crear requiere acción explícita y selecciona la fila confirmada", async () => {
  const { controlador, llamadas } = preparar();
  await controlador.cargar();
  const creado = await controlador.crear({ titulo: "Nuevo", notas: "Notas nuevas" });
  assert.equal(creado.estado, "propuesto"); assert.equal(controlador.obtener().seleccionadoId, creado.id);
  assert.deepEqual(llamadas, ["listar", "crear"]);
});

test("permisos por perfil real y autor; recepción, superadmin y colega no editan planes ajenos", async () => {
  assert.equal(puedeCrearPlan(perfil), true); assert.equal(puedeEditarPlan(perfil, plan), true);
  for (const p of [{ ...perfil, rol: "recepcionista" }, { ...perfil, rol: "superadmin", clinicaId: null },
    { ...perfil, id: PACIENTE }, { ...perfil, activo: false }, { ...perfil, clinicaId: PACIENTE }]) {
    assert.equal(puedeEditarPlan(p, plan), false);
    const { controlador } = preparar({ perfil: async () => p });
    await controlador.cargar();
    if (controlador.obtener().estado === "success") {
      controlador.seleccionar(ID);
      await assert.rejects(controlador.guardarTitulo("Otro"), /autor/);
      if (p.rol !== "odontologo") await assert.rejects(controlador.crear({ titulo: "Nuevo", notas: "" }), /autor/);
    }
  }
});

test("bloquea doble escritura, selección y recarga durante guardado", async () => {
  const pendiente = diferido<PlanTratamientoPaciente>();
  const { controlador } = preparar({ notas: async () => pendiente.promesa });
  await controlador.cargar(); controlador.seleccionar(ID);
  const guardado = controlador.guardarNotas("Nuevo");
  await assert.rejects(controlador.guardarNotas("Segundo"), /en curso/);
  assert.throws(() => controlador.seleccionar(otro.id), /termine/);
  await controlador.cargar(); assert.equal(controlador.obtener().estado, "success");
  pendiente.resolver({ ...plan, notas: "Nuevo" }); await guardado;
  assert.equal(controlador.obtener().guardando, false);
});

test("cambio de paciente descarta lectura tardía y no muestra selección ni notas previas", async () => {
  const pendiente = diferido<PlanTratamientoPaciente[]>();
  const anterior = preparar({ listar: async () => pendiente.promesa });
  const carga = anterior.controlador.cargar(); await Promise.resolve();
  anterior.controlador.desactivar();
  const actual = preparar({ listar: async () => [] }, AUTOR); await actual.controlador.cargar();
  pendiente.resolver([plan]); await carga;
  assert.equal(anterior.controlador.obtener().estado, "loading");
  assert.deepEqual(actual.controlador.obtener().planes, []); assert.equal(actual.controlador.obtener().seleccionadoId, null);
});

test("escritura tardía no reconcilia ni anuncia éxito al cambiar ficha/sesión", async () => {
  const pendiente = diferido<PlanTratamientoPaciente>();
  const { controlador } = preparar({ crear: async () => pendiente.promesa });
  await controlador.cargar();
  const guardar = controlador.crear({ titulo: "Tardío", notas: "" });
  controlador.desactivar(); pendiente.resolver({ ...plan, titulo: "Tardío" });
  await assert.rejects(guardar, /cambió/);
  assert.equal(controlador.obtener().planes.find((p) => p.id === ID)?.titulo, "Plan uno");
});

test("remontaje StrictMode reintenta lectura invalidada sin quedar en loading", async () => {
  const pendiente = diferido<PlanTratamientoPaciente[]>();
  let numero = 0;
  const { controlador } = preparar({ listar: async () => ++numero === 1 ? pendiente.promesa : [plan] });
  const carga = controlador.cargar(); await Promise.resolve();
  controlador.desactivar(); controlador.activar(); void controlador.cargar();
  pendiente.resolver([otro]); await carga;
  await controlador.cargar();
  assert.equal(controlador.obtener().estado, "success"); assert.equal(controlador.obtener().planes[0].id, ID);
});

test("formulario precarga notas reales y sincroniza cargas sin borrar borrador del otro campo", () => {
  const form = crearFormularioPlan({ titulo: plan.titulo!, notas: plan.notas });
  assert.equal(form.obtener().notas, plan.notas);
  form.cambiar("notas", "Borrador sin guardar");
  form.sincronizar({ titulo: "Título confirmado", notas: plan.notas });
  assert.equal(form.obtener().notas, "Borrador sin guardar");
  form.sincronizar({ titulo: otro.titulo!, notas: otro.notas });
  assert.equal(form.obtener().notas, otro.notas);
});

test("formulario falla sin limpiar; creación limpia solo tras éxito confirmado; título vacío no envía", async () => {
  const form = crearFormularioPlan({ titulo: "Plan", notas: "Notas" });
  assert.equal(await form.enviar("crear", async () => { throw new Error("Sin permiso"); }), false);
  assert.equal(form.obtener().titulo, "Plan"); assert.equal(form.obtener().notas, "Notas");
  assert.match(form.obtener().error, /Sin permiso/);
  await form.enviar("crear", async (datos) => datos);
  assert.equal(form.obtener().titulo, ""); assert.equal(form.obtener().notas, "");
  let llamadas = 0;
  await form.enviar("crear", async (datos) => { llamadas++; return datos; });
  assert.equal(llamadas, 0); assert.match(form.obtener().error, /título/);
});

test("guardar título conserva notas no enviadas; ninguna sincronización guarda por sí sola", async () => {
  const form = crearFormularioPlan({ titulo: "Título", notas: "Originales" });
  form.cambiar("notas", "Borrador");
  await form.enviar("titulo", async () => ({ titulo: "Confirmado", notas: "Originales" }));
  assert.equal(form.obtener().titulo, "Confirmado"); assert.equal(form.obtener().notas, "Borrador");
  await form.enviar("notas", async (datos) => ({ ...datos, notas: "Borrador" }));
  assert.equal(form.obtener().notas, "Borrador");
});

test("formulario bloquea doble submit y descarta respuesta al desmontarse", async () => {
  const form = crearFormularioPlan({ titulo: "Plan", notas: "No borrar" });
  const pendiente = diferido<{ titulo: string; notas: string }>();
  const guardar = form.enviar("crear", async () => pendiente.promesa);
  assert.equal(await form.enviar("crear", async (datos) => datos), false);
  form.desactivar(); pendiente.resolver({ titulo: "Plan", notas: "No borrar" });
  assert.equal(await guardar, false); assert.equal(form.obtener().notas, "No borrar");
});

test("T-5.7 aceptar/iniciar actualizan lista y selección sin recargar", async () => {
  const envios: unknown[] = [];
  const { controlador, llamadas } = preparar({ listar: async () => { llamadas.push("listar"); return [{ ...plan, estado: "propuesto" }, otro]; },
    cambiarEstado: async (id, destino, anterior, nuevo) => { envios.push({ id, destino, anterior, nuevo }); return { ...plan, estado: nuevo }; } });
  await controlador.cargar(); controlador.seleccionar(ID);
  await controlador.solicitarCambioEstado("aceptado");
  assert.equal(controlador.obtener().planes.find((p) => p.id === ID)?.estado, "aceptado");
  await controlador.solicitarCambioEstado("en_proceso");
  assert.equal(controlador.obtener().planes.find((p) => p.id === ID)?.estado, "en_proceso");
  assert.equal(controlador.obtener().planes.find((p) => p.id === otro.id)?.estado, otro.estado);
  assert.equal(controlador.obtener().seleccionadoId, ID); assert.equal(llamadas.length, 1);
  assert.match(controlador.obtener().exitoEstado!, /en_proceso confirmado/);
  assert.deepEqual(envios[0], { id: ID, destino: { pacienteId: PACIENTE, clinicaId: CLINICA, odontologoId: AUTOR }, anterior: "propuesto", nuevo: "aceptado" });
});
for (const nuevo of ["cancelado", "completado"] as const) {
  test(`T-5.7 ${nuevo} exige confirmación visual para el id exacto`, async () => {
    let envios = 0;
    const { controlador } = preparar({ listar: async () => [{ ...plan, estado: "en_proceso" }, otro],
      cambiarEstado: async (_id, _d, anterior, estado) => { envios++; assert.equal(anterior, "en_proceso"); return { ...plan, estado }; } });
    await controlador.cargar(); controlador.seleccionar(ID);
    await assert.rejects(controlador.confirmarCambioEstado(), /Confirma primero/);
    await controlador.solicitarCambioEstado(nuevo);
    assert.equal(envios, 0); assert.equal(controlador.obtener().confirmacionEstado?.planId, ID);
    controlador.cancelarConfirmacionEstado();
    await assert.rejects(controlador.confirmarCambioEstado()); assert.equal(envios, 0);
    await controlador.solicitarCambioEstado(nuevo); await controlador.confirmarCambioEstado();
    assert.equal(envios, 1); assert.equal(controlador.obtener().planes.find((p) => p.id === ID)?.estado, nuevo);
    assert.equal(controlador.obtener().confirmacionEstado, null);
    await assert.rejects(controlador.solicitarCambioEstado("en_proceso"), /no permitida/);
  });
}
test("T-5.7 cambio de selección borra confirmación y mensajes del plan anterior", async () => {
  const { controlador } = preparar({ listar: async () => [{ ...plan, estado: "propuesto" }, otro] });
  await controlador.cargar(); controlador.seleccionar(ID); await controlador.solicitarCambioEstado("cancelado");
  controlador.seleccionar(otro.id);
  assert.equal(controlador.obtener().confirmacionEstado, null);
  await assert.rejects(controlador.confirmarCambioEstado(), /Confirma/);
  assert.equal(controlador.obtener().exitoEstado, null); assert.equal(controlador.obtener().errorEstado, null);
});
test("T-5.7 doble submit y otros guardados/selección quedan bloqueados sin actualización optimista", async () => {
  const pendiente = diferido<PlanTratamientoPaciente>(); let envios = 0;
  const { controlador } = preparar({ cambiarEstado: async () => { envios++; return pendiente.promesa; } });
  await controlador.cargar(); controlador.seleccionar(ID);
  const solicitud = controlador.solicitarCambioEstado("en_proceso");
  assert.equal(controlador.obtener().cambiandoEstado, true);
  assert.equal(controlador.obtener().planes.find((p) => p.id === ID)?.estado, "aceptado");
  await assert.rejects(controlador.solicitarCambioEstado("en_proceso"), /en curso/);
  await assert.rejects(controlador.guardarNotas("No enviar"), /en curso/);
  assert.throws(() => controlador.seleccionar(otro.id), /termine/);
  assert.equal(envios, 1); pendiente.resolver({ ...plan, estado: "en_proceso" }); await solicitud;
  assert.equal(controlador.obtener().guardando, false);
});
test("T-5.7 doble confirmación no duplica envío", async () => {
  const pendiente = diferido<PlanTratamientoPaciente>(); let envios = 0;
  const { controlador } = preparar({ listar: async () => [{ ...plan, estado: "en_proceso" }],
    cambiarEstado: async () => { envios++; return pendiente.promesa; } });
  await controlador.cargar(); controlador.seleccionar(ID); await controlador.solicitarCambioEstado("completado");
  const solicitud = controlador.confirmarCambioEstado(); await assert.rejects(controlador.confirmarCambioEstado(), /en curso/);
  assert.equal(envios, 1); pendiente.resolver({ ...plan, estado: "completado" }); await solicitud;
});
test("T-5.7 fallo conserva estado y plan, sin éxito ni reintentos", async () => {
  let envios = 0;
  const { controlador } = preparar({ cambiarEstado: async () => { envios++; throw new Error("El estado del plan cambió en otra sesión. Recarga."); } });
  await controlador.cargar(); controlador.seleccionar(ID);
  await assert.rejects(controlador.solicitarCambioEstado("en_proceso"), /otra sesión/);
  assert.equal(controlador.obtener().estado, "success"); assert.equal(controlador.obtener().seleccionadoId, ID);
  assert.equal(controlador.obtener().planes.find((p) => p.id === ID)?.estado, "aceptado");
  assert.match(controlador.obtener().errorEstado!, /otra sesión/); assert.equal(controlador.obtener().exitoEstado, null);
  assert.equal(controlador.obtener().guardando, false); assert.equal(envios, 1);
});
test("T-5.7 permisos rechazan colegas, recepción, superadmin, inactivo y clínica ajena", async () => {
  for (const p of [{ ...perfil, id: PACIENTE }, { ...perfil, rol: "recepcionista" }, { ...perfil, rol: "superadmin", clinicaId: null },
    { ...perfil, activo: false }, { ...perfil, clinicaId: PACIENTE }]) {
    let envios = 0;
    const { controlador } = preparar({ perfil: async () => p, cambiarEstado: async () => { envios++; return plan; } });
    await controlador.cargar();
    if (controlador.obtener().estado === "success") controlador.seleccionar(ID);
    await assert.rejects(controlador.solicitarCambioEstado("en_proceso")); assert.equal(envios, 0);
  }
});
test("T-5.7 respuesta inesperada no reconcilia la lista", async () => {
  for (const respuesta of [{ ...plan, id: otro.id, estado: "en_proceso" as const }, plan, { ...plan, estado: "en_proceso" as const, actualizadoEn: null }]) {
    const { controlador } = preparar({ cambiarEstado: async () => respuesta });
    await controlador.cargar(); controlador.seleccionar(ID);
    await assert.rejects(controlador.solicitarCambioEstado("en_proceso"), /No se confirmó/);
    assert.equal(controlador.obtener().planes.find((p) => p.id === ID)?.estado, "aceptado");
    assert.equal(controlador.obtener().exitoEstado, null);
  }
});
test("T-5.7 request tardío no modifica un nuevo contexto de plan/paciente/sesión", async () => {
  const pendiente = diferido<PlanTratamientoPaciente>();
  const anterior = preparar({ cambiarEstado: async () => pendiente.promesa });
  await anterior.controlador.cargar(); anterior.controlador.seleccionar(ID);
  const solicitud = anterior.controlador.solicitarCambioEstado("en_proceso"); anterior.controlador.desactivar();
  const actual = preparar({}, AUTOR); await actual.controlador.cargar(); actual.controlador.seleccionar(otro.id);
  pendiente.resolver({ ...plan, estado: "en_proceso" }); await assert.rejects(solicitud, /cambió/);
  assert.equal(actual.controlador.obtener().seleccionadoId, otro.id);
  assert.equal(actual.controlador.obtener().planes.find((p) => p.id === otro.id)?.estado, "aceptado");
  assert.equal(actual.controlador.obtener().exitoEstado, null);
  assert.equal(anterior.controlador.obtener().planes.find((p) => p.id === ID)?.estado, "aceptado");
});
test("T-5.7 remontaje durante request espera, descarta respuesta e inicia lectura vigente", async () => {
  const pendiente = diferido<PlanTratamientoPaciente>(); let lecturas = 0;
  const vigente = diferido<PlanTratamientoPaciente[]>();
  const { controlador } = preparar({ listar: async () => ++lecturas === 1 ? [plan] : vigente.promesa, cambiarEstado: async () => pendiente.promesa });
  await controlador.cargar(); controlador.seleccionar(ID);
  const solicitud = controlador.solicitarCambioEstado("en_proceso");
  controlador.desactivar(); controlador.activar(); await controlador.cargar();
  assert.equal(lecturas, 1);
  await assert.rejects(controlador.solicitarCambioEstado("en_proceso"), /en curso/);
  pendiente.resolver({ ...plan, estado: "en_proceso" }); await assert.rejects(solicitud, /cambió/);
  const carga = controlador.cargar(); vigente.resolver([plan]); await carga;
  assert.equal(lecturas, 2); assert.equal(controlador.obtener().guardando, false);
  assert.equal(controlador.obtener().cambiandoEstado, false); assert.equal(controlador.obtener().exitoEstado, null);
  assert.equal(controlador.obtener().planes[0].estado, "aceptado");
});

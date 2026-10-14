/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import { crearControladorPlanes } from "./planesTratamientoControlador.ts";
import { crearControladorProcedimientos } from "./procedimientosControlador.ts";
import { formatearCostoTotal, totalPlanConfirmado } from "./planTotal.ts";
import type { PlanTratamientoPaciente, ProcedimientoTratamiento } from "./tipos.ts";

const ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", P = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc", A = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const perfil = { id: A, clinicaId: C, rol: "odontologo", activo: true };
const plan: PlanTratamientoPaciente = { id: ID, pacienteId: P, clinicaId: C, odontologoId: A, titulo: "Plan real", notas: "Notas reales",
  estado: "aceptado", costoTotal: 100, creadoEn: "2026-10-12T12:00:00Z", actualizadoEn: "2026-10-12T13:00:00Z" };
const procedimiento: ProcedimientoTratamiento = { id: P, planTratamientoId: ID, clinicaId: C, servicioId: null, descripcion: "Procedimiento real",
  numeroPieza: 11, prioridad: "normal", estado: "pendiente", costo: 1.25, creadoEn: plan.creadoEn, actualizadoEn: plan.actualizadoEn };
function diferido<T>() { let resolver!: (valor: T) => void; const promesa = new Promise<T>((r) => { resolver = r; }); return { resolver, promesa }; }
async function preparar(opciones: { obtener?: () => Promise<PlanTratamientoPaciente>; crear?: () => Promise<ProcedimientoTratamiento>;
  total?: number; filas?: ProcedimientoTratamiento[] } = {}) {
  const llamadas: string[] = [];
  const planes = crearControladorPlanes({ pacienteId: P, email: "autor@test", rol: "odontologo" }, {
    perfil: async () => perfil, listar: async () => [plan, { ...plan, id: A, titulo: "Otro plan", costoTotal: 55 }],
    obtener: async (id, destino) => { llamadas.push("leer_plan"); assert.equal(id, ID); assert.deepEqual(destino, { pacienteId: P, clinicaId: C });
      return opciones.obtener ? opciones.obtener() : { ...plan, costoTotal: opciones.total ?? 300.5, actualizadoEn: "2026-10-12T16:00:00Z" }; },
    crear: async () => plan, titulo: async () => plan, notas: async () => plan, cambiarEstado: async () => plan,
  });
  planes.activar(); await planes.cargar(); planes.seleccionar(ID);
  const procedimientos = crearControladorProcedimientos(plan, perfil, {
    listar: async () => opciones.filas ?? [procedimiento],
    crear: async () => { llamadas.push("crear"); const fila = opciones.crear ? await opciones.crear() : { ...procedimiento, id: A }; llamadas.push("crear_confirmado"); return fila; },
    actualizar: async (id, _d, datos) => { llamadas.push("editar_confirmado"); return { ...procedimiento, ...datos, id }; },
    eliminar: async () => { llamadas.push("eliminar_confirmado"); return procedimiento; },
  }, planes.iniciarTotalProcedimiento);
  procedimientos.activar(); await procedimientos.cargar();
  return { planes, procedimientos, llamadas };
}
const contenido = { descripcion: "Nuevo", numeroPieza: 11, prioridad: "normal" as const, costo: 1.25, estado: "pendiente" as const };

test("T-5.10 crear confirma primero CRUD, relee fila y actualiza total sin F5 ni suma local", async () => {
  const h = await preparar({ total: 300.5 });
  const p = await h.procedimientos.crear(contenido);
  assert.deepEqual(h.llamadas, ["crear", "crear_confirmado", "leer_plan"]);
  assert.equal(h.procedimientos.obtener().procedimientos.some((f) => f.id === p.id), true);
  assert.equal(h.planes.obtener().planes.find((f) => f.id === ID)?.costoTotal, 300.5);
  assert.equal(h.planes.obtener().seleccionadoId, ID);
  assert.equal(h.planes.obtener().planes.find((f) => f.id === ID)?.actualizadoEn, "2026-10-12T16:00:00Z");
  assert.equal(h.planes.obtener().planes.find((f) => f.id === A)?.costoTotal, 55);
  assert.equal(totalPlanConfirmado(h.planes.obtener().totales, ID), true);
});
test("T-5.10 editar costo y cancelado conservan como autoridad el plan releído", async () => {
  const h = await preparar({ total: 4000 });
  await h.procedimientos.actualizar(P, { ...contenido, costo: 2.20, estado: "cancelado" });
  assert.deepEqual(h.llamadas, ["editar_confirmado", "leer_plan"]);
  assert.equal(h.procedimientos.obtener().procedimientos[0].estado, "cancelado");
  assert.equal(h.planes.obtener().planes.find((p) => p.id === ID)!.costoTotal, 4000);
  // El resultado del servidor no depende de la suma ni del estado de la lista local.
  assert.equal(formatearCostoTotal(h.planes.obtener().planes.find((p) => p.id === ID)!.costoTotal), "Bs 4000.00");
});
test("T-5.10 eliminar último procedimiento relee plan vacío = 0.00", async () => {
  const h = await preparar({ total: 0 }); h.procedimientos.solicitarEliminar(P); await h.procedimientos.eliminar(P);
  assert.deepEqual(h.llamadas, ["eliminar_confirmado", "leer_plan"]);
  assert.equal(h.procedimientos.obtener().procedimientos.length, 0);
  assert.equal(h.planes.obtener().planes.find((p) => p.id === ID)!.costoTotal, 0);
  assert.equal(formatearCostoTotal(h.planes.obtener().planes.find((p) => p.id === ID)!.costoTotal), "Bs 0.00");
});
test("T-5.10 no relee antes de confirmar mutación y bloquea impresión desde el envío", async () => {
  const pendiente = diferido<ProcedimientoTratamiento>(); const h = await preparar({ crear: () => pendiente.promesa });
  const escribir = h.procedimientos.crear(contenido);
  assert.deepEqual(h.llamadas, ["crear"]); assert.equal(h.planes.obtener().totales[ID].estado, "mutando");
  assert.equal(totalPlanConfirmado(h.planes.obtener().totales, ID), false);
  await assert.rejects(h.planes.sincronizarTotalPlan(ID), /mutación.*pendiente/);
  pendiente.resolver({ ...procedimiento, id: A }); await escribir;
  assert.equal(totalPlanConfirmado(h.planes.obtener().totales, ID), true);
});
test("T-5.10 fallo de relectura conserva CREATE confirmado y reintenta solo SELECT", async () => {
  let lecturas = 0;
  const h = await preparar({ obtener: async () => { if (++lecturas === 1) throw new Error("Sin red"); return { ...plan, costoTotal: 300.5 }; } });
  await h.procedimientos.crear(contenido);
  assert.equal(h.procedimientos.obtener().procedimientos.length, 2); assert.equal(h.procedimientos.obtener().error, null);
  assert.match(h.procedimientos.obtener().mensaje, /guardado y confirmado/);
  assert.equal(h.planes.obtener().totales[ID].estado, "error");
  assert.match(h.planes.obtener().totales[ID].error!, /se confirmó.*Reintenta/);
  assert.equal(totalPlanConfirmado(h.planes.obtener().totales, ID), false);
  await assert.rejects(h.procedimientos.crear(contenido), /Confirma primero/);
  await h.planes.sincronizarTotalPlan(ID);
  assert.deepEqual(h.llamadas, ["crear", "crear_confirmado", "leer_plan", "leer_plan"]);
  assert.equal(h.planes.obtener().planes.find((p) => p.id === ID)!.costoTotal, 300.5);
  assert.equal(totalPlanConfirmado(h.planes.obtener().totales, ID), true);
});
test("T-5.10 error parcial tras DELETE no vuelve a borrar y conserva fila retirada", async () => {
  let lecturas = 0;
  const h = await preparar({ obtener: async () => { if (++lecturas === 1) throw new Error("Sin red"); return { ...plan, costoTotal: 0 }; } });
  h.procedimientos.solicitarEliminar(P); await h.procedimientos.eliminar(P);
  assert.equal(h.procedimientos.obtener().procedimientos.length, 0); assert.equal(h.procedimientos.obtener().confirmacionId, null);
  assert.equal(h.procedimientos.obtener().error, null); await h.planes.sincronizarTotalPlan(ID);
  assert.deepEqual(h.llamadas, ["eliminar_confirmado", "leer_plan", "leer_plan"]);
  assert.equal(h.planes.obtener().planes.find((p) => p.id === ID)!.costoTotal, 0);
});
test("T-5.10 error CRUD no se anuncia como éxito ni dispara relectura automática", async () => {
  const h = await preparar({ crear: async () => { throw new Error("Error CRUD"); } });
  await assert.rejects(h.procedimientos.crear(contenido), /Error CRUD/);
  assert.deepEqual(h.llamadas, ["crear"]); assert.match(h.procedimientos.obtener().error!, /Error CRUD/);
  assert.equal(h.procedimientos.obtener().procedimientos.length, 1);
  assert.match(h.planes.obtener().totales[ID].error!, /operación.*no se confirmó/);
  await h.planes.sincronizarTotalPlan(ID); assert.deepEqual(h.llamadas, ["crear", "leer_plan"]);
});
test("T-5.10 no duplica CRUD durante relectura ni metadatos que puedan pisarla", async () => {
  const pendiente = diferido<PlanTratamientoPaciente>(); const h = await preparar({ obtener: () => pendiente.promesa });
  const escribir = h.procedimientos.crear(contenido); await Promise.resolve(); await Promise.resolve();
  assert.equal(h.planes.obtener().totales[ID].estado, "loading");
  await assert.rejects(h.procedimientos.crear(contenido), /en curso/);
  await assert.rejects(h.planes.guardarNotas("No enviar"), /sincronización/);
  assert.equal(totalPlanConfirmado(h.planes.obtener().totales, ID), false);
  pendiente.resolver({ ...plan, costoTotal: 300.5 }); await escribir;
  assert.equal(h.llamadas.filter((f) => f === "crear").length, 1);
});
test("T-5.10 reintentos simultáneos comparten solo una lectura", async () => {
  const pendiente = diferido<PlanTratamientoPaciente>(); let n = 0;
  const h = await preparar({ obtener: async () => { if (++n === 1) throw new Error("Sin red"); return pendiente.promesa; } });
  await h.procedimientos.crear(contenido);
  const uno = h.planes.sincronizarTotalPlan(ID), dos = h.planes.sincronizarTotalPlan(ID);
  assert.equal(n, 2); pendiente.resolver({ ...plan, costoTotal: 300.5 }); await uno; await dos;
  assert.equal(h.llamadas.filter((f) => f === "crear").length, 1);
});
test("T-5.10 cambiar plan durante relectura descarta total/mensaje tardíos", async () => {
  const pendiente = diferido<PlanTratamientoPaciente>(); const h = await preparar({ obtener: () => pendiente.promesa });
  const escribir = h.procedimientos.crear(contenido); await Promise.resolve(); await Promise.resolve();
  h.planes.seleccionar(A); pendiente.resolver({ ...plan, costoTotal: 300.5 }); await escribir;
  assert.equal(h.planes.obtener().seleccionadoId, A); assert.equal(h.planes.obtener().planes.find((p) => p.id === A)?.costoTotal, 55);
  assert.equal(h.planes.obtener().planes.find((p) => p.id === ID)?.costoTotal, 100);
  assert.equal(totalPlanConfirmado(h.planes.obtener().totales, ID), false);
});
test("T-5.10 volver a plan y releer no permite que una respuesta anterior pise el nuevo total", async () => {
  const anterior = diferido<PlanTratamientoPaciente>(); let lecturas = 0;
  const h = await preparar({ obtener: async () => ++lecturas === 1 ? anterior.promesa : { ...plan, costoTotal: 4000 } });
  const escribir = h.procedimientos.crear(contenido); await Promise.resolve(); await Promise.resolve();
  h.planes.seleccionar(A); h.planes.seleccionar(ID); await h.planes.sincronizarTotalPlan(ID);
  anterior.resolver({ ...plan, costoTotal: 300.5 }); await escribir;
  assert.equal(h.planes.obtener().planes.find((p) => p.id === ID)!.costoTotal, 4000); assert.equal(totalPlanConfirmado(h.planes.obtener().totales, ID), true);
});
test("T-5.10 ficha/sesión desactivada no recibe el plan releído tardío", async () => {
  const pendiente = diferido<PlanTratamientoPaciente>(); const h = await preparar({ obtener: () => pendiente.promesa });
  const escribir = h.procedimientos.crear(contenido); await Promise.resolve(); await Promise.resolve();
  h.procedimientos.desactivar(); h.planes.desactivar(); pendiente.resolver({ ...plan, costoTotal: 300.5 }); await escribir;
  assert.equal(h.planes.obtener().planes.find((p) => p.id === ID)!.costoTotal, 100);
});
test("T-5.10 fila releída ajena no reconcilia ni habilita impresión", async () => {
  for (const respuesta of [{ ...plan, id: A }, { ...plan, pacienteId: A }, { ...plan, odontologoId: P }, { ...plan, costoTotal: NaN }]) {
    const h = await preparar({ obtener: async () => respuesta }); await h.procedimientos.crear(contenido);
    assert.equal(h.planes.obtener().planes.find((p) => p.id === ID)!.costoTotal, 100);
    assert.equal(h.planes.obtener().totales[ID].estado, "error");
    assert.equal(totalPlanConfirmado(h.planes.obtener().totales, ID), false);
  }
});
test("T-5.10 formato usa siempre dos decimales para total persistido", () => {
  for (const [numero, texto] of [[0, "Bs 0.00"], [300.5, "Bs 300.50"], [4000, "Bs 4000.00"], [0.01, "Bs 0.01"]] as const) assert.equal(formatearCostoTotal(numero), texto);
});
test("T-5.10 UPDATE confirmado se conserva aunque falle la relectura", async () => {
  const h = await preparar({ obtener: async () => { throw new Error("Sin red"); } });
  await h.procedimientos.actualizar(P, { ...contenido, costo: 300.5 });
  assert.equal(h.procedimientos.obtener().procedimientos[0].costo, 300.5);
  assert.equal(h.procedimientos.obtener().error, null);
  assert.equal(h.planes.obtener().totales[ID].mutacionConfirmada, true);
  assert.deepEqual(h.llamadas, ["editar_confirmado", "leer_plan"]);
});
test("T-5.10 reintento fallido tras error CRUD no fabrica confirmación de mutación", async () => {
  const h = await preparar({ crear: async () => { throw new Error("Error CRUD"); }, obtener: async () => { throw new Error("Sin red"); } });
  await assert.rejects(h.procedimientos.crear(contenido)); await h.planes.sincronizarTotalPlan(ID);
  assert.equal(h.planes.obtener().totales[ID].mutacionConfirmada, false);
  assert.doesNotMatch(h.planes.obtener().totales[ID].error!, /procedimiento se confirmó/);
  assert.match(h.procedimientos.obtener().error!, /Error CRUD/);
  assert.deepEqual(h.llamadas, ["crear", "leer_plan"]);
});

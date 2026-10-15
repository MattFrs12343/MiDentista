/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import { crearControladorFormularioDiagnostico } from "./diagnosticoFormulario.ts";
import type { DiagnosticoPaciente } from "./tipos.ts";

const diagnostico: DiagnosticoPaciente = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", pacienteId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  clinicaId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", odontologoId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  descripcion: "Caries", numeroPieza: 54, observaciones: "Control", estado: "activo", fechaDiagnostico: "2026-10-11",
  creadoEn: "2026-10-11T10:00:00Z", actualizadoEn: "2026-10-11T12:00:00Z",
};
function diferido<T>() {
  let resolver!: (valor: T) => void;
  let rechazar!: (causa: Error) => void;
  const promesa = new Promise<T>((resolve, reject) => { resolver = resolve; rechazar = reject; });
  return { promesa, resolver, rechazar };
}

test("creación conserva todos los campos ante error y solo limpia tras éxito real", async () => {
  const pendiente = diferido<DiagnosticoPaciente>();
  let intentos = 0;
  const formulario = crearControladorFormularioDiagnostico(undefined, async () => {
    intentos++;
    if (intentos === 1) return pendiente.promesa;
    return diagnostico;
  });
  formulario.cambiar("descripcion", "Caries"); formulario.cambiar("numeroPieza", "54"); formulario.cambiar("observaciones", "Control");
  const campos = formulario.obtener().campos;
  const envio = formulario.enviar("contenido");
  assert.equal(formulario.obtener().guardando, true);
  assert.deepEqual(formulario.obtener().campos, campos);
  pendiente.rechazar(new Error("Sin permiso RLS"));
  assert.equal(await envio, null);
  assert.deepEqual(formulario.obtener().campos, campos);
  assert.equal(formulario.obtener().error, "Sin permiso RLS");
  assert.equal(formulario.obtener().exito, null);
  assert.equal(await formulario.enviar("contenido"), diagnostico);
  assert.deepEqual(formulario.obtener().campos, { descripcion: "", numeroPieza: "", observaciones: "", estado: "activo" });
  assert.equal(formulario.obtener().error, null);
  assert.equal(formulario.obtener().exito, "Diagnóstico creado.");
});

test("doble submit no dispara otra escritura y campos no cambian durante envío", async () => {
  const pendiente = diferido<DiagnosticoPaciente>();
  let llamadas = 0;
  const formulario = crearControladorFormularioDiagnostico(diagnostico, async () => { llamadas++; return pendiente.promesa; });
  const primero = formulario.enviar("contenido");
  assert.equal(await formulario.enviar("contenido"), null);
  formulario.cambiar("observaciones", "No debe cambiar");
  assert.equal(formulario.obtener().campos.observaciones, "Control");
  assert.equal(llamadas, 1);
  pendiente.resolver(diagnostico);
  assert.equal(await primero, diagnostico);
  assert.equal(formulario.obtener().guardando, false);
});

test("validación de descripción/pieza ocurre antes de guardar y conserva el borrador", async () => {
  let llamadas = 0;
  const formulario = crearControladorFormularioDiagnostico(undefined, async () => { llamadas++; return diagnostico; });
  formulario.cambiar("descripcion", " \n");
  assert.equal(await formulario.enviar("contenido"), null);
  assert.match(formulario.obtener().error!, /obligatoria/);
  formulario.cambiar("descripcion", "Caries"); formulario.cambiar("numeroPieza", "1e1");
  assert.equal(await formulario.enviar("contenido"), null);
  assert.equal(formulario.obtener().campos.numeroPieza, "1e1");
  assert.match(formulario.obtener().error!, /FDI válido/);
  assert.equal(llamadas, 0);
});

test("edición fallida conserva contenido y estado pendiente; éxito no vacía diagnóstico", async () => {
  const formulario = crearControladorFormularioDiagnostico(diagnostico, async () => { throw new Error("UPDATE sin filas"); });
  formulario.cambiar("descripcion", "Corregido"); formulario.cambiar("observaciones", "Nuevo texto"); formulario.cambiar("estado", "resuelto");
  const campos = formulario.obtener().campos;
  assert.equal(await formulario.enviar("contenido"), null);
  assert.deepEqual(formulario.obtener().campos, campos);
  assert.equal(formulario.obtener().exito, null);
  const correcto = crearControladorFormularioDiagnostico(diagnostico, async () => ({ ...diagnostico, descripcion: "Corregido" }));
  correcto.cambiar("descripcion", "Corregido"); correcto.cambiar("estado", "resuelto");
  await correcto.enviar("contenido");
  assert.equal(correcto.obtener().campos.descripcion, "Corregido");
  assert.equal(correcto.obtener().campos.estado, "resuelto"); // Selección no enviada aún.
  assert.equal(correcto.obtener().exito, "Diagnóstico actualizado.");
});

test("guardar solo estado no borra cambios de contenido sin guardar", async () => {
  let accionEnviada = "";
  const formulario = crearControladorFormularioDiagnostico(diagnostico, async (accion, campos) => {
    accionEnviada = accion;
    return { ...diagnostico, estado: campos.estado };
  });
  formulario.cambiar("estado", "inactivo"); formulario.cambiar("descripcion", "Borrador"); formulario.cambiar("numeroPieza", "texto pendiente");
  assert.equal((await formulario.enviar("estado"))?.estado, "inactivo");
  assert.equal(accionEnviada, "estado");
  assert.equal(formulario.obtener().campos.descripcion, "Borrador");
  assert.equal(formulario.obtener().campos.numeroPieza, "texto pendiente");
  assert.equal(formulario.obtener().exito, "Estado del diagnóstico actualizado.");
});

test("respuesta NULL no limpia campos ni genera éxito", async () => {
  const formulario = crearControladorFormularioDiagnostico(diagnostico, async () => null as unknown as DiagnosticoPaciente);
  assert.equal(await formulario.enviar("contenido"), null);
  assert.equal(formulario.obtener().campos.descripcion, "Caries");
  assert.match(formulario.obtener().error!, /No se confirmó/);
  assert.equal(formulario.obtener().exito, null);
});

test("desmontaje descarta respuestas tardías y no anuncia éxito en otra ficha", async () => {
  const pendiente = diferido<DiagnosticoPaciente>();
  const formulario = crearControladorFormularioDiagnostico(diagnostico, async () => pendiente.promesa);
  let notificaciones = 0;
  const desmontar = formulario.suscribir(() => { notificaciones++; });
  const envio = formulario.enviar("contenido");
  const antes = notificaciones;
  desmontar();
  pendiente.resolver(diagnostico);
  assert.equal(await envio, null);
  assert.equal(notificaciones, antes);
  assert.equal(formulario.obtener().exito, null);
});

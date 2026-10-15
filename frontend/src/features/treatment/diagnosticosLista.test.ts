/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import { compararDiagnosticos, incorporarDiagnosticoConfirmado, presentarDiagnostico, presentarListaDiagnosticos, type ResultadoListaDiagnosticos } from "./diagnosticosLista.ts";
import { crearControladorListaDiagnosticos } from "./diagnosticosListaControlador.ts";
import type { DiagnosticoPaciente } from "./tipos.ts";

const PACIENTE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CLINICA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const AUTOR = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const perfil = { id: AUTOR, clinicaId: CLINICA, rol: "odontologo", activo: true };
const contexto = { pacienteId: PACIENTE, email: "autor@clinica.test", rol: "odontologo" };
const diagnostico = (n = 1, cambios: Partial<DiagnosticoPaciente> = {}): DiagnosticoPaciente => ({
  id: `00000000-0000-4000-8000-${n.toString().padStart(12, "0")}`, pacienteId: PACIENTE, clinicaId: CLINICA, odontologoId: AUTOR,
  descripcion: `Diagnóstico ${n}`, numeroPieza: 54, observaciones: "Control\npendiente", estado: "activo",
  fechaDiagnostico: "2026-10-11", creadoEn: "2026-10-11T10:00:00.000000+00:00", actualizadoEn: "2026-10-11T12:00:00Z", ...cambios,
});
const resultado = (cambios: Partial<ResultadoListaDiagnosticos> = {}): ResultadoListaDiagnosticos => ({ clave: "ficha", estado: "success",
  diagnosticos: [diagnostico()], perfil, error: null, ...cambios });
function diferido<T>() {
  let resolver!: (valor: T) => void;
  let rechazar!: (causa: Error) => void;
  const promesa = new Promise<T>((resolve, reject) => { resolver = resolve; rechazar = reject; });
  return { promesa, resolver, rechazar };
}

test("lista con datos conserva texto, pieza, observaciones y fechas del diagnóstico", () => {
  const vista = presentarListaDiagnosticos(resultado(), 1);
  assert.equal(vista.tipo, "resultados");
  if (vista.tipo !== "resultados") return;
  const fila = vista.filas[0];
  assert.equal(fila.diagnostico.descripcion, "Diagnóstico 1");
  assert.equal(fila.pieza, "Pieza 54");
  assert.equal(fila.observaciones, "Control\npendiente");
  assert.equal(fila.fecha, "11/10/2026");
  assert.equal(fila.diagnostico.actualizadoEn, "2026-10-11T12:00:00Z");
  assert.equal(fila.editable, true);
});

test("pieza/observaciones opcionales no inventan contenido y fechas NULL tienen texto explícito", () => {
  for (const observaciones of ["", " \t\n"]) {
    const vista = presentarDiagnostico(diagnostico(1, { numeroPieza: null, observaciones, fechaDiagnostico: null, actualizadoEn: null }), perfil);
    assert.equal(vista.pieza, null);
    assert.equal(vista.observaciones, null);
    assert.equal(vista.fecha, "Sin fecha registrada");
    assert.equal(vista.actualizado, "Sin fecha de actualización registrada");
  }
});

test("estados muestran Activo/Inactivo/Resuelto sin depender del color", () => {
  for (const [estado, etiqueta] of [["activo", "Activo"], ["inactivo", "Inactivo"], ["resuelto", "Resuelto"]] as const) {
    assert.equal(presentarDiagnostico(diagnostico(1, { estado }), perfil).estado, etiqueta);
  }
});

test("loading, error, vacío y resultados son ramas distintas incluso si quedan datos anteriores", () => {
  assert.equal(presentarListaDiagnosticos(resultado({ estado: "loading" }), 1).tipo, "loading");
  const fallo = presentarListaDiagnosticos(resultado({ estado: "error", diagnosticos: [], error: "Sesión vencida" }), 1);
  assert.equal(fallo.tipo, "error");
  if (fallo.tipo === "error") { assert.match(fallo.mensaje, /Reintenta/); assert.equal(fallo.detalle, "Sesión vencida"); }
  assert.equal(presentarListaDiagnosticos(resultado({ diagnosticos: [] }), 1).tipo, "vacio");
  assert.equal(presentarListaDiagnosticos(resultado(), 1).tipo, "resultados");
});

test("paginación de 20 limita, permite última página parcial y ajusta páginas inválidas", () => {
  const diagnosticos = Array.from({ length: 45 }, (_, i) => diagnostico(i + 1));
  const primera = presentarListaDiagnosticos(resultado({ diagnosticos }), 1);
  const ultima = presentarListaDiagnosticos(resultado({ diagnosticos }), 3);
  assert.equal(primera.tipo, "resultados"); assert.equal(ultima.tipo, "resultados");
  if (primera.tipo !== "resultados" || ultima.tipo !== "resultados") return;
  assert.equal(primera.filas.length, 20); assert.equal(primera.totalPaginas, 3);
  assert.equal(primera.desde, 1); assert.equal(primera.hasta, 20);
  assert.equal(ultima.filas.length, 5); assert.equal(ultima.desde, 41); assert.equal(ultima.hasta, 45);
  for (const [solicitada, esperada] of [[99,3], [-1,1], [NaN,1], [Infinity,1]]) {
    const pagina = presentarListaDiagnosticos(resultado({ diagnosticos }), solicitada);
    assert.equal(pagina.tipo === "resultados" ? pagina.pagina : 0, esperada);
  }
  assert.equal(diagnosticos[0].id, diagnostico(1).id); // No modifica el array fuente.
});

test("orden creado DESC e id DESC conserva microsegundos, offsets y NULLS LAST", () => {
  const filas = [diagnostico(8, { creadoEn: null }), diagnostico(1), diagnostico(2),
    diagnostico(3, { creadoEn: "2026-10-11T10:00:00.000002Z" }),
    diagnostico(4, { creadoEn: "2026-10-11T10:00:00.000001Z" }),
    diagnostico(5, { creadoEn: "2026-10-12T10:00:00Z" }),
    diagnostico(6, { creadoEn: "2026-10-11T06:00:00-04:00" })];
  assert.deepEqual([...filas].sort(compararDiagnosticos).map((d) => d.id), [5,3,4,6,2,1,8].map((n) => diagnostico(n).id));
  assert.equal(compararDiagnosticos(filas[0], filas[0]), 0);
});

test("acciones solo para autor activo de la clínica; colega, recepción y auditoría leen", () => {
  const fila = diagnostico();
  assert.equal(presentarDiagnostico(fila, perfil).editable, true);
  for (const actor of [{ ...perfil, id: PACIENTE }, { ...perfil, clinicaId: PACIENTE }, { ...perfil, activo: false },
    { ...perfil, rol: "recepcionista" }, { ...perfil, rol: "superadmin", clinicaId: null }, null]) {
    assert.equal(presentarDiagnostico(fila, actor).editable, false);
  }
});

test("confirmaciones reemplazan id sin duplicar y mantienen creado_en como orden", () => {
  const inicial = [diagnostico(1), diagnostico(2)];
  const actualizado = diagnostico(1, { descripcion: "Corregido", estado: "resuelto", actualizadoEn: "2026-10-13T12:00:00Z" });
  const filas = incorporarDiagnosticoConfirmado(inicial, actualizado);
  assert.equal(filas.length, 2);
  assert.equal(filas[1].descripcion, "Corregido");
  assert.equal(filas[1].estado, "resuelto");
  assert.equal(inicial[0].estado, "activo");
});

test("error de carga permite reintento y luego resultados, sin falso vacío ni bloqueo", async () => {
  let llamadas = 0;
  const controlador = crearControladorListaDiagnosticos(contexto, { obtenerPerfil: async () => perfil,
    listar: async () => { llamadas++; if (llamadas === 1) throw new Error("Conexión interrumpida"); return [diagnostico()]; } });
  controlador.activar();
  assert.equal(controlador.obtener().estado, "loading");
  await controlador.cargar();
  assert.equal(controlador.obtener().estado, "error");
  assert.equal(presentarListaDiagnosticos(controlador.obtener(), 1).tipo, "error");
  assert.equal(controlador.cargando(), false);
  const reintento = controlador.cargar();
  assert.equal(controlador.obtener().estado, "loading"); assert.equal(controlador.obtener().error, null);
  await reintento;
  assert.equal(controlador.obtener().estado, "success"); assert.equal(llamadas, 2);
  assert.equal(controlador.obtener().diagnosticos.length, 1);
});

test("doble reintento y remontaje StrictMode reutilizan lectura pendiente", async () => {
  const pendiente = diferido<typeof perfil>();
  let perfiles = 0; let listas = 0;
  const controlador = crearControladorListaDiagnosticos(contexto, { obtenerPerfil: async () => { perfiles++; return pendiente.promesa; },
    listar: async () => { listas++; return []; } });
  controlador.activar();
  const primero = controlador.cargar();
  assert.equal(controlador.cargar(), primero);
  controlador.desactivar(); controlador.activar();
  assert.equal(controlador.cargar(), primero);
  pendiente.resolver(perfil);
  await primero;
  assert.equal(perfiles, 1); assert.equal(listas, 1);
  assert.equal(presentarListaDiagnosticos(controlador.obtener(), 1).tipo, "vacio");
});

test("alta, edición y estado se reflejan en lista confirmada sin otra carga", async () => {
  let cargas = 0;
  const controlador = crearControladorListaDiagnosticos(contexto, { obtenerPerfil: async () => perfil,
    listar: async () => { cargas++; return [diagnostico()]; } });
  controlador.activar(); await controlador.cargar();
  controlador.confirmar(diagnostico(2, { creadoEn: "2026-10-12T10:00:00Z" }));
  controlador.confirmar(diagnostico(1, { descripcion: "Actualizado", observaciones: "Nueva observación" }));
  controlador.confirmar(diagnostico(1, { descripcion: "Actualizado", observaciones: "Nueva observación", estado: "inactivo", actualizadoEn: "2026-10-13T12:00:00Z" }));
  const vista = presentarListaDiagnosticos(controlador.obtener(), 1);
  assert.equal(vista.tipo, "resultados");
  if (vista.tipo !== "resultados") return;
  assert.equal(vista.total, 2); assert.equal(vista.filas[0].diagnostico.id, diagnostico(2).id);
  assert.equal(vista.filas[1].diagnostico.descripcion, "Actualizado");
  assert.equal(vista.filas[1].estado, "Inactivo");
  assert.equal(vista.filas[1].observaciones, "Nueva observación");
  assert.equal(vista.filas[1].diagnostico.actualizadoEn, "2026-10-13T12:00:00Z");
  assert.equal(cargas, 1);
});

test("respuesta tardía y confirmación de otro paciente no contaminan otra ficha", async () => {
  const pendiente = diferido<DiagnosticoPaciente[]>();
  const anterior = crearControladorListaDiagnosticos(contexto, { obtenerPerfil: async () => perfil, listar: async () => pendiente.promesa });
  anterior.activar();
  const carga = anterior.cargar(); await Promise.resolve(); anterior.desactivar();
  pendiente.resolver([diagnostico()]); await carga;
  assert.equal(anterior.obtener().diagnosticos.length, 0);
  const actual = crearControladorListaDiagnosticos(contexto, { obtenerPerfil: async () => perfil, listar: async () => [] });
  actual.activar(); await actual.cargar();
  assert.throws(() => actual.confirmar(diagnostico(1, { pacienteId: AUTOR })), /no corresponde/);
  assert.equal(actual.obtener().diagnosticos.length, 0);
});

test("perfil denegado falla antes de consultar diagnósticos", async () => {
  let listas = 0;
  const controlador = crearControladorListaDiagnosticos(contexto, { obtenerPerfil: async () => ({ ...perfil, rol: "paciente" }),
    listar: async () => { listas++; return []; } });
  controlador.activar(); await controlador.cargar();
  assert.equal(controlador.obtener().estado, "error"); assert.equal(listas, 0);
});

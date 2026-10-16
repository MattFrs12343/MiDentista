/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { capacidadesArchivos, crearCoordinadorArchivos, mensajePublicoSubida, registroEscritura } from "./patientFilesSection.ts";
import { cargarContextoPacienteArchivos } from "./patientFilesSectionService.ts";
import { esTabValida } from "../patients/tabValue.ts";
import type { Archivo } from "./tipos.ts";

const PACIENTE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CLINICA = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PERFIL = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const OTRO = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const contexto = { pacienteId: PACIENTE, clinicaId: CLINICA, perfilId: PERFIL };
const perfil = { id: PERFIL, clinicaId: CLINICA };
function archivo(cambios: Partial<Archivo> = {}): Archivo {
  return { id: OTRO, pacienteId: PACIENTE, clinicaId: CLINICA, subidoPor: PERFIL,
    nombre: "Imagen original.jpg", ruta: `${CLINICA}/${PACIENTE}/objeto.jpg`, mime: "image/jpeg", tamano: 1,
    categoria: "clinico", tipoArchivo: "fotografia", descripcion: "", creadoEl: "2026-10-06T12:00:00Z",
    evolucionClinicaId: null, planTratamientoId: null, ...cambios };
}

test("capacidades de la ficha: odontólogo/odontólogo_admin/recepción; no inventa portal", () => {
  for (const rol of ["odontologo", "odontologo_admin", "recepcionista"]) {
    assert.deepEqual(capacidadesArchivos(PACIENTE, contexto, perfil, rol), { imagen: true, pdf: true });
  }
  for (const rol of ["superadmin", "paciente", "otro", null]) {
    assert.deepEqual(capacidadesArchivos(PACIENTE, contexto, perfil, rol), { imagen: false, pdf: false });
  }
});

test("perfil/contexto/UUID faltantes y clínica incompatible deshabilitan escrituras", () => {
  for (const [paciente, datos, autor] of [
    ["p1", contexto, perfil], [PACIENTE, null, perfil], [PACIENTE, contexto, null],
    [PACIENTE, contexto, { id: "demo", clinicaId: CLINICA }],
    [PACIENTE, contexto, { id: PERFIL, clinicaId: null }],
    [PACIENTE, contexto, { id: PERFIL, clinicaId: OTRO }],
    [PACIENTE, { ...contexto, pacienteId: OTRO }, perfil],
  ] as const) {
    assert.deepEqual(capacidadesArchivos(paciente, datos, autor, "odontologo"), { imagen: false, pdf: false });
  }
});

test("confirmación cierra y solicita un único refresh pese a callbacks repetidos", async () => {
  const acciones: string[] = [];
  let terminar!: () => void;
  const confirmar = crearCoordinadorArchivos(contexto, {
    vigente: () => true, cerrar: () => acciones.push("cerrar"), confirmar: () => acciones.push("confirmar"),
    reload: () => { acciones.push("reload"); return new Promise<void>((resolve) => { terminar = resolve; }); },
    errorRefresh: () => acciones.push("errorRefresh"),
  });
  const pendiente = confirmar(archivo());
  assert.equal(await confirmar(archivo()), false);
  assert.deepEqual(acciones, ["cerrar", "confirmar", "reload"]);
  terminar();
  assert.equal(await pendiente, true);
});

test("resultado ajeno, fallo de subida y contexto desmontado no cierran ni refrescan", async () => {
  let vigente = true;
  const confirmar = crearCoordinadorArchivos(contexto, {
    vigente: () => vigente, cerrar: () => assert.fail("No cerrar"), confirmar: () => assert.fail("No confirmar"),
    reload: async () => { assert.fail("No refrescar"); }, errorRefresh: () => assert.fail("No mostrar éxito"),
  });
  assert.equal(await confirmar(null), false);
  for (const cambios of [{ pacienteId: OTRO }, { clinicaId: OTRO }, { subidoPor: OTRO }]) {
    assert.equal(await confirmar(archivo(cambios)), false);
  }
  vigente = false;
  assert.equal(await confirmar(archivo()), false);
});

test("refresh fallido conserva subida confirmada y no solicita una nueva subida", async () => {
  const acciones: string[] = [];
  const confirmar = crearCoordinadorArchivos(contexto, {
    vigente: () => true, cerrar: () => acciones.push("cerrar"), confirmar: () => acciones.push("confirmar"),
    reload: async () => { acciones.push("reload"); throw new Error("fallo lectura"); },
    errorRefresh: () => acciones.push("errorRefresh"),
  });
  assert.equal(await confirmar(archivo()), true);
  assert.deepEqual(acciones, ["cerrar", "confirmar", "reload", "errorRefresh"]);
  assert.equal(await confirmar(archivo()), false);
});

test("requiereRevision sobrevive a cerrar/reabrir y un idle no elimina alerta", () => {
  const clave = "prueba-revision";
  const registro = registroEscritura(clave);
  let avisos = 0;
  const cancelar = registro.suscribir(() => { avisos++; });
  registro.publicar({ estado: "uploading", requiereRevision: false });
  assert.equal(registro.leer().subiendo, true);
  registro.publicar({ estado: "error", requiereRevision: true });
  cancelar();
  const reabierto = registroEscritura(clave);
  assert.strictEqual(reabierto, registro);
  reabierto.publicar({ estado: "idle", requiereRevision: false });
  assert.deepEqual(reabierto.leer(), { subiendo: false, requiereRevision: true });
  assert.equal(avisos, 2);
});

test("terminar fuera de la pestaña comunica confirmación solo al mismo contexto", () => {
  const registro = registroEscritura("prueba-pendiente");
  const otra = registroEscritura("prueba-otra-ficha");
  registro.publicar({ estado: "uploading", requiereRevision: false });
  const cancelarOtra = otra.observarConfirmacion(() => assert.fail("No confirmar otra ficha"));
  let confirmada: Archivo | undefined;
  const cancelarEstado = registro.suscribir(() => {});
  const cancelar = registro.observarConfirmacion((datos) => { confirmada = datos; });
  registro.publicar({ estado: "success", requiereRevision: false, archivo: archivo() });
  assert.equal(confirmada?.id, OTRO);
  assert.equal(registro.leer().subiendo, false);
  cancelar(); cancelarOtra(); cancelarEstado();
});

function lecturaSimulada(data: { id: string; clinica_id: string } | null, error: unknown = null) {
  const llamadas: unknown[][] = [];
  const consulta = {
    select(columnas: string) { llamadas.push(["select", columnas]); return consulta; },
    eq(campo: string, valor: string) { llamadas.push(["eq", campo, valor]); return consulta; },
    async maybeSingle() { llamadas.push(["maybeSingle"]); return { data, error }; },
  };
  const cliente = { schema(esquema: string) {
    llamadas.push(["schema", esquema]);
    return { from(tabla: string) { llamadas.push(["from", tabla]); return consulta; } };
  } } as unknown as SupabaseClient;
  return { cliente, llamadas };
}

test("contexto real consulta únicamente id y clínica, bajo public.pacientes", async () => {
  const fake = lecturaSimulada({ id: PACIENTE, clinica_id: CLINICA });
  assert.deepEqual(await cargarContextoPacienteArchivos(PACIENTE, fake.cliente), { pacienteId: PACIENTE, clinicaId: CLINICA });
  assert.deepEqual(fake.llamadas, [["schema", "public"], ["from", "pacientes"], ["select", "id,clinica_id"], ["eq", "id", PACIENTE], ["maybeSingle"]]);
});

test("contexto inválido/no visible/error no habilita subida ni inventa clínica", async () => {
  const fake = lecturaSimulada(null);
  await assert.rejects(cargarContextoPacienteArchivos("p1", fake.cliente), /UUID/);
  assert.deepEqual(fake.llamadas, []);
  for (const consulta of [fake, lecturaSimulada(null, { message: "detalle técnico" }),
    lecturaSimulada({ id: OTRO, clinica_id: CLINICA }), lecturaSimulada({ id: PACIENTE, clinica_id: "demo" })]) {
    await assert.rejects(cargarContextoPacienteArchivos(PACIENTE, consulta.cliente), /confirmar el contexto/);
  }
});

test("mensajes de subida no exponen rutas/tokens y mantienen revisión pendiente", () => {
  assert.match(mensajePublicoSubida({ etapa: "confirmacion", requiereRevision: true }), /Revisa el intento/);
  assert.match(mensajePublicoSubida({ etapa: "autoria", requiereRevision: false }), /acceso/);
});

test("tab archivos válido conserva navegación de ficha y rechaza valores ajenos", () => {
  assert.equal(esTabValida("archivos"), true);
  assert.equal(esTabValida("evolucion"), true);
  assert.equal(esTabValida("pagos"), true);
  assert.equal(esTabValida("archivo"), false);
});

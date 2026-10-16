/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cargarArchivos, crearUrlArchivo, descargarArchivo, ErrorSubidaArchivo, ErrorSubidaImagen, subirArchivo, subirDocumento } from "./archivoService.ts";
import { MENSAJES_DESCARGA } from "./archivoDescarga.ts";
import { archivoDesdeFila } from "./archivoMapper.ts";
import type { ArchivoFila, ArchivoPayload } from "./archivoMapper.ts";
import type { SubidaDocumento, SubidaImagen } from "./tipos.ts";

const CLINICA = "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA";
const PACIENTE = "BBBBBBBB-BBBB-4BBB-8BBB-BBBBBBBBBBBB";
const PERFIL = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const AUTH = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const RECHAZO = { code: "42501", message: "new row violates row-level security policy" };

function descargaSimulada(opciones: {
  fila?: ArchivoFila | null; errorConsulta?: unknown; excepcionConsulta?: Error;
  blob?: Blob | null; errorStorage?: unknown; excepcionStorage?: Error;
} = {}) {
  const llamadas: unknown[][] = [];
  const consulta = {
    select(columnas: string) { llamadas.push(["select", columnas]); return consulta; },
    eq(campo: string, valor: string) { llamadas.push(["eq", campo, valor]); return consulta; },
    abortSignal(signal: AbortSignal) { llamadas.push(["signalConsulta", signal]); return consulta; },
    async maybeSingle() {
      llamadas.push(["maybeSingle"]);
      if (opciones.excepcionConsulta) throw opciones.excepcionConsulta;
      return { data: "fila" in opciones ? opciones.fila : filaGaleria(), error: opciones.errorConsulta ?? null };
    },
  };
  const cliente = {
    schema(nombre: string) {
      llamadas.push(["schema", nombre]);
      return { from(tabla: string) { llamadas.push(["tabla", tabla]); return consulta; } };
    },
    storage: {
      from(bucket: string) {
        llamadas.push(["bucket", bucket]);
        // Sin API de URLs: cualquier uso de firmas/getPublicUrl haría fallar el test.
        return {
          async download(ruta: string, opcionesStorage: object, parametros: { signal?: AbortSignal }) {
            llamadas.push(["download", ruta, opcionesStorage, parametros.signal]);
            if (opciones.excepcionStorage) throw opciones.excepcionStorage;
            return { data: "blob" in opciones ? opciones.blob : new Blob(["bytes"], { type: "image/jpeg" }), error: opciones.errorStorage ?? null };
          },
        };
      },
    },
  } as unknown as SupabaseClient;
  return { cliente, llamadas };
}

for (const [mime, extension] of [["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"], ["application/pdf", "pdf"]]) {
  test(`descarga autenticada ${extension}: fila real, nombre original, ruta y MIME`, async () => {
    const fila: ArchivoFila = { ...filaGaleria(), nombre: `Nombre clínico original.${extension}`, mime,
      tipo_archivo: mime === "application/pdf" ? "documento" : "radiografia", categoria: "administrativo",
      ruta: `${CLINICA.toLowerCase()}/${PACIENTE.toLowerCase()}/uuid-interno.${extension}` };
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: mime });
    const fake = descargaSimulada({ fila, blob });
    const controller = new AbortController();
    const resultado = await descargarArchivo(ID, PACIENTE, fake.cliente, controller.signal);
    assert.equal(resultado.archivo.nombre, fila.nombre);
    assert.equal(resultado.archivo.ruta, fila.ruta);
    assert.strictEqual(resultado.blob, blob);
    assert.equal(resultado.blob.type, mime);
    assert.deepEqual(fake.llamadas, [
      ["schema", "public"], ["tabla", "archivos"],
      ["select", "id,clinica_id,paciente_id,nombre,ruta,mime,tamano,categoria,tipo_archivo,descripcion,subido_por,creado_en,evolucion_clinica_id,plan_tratamiento_id"],
      ["eq", "id", ID], ["eq", "paciente_id", PACIENTE], ["signalConsulta", controller.signal],
      ["maybeSingle"], ["bucket", "archivos-clinica"], ["download", fila.ruta, {}, controller.signal],
    ]);
  });
}

test("descarga valida ambos UUID y señal cancelada antes de red", async () => {
  const fake = descargaSimulada();
  await assert.rejects(descargarArchivo("demo", PACIENTE, fake.cliente), /UUID/);
  await assert.rejects(descargarArchivo(ID, "p1", fake.cliente), /UUID/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(descargarArchivo(ID, PACIENTE, fake.cliente, controller.signal), { name: "AbortError" });
  assert.deepEqual(fake.llamadas, []);
});

test("descarga rechaza consulta, fila invisible y fila de otro paciente sin tocar Storage", async () => {
  for (const [opciones, mensaje] of [
    [{ errorConsulta: RECHAZO }, MENSAJES_DESCARGA.sin_permiso],
    [{ errorConsulta: { message: "detalle privado" } }, MENSAJES_DESCARGA.storage],
    [{ excepcionConsulta: new TypeError("Failed to fetch") }, MENSAJES_DESCARGA.red],
    [{ fila: null }, MENSAJES_DESCARGA.no_visible],
    [{ fila: { ...filaGaleria(), id: AUTH } }, MENSAJES_DESCARGA.no_visible],
    [{ fila: { ...filaGaleria(), paciente_id: AUTH, ruta: `${CLINICA.toLowerCase()}/${AUTH}/foto.jpg` } }, MENSAJES_DESCARGA.no_visible],
  ] as const) {
    const fake = descargaSimulada(opciones);
    await assert.rejects(descargarArchivo(ID, PACIENTE, fake.cliente), (error: Error) => error.message === mensaje);
    assert.equal(fake.llamadas.some(([tipo]) => tipo === "bucket"), false);
  }
});

test("descarga transforma errores de Storage en mensajes amigables", async () => {
  for (const [opciones, mensaje] of [
    [{ errorStorage: { status: 403, statusCode: "AccessDenied", message: "ruta privada" } }, MENSAJES_DESCARGA.sin_permiso],
    [{ errorStorage: { statusCode: "404", code: "NoSuchKey" } }, MENSAJES_DESCARGA.no_encontrado],
    [{ errorStorage: { status: 500, message: "servidor interno" } }, MENSAJES_DESCARGA.storage],
    [{ excepcionStorage: new TypeError("Failed to fetch") }, MENSAJES_DESCARGA.red],
  ] as const) {
    const fake = descargaSimulada(opciones);
    await assert.rejects(descargarArchivo(ID, PACIENTE, fake.cliente), (error: Error) => error.message === mensaje);
  }
});

test("descarga rechaza Blob nulo, vacío, MIME contradictorio y metadatos inválidos", async () => {
  for (const fake of [
    descargaSimulada({ blob: null }), descargaSimulada({ blob: new Blob([]) }),
    descargaSimulada({ blob: new Blob(["pdf"], { type: "application/pdf" }) }),
    descargaSimulada({ fila: { ...filaGaleria(), mime: "image/gif" } }),
  ]) {
    await assert.rejects(descargarArchivo(ID, PACIENTE, fake.cliente), (error: Error) => error.message === MENSAJES_DESCARGA.invalida);
  }
});

test("MIME vacío u octet-stream se normaliza sin alterar bytes", async () => {
  for (const mime of ["", "application/octet-stream"]) {
    const blob = new Blob([new Uint8Array([0, 1, 255])], { type: mime });
    const resultado = await descargarArchivo(ID, PACIENTE, descargaSimulada({ blob }).cliente);
    assert.equal(resultado.blob.type, "image/jpeg");
    assert.deepEqual(await resultado.blob.arrayBuffer(), await blob.arrayBuffer());
  }
});

function filaGaleria(): ArchivoFila {
  return {
    id: ID, clinica_id: CLINICA.toLowerCase(), paciente_id: PACIENTE.toLowerCase(),
    nombre: "foto.jpg", ruta: `${CLINICA.toLowerCase()}/${PACIENTE.toLowerCase()}/objeto.jpg`,
    mime: "image/jpeg", tamano: 12, categoria: "clinico", tipo_archivo: "fotografia",
    descripcion: null, subido_por: PERFIL, creado_en: "2026-10-04T14:00:00Z",
    evolucion_clinica_id: null, plan_tratamiento_id: null,
  };
}

function lecturaSimulada(respuesta: { data: ArchivoFila[] | null; error: unknown }, excepcion?: Error) {
  const llamadas: unknown[][] = [];
  const consulta = {
    select(columnas: string) { llamadas.push(["select", columnas]); return consulta; },
    eq(campo: string, valor: string) { llamadas.push(["eq", campo, valor]); return consulta; },
    order(campo: string, opciones: { ascending: boolean }) { llamadas.push(["order", campo, opciones]); return consulta; },
    then(resolve: (valor: typeof respuesta) => unknown, reject: (causa: Error) => unknown) {
      return (excepcion ? Promise.reject(excepcion) : Promise.resolve(respuesta)).then(resolve, reject);
    },
  };
  const cliente = {
    schema(esquema: string) {
      llamadas.push(["schema", esquema]);
      return { from(tabla: string) { llamadas.push(["from", tabla]); return consulta; } };
    },
  } as unknown as SupabaseClient;
  return { cliente, llamadas };
}

test("galería consulta public.archivos con columnas, paciente y orden descendente explícitos", async () => {
  const original = filaGaleria();
  const fake = lecturaSimulada({ data: [original], error: null });
  const resultado = await cargarArchivos(PACIENTE, fake.cliente);
  assert.deepEqual(fake.llamadas, [
    ["schema", "public"], ["from", "archivos"],
    ["select", "id,clinica_id,paciente_id,nombre,ruta,mime,tamano,categoria,tipo_archivo,descripcion,subido_por,creado_en,evolucion_clinica_id,plan_tratamiento_id"],
    ["eq", "paciente_id", PACIENTE],
    ["order", "creado_en", { ascending: false }], ["order", "id", { ascending: false }],
  ]);
  assert.deepEqual(resultado, [archivoDesdeFila(original)]);
});

test("galería rechaza UUID demo antes de tocar la red", async () => {
  const fake = lecturaSimulada({ data: [], error: null });
  await assert.rejects(cargarArchivos("p1", fake.cliente), /UUID/);
  assert.deepEqual(fake.llamadas, []);
});

test("galería acepta [] y conserva el orden recibido sin reordenar el mapper", async () => {
  const vacio = lecturaSimulada({ data: [], error: null });
  assert.deepEqual(await cargarArchivos(PACIENTE, vacio.cliente), []);
  const primero = filaGaleria();
  const segundo = { ...primero, id: AUTH, creado_en: "2026-10-03T14:00:00Z" };
  const fake = lecturaSimulada({ data: [primero, segundo], error: null });
  assert.deepEqual((await cargarArchivos(PACIENTE, fake.cliente)).map((archivo) => archivo.id), [ID, AUTH]);
});

test("galería no confunde error, excepción o data null con lista vacía", async () => {
  for (const fake of [
    lecturaSimulada({ data: null, error: { message: "consulta rechazada" } }),
    lecturaSimulada({ data: null, error: null }),
    lecturaSimulada({ data: [], error: null }, new Error("fallo de transporte")),
  ]) {
    await assert.rejects(cargarArchivos(PACIENTE, fake.cliente));
  }
});

function firmaSimulada(respuesta: { data: { signedUrl?: string } | null; error: unknown }, excepcion?: Error) {
  const llamadas: unknown[][] = [];
  const cliente = {
    storage: {
      from(bucket: string) {
        llamadas.push(["bucket", bucket]);
        return {
          async createSignedUrl(ruta: string, segundos: number) {
            llamadas.push(["firma", ruta, segundos]);
            if (excepcion) throw excepcion;
            return respuesta;
          },
        };
      },
    },
  } as unknown as SupabaseClient;
  return { cliente, llamadas };
}

test("firma utiliza bucket privado, ruta real y 300 segundos o duración explícita", async () => {
  const archivo = archivoDesdeFila(filaGaleria());
  const fake = firmaSimulada({ data: { signedUrl: "https://ejemplo.test/firmada" }, error: null });
  assert.equal(await crearUrlArchivo(archivo, undefined, fake.cliente), "https://ejemplo.test/firmada");
  await crearUrlArchivo(archivo, 120, fake.cliente);
  assert.deepEqual(fake.llamadas, [
    ["bucket", "archivos-clinica"], ["firma", archivo.ruta, 300],
    ["bucket", "archivos-clinica"], ["firma", archivo.ruta, 120],
  ]);
});

test("firma rechaza errores, excepciones y URLs ausentes o vacías", async () => {
  for (const respuesta of [
    { data: null, error: { message: "sin permiso" } },
    { data: null, error: null }, { data: {}, error: null },
    { data: { signedUrl: "" }, error: null }, { data: { signedUrl: "   " }, error: null },
  ]) {
    await assert.rejects(crearUrlArchivo(archivoDesdeFila(filaGaleria()), 300, firmaSimulada(respuesta).cliente));
  }
  await assert.rejects(crearUrlArchivo(archivoDesdeFila(filaGaleria()), 300,
    firmaSimulada({ data: null, error: null }, new Error("red")).cliente), /red/);
});

function datos(cambios: Partial<SubidaImagen> = {}): SubidaImagen {
  return {
    archivo: new File(["imagen"], "Nombre clínico privado.JPEG", { type: "image/jpeg" }),
    clinicaId: CLINICA, pacienteId: PACIENTE, subidoPor: PERFIL,
    tipoArchivo: "fotografia", descripcion: "  Control  ", ...cambios,
  };
}

function documento(cambios: Partial<SubidaDocumento> = {}): SubidaDocumento {
  return {
    archivo: new File(["contenido PDF de prueba"], "Informe clínico privado.PDF", { type: "application/pdf" }),
    clinicaId: CLINICA, pacienteId: PACIENTE, subidoPor: PERFIL, descripcion: "  Informe  ", ...cambios,
  };
}

function guardada(payload: ArchivoPayload): ArchivoFila {
  return { ...payload, id: ID, creado_en: "2026-10-04T14:00:00Z" };
}

type Opciones = {
  entidad?: { id: string; paciente_id: string; clinica_id: string } | null;
  errorEntidad?: unknown;
  permisoAsociacion?: boolean;
  errorPermisoAsociacion?: unknown;
  sinUsuario?: boolean;
  errorAuth?: unknown;
  perfil?: { id: string; auth_user_id: string; activo: boolean; rol?: string } | null;
  errorPerfil?: unknown;
  errorUpload?: unknown;
  excepcionUpload?: Error;
  uploadSinDatos?: boolean;
  errorInsert?: unknown;
  excepcionInsert?: Error;
  insertSinFila?: boolean;
  filaInsert?: (payload: ArchivoPayload) => ArchivoFila;
  recuperar?: boolean;
  filaRecuperada?: (payload: ArchivoPayload) => ArchivoFila;
  errorRecuperacion?: unknown;
  excepcionRecuperacion?: Error;
  errorLimpieza?: unknown;
  excepcionLimpieza?: Error;
  limpiezaVacia?: boolean;
};

/** Simula Auth, PostgREST y Storage sin red ni credenciales. */
function simulado(opciones: Opciones = {}) {
  const llamadas: string[] = [];
  const filtrosPerfil: [string, unknown][] = [];
  const columnasPerfil: string[] = [];
  const filtrosRecuperacion: [string, unknown][] = [];
  const filtrosDestino: [string, unknown][] = [];
  const rutas: string[] = [];
  const borradas: string[][] = [];
  const uploads: { file: File; opciones: { contentType: string; upsert: boolean } }[] = [];
  const payloads: ArchivoPayload[] = [];
  const columnas: string[] = [];
  const cliente = {
    auth: {
      async getUser() {
        llamadas.push("auth");
        return { data: { user: opciones.sinUsuario ? null : { id: AUTH } }, error: opciones.errorAuth ?? null };
      },
    },
    schema(esquema: string) {
      assert.equal(esquema, "public");
      return {
        from(nombre: string) {
          if (nombre === "evoluciones_clinicas" || nombre === "planes_tratamiento") {
            const consulta = {
              select() { return consulta; },
              eq(campo: string, valor: unknown) { filtrosDestino.push([campo, valor]); return consulta; },
              async maybeSingle() {
                llamadas.push("destino");
                return { data: "entidad" in opciones ? opciones.entidad : { id: ID, paciente_id: PACIENTE.toLowerCase(), clinica_id: CLINICA.toLowerCase() }, error: opciones.errorEntidad ?? null };
              },
            };
            return consulta;
          }
          if (nombre === "perfiles") {
            const consulta = {
              select(valor: string) { columnasPerfil.push(valor); return consulta; },
              eq(campo: string, valor: unknown) { filtrosPerfil.push([campo, valor]); return consulta; },
              async maybeSingle() {
                llamadas.push("perfil");
                return { data: "perfil" in opciones ? opciones.perfil : { id: PERFIL, auth_user_id: AUTH, activo: true, rol: "odontologo" }, error: opciones.errorPerfil ?? null };
              },
            };
            return consulta;
          }
          assert.equal(nombre, "archivos");
          const consulta = {
            select(valor: string) { columnas.push(valor); return consulta; },
            eq(campo: string, valor: unknown) { filtrosRecuperacion.push([campo, valor]); return consulta; },
            insert(payload: ArchivoPayload) { llamadas.push("insert"); payloads.push(payload); return consulta; },
            async single() {
              if (opciones.excepcionInsert) throw opciones.excepcionInsert;
              const payload = payloads[payloads.length - 1];
              return {
                data: opciones.insertSinFila || opciones.errorInsert ? null : (opciones.filaInsert ?? guardada)(payload),
                error: opciones.errorInsert ?? null,
              };
            },
            async maybeSingle() {
              llamadas.push("recuperar");
              if (opciones.excepcionRecuperacion) throw opciones.excepcionRecuperacion;
              const payload = payloads[payloads.length - 1];
              return {
                data: opciones.recuperar ? (opciones.filaRecuperada ?? guardada)(payload) : null,
                error: opciones.errorRecuperacion ?? null,
              };
            },
          };
          return consulta;
        },
      };
    },
    async rpc(nombre: string) {
      assert.equal(nombre, "archivos_asociacion_autorizada");
      llamadas.push("permisoAsociacion");
      return { data: opciones.permisoAsociacion ?? true, error: opciones.errorPermisoAsociacion ?? null };
    },
    storage: {
      from(bucket: string) {
        assert.equal(bucket, "archivos-clinica");
        return {
          async upload(ruta: string, file: File, opcionesUpload: { contentType: string; upsert: boolean }) {
            llamadas.push("upload"); rutas.push(ruta); uploads.push({ file, opciones: opcionesUpload });
            if (opciones.excepcionUpload) throw opciones.excepcionUpload;
            return { data: opciones.uploadSinDatos || opciones.errorUpload ? null : { path: ruta }, error: opciones.errorUpload ?? null };
          },
          async remove(objetos: string[]) {
            llamadas.push("remove"); borradas.push(objetos);
            if (opciones.excepcionLimpieza) throw opciones.excepcionLimpieza;
            return {
              data: opciones.limpiezaVacia ? [] : objetos.map((name) => ({ name })),
              error: opciones.errorLimpieza ?? null,
            };
          },
        };
      },
    },
  } as unknown as SupabaseClient;
  return { cliente, llamadas, filtrosPerfil, columnasPerfil, filtrosRecuperacion, filtrosDestino, rutas, borradas, uploads, payloads, columnas };
}

async function exigirError(promesa: Promise<unknown>): Promise<ErrorSubidaImagen> {
  try {
    await promesa;
    assert.fail("La subida debía fallar");
  } catch (causa) {
    assert.ok(causa instanceof ErrorSubidaImagen);
    return causa;
  }
}

test("sube objeto antes de insertar, con datos del File y fila real confirmada", async () => {
  const fake = simulado({ filaInsert: (payload) => ({ ...guardada(payload), descripcion: "Respuesta real de la base" }) });
  const entrada = datos();
  const resultado = await subirArchivo(entrada, fake.cliente);
  assert.deepEqual(fake.llamadas, ["auth", "perfil", "upload", "insert"]);
  assert.deepEqual(fake.uploads[0].opciones, { contentType: entrada.archivo.type, upsert: false });
  assert.strictEqual(fake.uploads[0].file, entrada.archivo);
  const payload = fake.payloads[0];
  assert.equal(payload.nombre, entrada.archivo.name);
  assert.equal(payload.mime, entrada.archivo.type);
  assert.equal(payload.tamano, entrada.archivo.size);
  assert.equal(payload.categoria, "clinico");
  assert.equal(payload.tipo_archivo, "fotografia");
  assert.equal(payload.subido_por, PERFIL);
  assert.notEqual(payload.subido_por, AUTH);
  assert.equal(payload.descripcion, "Control");
  assert.equal(payload.ruta, fake.rutas[0]);
  assert.equal(payload.ruta.includes(entrada.archivo.name), false);
  assert.equal(payload.ruta.split("/").length, 3);
  assert.equal(payload.ruta.startsWith(`${CLINICA.toLowerCase()}/${PACIENTE.toLowerCase()}/`), true);
  assert.match(payload.ruta, /\.jpg$/);
  assert.equal("id" in payload, false);
  assert.equal("creado_en" in payload, false);
  assert.equal(fake.columnas[0].includes("tipo_archivo"), true);
  assert.equal(resultado.id, ID);
  assert.equal(resultado.creadoEl, "2026-10-04T14:00:00Z");
  assert.equal(resultado.descripcion, "Respuesta real de la base");
  assert.deepEqual(fake.filtrosPerfil, [["id", PERFIL], ["auth_user_id", AUTH], ["activo", true]]);
});

test("radiografía explícita, PNG y WEBP mantienen clasificación y extensión canónica", async () => {
  for (const [mime, extension] of [["image/png", "png"], ["image/webp", "webp"]]) {
    const fake = simulado();
    const resultado = await subirArchivo(datos({ archivo: new File(["abc"], `imagen.${extension.toUpperCase()}`, { type: mime }), tipoArchivo: "radiografia" }), fake.cliente);
    assert.equal(resultado.tipoArchivo, "radiografia");
    assert.equal(fake.payloads[0].tipo_archivo, "radiografia");
    assert.equal(fake.payloads[0].mime, mime);
    assert.match(resultado.ruta, new RegExp(`\\.${extension}$`));
  }
});

test("cada intento tiene una ruta nueva incluso después de un rechazo", async () => {
  const fake = simulado({ errorInsert: RECHAZO });
  await exigirError(subirArchivo(datos(), fake.cliente));
  await exigirError(subirArchivo(datos(), fake.cliente));
  assert.notEqual(fake.rutas[0], fake.rutas[1]);
});

test("ids demo, PDF y clasificación incorrecta se rechazan antes de tocar la red", async () => {
  for (const cambios of [
    { pacienteId: "p1" }, { clinicaId: "p_123" }, { subidoPor: "p2" },
    { tipoArchivo: "documento" as SubidaImagen["tipoArchivo"] },
    { archivo: new File(["pdf"], "informe.pdf", { type: "application/pdf" }) },
  ]) {
    const fake = simulado();
    const error = await exigirError(subirArchivo(datos(cambios), fake.cliente));
    assert.equal(error.etapa, "validacion");
    assert.deepEqual(fake.llamadas, []);
  }
});

test("usuario ausente y perfiles ajenos/inactivos impiden subir", async () => {
  for (const opciones of [
    { sinUsuario: true }, { perfil: null },
    { perfil: { id: PERFIL, auth_user_id: "otro", activo: true } },
    { perfil: { id: AUTH, auth_user_id: AUTH, activo: true } },
    { perfil: { id: PERFIL, auth_user_id: AUTH, activo: false } },
    { errorPerfil: { message: "permission denied" } },
  ]) {
    const fake = simulado(opciones);
    assert.equal((await exigirError(subirArchivo(datos(), fake.cliente))).etapa, "autoria");
    assert.equal(fake.llamadas.includes("upload"), false);
    assert.equal(fake.llamadas.includes("insert"), false);
  }
});

test("fallo de Storage no intenta INSERT ni borrar un objeto posiblemente ajeno", async () => {
  const fake = simulado({ errorUpload: { message: "Object already exists", statusCode: "409" } });
  assert.equal((await exigirError(subirArchivo(datos(), fake.cliente))).etapa, "subida");
  assert.equal(fake.llamadas.includes("insert"), false);
  assert.equal(fake.llamadas.includes("remove"), false);
});

test("excepción o respuesta sin datos de Storage no anuncia éxito", async () => {
  for (const opciones of [{ excepcionUpload: new Error("timeout") }, { uploadSinDatos: true }]) {
    const fake = simulado(opciones);
    const error = await exigirError(subirArchivo(datos(), fake.cliente));
    assert.equal(error.etapa, "subida");
    assert.equal(error.requiereRevision, true);
    assert.equal(fake.llamadas.includes("insert"), false);
  }
});

test("rechazo SQL confirmado compensa solo la ruta exacta y conserva la causa", async () => {
  const fake = simulado({ errorInsert: RECHAZO });
  const error = await exigirError(subirArchivo(datos(), fake.cliente));
  assert.equal(error.etapa, "registro");
  assert.equal(error.limpieza, "confirmada");
  assert.strictEqual(error.errorOriginal, RECHAZO);
  assert.equal(error.ruta, fake.rutas[0]);
  assert.deepEqual(fake.borradas, [[fake.rutas[0]]]);
  assert.match(error.message, /objeto fue retirado/);
  assert.equal(fake.llamadas.includes("recuperar"), false);
});

test("limpieza fallida conserva ambas causas y exige revisión", async () => {
  const causaLimpieza = { message: "permission denied" };
  const fake = simulado({ errorInsert: RECHAZO, errorLimpieza: causaLimpieza });
  const error = await exigirError(subirArchivo(datos(), fake.cliente));
  assert.equal(error.etapa, "limpieza");
  assert.equal(error.limpieza, "fallida");
  assert.strictEqual(error.errorOriginal, RECHAZO);
  assert.strictEqual(error.errorLimpieza, causaLimpieza);
  assert.equal(error.requiereRevision, true);
});

test("limpieza vacía o con excepción queda incierta, no confirmada", async () => {
  for (const opciones of [{ limpiezaVacia: true }, { excepcionLimpieza: new Error("fetch failed") }]) {
    const fake = simulado({ errorInsert: RECHAZO, ...opciones });
    const error = await exigirError(subirArchivo(datos(), fake.cliente));
    assert.equal(error.limpieza, "incierta");
    assert.ok(error.errorLimpieza);
    assert.equal(error.requiereRevision, true);
  }
});

test("timeout de INSERT recupera una fila compatible por ruta, sin borrar ni reintentar", async () => {
  const fake = simulado({ excepcionInsert: new Error("timeout"), recuperar: true });
  const resultado = await subirArchivo(datos(), fake.cliente);
  assert.equal(resultado.id, ID);
  assert.deepEqual(fake.filtrosRecuperacion, [["clinica_id", CLINICA.toLowerCase()], ["paciente_id", PACIENTE.toLowerCase()], ["ruta", fake.rutas[0]]]);
  assert.equal(fake.llamadas.filter((valor) => valor === "upload").length, 1);
  assert.equal(fake.llamadas.filter((valor) => valor === "insert").length, 1);
  assert.equal(fake.borradas.length, 0);
});

test("respuesta sin fila se recupera sin tratar null como éxito", async () => {
  const fake = simulado({ insertSinFila: true, recuperar: true });
  assert.equal((await subirArchivo(datos(), fake.cliente)).id, ID);
  assert.equal(fake.llamadas.includes("recuperar"), true);
  assert.equal(fake.borradas.length, 0);
});

test("error de transporte devuelto por el cliente también se recupera", async () => {
  for (const code of ["", "EPIPE", "ETIMEDOUT", "PGRST116"]) {
    const fake = simulado({ errorInsert: { code, message: "Respuesta no confirmada" }, recuperar: true });
    assert.equal((await subirArchivo(datos(), fake.cliente)).id, ID);
    assert.equal(fake.borradas.length, 0);
  }
});

test("registro no confirmado mantiene ruta y causas sin borrar ni volver a subir", async () => {
  for (const opciones of [
    {}, { errorRecuperacion: { message: "RLS" } },
    { excepcionRecuperacion: new Error("fetch failed") },
    { recuperar: true, filaRecuperada: (payload: ArchivoPayload) => ({ ...guardada(payload), subido_por: AUTH }) },
  ]) {
    const causa = new Error("timeout");
    const fake = simulado({ excepcionInsert: causa, ...opciones });
    const error = await exigirError(subirArchivo(datos(), fake.cliente));
    assert.equal(error.etapa, "confirmacion");
    assert.equal(error.limpieza, "no_intentada");
    assert.equal(error.requiereRevision, true);
    assert.strictEqual(error.errorOriginal, causa);
    assert.ok(error.errorConfirmacion);
    assert.equal(error.ruta, fake.rutas[0]);
    assert.match(error.message, /Registro no confirmado/);
    assert.equal(fake.borradas.length, 0);
    assert.equal(fake.rutas.length, 1);
  }
});

test("una fila incompatible del INSERT no se acepta como resultado", async () => {
  const fake = simulado({ filaInsert: (payload) => ({ ...guardada(payload), tipo_archivo: "documento" }) });
  const error = await exigirError(subirArchivo(datos(), fake.cliente));
  assert.equal(error.etapa, "confirmacion");
  assert.equal(fake.llamadas.includes("recuperar"), true);
  assert.equal(fake.borradas.length, 0);
});

test("el error común conserva compatibilidad de constructor e instanceof con imágenes", () => {
  assert.strictEqual(ErrorSubidaImagen, ErrorSubidaArchivo);
  const error = new ErrorSubidaArchivo("Prueba", { etapa: "registro" });
  assert.ok(error instanceof ErrorSubidaImagen);
  assert.equal(error.name, "ErrorSubidaArchivo");
});

test("PDF deriva categoría del perfil real y devuelve la fila confirmada", async () => {
  for (const [rol, categoria] of [["odontologo", "clinico"], ["odontologo_admin", "clinico"], ["recepcionista", "administrativo"]]) {
    const fake = simulado({ perfil: { id: PERFIL, auth_user_id: AUTH, activo: true, rol } });
    const entrada = documento();
    const resultado = await subirDocumento(entrada, fake.cliente);
    assert.deepEqual(fake.llamadas, ["auth", "perfil", "upload", "insert"]);
    assert.equal(fake.columnasPerfil[0].includes("rol"), true);
    assert.deepEqual(fake.uploads[0].opciones, { contentType: "application/pdf", upsert: false });
    assert.strictEqual(fake.uploads[0].file, entrada.archivo);
    const payload = fake.payloads[0];
    assert.equal(payload.categoria, categoria);
    assert.equal(payload.tipo_archivo, "documento");
    assert.equal(payload.nombre, entrada.archivo.name);
    assert.equal(payload.mime, entrada.archivo.type);
    assert.equal(payload.tamano, entrada.archivo.size);
    assert.equal(payload.descripcion, "Informe");
    assert.equal(payload.subido_por, PERFIL);
    assert.notEqual(payload.subido_por, AUTH);
    assert.equal(payload.ruta, fake.rutas[0]);
    assert.equal(payload.ruta.split("/").length, 3);
    assert.equal(payload.ruta.startsWith(`${CLINICA.toLowerCase()}/${PACIENTE.toLowerCase()}/`), true);
    assert.match(payload.ruta, /\.pdf$/);
    assert.equal(payload.ruta.includes(entrada.archivo.name), false);
    assert.equal("id" in payload, false);
    assert.equal("creado_en" in payload, false);
    assert.equal(resultado.id, ID);
    assert.equal(resultado.creadoEl, "2026-10-04T14:00:00Z");
    assert.equal(resultado.categoria, categoria);
    assert.equal(resultado.tipoArchivo, "documento");
    assert.deepEqual(fake.filtrosPerfil, [["id", PERFIL], ["auth_user_id", AUTH], ["activo", true]]);
  }
});

test("PDF ignora categoría, clasificación, rol y metadatos extras enviados desde fuera", async () => {
  const fake = simulado({ perfil: { id: PERFIL, auth_user_id: AUTH, activo: true, rol: "recepcionista" } });
  const entrada = {
    ...documento({ descripcion: "   " }), categoria: "portal", tipoArchivo: "fotografia",
    rol: "odontologo", ruta: "falsa", mime: "image/png", tamano: 999, nombre: "falso", id: "falso", creado_en: "falso",
  };
  await subirDocumento(entrada, fake.cliente);
  const payload = fake.payloads[0];
  assert.equal(payload.categoria, "administrativo");
  assert.equal(payload.tipo_archivo, "documento");
  assert.equal(payload.mime, "application/pdf");
  assert.equal(payload.tamano, entrada.archivo.size);
  assert.equal(payload.nombre, entrada.archivo.name);
  assert.notEqual(payload.ruta, entrada.ruta);
  assert.equal(payload.descripcion, null);
  assert.equal("id" in payload, false);
  assert.equal("creado_en" in payload, false);
});

test("PDF rechaza roles no soportados antes de generar ruta o subir", async (contexto) => {
  contexto.mock.method(globalThis.crypto, "randomUUID", () => { throw new Error("No generar ruta para roles incompatibles"); });
  for (const rol of ["paciente", "otro", undefined]) {
    const fake = simulado({ perfil: { id: PERFIL, auth_user_id: AUTH, activo: true, rol } });
    const error = await exigirError(subirDocumento(documento(), fake.cliente));
    assert.equal(error.etapa, "autoria");
    assert.match(error.message, /odontologo o recepcionista/);
    assert.equal(fake.rutas.length, 0);
    assert.equal(fake.payloads.length, 0);
  }
});

test("PDF rechaza usuario ausente, perfil ajeno, autor distinto y perfil inactivo", async () => {
  for (const opciones of [
    { sinUsuario: true }, { perfil: null },
    { perfil: { id: PERFIL, auth_user_id: "otro", activo: true, rol: "odontologo" } },
    { perfil: { id: AUTH, auth_user_id: AUTH, activo: true, rol: "odontologo" } },
    { perfil: { id: PERFIL, auth_user_id: AUTH, activo: false, rol: "odontologo" } },
  ]) {
    const fake = simulado(opciones);
    const error = await exigirError(subirDocumento(documento(), fake.cliente));
    assert.equal(error.etapa, "autoria");
    assert.equal(fake.llamadas.includes("upload"), false);
    assert.equal(fake.llamadas.includes("insert"), false);
  }
});

test("PDF valida UUID y formato antes de realizar consultas de red", async () => {
  for (const cambios of [
    { pacienteId: "p1" }, { clinicaId: "p_demo" }, { subidoPor: "auth_inventado" },
    { archivo: datos().archivo },
    { archivo: new File(["pdf"], "informe.pdf", { type: "" }) },
    { archivo: new File(["pdf"], "informe.txt", { type: "application/pdf" }) },
    { archivo: new File([], "informe.pdf", { type: "application/pdf" }) },
  ]) {
    const fake = simulado();
    assert.equal((await exigirError(subirDocumento(documento(cambios), fake.cliente))).etapa, "validacion");
    assert.deepEqual(fake.llamadas, []);
  }
});

test("PDF: Storage falla o no se confirma y no se intenta INSERT ni remove", async () => {
  for (const opciones of [
    { errorUpload: { message: "denied", statusCode: "403" } },
    { excepcionUpload: new Error("timeout") }, { uploadSinDatos: true },
  ]) {
    const fake = simulado(opciones);
    assert.equal((await exigirError(subirDocumento(documento(), fake.cliente))).etapa, "subida");
    assert.equal(fake.payloads.length, 0);
    assert.equal(fake.borradas.length, 0);
  }
});

test("PDF: rechazo SQL retira la ruta exacta y conserva el error original", async () => {
  const fake = simulado({ errorInsert: RECHAZO });
  const error = await exigirError(subirDocumento(documento(), fake.cliente));
  assert.equal(error.etapa, "registro");
  assert.equal(error.limpieza, "confirmada");
  assert.strictEqual(error.errorOriginal, RECHAZO);
  assert.equal(error.ruta, fake.rutas[0]);
  assert.deepEqual(fake.borradas, [[fake.rutas[0]]]);
  assert.deepEqual(fake.llamadas, ["auth", "perfil", "upload", "insert", "remove"]);
  assert.match(error.message, /archivo; el objeto fue retirado/);
});

test("PDF: limpieza fallida o incierta conserva causas, ruta y bloqueo de revisión", async () => {
  for (const opciones of [
    { errorLimpieza: { message: "denied" } },
    { limpiezaVacia: true }, { excepcionLimpieza: new Error("timeout remove") },
  ]) {
    const fake = simulado({ errorInsert: RECHAZO, ...opciones });
    const error = await exigirError(subirDocumento(documento(), fake.cliente));
    assert.equal(error.etapa, "limpieza");
    assert.equal(error.limpieza, "errorLimpieza" in opciones ? "fallida" : "incierta");
    assert.strictEqual(error.errorOriginal, RECHAZO);
    assert.ok(error.errorLimpieza);
    assert.equal(error.ruta, fake.rutas[0]);
    assert.equal(error.requiereRevision, true);
  }
});

test("PDF: timeout, error de transporte y respuesta sin fila recuperan por ruta sin reintentar", async () => {
  for (const opciones of [
    { excepcionInsert: new Error("timeout") }, { insertSinFila: true },
    { errorInsert: { code: "EPIPE", message: "fetch failed" } },
  ]) {
    const fake = simulado({ ...opciones, recuperar: true });
    const resultado = await subirDocumento(documento(), fake.cliente);
    assert.equal(resultado.id, ID);
    assert.equal(resultado.tipoArchivo, "documento");
    assert.equal(fake.rutas.length, 1);
    assert.equal(fake.payloads.length, 1);
    assert.equal(fake.borradas.length, 0);
    assert.deepEqual(fake.filtrosRecuperacion, [["clinica_id", CLINICA.toLowerCase()], ["paciente_id", PACIENTE.toLowerCase()], ["ruta", fake.rutas[0]]]);
  }
});

test("PDF: registro incierto o incompatible no borra ni repite la subida", async () => {
  for (const opciones of [
    {}, { errorRecuperacion: { message: "RLS" } },
    { excepcionRecuperacion: new Error("timeout lectura") },
    { recuperar: true, filaRecuperada: (payload: ArchivoPayload) => ({ ...guardada(payload), categoria: "portal" as const }) },
    { recuperar: true, filaRecuperada: (payload: ArchivoPayload) => ({ ...guardada(payload), subido_por: AUTH }) },
  ]) {
    const original = new Error("timeout registro");
    const fake = simulado({ excepcionInsert: original, ...opciones });
    const error = await exigirError(subirDocumento(documento(), fake.cliente));
    assert.equal(error.etapa, "confirmacion");
    assert.equal(error.limpieza, "no_intentada");
    assert.strictEqual(error.errorOriginal, original);
    assert.ok(error.errorConfirmacion);
    assert.equal(error.ruta, fake.rutas[0]);
    assert.equal(error.requiereRevision, true);
    assert.match(error.message, /Registro no confirmado/);
    assert.equal(fake.rutas.length, 1);
    assert.equal(fake.payloads.length, 1);
    assert.equal(fake.borradas.length, 0);
  }
});

test("PDF genera claves nuevas después de un intento rechazado y compensado", async () => {
  const fake = simulado({ errorInsert: RECHAZO });
  await exigirError(subirDocumento(documento(), fake.cliente));
  await exigirError(subirDocumento(documento(), fake.cliente));
  assert.notEqual(fake.rutas[0], fake.rutas[1]);
  assert.match(fake.rutas[0], /\.pdf$/);
  assert.match(fake.rutas[1], /\.pdf$/);
});

test("asociación general omite destino y persiste referencias null", async () => {
  const fake = simulado();
  const resultado = await subirArchivo(datos({ asociacion: { tipo: "general" } }), fake.cliente);
  assert.equal(resultado.evolucionClinicaId, null);
  assert.equal(resultado.planTratamientoId, null);
  assert.equal(fake.llamadas.includes("destino"), false);
});

test("evolución y plan se validan antes de Storage y persisten en el único INSERT", async () => {
  for (const asociacion of [{ tipo: "evolucion", evolucionClinicaId: ID }, { tipo: "plan", planTratamientoId: ID }] as const) {
    const fake = simulado();
    const resultado = await subirArchivo(datos({ asociacion }), fake.cliente);
    assert.deepEqual(fake.llamadas, ["auth", "perfil", "destino", "permisoAsociacion", "upload", "insert"]);
    assert.deepEqual(fake.filtrosDestino, [["id", ID], ["paciente_id", PACIENTE.toLowerCase()], ["clinica_id", CLINICA.toLowerCase()]]);
    assert.equal(fake.payloads.length, 1);
    assert.equal(resultado.evolucionClinicaId, asociacion.tipo === "evolucion" ? ID : null);
    assert.equal(resultado.planTratamientoId, asociacion.tipo === "plan" ? ID : null);
  }
  const pdf = simulado({ perfil: { id: PERFIL, auth_user_id: AUTH, activo: true, rol: "recepcionista" } });
  assert.equal((await subirDocumento({ ...documento(), asociacion: { tipo: "plan", planTratamientoId: ID } }, pdf.cliente)).planTratamientoId, ID);
});

test("asociaciones manipuladas o UUID inválido se rechazan antes de red", async () => {
  for (const asociacion of [
    { tipo: "evolucion", evolucionClinicaId: "demo" },
    { tipo: "plan", planTratamientoId: "p1" },
    { tipo: "evolucion", evolucionClinicaId: ID, planTratamientoId: AUTH },
  ]) {
    const fake = simulado();
    const error = await exigirError(subirArchivo(datos({ asociacion: asociacion as SubidaImagen["asociacion"] }), fake.cliente));
    assert.equal(error.etapa, "validacion");
    assert.deepEqual(fake.llamadas, []);
  }
});

test("inexistente/invisible, paciente/clínica distintos o permiso incierto no suben objeto", async () => {
  for (const asociacion of [{ tipo: "evolucion", evolucionClinicaId: ID }, { tipo: "plan", planTratamientoId: ID }] as const) {
    for (const opciones of [
      { entidad: null }, { errorEntidad: { message: "RLS" } },
      { entidad: { id: ID, paciente_id: AUTH, clinica_id: CLINICA.toLowerCase() } },
      { entidad: { id: ID, paciente_id: PACIENTE.toLowerCase(), clinica_id: AUTH } },
      { permisoAsociacion: false }, { errorPermisoAsociacion: { message: "RPC no instalada" } },
    ]) {
      const fake = simulado(opciones);
      await exigirError(subirArchivo(datos({ asociacion }), fake.cliente));
      assert.equal(fake.llamadas.includes("upload"), false);
    }
  }
});

test("paciente portal no puede asociar; superadmin con acceso puede asociar imágenes", async () => {
  const portal = simulado({ perfil: { id: PERFIL, auth_user_id: AUTH, activo: true, rol: "paciente" } });
  await exigirError(subirArchivo(datos({ asociacion: { tipo: "plan", planTratamientoId: ID } }), portal.cliente));
  assert.equal(portal.llamadas.includes("destino"), false);
  const admin = simulado({ perfil: { id: PERFIL, auth_user_id: AUTH, activo: true, rol: "superadmin" } });
  assert.equal((await subirArchivo(datos({ asociacion: { tipo: "plan", planTratamientoId: ID } }), admin.cliente)).planTratamientoId, ID);
  const pdfAdmin = simulado({ perfil: { id: PERFIL, auth_user_id: AUTH, activo: true, rol: "superadmin" } });
  assert.equal((await subirDocumento({ ...documento(), asociacion: { tipo: "plan", planTratamientoId: ID } }, pdfAdmin.cliente)).planTratamientoId, ID);
  const generalPortal = simulado({ perfil: { id: PERFIL, auth_user_id: AUTH, activo: true, rol: "paciente" } });
  const general = await subirArchivo(datos(), generalPortal.cliente);
  assert.equal(general.categoria, "portal");
  assert.equal(general.planTratamientoId, null);
});

test("rechazo FK de asociación compensa la ruta y recuperación incierta compara destino", async () => {
  const entrada = datos({ asociacion: { tipo: "plan", planTratamientoId: ID } });
  const rechazo = simulado({ errorInsert: { code: "23503", message: "FK destino eliminado" } });
  assert.equal((await exigirError(subirArchivo(entrada, rechazo.cliente))).limpieza, "confirmada");
  assert.deepEqual(rechazo.borradas, [[rechazo.rutas[0]]]);
  const recuperada = simulado({ excepcionInsert: new Error("timeout"), recuperar: true });
  assert.equal((await subirArchivo(entrada, recuperada.cliente)).planTratamientoId, ID);
  const distinta = simulado({ excepcionInsert: new Error("timeout"), recuperar: true,
    filaRecuperada: (payload) => ({ ...guardada(payload), plan_tratamiento_id: AUTH }) });
  assert.equal((await exigirError(subirArchivo(entrada, distinta.cliente))).etapa, "confirmacion");
  assert.deepEqual(distinta.borradas, []);
});

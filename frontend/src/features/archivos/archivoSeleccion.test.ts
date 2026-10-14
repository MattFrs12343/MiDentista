/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import { MAX_FILE_SIZE, validarSeleccionArchivos, validarSeleccionDocumento, validarSeleccionImagen } from "./archivoSeleccion.ts";

function archivo(nombre = "foto.jpg", mime = "image/jpeg", tamano = 1): File {
  return new File([new Uint8Array(tamano)], nombre, { type: mime });
}

function exigirInvalido(archivos: File[], mensaje: RegExp) {
  const resultado = validarSeleccionArchivos(archivos);
  assert.equal(resultado.valido, false);
  if (!resultado.valido) assert.match(resultado.error, mensaje);
}

for (const [nombre, mime] of [
  ["foto.jpg", "image/jpeg"],
  ["foto.jpeg", "image/jpeg"],
  ["foto.png", "image/png"],
  ["foto.webp", "image/webp"],
  ["informe.pdf", "application/pdf"],
]) {
  test(`acepta ${nombre} con su MIME y conserva el File original`, () => {
    const seleccionado = archivo(nombre, mime);
    const resultado = validarSeleccionArchivos([seleccionado]);
    assert.equal(resultado.valido, true);
    if (resultado.valido) assert.strictEqual(resultado.archivo, seleccionado);
  });
}

test("rechaza archivos vacíos", () => {
  exigirInvalido([archivo("foto.jpg", "image/jpeg", 0)], /vacío/);
});

test("acepta exactamente 10 MiB", () => {
  assert.equal(MAX_FILE_SIZE, 10485760);
  assert.equal(validarSeleccionArchivos([archivo("foto.jpg", "image/jpeg", MAX_FILE_SIZE)]).valido, true);
});

test("rechaza 10 MiB más un byte", () => {
  exigirInvalido([archivo("foto.jpg", "image/jpeg", MAX_FILE_SIZE + 1)], /10 MiB/);
});

test("rechaza MIME no permitido y el comodín image/*", () => {
  for (const mime of ["image/gif", "image/svg+xml", "application/octet-stream", "image/*"]) {
    exigirInvalido([archivo("foto.jpg", mime)], /Formato no permitido/);
  }
});

test("rechaza extensión no permitida aunque el MIME esté permitido", () => {
  exigirInvalido([archivo("foto.gif", "image/jpeg")], /Extensión no permitida/);
});

test("rechaza nombres sin extensión y extensiones dobles engañosas", () => {
  for (const nombre of ["foto", "foto.jpg.exe", "foto.jpg "]) {
    exigirInvalido([archivo(nombre)], /Extensión no permitida/);
  }
});

test("rechaza correspondencias incorrectas de extensión y MIME", () => {
  for (const [nombre, mime] of [
    ["foto.jpg", "image/png"],
    ["foto.jpeg", "application/pdf"],
    ["foto.png", "image/webp"],
    ["foto.webp", "image/jpeg"],
    ["informe.pdf", "image/jpeg"],
  ]) {
    exigirInvalido([archivo(nombre, mime)], /no coincide/);
  }
});

test("rechaza nombre vacío", () => {
  exigirInvalido([archivo("")], /nombre válido/);
});

test("rechaza nombre compuesto solo por espacios", () => {
  exigirInvalido([archivo("   ")], /nombre válido/);
});

test("rechaza más de un archivo sin modificar la colección", () => {
  const seleccionados = [archivo(), archivo("informe.pdf", "application/pdf")];
  const originales = [...seleccionados];
  exigirInvalido(seleccionados, /un solo archivo/);
  assert.deepEqual(seleccionados, originales);
});

test("devuelve un error explícito cuando no hay archivo", () => {
  exigirInvalido([], /Selecciona un archivo/);
});

test("rechaza MIME vacío aunque la extensión sea válida", () => {
  exigirInvalido([archivo("foto.jpg", "")], /MIME vacío/);
});

test("acepta extensiones en mayúsculas para todos los formatos", () => {
  for (const [nombre, mime] of [
    ["FOTO.JPG", "image/jpeg"],
    ["FOTO.JPEG", "image/jpeg"],
    ["FOTO.PNG", "image/png"],
    ["FOTO.WEBP", "image/webp"],
    ["INFORME.PDF", "application/pdf"],
  ]) {
    assert.equal(validarSeleccionArchivos([archivo(nombre, mime)]).valido, true);
  }
});

test("acepta una colección similar a FileList sin requerir un array", () => {
  const seleccionado = archivo();
  const resultado = validarSeleccionArchivos({ 0: seleccionado, length: 1 });
  assert.deepEqual(resultado, { valido: true, archivo: seleccionado });
});

test("el flujo de imágenes rechaza PDF sin cambiar el selector genérico", () => {
  const pdf = archivo("informe.pdf", "application/pdf");
  assert.equal(validarSeleccionArchivos([pdf]).valido, true);
  assert.deepEqual(validarSeleccionImagen([pdf], "fotografia"), {
    valido: false, error: "Este formulario solo permite imágenes JPG, PNG o WEBP",
  });
});

test("JPG, PNG y WEBP son válidos como fotografías o radiografías explícitas", () => {
  for (const [nombre, mime] of [["foto.jpg", "image/jpeg"], ["foto.png", "image/png"], ["foto.webp", "image/webp"]]) {
    for (const tipo of ["fotografia", "radiografia"]) {
      assert.equal(validarSeleccionImagen([archivo(nombre, mime)], tipo).valido, true);
    }
  }
});

test("el flujo de imágenes rechaza una clasificación inválida", () => {
  for (const tipo of ["documento", "otro", "", null, undefined]) {
    const resultado = validarSeleccionImagen([archivo()], tipo);
    assert.equal(resultado.valido, false);
    if (!resultado.valido) assert.match(resultado.error, /Fotografía clínica o Radiografía/);
  }
});

test("el flujo de imágenes conserva las validaciones de tamaño y selección única", () => {
  assert.equal(validarSeleccionImagen([archivo("foto.jpg", "image/jpeg", 0)], "fotografia").valido, false);
  assert.equal(validarSeleccionImagen([archivo(), archivo()], "fotografia").valido, false);
});

test("el flujo documental acepta PDF y extensión .PDF sin alterar el File", () => {
  for (const nombre of ["informe.pdf", "INFORME.PDF"]) {
    const pdf = archivo(nombre, "application/pdf");
    assert.deepEqual(validarSeleccionDocumento([pdf]), { valido: true, archivo: pdf });
  }
});

test("el flujo documental rechaza todas las imágenes permitidas por el selector", () => {
  for (const [nombre, mime] of [["foto.jpg", "image/jpeg"], ["foto.png", "image/png"], ["foto.webp", "image/webp"]]) {
    assert.deepEqual(validarSeleccionDocumento([archivo(nombre, mime)]), {
      valido: false, error: "Este formulario solo permite documentos PDF",
    });
  }
});

test("el flujo documental rechaza MIME vacío, desconocido y discrepancias con .pdf", () => {
  for (const mime of ["", "application/octet-stream", "image/jpeg", "text/plain"]) {
    assert.equal(validarSeleccionDocumento([archivo("informe.pdf", mime)]).valido, false);
  }
});

test("el flujo documental rechaza extensiones no PDF o incompatibles", () => {
  for (const nombre of ["informe.txt", "informe.jpg", "informe", "informe.pdf.exe"]) {
    assert.equal(validarSeleccionDocumento([archivo(nombre, "application/pdf")]).valido, false);
  }
});

test("el flujo documental conserva nombres obligatorios y selección única", () => {
  for (const nombre of ["", "   "]) {
    assert.equal(validarSeleccionDocumento([archivo(nombre, "application/pdf")]).valido, false);
  }
  assert.equal(validarSeleccionDocumento([]).valido, false);
  assert.equal(validarSeleccionDocumento([archivo("uno.pdf", "application/pdf"), archivo("dos.pdf", "application/pdf")]).valido, false);
});

test("el flujo documental rechaza PDF vacío", () => {
  assert.equal(validarSeleccionDocumento([archivo("informe.pdf", "application/pdf", 0)]).valido, false);
});

test("el flujo documental acepta exactamente 10 MiB y rechaza un byte más", () => {
  assert.equal(validarSeleccionDocumento([archivo("informe.pdf", "application/pdf", MAX_FILE_SIZE)]).valido, true);
  assert.equal(validarSeleccionDocumento([archivo("informe.pdf", "application/pdf", MAX_FILE_SIZE + 1)]).valido, false);
});

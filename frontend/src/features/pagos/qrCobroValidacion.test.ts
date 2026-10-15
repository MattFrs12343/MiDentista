/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import { QR_COBRO_TAMANO_MAXIMO, validarQrCobro } from "./qrCobroValidacion.ts";

function archivo(tipo: string, bytes: number): File {
  return new File([new Uint8Array(Math.max(bytes, 0))], "qr", { type: tipo });
}

test("acepta una imagen JPG/PNG/WEBP dentro del límite", () => {
  for (const tipo of ["image/jpeg", "image/png", "image/webp"]) {
    const resultado = validarQrCobro(archivo(tipo, 1024));
    assert.equal(resultado.valido, true, tipo);
  }
});

test("rechaza un archivo vacío", () => {
  const resultado = validarQrCobro(archivo("image/png", 0));
  assert.equal(resultado.valido, false);
});

test("rechaza un archivo que excede el tamaño máximo", () => {
  const resultado = validarQrCobro(archivo("image/png", QR_COBRO_TAMANO_MAXIMO + 1));
  assert.equal(resultado.valido, false);
});

test("rechaza formatos que no son imagen", () => {
  const resultado = validarQrCobro(archivo("application/pdf", 1024));
  assert.equal(resultado.valido, false);
});

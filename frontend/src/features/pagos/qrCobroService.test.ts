/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { obtenerUrlQrCobro, rutaQrCobro, subirQrCobro } from "./qrCobroService.ts";

const CLINICA = "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA";

function clienteSimulado(opciones: {
  signedUrl?: string | null;
  errorSignedUrl?: unknown;
  errorUpload?: unknown;
} = {}) {
  const llamadas: unknown[][] = [];
  const cliente = {
    storage: {
      from(bucket: string) {
        llamadas.push(["bucket", bucket]);
        return {
          async createSignedUrl(ruta: string, segundos: number) {
            llamadas.push(["createSignedUrl", ruta, segundos]);
            if (opciones.errorSignedUrl) return { data: null, error: opciones.errorSignedUrl };
            const url = "signedUrl" in opciones ? opciones.signedUrl : "https://ejemplo.test/qr-firmado";
            return { data: url ? { signedUrl: url } : null, error: null };
          },
          async upload(ruta: string, archivo: File, opts: { contentType: string; upsert: boolean }) {
            llamadas.push(["upload", ruta, archivo.type, opts]);
            if (opciones.errorUpload) return { data: null, error: opciones.errorUpload };
            return { data: { path: ruta }, error: null };
          },
        };
      },
    },
  } as unknown as SupabaseClient;
  return { cliente, llamadas };
}

function imagen(tipo = "image/png", bytes = 10): File {
  return new File([new Uint8Array(bytes)], "qr.png", { type: tipo });
}

test("rutaQrCobro es fija por clínica, sin extensión", () => {
  assert.equal(rutaQrCobro(CLINICA), `${CLINICA}/qr`);
});

test("obtenerUrlQrCobro exige un UUID real de clínica", async () => {
  const { cliente } = clienteSimulado();
  await assert.rejects(obtenerUrlQrCobro("demo", cliente), /UUID/);
});

test("obtenerUrlQrCobro devuelve la URL firmada cuando el objeto existe", async () => {
  const { cliente, llamadas } = clienteSimulado({ signedUrl: "https://ejemplo.test/qr-firmado" });
  const url = await obtenerUrlQrCobro(CLINICA, cliente);
  assert.equal(url, "https://ejemplo.test/qr-firmado");
  assert.deepEqual(llamadas, [
    ["bucket", "qr-cobros"],
    ["createSignedUrl", rutaQrCobro(CLINICA), 300],
  ]);
});

test("obtenerUrlQrCobro devuelve null si todavía no hay QR subido", async () => {
  const { cliente } = clienteSimulado({ errorSignedUrl: { message: "Object not found" } });
  const url = await obtenerUrlQrCobro(CLINICA, cliente);
  assert.equal(url, null);
});

test("obtenerUrlQrCobro relanza otros errores de Storage", async () => {
  const { cliente } = clienteSimulado({ errorSignedUrl: { message: "network error" } });
  await assert.rejects(obtenerUrlQrCobro(CLINICA, cliente), /network error/);
});

test("subirQrCobro rechaza un archivo que no pasa la validación local, sin tocar la red", async () => {
  const { cliente, llamadas } = clienteSimulado();
  await assert.rejects(subirQrCobro(CLINICA, imagen("application/pdf"), cliente), /Formato no permitido/);
  assert.deepEqual(llamadas, []);
});

test("subirQrCobro sube con upsert y devuelve una URL firmada nueva", async () => {
  const { cliente, llamadas } = clienteSimulado({ signedUrl: "https://ejemplo.test/qr-nuevo" });
  const url = await subirQrCobro(CLINICA, imagen("image/webp"), cliente);
  assert.equal(url, "https://ejemplo.test/qr-nuevo");
  assert.deepEqual(llamadas, [
    ["bucket", "qr-cobros"],
    ["upload", rutaQrCobro(CLINICA), "image/webp", { contentType: "image/webp", upsert: true }],
    ["bucket", "qr-cobros"],
    ["createSignedUrl", rutaQrCobro(CLINICA), 300],
  ]);
});

test("subirQrCobro propaga el error si Storage rechaza la subida", async () => {
  const { cliente } = clienteSimulado({ errorUpload: { message: "permiso denegado" } });
  await assert.rejects(subirQrCobro(CLINICA, imagen(), cliente), /permiso denegado/);
});

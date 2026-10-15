/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import {
  esUuid,
  itemDesdeFila,
  itemParaGuardar,
  presupuestoDesdeFila,
  presupuestoParaGuardar,
  type ItemPresupuestoFila,
  type PresupuestoFila,
} from "./presupuestoMapper.ts";
import { transicionValida } from "./tipos.ts";

const CLINICA = "33333333-3333-4333-8333-333333333333";
const PACIENTE = "11111111-1111-4111-8111-111111111111";
const PERFIL = "44444444-4444-4444-8444-444444444444";
const PRESUPUESTO = "55555555-5555-4555-8555-555555555555";

function filaPresupuesto(cambios: Partial<PresupuestoFila> = {}): PresupuestoFila {
  return {
    id: PRESUPUESTO,
    clinica_id: CLINICA,
    paciente_id: PACIENTE,
    odontologo_id: PERFIL,
    titulo: "Tratamiento inicial",
    descuento: 100,
    total: 900,
    estado: "borrador",
    valido_hasta: "2026-11-01",
    notas: "Sin observaciones",
    creado_en: "2026-10-01T10:00:00Z",
    actualizado_en: "2026-10-01T10:00:00Z",
    ...cambios,
  };
}

test("esUuid acepta UUIDs reales y rechaza los ids de demo", () => {
  assert.equal(esUuid(PACIENTE), true);
  assert.equal(esUuid("p1"), false);
  assert.equal(esUuid("p_perez"), false);
  assert.equal(esUuid(""), false);
});

test("presupuestoDesdeFila traduce snake_case y normaliza los nulos de texto", () => {
  const presupuesto = presupuestoDesdeFila(
    filaPresupuesto({ titulo: null, notas: null, valido_hasta: null }),
  );
  assert.equal(presupuesto.titulo, "");
  assert.equal(presupuesto.notas, "");
  assert.equal(presupuesto.validoHasta, null);
  assert.equal(presupuesto.clinicaId, CLINICA);
  assert.equal(presupuesto.estado, "borrador");
});

test("un estado desconocido se degrada a borrador en vez de romper los comparadores", () => {
  const presupuesto = presupuestoDesdeFila(filaPresupuesto({ estado: "vencido" }));
  assert.equal(presupuesto.estado, "borrador");
});

test("itemDesdeFila asume cantidad 1 cuando la columna viene en null", () => {
  const fila: ItemPresupuestoFila = {
    id: "66666666-6666-4666-8666-666666666666",
    clinica_id: CLINICA,
    presupuesto_id: PRESUPUESTO,
    servicio_id: null,
    descripcion: "Limpieza",
    numero_pieza: 16,
    cantidad: null,
    precio_unitario: "200.00",
    subtotal: "200.00",
    creado_en: "2026-10-01T10:00:00Z",
  };
  const item = itemDesdeFila(fila);
  assert.equal(item.cantidad, 1);
  assert.equal(item.descripcion, "Limpieza");
  assert.equal(item.servicioId, null);
});

test("un presupuesto nuevo nace en borrador y con el total que se le calculó", () => {
  const fila = presupuestoParaGuardar(
    {
      clinicaId: CLINICA,
      pacienteId: PACIENTE,
      odontologoId: PERFIL,
      titulo: "Ortodoncia",
      descuento: 0,
      validoHasta: null,
      notas: "",
    },
    1500,
  );
  assert.equal(fila.estado, "borrador");
  assert.equal(fila.total, 1500);
  assert.equal(fila.valido_hasta, null);
});

test("itemParaGuardar engancha la partida al presupuesto y usa su subtotal", () => {
  const fila = itemParaGuardar(
    {
      clinicaId: CLINICA,
      presupuestoId: "",
      servicioId: null,
      descripcion: "Endodoncia",
      numeroPieza: 36,
      cantidad: 1,
      precioUnitario: 900,
      subtotal: 900,
    },
    PRESUPUESTO,
  );
  assert.equal(fila.presupuesto_id, PRESUPUESTO);
  assert.equal(fila.subtotal, 900);
  assert.equal(fila.numero_pieza, 36);
});

test("el ciclo de vida no retrocede: rechazado y aceptado son terminales", () => {
  assert.equal(transicionValida("borrador", "enviado"), true);
  assert.equal(transicionValida("enviado", "aceptado"), true);
  assert.equal(transicionValida("enviado", "rechazado"), true);
  assert.equal(transicionValida("borrador", "aceptado"), false);
  assert.equal(transicionValida("aceptado", "rechazado"), false);
  assert.equal(transicionValida("rechazado", "borrador"), false);
  assert.equal(transicionValida("enviado", "enviado"), false);
});

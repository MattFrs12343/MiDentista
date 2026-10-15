/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import {
  esCiValida,
  esEmailValido,
  esFechaNacimientoValida,
  esTelefonoValido,
  hayErrores,
  validarPaciente,
  type BorradorPaciente,
  type ErroresPaciente,
} from "./validacionesPaciente.ts";

/** Borrador válido de referencia; cada prueba rompe solo el campo que le toca. */
function borrador(cambios: Partial<BorradorPaciente> = {}): BorradorPaciente {
  return {
    nombres: "María",
    apellidos: "Quispe",
    ci: "7654321",
    fechaNacimiento: "1990-05-20",
    sexo: "femenino",
    telefono: "70012345",
    email: "maria@example.com",
    direccion: "Av. Siempre Viva 742",
    contactoEmergenciaNombre: "",
    contactoEmergenciaTelefono: "",
    contactoEmergenciaParentesco: "",
    ...cambios,
  };
}

const HOY = new Date(2026, 9, 14); // 14 de octubre de 2026, hora local.

test("un borrador completo y correcto no tiene errores", () => {
  assert.deepEqual(validarPaciente(borrador(), HOY), {});
  assert.equal(hayErrores(validarPaciente(borrador(), HOY)), false);
});

test("nombres y apellidos son obligatorios y no aceptan solo espacios", () => {
  const errores = validarPaciente(borrador({ nombres: "   ", apellidos: "Q" }), HOY);
  assert.ok(errores.nombres);
  assert.ok(errores.apellidos);
});

test("la CI exige formato y es obligatoria", () => {
  assert.equal(esCiValida("7654321"), true);
  assert.equal(esCiValida("7654321-1A"), true);
  assert.equal(esCiValida("12"), false);
  assert.equal(esCiValida("7654 321"), false);
  assert.ok(validarPaciente(borrador({ ci: "" }), HOY).ci);
  assert.ok(validarPaciente(borrador({ ci: "12" }), HOY).ci);
});

test("la fecha de nacimiento no puede ser futura", () => {
  assert.equal(esFechaNacimientoValida("2026-10-14", HOY), true);
  assert.equal(esFechaNacimientoValida("2026-10-15", HOY), false);
  assert.ok(validarPaciente(borrador({ fechaNacimiento: "2027-01-01" }), HOY).fechaNacimiento);
});

test("la fecha de nacimiento rechaza fechas que no existen en el calendario", () => {
  assert.equal(esFechaNacimientoValida("2026-02-31", HOY), false);
  assert.equal(esFechaNacimientoValida("14/10/2026", HOY), false);
  assert.equal(esFechaNacimientoValida("", HOY), false);
});

test("la fecha de nacimiento rechaza edades mayores a 120 años", () => {
  assert.equal(esFechaNacimientoValida("1906-10-14", HOY), true);
  assert.equal(esFechaNacimientoValida("1905-10-14", HOY), false);
});

test("el teléfono admite formatos locales y rechaza el vacío", () => {
  assert.equal(esTelefonoValido("70012345"), true);
  assert.equal(esTelefonoValido("+591 700-12345"), true);
  assert.equal(esTelefonoValido("(3) 456-789"), true);
  assert.equal(esTelefonoValido("123"), false);
  assert.ok(validarPaciente(borrador({ telefono: "" }), HOY).telefono);
  assert.ok(validarPaciente(borrador({ telefono: "abc" }), HOY).telefono);
});

test("el correo es opcional, pero si viene debe ser válido", () => {
  assert.equal(esEmailValido("maria@example.com"), true);
  assert.equal(esEmailValido("maria@example"), false);
  assert.equal(esEmailValido("maria example.com"), false);
  assert.equal(validarPaciente(borrador({ email: "" }), HOY).email, undefined);
  assert.ok(validarPaciente(borrador({ email: "no-es-correo" }), HOY).email);
});

test("el contacto de emergencia es opcional, pero si se completa pide nombre y teléfono", () => {
  const vacio = validarPaciente(borrador(), HOY);
  assert.equal(vacio.contactoEmergenciaNombre, undefined);
  assert.equal(vacio.contactoEmergenciaTelefono, undefined);

  const soloNombre = validarPaciente(
    borrador({ contactoEmergenciaNombre: "Pedro" }),
    HOY,
  );
  assert.equal(soloNombre.contactoEmergenciaNombre, undefined);
  assert.ok(soloNombre.contactoEmergenciaTelefono);
});

test("un contacto de emergencia completo y válido no genera errores", () => {
  const errores = validarPaciente(
    borrador({
      contactoEmergenciaNombre: "Pedro Quispe",
      contactoEmergenciaTelefono: "70099999",
      contactoEmergenciaParentesco: "Padre",
    }),
    HOY,
  );
  assert.deepEqual(errores, {});
});

test("hayErrores resume la presencia de problemas", () => {
  const errores: ErroresPaciente = {};
  assert.equal(hayErrores(errores), false);
  errores.ci = "problema";
  assert.equal(hayErrores(errores), true);
});

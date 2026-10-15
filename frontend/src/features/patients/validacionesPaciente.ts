/**
 * Validaciones de formulario del módulo 02 Pacientes (T-2.8).
 *
 * Lógica pura, sin React ni red: se puede probar con `node --test` (ver
 * `validacionesPaciente.test.ts`). El formulario (`PatientForm.tsx`) es el único
 * consumidor; el servicio solo guarda lo que ya pasó por acá.
 *
 * Los tipos del módulo no van a `@/types` (archivo de integración): se reusa
 * `Paciente` para no duplicar la forma del dato, pero el borrador se define
 * aquí.
 */

import type { Paciente } from "@/types";

/** Lo que el formulario entrega antes de tener `id` y fecha de alta. */
export type BorradorPaciente = Omit<Paciente, "id" | "creadoEl">;

/** Un mensaje por campo con problema; los campos válidos no aparecen. */
export type ErroresPaciente = Partial<Record<keyof BorradorPaciente, string>>;

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RE_TELEFONO = /^[+]?[\d\s()-]{6,20}$/;
const RE_CI = /^[0-9A-Za-z-]{4,20}$/;
const RE_FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

const NOMBRES_MAX = 80;
const DIRECCION_MAX = 160;
const EDAD_MAXIMA = 120;

/** `true` solo si el correo tiene la forma mínima `algo@dominio.tld`. */
export function esEmailValido(valor: string): boolean {
  return RE_EMAIL.test(valor.trim());
}

/** `true` si el teléfono admite dígitos, espacios, guiones, paréntesis y un `+`. */
export function esTelefonoValido(valor: string): boolean {
  return RE_TELEFONO.test(valor.trim());
}

/** `true` si la CI tiene entre 4 y 20 caracteres alfanuméricos o guiones. */
export function esCiValida(valor: string): boolean {
  return RE_CI.test(valor.trim());
}

/**
 * `true` si es una fecha `YYYY-MM-DD` real, no futura y no anterior a 120 años.
 *
 * Se descompone el texto a mano y se construye una `Date` en hora local: al
 * interpretar `2026-10-03` como UTC, en América aparecería como el día anterior.
 * Si los tres números no sobreviven a la construcción, la fecha no existía
 * (mes 13, 31 de febrero).
 */
export function esFechaNacimientoValida(valor: string, hoy: Date = new Date()): boolean {
  const partes = RE_FECHA_ISO.exec(valor.trim());
  if (!partes) return false;
  const anio = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const fecha = new Date(anio, mes - 1, dia);
  if (
    fecha.getFullYear() !== anio ||
    fecha.getMonth() !== mes - 1 ||
    fecha.getDate() !== dia
  ) {
    return false;
  }
  const limiteInferior = new Date(
    hoy.getFullYear() - EDAD_MAXIMA,
    hoy.getMonth(),
    hoy.getDate(),
  );
  return fecha.getTime() <= hoy.getTime() && fecha.getTime() >= limiteInferior.getTime();
}

/**
 * Valida el borrador completo y devuelve los errores por campo.
 *
 * El contacto de emergencia es opcional, pero si se empieza a completar hay que
 * dar nombre y teléfono: un contacto al que no se puede llamar no sirve para una
 * urgencia.
 */
export function validarPaciente(
  borrador: BorradorPaciente,
  hoy: Date = new Date(),
): ErroresPaciente {
  const errores: ErroresPaciente = {};

  const nombres = borrador.nombres.trim();
  if (!nombres) errores.nombres = "Escribí los nombres del paciente.";
  else if (nombres.length < 2) errores.nombres = "El nombre es demasiado corto.";
  else if (nombres.length > NOMBRES_MAX) errores.nombres = `Máximo ${NOMBRES_MAX} caracteres.`;

  const apellidos = borrador.apellidos.trim();
  if (!apellidos) errores.apellidos = "Escribí los apellidos del paciente.";
  else if (apellidos.length < 2) errores.apellidos = "El apellido es demasiado corto.";
  else if (apellidos.length > NOMBRES_MAX) errores.apellidos = `Máximo ${NOMBRES_MAX} caracteres.`;

  const ci = borrador.ci.trim();
  if (!ci) errores.ci = "La cédula de identidad es obligatoria.";
  else if (!esCiValida(ci)) errores.ci = "Usá entre 4 y 20 letras, números o guiones.";

  const fecha = borrador.fechaNacimiento.trim();
  if (!fecha) errores.fechaNacimiento = "La fecha de nacimiento es obligatoria.";
  else if (!esFechaNacimientoValida(fecha, hoy)) {
    errores.fechaNacimiento = "Revisá la fecha: no puede ser futura ni irreal.";
  }

  const telefono = borrador.telefono.trim();
  if (!telefono) errores.telefono = "El teléfono es obligatorio.";
  else if (!esTelefonoValido(telefono)) errores.telefono = "Revisá el formato del teléfono.";

  const email = borrador.email.trim();
  if (email && !esEmailValido(email)) errores.email = "El correo no parece válido.";

  const direccion = borrador.direccion.trim();
  if (direccion.length > DIRECCION_MAX) errores.direccion = `Máximo ${DIRECCION_MAX} caracteres.`;

  const contactoNombre = (borrador.contactoEmergenciaNombre ?? "").trim();
  const contactoTelefono = (borrador.contactoEmergenciaTelefono ?? "").trim();
  const contactoParentesco = (borrador.contactoEmergenciaParentesco ?? "").trim();
  const hayContacto = Boolean(contactoNombre || contactoTelefono || contactoParentesco);

  if (hayContacto) {
    if (!contactoNombre) {
      errores.contactoEmergenciaNombre = "Escribí el nombre del contacto.";
    }
    if (!contactoTelefono) {
      errores.contactoEmergenciaTelefono = "Escribí el teléfono del contacto.";
    } else if (!esTelefonoValido(contactoTelefono)) {
      errores.contactoEmergenciaTelefono = "Revisá el formato del teléfono.";
    }
  }

  return errores;
}

/** `true` si `validarPaciente` encontró al menos un problema. */
export function hayErrores(errores: ErroresPaciente): boolean {
  return Object.keys(errores).length > 0;
}

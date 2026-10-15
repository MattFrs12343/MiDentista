import { useState, type FormEvent } from "react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormActions, FormAlert, FormGroup, FormShell } from "@/components/ui/form-parts";
import {
  hayErrores,
  validarPaciente,
  type BorradorPaciente,
  type ErroresPaciente,
} from "@/features/patients/validacionesPaciente";
import type { Paciente, Sexo } from "@/types";

const vacio: BorradorPaciente = {
  nombres: "",
  apellidos: "",
  ci: "",
  fechaNacimiento: "",
  sexo: "femenino",
  telefono: "",
  email: "",
  direccion: "",
  contactoEmergenciaNombre: "",
  contactoEmergenciaTelefono: "",
  contactoEmergenciaParentesco: "",
};

export function PatientForm({
  inicial,
  onSubmit,
  textoBoton = "Registrar paciente",
}: {
  inicial?: Paciente;
  onSubmit: (datos: BorradorPaciente) => void | Promise<void>;
  textoBoton?: string;
}) {
  const [datos, setDatos] = useState<BorradorPaciente>(inicial ?? vacio);
  const [errores, setErrores] = useState<ErroresPaciente>({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Al editar un campo se limpia su error y el resumen: el usuario ya lo está corrigiendo. */
  const set = <K extends keyof BorradorPaciente>(key: K, value: BorradorPaciente[K]) => {
    setDatos((prev) => ({ ...prev, [key]: value }));
    setError(null);
    setErrores((prev) => {
      if (prev[key] === undefined) return prev;
      const limpio = { ...prev };
      delete limpio[key];
      return limpio;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // La validación es nuestra, no la del navegador: `noValidate` desactiva los
    // globos nativos para que los mensajes salgan en el idioma de la app.
    const problemas = validarPaciente(datos);
    setErrores(problemas);
    if (hayErrores(problemas)) {
      setError("Revisá los campos marcados antes de guardar.");
      return;
    }

    setError(null);
    setEnviando(true);
    try {
      await onSubmit(datos);
    } catch (fallo) {
      setError(
        fallo instanceof Error
          ? fallo.message
          : "No se pudo guardar el paciente. Probá de nuevo.",
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    // El tema vive en `FormShell`: los `Field`, `Input` y `Select` de adentro
    // heredan solos el color y el tratamiento de la sección de pacientes.
    <form onSubmit={handleSubmit} noValidate>
      <FormShell section="pacientes">
        <FormGroup titulo="Identificación">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombres" htmlFor="nombres" error={errores.nombres}>
              <Input
                id="nombres"
                value={datos.nombres}
                onChange={(e) => set("nombres", e.target.value)}
              />
            </Field>
            <Field label="Apellidos" htmlFor="apellidos" error={errores.apellidos}>
              <Input
                id="apellidos"
                value={datos.apellidos}
                onChange={(e) => set("apellidos", e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Carnet de identidad" htmlFor="ci" error={errores.ci}>
              <Input id="ci" value={datos.ci} onChange={(e) => set("ci", e.target.value)} />
            </Field>
            <Field label="Fecha de nacimiento" htmlFor="fechaNacimiento" error={errores.fechaNacimiento}>
              <Input
                id="fechaNacimiento"
                type="date"
                value={datos.fechaNacimiento}
                onChange={(e) => set("fechaNacimiento", e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Sexo">
              <Select value={datos.sexo} onValueChange={(v) => set("sexo", v as Sexo)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="femenino">Femenino</SelectItem>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Teléfono" htmlFor="telefono" error={errores.telefono}>
              <Input
                id="telefono"
                value={datos.telefono}
                onChange={(e) => set("telefono", e.target.value)}
              />
            </Field>
          </div>
        </FormGroup>

        <FormGroup titulo="Contacto">
          <Field label="Correo electrónico" htmlFor="email" error={errores.email}>
            <Input
              id="email"
              type="email"
              value={datos.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </Field>

          <Field label="Dirección" htmlFor="direccion" error={errores.direccion}>
            <Input
              id="direccion"
              value={datos.direccion}
              onChange={(e) => set("direccion", e.target.value)}
            />
          </Field>
        </FormGroup>

        <FormGroup
          titulo="Contacto de emergencia"
          descripcion="A quién llamamos si el paciente no responde durante la atención."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Nombre"
              htmlFor="contactoEmergenciaNombre"
              error={errores.contactoEmergenciaNombre}
            >
              <Input
                id="contactoEmergenciaNombre"
                value={datos.contactoEmergenciaNombre ?? ""}
                onChange={(e) => set("contactoEmergenciaNombre", e.target.value)}
              />
            </Field>
            <Field
              label="Teléfono"
              htmlFor="contactoEmergenciaTelefono"
              error={errores.contactoEmergenciaTelefono}
            >
              <Input
                id="contactoEmergenciaTelefono"
                value={datos.contactoEmergenciaTelefono ?? ""}
                onChange={(e) => set("contactoEmergenciaTelefono", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Parentesco" htmlFor="contactoEmergenciaParentesco">
            <Input
              id="contactoEmergenciaParentesco"
              value={datos.contactoEmergenciaParentesco ?? ""}
              onChange={(e) => set("contactoEmergenciaParentesco", e.target.value)}
            />
          </Field>
        </FormGroup>

        {error ? <FormAlert>{error}</FormAlert> : null}

        <FormActions>
          <Button type="submit" disabled={enviando}>
            {enviando ? "Guardando…" : textoBoton}
          </Button>
        </FormActions>
      </FormShell>
    </form>
  );
}

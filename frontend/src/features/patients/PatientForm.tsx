import { useState, type FormEvent } from "react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormActions, FormAlert, FormGroup, FormShell } from "@/components/ui/form-parts";
import type { Paciente, Sexo } from "@/types";

type Borrador = Omit<Paciente, "id" | "creadoEl">;

const vacio: Borrador = {
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
  onSubmit: (datos: Borrador) => void | Promise<void>;
  textoBoton?: string;
}) {
  const [datos, setDatos] = useState<Borrador>(inicial ?? vacio);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Borrador>(key: K, value: Borrador[K]) =>
    setDatos((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
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
    <form onSubmit={handleSubmit}>
      <FormShell section="pacientes">
        <FormGroup titulo="Identificación">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombres" htmlFor="nombres">
              <Input
                id="nombres"
                required
                value={datos.nombres}
                onChange={(e) => set("nombres", e.target.value)}
              />
            </Field>
            <Field label="Apellidos" htmlFor="apellidos">
              <Input
                id="apellidos"
                required
                value={datos.apellidos}
                onChange={(e) => set("apellidos", e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Carnet de identidad" htmlFor="ci">
              <Input id="ci" required value={datos.ci} onChange={(e) => set("ci", e.target.value)} />
            </Field>
            <Field label="Fecha de nacimiento" htmlFor="fechaNacimiento">
              <Input
                id="fechaNacimiento"
                type="date"
                required
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
            <Field label="Teléfono" htmlFor="telefono">
              <Input
                id="telefono"
                required
                value={datos.telefono}
                onChange={(e) => set("telefono", e.target.value)}
              />
            </Field>
          </div>
        </FormGroup>

        <FormGroup titulo="Contacto">
          <Field label="Correo electrónico" htmlFor="email">
            <Input
              id="email"
              type="email"
              value={datos.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </Field>

          <Field label="Dirección" htmlFor="direccion">
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
            <Field label="Nombre" htmlFor="contactoEmergenciaNombre">
              <Input
                id="contactoEmergenciaNombre"
                value={datos.contactoEmergenciaNombre ?? ""}
                onChange={(e) => set("contactoEmergenciaNombre", e.target.value)}
              />
            </Field>
            <Field label="Teléfono" htmlFor="contactoEmergenciaTelefono">
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

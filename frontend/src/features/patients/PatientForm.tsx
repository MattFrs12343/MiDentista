import { useState, type FormEvent } from "react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
};

export function PatientForm({
  inicial,
  onSubmit,
  textoBoton = "Registrar paciente",
}: {
  inicial?: Paciente;
  onSubmit: (datos: Borrador) => void;
  textoBoton?: string;
}) {
  const [datos, setDatos] = useState<Borrador>(inicial ?? vacio);

  const set = <K extends keyof Borrador>(key: K, value: Borrador[K]) =>
    setDatos((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(datos);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
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

      <div className="grid grid-cols-2 gap-4">
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

      <div className="grid grid-cols-2 gap-4">
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

      <Button type="submit" className="mt-2 self-end">
        {textoBoton}
      </Button>
    </form>
  );
}

import { useState, type FormEvent } from "react";
import { Plus, X, Warning } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { useClinicaData } from "@/data/store";
import type { Alergia } from "@/types";

const SEVERIDAD_TONE: Record<Alergia["severidad"], "yellow" | "red"> = {
  leve: "yellow",
  moderada: "yellow",
  grave: "red",
};

export function ClinicalHistoryTab({ pacienteId }: { pacienteId: string }) {
  const { historiaDe, actualizarHistoria, agregarAlergia, quitarAlergia } = useClinicaData();
  const historia = historiaDe(pacienteId);

  const [motivo, setMotivo] = useState(historia.motivoConsulta);
  const [personales, setPersonales] = useState(historia.antecedentesPersonales);
  const [familiares, setFamiliares] = useState(historia.antecedentesFamiliares);
  const [enfermedad, setEnfermedad] = useState("");

  const [nuevaSustancia, setNuevaSustancia] = useState("");
  const [nuevaSeveridad, setNuevaSeveridad] = useState<Alergia["severidad"]>("leve");

  const agregarEnfermedad = (e: FormEvent) => {
    e.preventDefault();
    const valor = enfermedad.trim();
    if (!valor) return;
    actualizarHistoria(pacienteId, { enfermedadesBase: [...historia.enfermedadesBase, valor] });
    setEnfermedad("");
  };

  const quitarEnfermedad = (valor: string) => {
    actualizarHistoria(pacienteId, {
      enfermedadesBase: historia.enfermedadesBase.filter((e) => e !== valor),
    });
  };

  const handleAgregarAlergia = (e: FormEvent) => {
    e.preventDefault();
    const sustancia = nuevaSustancia.trim();
    if (!sustancia) return;
    agregarAlergia(pacienteId, { sustancia, severidad: nuevaSeveridad });
    setNuevaSustancia("");
    setNuevaSeveridad("leve");
  };

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Motivo de consulta</CardTitle>
          <CardDescription>Lo que refiere el paciente al ingresar</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            onBlur={() => actualizarHistoria(pacienteId, { motivoConsulta: motivo })}
            placeholder="Ej. dolor al masticar en molar inferior derecho, desde hace una semana…"
            className="min-h-24"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Antecedentes</CardTitle>
          <CardDescription>Personales y familiares relevantes para el diagnóstico</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Antecedentes personales">
            <Textarea
              value={personales}
              onChange={(e) => setPersonales(e.target.value)}
              onBlur={() => actualizarHistoria(pacienteId, { antecedentesPersonales: personales })}
              placeholder="Cirugías, hábitos, tratamientos previos…"
            />
          </Field>
          <Field label="Antecedentes familiares">
            <Textarea
              value={familiares}
              onChange={(e) => setFamiliares(e.target.value)}
              onBlur={() => actualizarHistoria(pacienteId, { antecedentesFamiliares: familiares })}
              placeholder="Enfermedades hereditarias o relevantes en la familia…"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enfermedades de base</CardTitle>
          <CardDescription>Condiciones médicas que el odontólogo debe considerar</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {historia.enfermedadesBase.length === 0 ? (
              <p className="text-sm text-ink-muted">Sin enfermedades de base registradas.</p>
            ) : (
              historia.enfermedadesBase.map((e) => (
                <Badge key={e} tone="neutral" className="gap-1.5 normal-case tracking-normal">
                  {e}
                  <button
                    onClick={() => quitarEnfermedad(e)}
                    aria-label={`Quitar ${e}`}
                    className="text-ink-muted transition-colors hover:text-ink"
                  >
                    <X size={11} weight="bold" />
                  </button>
                </Badge>
              ))
            )}
          </div>
          <form onSubmit={agregarEnfermedad} className="flex max-w-sm gap-2">
            <Input
              value={enfermedad}
              onChange={(e) => setEnfermedad(e.target.value)}
              placeholder="Ej. diabetes, hipertensión…"
            />
            <Button type="submit" variant="secondary" size="md">
              <Plus size={15} />
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alergias</CardTitle>
          <CardDescription>Dato crítico: revisar antes de indicar medicación</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {historia.alergias.length === 0 ? (
            <p className="text-sm text-ink-muted">Sin alergias registradas.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {historia.alergias.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2.5">
                    {a.severidad === "grave" ? (
                      <Warning size={16} weight="fill" className="text-pastel-red-fg" />
                    ) : null}
                    <span className="text-sm text-ink">{a.sustancia}</span>
                    <Badge tone={SEVERIDAD_TONE[a.severidad]}>{a.severidad}</Badge>
                  </div>
                  <button
                    onClick={() => quitarAlergia(pacienteId, a.id)}
                    aria-label={`Quitar alergia a ${a.sustancia}`}
                    className="rounded-md p-1.5 text-ink-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
                  >
                    <X size={13} weight="bold" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAgregarAlergia} className="flex flex-wrap items-end gap-3">
            <Field label="Sustancia" className="min-w-48 flex-1">
              <Input
                value={nuevaSustancia}
                onChange={(e) => setNuevaSustancia(e.target.value)}
                placeholder="Ej. penicilina, látex…"
              />
            </Field>
            <Field label="Severidad" className="w-40">
              <Select
                value={nuevaSeveridad}
                onValueChange={(v) => setNuevaSeveridad(v as Alergia["severidad"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leve">Leve</SelectItem>
                  <SelectItem value="moderada">Moderada</SelectItem>
                  <SelectItem value="grave">Grave</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Button type="submit" variant="secondary">
              <Plus size={15} /> Agregar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

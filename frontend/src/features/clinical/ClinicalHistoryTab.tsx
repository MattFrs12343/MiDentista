import { useState, type FormEvent } from "react";
import {
  Plus,
  X,
  Warning,
  ClipboardText,
  Heartbeat,
  Tooth,
  FirstAidKit,
  Pill,
  ShieldWarning,
  Sparkle,
  NotePencil,
  Clock,
  User,
  Printer,
} from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { useClinicaData } from "@/data/store";
import { useAuth } from "@/features/auth/AuthContext";
import { ClinicalHistoryPrint } from "./ClinicalHistoryPrint";
import type { Alergia } from "@/types";

const SEVERIDAD_TONE: Record<Alergia["severidad"], "yellow" | "red"> = {
  leve: "yellow",
  moderada: "yellow",
  grave: "red",
};

const CARD_STYLE = "min-w-0 rounded-2xl border-brand-200/50 bg-brand-50 shadow-diffuse";
const HEADER_STYLE =
  "mb-5 flex-row items-start gap-3 rounded-t-2xl border-b border-brand-200/40 bg-pastel-blue-bg/80 p-5 pb-4 sm:p-6 sm:pb-4";
const ICON_STYLE =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600";
const LILAC_ICON_STYLE =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pastel-violet-bg text-pastel-violet-fg/80";
const FIELD_STYLE =
  "border-brand-200/80 bg-surface placeholder:text-ink-muted/75 hover:border-brand-300 focus-visible:border-brand-400 focus-visible:ring-brand-100";
const LABEL_STYLE = "normal-case tracking-normal font-medium text-ink-soft";
const ADD_BUTTON_STYLE =
  "bg-brand-100 text-brand-600 hover:bg-brand-200/70 focus-visible:ring-brand-300 disabled:bg-pastel-blue-bg disabled:text-ink-muted disabled:opacity-60";

export function ClinicalHistoryTab({ pacienteId }: { pacienteId: string }) {
  const { historiaDe, actualizarHistoria, agregarAlergia, quitarAlergia, obtenerPaciente } = useClinicaData();
  const { sesion } = useAuth();
  const paciente = obtenerPaciente(pacienteId);
  const historia = historiaDe(pacienteId);
  const alergiasGraves = historia.alergias.filter((a) => a.severidad === "grave");

  const [motivo, setMotivo] = useState(historia.motivoConsulta);
  const [personales, setPersonales] = useState(historia.antecedentesPersonales);
  const [familiares, setFamiliares] = useState(historia.antecedentesFamiliares);
  const [odontologicos, setOdontologicos] = useState(historia.antecedentesOdontologicos);
  const [enfermedad, setEnfermedad] = useState("");
  const [medicamento, setMedicamento] = useState("");
  const [habito, setHabito] = useState("");
  const [observaciones, setObservaciones] = useState(historia.observacionesGenerales);

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

  const agregarMedicamento = (e: FormEvent) => {
    e.preventDefault();
    const valor = medicamento.trim();
    if (!valor) return;
    actualizarHistoria(pacienteId, {
      medicamentosActuales: [...historia.medicamentosActuales, valor],
    });
    setMedicamento("");
  };

  const quitarMedicamento = (indice: number) => {
    actualizarHistoria(pacienteId, {
      medicamentosActuales: historia.medicamentosActuales.filter((_, i) => i !== indice),
    });
  };

  const agregarHabito = (e: FormEvent) => {
    e.preventDefault();
    const valor = habito.trim();
    if (!valor) return;
    actualizarHistoria(pacienteId, { habitos: [...historia.habitos, valor] });
    setHabito("");
  };

  const quitarHabito = (indice: number) => {
    actualizarHistoria(pacienteId, {
      habitos: historia.habitos.filter((_, i) => i !== indice),
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
    <div className="grid min-w-0 grid-cols-1 gap-5 rounded-2xl bg-pastel-blue-bg p-3 sm:gap-6 sm:p-6 xl:grid-cols-2">
      {alergiasGraves.length > 0 ? (
        <div
          role="alert"
          className="flex min-w-0 items-start gap-3 rounded-xl border border-pastel-red-fg/15 bg-pastel-red-bg/65 p-4 text-pastel-red-fg sm:p-5 xl:col-span-2"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pastel-red-bg">
            <Warning size={20} weight="fill" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">
              {alergiasGraves.length === 1 ? "Alergia grave registrada" : "Alergias graves registradas"}
            </h3>
            <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {alergiasGraves.map((a) => (
                <li key={a.id} className="flex min-w-0 flex-wrap items-center gap-2 break-words">
                  <span className="min-w-0 break-words">{a.sustancia}</span>
                  <Badge tone="red" className="text-[10px]">Grave</Badge>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-sm">Revisar antes de indicar medicación.</p>
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 justify-end xl:col-span-2">
        <Button
          type="button"
          variant="secondary"
          className={`${ADD_BUTTON_STYLE} h-auto min-h-10 whitespace-normal py-2 text-left`}
          onClick={() => window.print()}
          disabled={!paciente}
        >
          <Printer size={17} className="shrink-0" aria-hidden /> Imprimir historia clínica
        </Button>
      </div>

      <Card className={`${CARD_STYLE} xl:col-span-2`}>
        <CardHeader className={HEADER_STYLE}>
          <span className={ICON_STYLE}>
            <ClipboardText size={20} weight="duotone" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            <CardTitle>Motivo de consulta</CardTitle>
            <CardDescription>Lo que refiere el paciente al ingresar</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            onBlur={() => actualizarHistoria(pacienteId, { motivoConsulta: motivo })}
            className={`${FIELD_STYLE} min-h-28 leading-relaxed`}
          />
        </CardContent>
      </Card>

      <Card className={`${CARD_STYLE} xl:col-span-2`}>
        <CardHeader className={HEADER_STYLE}>
          <span className={LILAC_ICON_STYLE}>
            <Heartbeat size={20} weight="duotone" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            <CardTitle>Antecedentes</CardTitle>
            <CardDescription>Personales y familiares relevantes para el diagnóstico</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-5 px-5 pb-5 sm:px-6 sm:pb-6 lg:grid-cols-2">
          <Field label="Antecedentes personales" labelClassName={LABEL_STYLE} className="min-w-0 gap-2">
            <Textarea
              value={personales}
              onChange={(e) => setPersonales(e.target.value)}
              onBlur={() => actualizarHistoria(pacienteId, { antecedentesPersonales: personales })}
              className={`${FIELD_STYLE} min-h-28 leading-relaxed`}
            />
          </Field>
          <Field label="Antecedentes familiares" labelClassName={LABEL_STYLE} className="min-w-0 gap-2">
            <Textarea
              value={familiares}
              onChange={(e) => setFamiliares(e.target.value)}
              onBlur={() => actualizarHistoria(pacienteId, { antecedentesFamiliares: familiares })}
              className={`${FIELD_STYLE} min-h-28 leading-relaxed`}
            />
          </Field>
        </CardContent>
      </Card>

      <Card className={`${CARD_STYLE} xl:col-span-2`}>
        <CardHeader className={HEADER_STYLE}>
          <span className={ICON_STYLE}>
            <Tooth size={20} weight="duotone" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            <CardTitle>Antecedentes odontológicos</CardTitle>
            <CardDescription>Tratamientos y experiencias odontológicas previas relevantes</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
          <Field label="Antecedentes odontológicos" htmlFor="antecedentes-odontologicos" labelClassName={LABEL_STYLE} className="gap-2">
            <Textarea
              id="antecedentes-odontologicos"
              value={odontologicos}
              onChange={(e) => setOdontologicos(e.target.value)}
              onBlur={() =>
                actualizarHistoria(pacienteId, { antecedentesOdontologicos: odontologicos })
              }
              className={`${FIELD_STYLE} min-h-28 leading-relaxed`}
            />
          </Field>
        </CardContent>
      </Card>

      <Card className={CARD_STYLE}>
        <CardHeader className={HEADER_STYLE}>
          <span className={ICON_STYLE}>
            <FirstAidKit size={20} weight="duotone" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            <CardTitle>Enfermedades de base</CardTitle>
            <CardDescription>Condiciones médicas que el odontólogo debe considerar</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-5 pb-5 sm:px-6 sm:pb-6">
          <div className="flex flex-wrap gap-2">
            {historia.enfermedadesBase.length === 0 ? (
              <p className="text-sm text-ink-muted">Sin enfermedades de base registradas.</p>
            ) : (
              historia.enfermedadesBase.map((e) => (
                <Badge key={e} tone="neutral" className="max-w-full gap-2 bg-brand-100/80 px-3 py-1.5 text-xs font-medium normal-case tracking-normal text-brand-600">
                  <span className="min-w-0 break-words">{e}</span>
                  <button
                    onClick={() => quitarEnfermedad(e)}
                    aria-label={`Quitar ${e}`}
                    className="shrink-0 rounded-full p-0.5 text-brand-500 transition-colors hover:bg-brand-100 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                  >
                    <X size={11} weight="bold" />
                  </button>
                </Badge>
              ))
            )}
          </div>
          <form onSubmit={agregarEnfermedad} className="flex min-w-0 flex-wrap items-end gap-3">
            <Input
              value={enfermedad}
              onChange={(e) => setEnfermedad(e.target.value)}
              className={`${FIELD_STYLE} min-w-0 basis-48 flex-1`}
            />
            <Button type="submit" variant="secondary" size="md" className={ADD_BUTTON_STYLE}>
              <Plus size={15} /> Agregar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className={CARD_STYLE}>
        <CardHeader className={HEADER_STYLE}>
          <span className={ICON_STYLE}>
            <Pill size={20} weight="duotone" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            <CardTitle>Medicamentos actuales</CardTitle>
            <CardDescription>Medicamentos que el paciente toma actualmente</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-5 pb-5 sm:px-6 sm:pb-6">
          {historia.medicamentosActuales.length === 0 ? (
            <p className="text-sm text-ink-muted">Sin medicamentos actuales registrados.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-brand-100/60">
              {historia.medicamentosActuales.map((m, i) => (
                <li key={`${i}-${m}`} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0 break-words text-sm text-ink">{m}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-ink-muted hover:bg-brand-50 hover:text-brand-700"
                    onClick={() => quitarMedicamento(i)}
                    aria-label={`Quitar medicamento ${m}`}
                  >
                    <X size={13} weight="bold" /> Quitar
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={agregarMedicamento} className="flex flex-wrap items-end gap-3">
            <Field label="Medicamento" htmlFor="medicamento-actual" labelClassName={LABEL_STYLE} className="min-w-0 basis-48 flex-1 gap-2">
              <Input
                id="medicamento-actual"
                value={medicamento}
                onChange={(e) => setMedicamento(e.target.value)}
                className={FIELD_STYLE}
              />
            </Field>
            <Button type="submit" variant="secondary" disabled={!medicamento.trim()} className={ADD_BUTTON_STYLE}>
              <Plus size={15} /> Agregar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className={CARD_STYLE}>
        <CardHeader className={HEADER_STYLE}>
          <span className={LILAC_ICON_STYLE}>
            <ShieldWarning size={20} weight="duotone" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            <CardTitle>Alergias</CardTitle>
            <CardDescription>Dato crítico: revisar antes de indicar medicación</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-5 pb-5 sm:px-6 sm:pb-6">
          {historia.alergias.length === 0 ? (
            <p className="text-sm text-ink-muted">Sin alergias registradas.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {historia.alergias.map((a) => (
                <li
                  key={a.id}
                  className={`flex min-w-0 items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${
                    a.severidad === "grave"
                      ? "border-pastel-red-fg/10 bg-pastel-red-bg/55"
                      : "border-brand-200/50 bg-pastel-blue-bg/60"
                  }`}
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    {a.severidad === "grave" ? (
                      <Warning size={16} weight="fill" className="shrink-0 text-pastel-red-fg" />
                    ) : null}
                    <span className="min-w-0 break-words text-sm text-ink">{a.sustancia}</span>
                    <Badge tone={SEVERIDAD_TONE[a.severidad]}>{a.severidad}</Badge>
                  </div>
                  <button
                    onClick={() => quitarAlergia(pacienteId, a.id)}
                    aria-label={`Quitar alergia a ${a.sustancia}`}
                    className="shrink-0 rounded-full p-1.5 text-ink-muted transition-colors duration-150 hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                  >
                    <X size={13} weight="bold" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAgregarAlergia} className="flex flex-wrap items-end gap-3">
            <Field label="Sustancia" labelClassName={LABEL_STYLE} className="min-w-0 basis-48 flex-1 gap-2">
              <Input
                value={nuevaSustancia}
                onChange={(e) => setNuevaSustancia(e.target.value)}
                className={FIELD_STYLE}
              />
            </Field>
            <Field label="Severidad" labelClassName={LABEL_STYLE} className="min-w-0 basis-32 flex-1 gap-2">
              <Select
                value={nuevaSeveridad}
                onValueChange={(v) => setNuevaSeveridad(v as Alergia["severidad"])}
              >
                <SelectTrigger className={`${FIELD_STYLE} min-w-0 gap-2`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leve">Leve</SelectItem>
                  <SelectItem value="moderada">Moderada</SelectItem>
                  <SelectItem value="grave">Grave</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Button type="submit" variant="secondary" className={ADD_BUTTON_STYLE}>
              <Plus size={15} /> Agregar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className={CARD_STYLE}>
        <CardHeader className={HEADER_STYLE}>
          <span className={ICON_STYLE}>
            <Sparkle size={20} weight="duotone" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            <CardTitle>Hábitos</CardTitle>
            <CardDescription>Hábitos relevantes para la atención odontológica</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-5 pb-5 sm:px-6 sm:pb-6">
          {historia.habitos.length === 0 ? (
            <p className="text-sm text-ink-muted">Sin hábitos registrados.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-brand-100/60">
              {historia.habitos.map((h, i) => (
                <li key={`${i}-${h}`} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0 break-words text-sm text-ink">{h}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-ink-muted hover:bg-brand-50 hover:text-brand-700"
                    onClick={() => quitarHabito(i)}
                    aria-label={`Quitar hábito ${h}`}
                  >
                    <X size={13} weight="bold" /> Quitar
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={agregarHabito} className="flex flex-wrap items-end gap-3">
            <Field label="Hábito" htmlFor="habito" labelClassName={LABEL_STYLE} className="min-w-0 basis-48 flex-1 gap-2">
              <Input
                id="habito"
                value={habito}
                onChange={(e) => setHabito(e.target.value)}
                className={FIELD_STYLE}
              />
            </Field>
            <Button type="submit" variant="secondary" disabled={!habito.trim()} className={ADD_BUTTON_STYLE}>
              <Plus size={15} /> Agregar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className={`${CARD_STYLE} xl:col-span-2`}>
        <CardHeader className={HEADER_STYLE}>
          <span className={ICON_STYLE}>
            <NotePencil size={20} weight="duotone" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            <CardTitle>Observaciones generales</CardTitle>
            <CardDescription>Notas clínicas generales que no correspondan a los demás apartados</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
          <Field label="Observaciones generales" htmlFor="observaciones-generales" labelClassName={LABEL_STYLE} className="gap-2">
            <Textarea
              id="observaciones-generales"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              onBlur={() =>
                actualizarHistoria(pacienteId, { observacionesGenerales: observaciones })
              }
              className={`${FIELD_STYLE} min-h-32 leading-relaxed`}
            />
          </Field>
        </CardContent>
      </Card>

      <dl className="grid min-w-0 grid-cols-1 gap-4 rounded-xl border border-brand-200/60 bg-brand-100/60 p-4 text-xs text-ink-muted sm:grid-cols-2 sm:p-5 xl:col-span-2">
        <div className="min-w-0">
          <dt className="flex items-center gap-2 font-medium">
            <Clock size={15} className="text-brand-400" aria-hidden /> Última actualización
          </dt>
          <dd className="mt-1.5 pl-[23px]">
            {historia.actualizadoEl ? (
              <time dateTime={historia.actualizadoEl}>
                {new Date(historia.actualizadoEl).toLocaleString("es", {
                  dateStyle: "medium",
                  timeStyle: "medium",
                })}
              </time>
            ) : (
              "Sin actualización registrada"
            )}
          </dd>
        </div>
        <div className="min-w-0 border-t border-brand-200/70 pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          <dt className="flex items-center gap-2 font-medium">
            <User size={15} className="text-brand-400" aria-hidden /> Responsable
          </dt>
          <dd className="mt-1.5 break-words pl-[23px]">{historia.actualizadoPor || "No registrado"}</dd>
        </div>
      </dl>
      {paciente ? (
        <ClinicalHistoryPrint
          paciente={paciente}
          clinica={sesion?.clinica}
          historia={{
            ...historia,
            motivoConsulta: motivo,
            antecedentesPersonales: personales,
            antecedentesFamiliares: familiares,
            antecedentesOdontologicos: odontologicos,
            observacionesGenerales: observaciones,
          }}
        />
      ) : null}
    </div>
  );
}

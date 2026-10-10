import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, X, Warning, Clock, User, Printer, FirstAid, Pill, Leaf } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { FormActions, FormShell } from "@/components/ui/form-parts";
import { SectionStatStrip } from "@/components/ui/section-board";
import { useClinicaData } from "@/data/store";
import { useAuth } from "@/features/auth/AuthContext";
import { ClinicalHistoryPrint } from "./ClinicalHistoryPrint";
import type { Alergia } from "@/types";

const SEVERIDAD_TONE: Record<Alergia["severidad"], "yellow" | "red"> = {
  leve: "yellow",
  moderada: "yellow",
  grave: "red",
};

const EDITABLE_TEXT_STYLE =
  "block w-full min-w-0 cursor-pointer rounded-lg p-2 -m-2 text-left transition-colors hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring";

export function ClinicalHistoryTab({ pacienteId }: { pacienteId: string }) {
  const { historiaDe, actualizarHistoria, agregarAlergia, quitarAlergia, obtenerPaciente } = useClinicaData();
  const { sesion } = useAuth();
  const paciente = obtenerPaciente(pacienteId);
  const historia = historiaDe(pacienteId);
  const alergiasGraves = historia.alergias.filter((a) => a.severidad === "grave");
  const [searchParams, setSearchParams] = useSearchParams();

  // Llegar con ?print=1 (desde el botón "Imprimir" de la tabla de pacientes)
  // dispara la impresión automáticamente. La historia carga async desde la
  // API, así que se espera un instante breve antes de imprimir.
  useEffect(() => {
    if (searchParams.get("print") !== "1") return;
    const id = setTimeout(() => window.print(), 600);
    searchParams.delete("print");
    setSearchParams(searchParams, { replace: true });
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Estado de apertura de los modales de edición/alta de cada sección.
  const [motivoAbierto, setMotivoAbierto] = useState(false);
  const [antecedentesAbierto, setAntecedentesAbierto] = useState(false);
  const [odontologicosAbierto, setOdontologicosAbierto] = useState(false);
  const [observacionesAbierto, setObservacionesAbierto] = useState(false);
  const [enfermedadAbierto, setEnfermedadAbierto] = useState(false);
  const [medicamentoAbierto, setMedicamentoAbierto] = useState(false);
  const [alergiaAbierto, setAlergiaAbierto] = useState(false);
  const [habitoAbierto, setHabitoAbierto] = useState(false);

  // Al abrir cada modal de edición de texto, se parte siempre del valor ya guardado
  // (así un cierre sin guardar -clic afuera o Escape- no deja texto a medio escribir).
  const handleMotivoOpenChange = (open: boolean) => {
    if (open) setMotivo(historia.motivoConsulta);
    setMotivoAbierto(open);
  };
  const handleAntecedentesOpenChange = (open: boolean) => {
    if (open) {
      setPersonales(historia.antecedentesPersonales);
      setFamiliares(historia.antecedentesFamiliares);
    }
    setAntecedentesAbierto(open);
  };
  const handleOdontologicosOpenChange = (open: boolean) => {
    if (open) setOdontologicos(historia.antecedentesOdontologicos);
    setOdontologicosAbierto(open);
  };
  const handleObservacionesOpenChange = (open: boolean) => {
    if (open) setObservaciones(historia.observacionesGenerales);
    setObservacionesAbierto(open);
  };

  const guardarMotivo = (e: FormEvent) => {
    e.preventDefault();
    actualizarHistoria(pacienteId, { motivoConsulta: motivo });
    setMotivoAbierto(false);
  };

  const guardarAntecedentes = (e: FormEvent) => {
    e.preventDefault();
    actualizarHistoria(pacienteId, {
      antecedentesPersonales: personales,
      antecedentesFamiliares: familiares,
    });
    setAntecedentesAbierto(false);
  };

  const guardarOdontologicos = (e: FormEvent) => {
    e.preventDefault();
    actualizarHistoria(pacienteId, { antecedentesOdontologicos: odontologicos });
    setOdontologicosAbierto(false);
  };

  const guardarObservaciones = (e: FormEvent) => {
    e.preventDefault();
    actualizarHistoria(pacienteId, { observacionesGenerales: observaciones });
    setObservacionesAbierto(false);
  };

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
    <div className="grid min-w-0 grid-cols-1 gap-5 sm:gap-6 xl:grid-cols-2">
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

      {/* Resumen del expediente: entrar a la pestaña ya dice qué hay de verdad
          cargado, en vez de obligar a recorrer las ocho tarjetas para
          enterarse de que están vacías. */}
      <div className="xl:col-span-2">
        <SectionStatStrip
          metrics={[
            {
              label: "Alergias",
              value: historia.alergias.length,
              icon: Warning,
              tone: alergiasGraves.length > 0 ? "red" : "neutral",
              hint: alergiasGraves.length > 0 ? `${alergiasGraves.length} graves` : "ninguna grave",
              destacado: alergiasGraves.length > 0,
            },
            {
              label: "Enfermedades de base",
              value: historia.enfermedadesBase.length,
              icon: FirstAid,
              tone: "orange",
              hint: "condiciones médicas",
            },
            {
              label: "Medicamentos",
              value: historia.medicamentosActuales.length,
              icon: Pill,
              tone: "teal",
              hint: "tratamiento actual",
            },
            {
              label: "Hábitos",
              value: historia.habitos.length,
              icon: Leaf,
              tone: "violet",
              hint: "registrados",
            },
          ]}
        />
      </div>

      <div className="flex min-w-0 justify-end xl:col-span-2">
        <Button
          type="button"
          variant="secondary"
          className="h-auto min-h-10 whitespace-normal py-2 text-left"
          onClick={() => window.print()}
          disabled={!paciente}
        >
          <Printer size={17} className="shrink-0" aria-hidden /> Imprimir historia clínica
        </Button>
      </div>

      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Motivo de consulta</CardTitle>
          <CardDescription>Lo que refiere el paciente al ingresar</CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={motivoAbierto} onOpenChange={handleMotivoOpenChange}>
            <DialogTrigger asChild>
              <button
                type="button"
                aria-label="Editar motivo de consulta"
                className={`${EDITABLE_TEXT_STYLE} min-h-28`}
              >
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">
                  {historia.motivoConsulta || (
                    <span className="text-ink-muted">Sin información registrada.</span>
                  )}
                </p>
              </button>
            </DialogTrigger>
            <DialogContent
              title="Motivo de consulta"
              description="Lo que refiere el paciente al ingresar"
            >
              <FormShell section="historia">
                <form onSubmit={guardarMotivo} className="flex flex-col gap-4">
                  <Textarea
                    autoFocus
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    className="min-h-28 leading-relaxed"
                  />
                  <FormActions>
                    <Button type="submit" variant="secondary">
                      Guardar
                    </Button>
                  </FormActions>
                </form>
              </FormShell>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Antecedentes</CardTitle>
          <CardDescription>Personales y familiares relevantes para el diagnóstico</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Dialog open={antecedentesAbierto} onOpenChange={handleAntecedentesOpenChange}>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Field label="Antecedentes personales" className="min-w-0 gap-2">
                <DialogTrigger asChild>
                  <button
                    type="button"
                    aria-label="Editar antecedentes personales"
                    className={`${EDITABLE_TEXT_STYLE} min-h-28`}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">
                      {historia.antecedentesPersonales || (
                        <span className="text-ink-muted">Sin información registrada.</span>
                      )}
                    </p>
                  </button>
                </DialogTrigger>
              </Field>
              <Field label="Antecedentes familiares" className="min-w-0 gap-2">
                <DialogTrigger asChild>
                  <button
                    type="button"
                    aria-label="Editar antecedentes familiares"
                    className={`${EDITABLE_TEXT_STYLE} min-h-28`}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">
                      {historia.antecedentesFamiliares || (
                        <span className="text-ink-muted">Sin información registrada.</span>
                      )}
                    </p>
                  </button>
                </DialogTrigger>
              </Field>
            </div>
            <DialogContent
              title="Antecedentes"
              description="Personales y familiares relevantes para el diagnóstico"
            >
              <FormShell section="historia">
                <form onSubmit={guardarAntecedentes} className="flex flex-col gap-4">
                  <Field label="Antecedentes personales" className="min-w-0 gap-2">
                    <Textarea
                      autoFocus
                      value={personales}
                      onChange={(e) => setPersonales(e.target.value)}
                      className="min-h-28 leading-relaxed"
                    />
                  </Field>
                  <Field label="Antecedentes familiares" className="min-w-0 gap-2">
                    <Textarea
                      value={familiares}
                      onChange={(e) => setFamiliares(e.target.value)}
                      className="min-h-28 leading-relaxed"
                    />
                  </Field>
                  <FormActions>
                    <Button type="submit" variant="secondary">
                      Guardar
                    </Button>
                  </FormActions>
                </form>
              </FormShell>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Antecedentes odontológicos</CardTitle>
          <CardDescription>Tratamientos y experiencias odontológicas previas relevantes</CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={odontologicosAbierto} onOpenChange={handleOdontologicosOpenChange}>
            <Field label="Antecedentes odontológicos" className="gap-2">
              <DialogTrigger asChild>
                <button
                  type="button"
                  aria-label="Editar antecedentes odontológicos"
                  className={`${EDITABLE_TEXT_STYLE} min-h-28`}
                >
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">
                    {historia.antecedentesOdontologicos || (
                      <span className="text-ink-muted">Sin información registrada.</span>
                    )}
                  </p>
                </button>
              </DialogTrigger>
            </Field>
            <DialogContent
              title="Antecedentes odontológicos"
              description="Tratamientos y experiencias odontológicas previas relevantes"
            >
              <FormShell section="historia">
                <form onSubmit={guardarOdontologicos} className="flex flex-col gap-4">
                  <Textarea
                    id="antecedentes-odontologicos"
                    autoFocus
                    value={odontologicos}
                    onChange={(e) => setOdontologicos(e.target.value)}
                    className="min-h-28 leading-relaxed"
                  />
                  <FormActions>
                    <Button type="submit" variant="secondary">
                      Guardar
                    </Button>
                  </FormActions>
                </form>
              </FormShell>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enfermedades de base</CardTitle>
          <CardDescription>Condiciones médicas que el odontólogo debe considerar</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {historia.enfermedadesBase.length === 0 ? (
              <p className="text-sm text-ink-muted">Sin enfermedades de base registradas.</p>
            ) : (
              historia.enfermedadesBase.map((e) => (
                <Badge key={e} tone="neutral" className="max-w-full gap-2 px-3 py-1.5 text-xs font-medium normal-case tracking-normal">
                  <span className="min-w-0 break-words">{e}</span>
                  <button
                    onClick={() => quitarEnfermedad(e)}
                    aria-label={`Quitar ${e}`}
                    className="shrink-0 rounded-full p-0.5 text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    <X size={11} weight="bold" />
                  </button>
                </Badge>
              ))
            )}
          </div>
          <div className="flex justify-end">
            <Dialog open={enfermedadAbierto} onOpenChange={setEnfermedadAbierto}>
              <DialogTrigger asChild>
                <Button type="button" variant="secondary" size="md">
                  <Plus size={15} /> Agregar
                </Button>
              </DialogTrigger>
              <DialogContent
                title="Agregar enfermedad de base"
                description="Condiciones médicas que el odontólogo debe considerar"
              >
                <FormShell section="historia">
                  <form
                    onSubmit={(e) => {
                      agregarEnfermedad(e);
                      setEnfermedadAbierto(false);
                    }}
                    className="flex min-w-0 flex-wrap items-end gap-3"
                  >
                    <Field label="Enfermedad" className="min-w-0 basis-48 flex-1 gap-2">
                      <Input
                        autoFocus
                        value={enfermedad}
                        onChange={(e) => setEnfermedad(e.target.value)}
                      />
                    </Field>
                    <Button type="submit" variant="secondary" size="md" disabled={!enfermedad.trim()}>
                      <Plus size={15} /> Agregar
                    </Button>
                  </form>
                </FormShell>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Medicamentos actuales</CardTitle>
          <CardDescription>Medicamentos que el paciente toma actualmente</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {historia.medicamentosActuales.length === 0 ? (
            <p className="text-sm text-ink-muted">Sin medicamentos actuales registrados.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {historia.medicamentosActuales.map((m, i) => (
                <li key={`${i}-${m}`} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0 break-words text-sm text-ink">{m}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-ink-muted"
                    onClick={() => quitarMedicamento(i)}
                    aria-label={`Quitar medicamento ${m}`}
                  >
                    <X size={13} weight="bold" /> Quitar
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex justify-end">
            <Dialog open={medicamentoAbierto} onOpenChange={setMedicamentoAbierto}>
              <DialogTrigger asChild>
                <Button type="button" variant="secondary">
                  <Plus size={15} /> Agregar
                </Button>
              </DialogTrigger>
              <DialogContent
                title="Agregar medicamento actual"
                description="Medicamentos que el paciente toma actualmente"
              >
                <FormShell section="historia">
                  <form
                    onSubmit={(e) => {
                      agregarMedicamento(e);
                      setMedicamentoAbierto(false);
                    }}
                    className="flex flex-wrap items-end gap-3"
                  >
                    <Field label="Medicamento" htmlFor="medicamento-actual" className="min-w-0 basis-48 flex-1 gap-2">
                      <Input
                        id="medicamento-actual"
                        autoFocus
                        value={medicamento}
                        onChange={(e) => setMedicamento(e.target.value)}
                      />
                    </Field>
                    <Button type="submit" variant="secondary" disabled={!medicamento.trim()}>
                      <Plus size={15} /> Agregar
                    </Button>
                  </form>
                </FormShell>
              </DialogContent>
            </Dialog>
          </div>
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
            <ul className="flex flex-col gap-2">
              {historia.alergias.map((a) => (
                <li
                  key={a.id}
                  className={`flex min-w-0 items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${
                    a.severidad === "grave"
                      ? "border-pastel-red-fg/10 bg-pastel-red-bg/55"
                      : "border-line bg-surface-sunken"
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
                    className="shrink-0 rounded-full p-1.5 text-ink-muted transition-colors duration-150 hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    <X size={13} weight="bold" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex justify-end">
            <Dialog open={alergiaAbierto} onOpenChange={setAlergiaAbierto}>
              <DialogTrigger asChild>
                <Button type="button" variant="secondary">
                  <Plus size={15} /> Agregar
                </Button>
              </DialogTrigger>
              <DialogContent
                title="Agregar alergia"
                description="Dato crítico: revisar antes de indicar medicación"
              >
                <FormShell section="historia">
                  <form
                    onSubmit={(e) => {
                      handleAgregarAlergia(e);
                      setAlergiaAbierto(false);
                    }}
                    className="flex flex-wrap items-end gap-3"
                  >
                    <Field label="Sustancia" className="min-w-0 basis-48 flex-1 gap-2">
                      <Input
                        autoFocus
                        value={nuevaSustancia}
                        onChange={(e) => setNuevaSustancia(e.target.value)}
                      />
                    </Field>
                    <Field label="Severidad" className="min-w-0 basis-32 flex-1 gap-2">
                      <Select
                        value={nuevaSeveridad}
                        onValueChange={(v) => setNuevaSeveridad(v as Alergia["severidad"])}
                      >
                        <SelectTrigger className="min-w-0 gap-2">
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
                </FormShell>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hábitos</CardTitle>
          <CardDescription>Hábitos relevantes para la atención odontológica</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {historia.habitos.length === 0 ? (
            <p className="text-sm text-ink-muted">Sin hábitos registrados.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {historia.habitos.map((h, i) => (
                <li key={`${i}-${h}`} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0 break-words text-sm text-ink">{h}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-ink-muted"
                    onClick={() => quitarHabito(i)}
                    aria-label={`Quitar hábito ${h}`}
                  >
                    <X size={13} weight="bold" /> Quitar
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex justify-end">
            <Dialog open={habitoAbierto} onOpenChange={setHabitoAbierto}>
              <DialogTrigger asChild>
                <Button type="button" variant="secondary">
                  <Plus size={15} /> Agregar
                </Button>
              </DialogTrigger>
              <DialogContent
                title="Agregar hábito"
                description="Hábitos relevantes para la atención odontológica"
              >
                <FormShell section="historia">
                  <form
                    onSubmit={(e) => {
                      agregarHabito(e);
                      setHabitoAbierto(false);
                    }}
                    className="flex flex-wrap items-end gap-3"
                  >
                    <Field label="Hábito" htmlFor="habito" className="min-w-0 basis-48 flex-1 gap-2">
                      <Input
                        id="habito"
                        autoFocus
                        value={habito}
                        onChange={(e) => setHabito(e.target.value)}
                      />
                    </Field>
                    <Button type="submit" variant="secondary" disabled={!habito.trim()}>
                      <Plus size={15} /> Agregar
                    </Button>
                  </form>
                </FormShell>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Observaciones generales</CardTitle>
          <CardDescription>Notas clínicas generales que no correspondan a los demás apartados</CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={observacionesAbierto} onOpenChange={handleObservacionesOpenChange}>
            <Field label="Observaciones generales" className="gap-2">
              <DialogTrigger asChild>
                <button
                  type="button"
                  aria-label="Editar observaciones generales"
                  className={`${EDITABLE_TEXT_STYLE} min-h-32`}
                >
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">
                    {historia.observacionesGenerales || (
                      <span className="text-ink-muted">Sin información registrada.</span>
                    )}
                  </p>
                </button>
              </DialogTrigger>
            </Field>
            <DialogContent
              title="Observaciones generales"
              description="Notas clínicas generales que no correspondan a los demás apartados"
            >
              <FormShell section="historia">
                <form onSubmit={guardarObservaciones} className="flex flex-col gap-4">
                  <Textarea
                    id="observaciones-generales"
                    autoFocus
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="min-h-32 leading-relaxed"
                  />
                  <FormActions>
                    <Button type="submit" variant="secondary">
                      Guardar
                    </Button>
                  </FormActions>
                </form>
              </FormShell>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <dl className="grid min-w-0 grid-cols-1 gap-4 rounded-xl border border-line bg-surface-sunken p-4 text-xs text-ink-muted sm:grid-cols-2 sm:p-5 xl:col-span-2">
        <div className="min-w-0">
          <dt className="flex items-center gap-2 font-medium">
            <Clock size={15} className="text-ink-muted" aria-hidden /> Öltima actualización
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
        <div className="min-w-0 border-t border-line pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          <dt className="flex items-center gap-2 font-medium">
            <User size={15} className="text-ink-muted" aria-hidden /> Responsable
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

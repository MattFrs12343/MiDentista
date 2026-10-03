import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Trash, Stethoscope, Printer } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClinicaData } from "@/data/store";
import { useAuth } from "@/features/auth/AuthContext";
import { TreatmentPrint } from "@/features/treatment/TreatmentPrint";
import type { PrioridadTratamiento } from "@/types";

const PRIORIDAD_TONE: Record<PrioridadTratamiento, "red" | "yellow" | "green"> = {
  alta: "red",
  media: "yellow",
  baja: "green",
};

export function TreatmentTab({ pacienteId }: { pacienteId: string }) {
  const {
    diagnosticosDe,
    registrarDiagnostico,
    planDe,
    agregarItemPlan,
    quitarItemPlan,
    actualizarObservacionesPlan,
    obtenerPaciente,
  } = useClinicaData();
  const { sesion } = useAuth();

  const paciente = obtenerPaciente(pacienteId);
  const diagnosticos = diagnosticosDe(pacienteId);
  const plan = planDe(pacienteId);
  const [searchParams, setSearchParams] = useSearchParams();

  // Llegar con ?print=1 (desde el botón "Imprimir" de la tabla de pacientes)
  // dispara la impresión automáticamente. Diagnósticos/plan cargan async
  // desde la API, así que se espera un instante breve antes de imprimir.
  useEffect(() => {
    if (searchParams.get("print") !== "1") return;
    const id = setTimeout(() => window.print(), 600);
    searchParams.delete("print");
    setSearchParams(searchParams, { replace: true });
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [descripcion, setDescripcion] = useState("");
  const [piezaDx, setPiezaDx] = useState("");

  const [procedimiento, setProcedimiento] = useState("");
  const [piezaTx, setPiezaTx] = useState("");
  const [costo, setCosto] = useState("");
  const [prioridad, setPrioridad] = useState<PrioridadTratamiento>("media");
  const [observaciones, setObservaciones] = useState(plan.observaciones);

  const total = plan.items.reduce((acc, i) => acc + i.costoEstimado, 0);

  const handleDiagnostico = (e: FormEvent) => {
    e.preventDefault();
    if (!descripcion.trim()) return;
    registrarDiagnostico(pacienteId, descripcion.trim(), piezaDx ? Number(piezaDx) : undefined);
    setDescripcion("");
    setPiezaDx("");
  };

  const handleItemPlan = (e: FormEvent) => {
    e.preventDefault();
    if (!procedimiento.trim() || !costo) return;
    agregarItemPlan(pacienteId, {
      procedimiento: procedimiento.trim(),
      pieza: piezaTx ? Number(piezaTx) : undefined,
      costoEstimado: Number(costo),
      prioridad,
    });
    setProcedimiento("");
    setPiezaTx("");
    setCosto("");
    setPrioridad("media");
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <Button type="button" variant="secondary" onClick={() => window.print()} disabled={!paciente}>
          <Printer size={15} /> Imprimir
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Diagnóstico</CardTitle>
          <CardDescription>Hallazgos clínicos que sustentan el plan de tratamiento</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {diagnosticos.length === 0 ? (
            <p className="text-sm text-ink-muted">Aún no se registraron diagnósticos.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {diagnosticos.map((d) => (
                <li key={d.id} className="flex items-start gap-3 py-3">
                  <Stethoscope size={16} className="mt-0.5 shrink-0 text-brand-500" />
                  <div className="flex-1">
                    <p className="text-sm text-ink">{d.descripcion}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {d.pieza ? `Pieza ${d.pieza} · ` : ""}
                      {d.registradoEl}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleDiagnostico} className="flex flex-wrap items-end gap-3">
            <Field label="Descripción del diagnóstico" className="min-w-56 flex-1">
              <Input
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej. caries profunda con compromiso pulpar…"
              />
            </Field>
            <Field label="Pieza (opcional)" className="w-32">
              <Input
                value={piezaDx}
                onChange={(e) => setPiezaDx(e.target.value)}
                placeholder="46"
                inputMode="numeric"
              />
            </Field>
            <Button type="submit" variant="secondary">
              <Plus size={15} /> Registrar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan de tratamiento propuesto</CardTitle>
          <CardDescription>Procedimientos sugeridos, priorizados y con costo estimado</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {plan.items.length === 0 ? (
            <p className="text-sm text-ink-muted">Aún no se propusieron procedimientos.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-sunken text-xs uppercase tracking-wide text-ink-muted">
                    <th className="px-4 py-2.5 font-semibold">Procedimiento</th>
                    <th className="px-4 py-2.5 font-semibold">Pieza</th>
                    <th className="px-4 py-2.5 font-semibold">Prioridad</th>
                    <th className="px-4 py-2.5 font-semibold">Costo (Bs)</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {plan.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2.5 text-ink">{item.procedimiento}</td>
                      <td className="px-4 py-2.5 text-ink-soft">{item.pieza ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <Badge tone={PRIORIDAD_TONE[item.prioridad]}>{item.prioridad}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-ink-soft">{item.costoEstimado.toFixed(0)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => quitarItemPlan(pacienteId, item.id)}
                          aria-label={`Quitar ${item.procedimiento}`}
                          className="rounded-md p-1.5 text-ink-muted transition-colors duration-150 hover:bg-pastel-red-bg hover:text-pastel-red-fg"
                        >
                          <Trash size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-line bg-surface-sunken">
                    <td colSpan={3} className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      Total estimado
                    </td>
                    <td colSpan={2} className="px-4 py-2.5 text-sm font-semibold text-ink">
                      Bs {total.toFixed(0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <form onSubmit={handleItemPlan} className="flex flex-wrap items-end gap-3">
            <Field label="Procedimiento" className="min-w-48 flex-1">
              <Input
                value={procedimiento}
                onChange={(e) => setProcedimiento(e.target.value)}
                placeholder="Ej. endodoncia, obturación…"
              />
            </Field>
            <Field label="Pieza" className="w-24">
              <Input
                value={piezaTx}
                onChange={(e) => setPiezaTx(e.target.value)}
                placeholder="46"
                inputMode="numeric"
              />
            </Field>
            <Field label="Costo (Bs)" className="w-28">
              <Input
                value={costo}
                onChange={(e) => setCosto(e.target.value)}
                placeholder="850"
                inputMode="numeric"
              />
            </Field>
            <Field label="Prioridad" className="w-32">
              <Select value={prioridad} onValueChange={(v) => setPrioridad(v as PrioridadTratamiento)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Button type="submit" variant="secondary">
              <Plus size={15} /> Agregar
            </Button>
          </form>

          <Field label="Observaciones del plan">
            <Textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              onBlur={() => actualizarObservacionesPlan(pacienteId, observaciones)}
              placeholder="Recomendaciones, orden sugerido, exámenes previos…"
            />
          </Field>
        </CardContent>
      </Card>

      {paciente ? (
        <TreatmentPrint
          paciente={paciente}
          diagnosticos={diagnosticos}
          plan={plan}
          clinica={sesion?.clinica}
        />
      ) : null}
    </div>
  );
}

import { Navigate } from "react-router-dom";
import { NotePencil, SpinnerGap, Tooth, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePortalPaciente } from "@/features/portal-paciente/PortalPacienteContext";
import { etiquetaPieza, formatearFecha } from "@/features/portal-paciente/portalFormato";
import type { CondicionDiente } from "@/types";

const CONDICION_LABEL: Record<CondicionDiente, string> = {
  sano: "Sano",
  caries: "Caries",
  obturado: "Obturado",
  corona: "Corona",
  endodoncia: "Endodoncia",
  ausente: "Ausente",
  extraccion_indicada: "Extracción indicada",
  implante: "Implante",
};

/** Color por condición: solo se pintan las piezas que requieren atención. */
const CONDICION_CLASE: Record<CondicionDiente, string> = {
  sano: "bg-surface-sunken text-ink-soft",
  caries: "bg-pastel-red-bg text-pastel-red-fg",
  obturado: "bg-pastel-blue-bg text-pastel-blue-fg",
  corona: "bg-pastel-yellow-bg text-pastel-yellow-fg",
  endodoncia: "bg-pastel-violet-bg text-pastel-violet-fg",
  ausente: "bg-surface-sunken text-ink-muted",
  extraccion_indicada: "bg-pastel-red-bg text-pastel-red-fg",
  implante: "bg-pastel-green-bg text-pastel-green-fg",
};

export function MiOdontogramaPage() {
  const { ficha, cargando, error, recargar } = usePortalPaciente();

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20">
        <SpinnerGap size={26} className="animate-spin text-ink-soft" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <WarningCircle size={26} weight="fill" className="text-pastel-red-fg" />
          <p className="text-sm text-ink-soft">{error}</p>
          <Button type="button" onClick={() => void recargar()}>
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!ficha) return null;
  if (ficha.sinClinica) return <Navigate to="/portal/buscar" replace />;

  const odontograma = ficha.odontograma;
  const piezas = [...(odontograma?.piezas ?? [])].sort((a, b) => a.pieza - b.pieza);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Mi odontograma</h1>
        <p className="mt-1 text-sm text-ink-soft">El estado de cada una de tus piezas dentales.</p>
      </div>

      {!odontograma ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <Tooth size={28} weight="duotone" className="text-ink-muted" />
            <p className="text-sm text-ink-soft">Todavía no hay un odontograma registrado.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Último examen
              </p>
              <p className="mt-1 font-semibold text-ink">{formatearFecha(odontograma.fechaExamen)}</p>
              {odontograma.actualizadoEl ? (
                <p className="mt-0.5 text-xs text-ink-muted">
                  Actualizado el {formatearFecha(odontograma.actualizadoEl)}
                </p>
              ) : null}
              {odontograma.notas ? (
                <p className="mt-3 flex items-start gap-2 rounded-xl bg-pastel-yellow-bg px-3 py-2 text-sm text-pastel-yellow-fg">
                  <NotePencil size={16} weight="duotone" className="mt-0.5 shrink-0" />
                  {odontograma.notas}
                </p>
              ) : null}
            </CardContent>
          </Card>

          {piezas.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
                <Tooth size={28} weight="duotone" className="text-ink-muted" />
                <p className="text-sm text-ink-soft">Sin piezas registradas</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-5">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Piezas
                </h2>
                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                  {piezas.map((p) => (
                    <Card
                      key={p.pieza}
                      className={`flex flex-col items-center gap-0.5 px-2 py-3 text-center shadow-none ${CONDICION_CLASE[p.condicion]}`}
                    >
                      <span className="text-base font-semibold tabular-nums">
                        {etiquetaPieza(p.pieza)}
                      </span>
                      <span className="text-[11px] leading-tight">{CONDICION_LABEL[p.condicion]}</span>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
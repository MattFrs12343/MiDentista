import { Navigate } from "react-router-dom";
import { CalendarCheck, Note, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePortalPaciente } from "@/features/portal-paciente/PortalPacienteContext";
import { etiquetaPieza, formatearFecha } from "@/features/portal-paciente/portalFormato";
import type { EvolucionPortal } from "@/data/api";

export function MisEvolucionesPage() {
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Mis evoluciones</h1>
        <p className="mt-1 text-sm text-ink-soft">
          El registro de cada atención que tu clínica te realizó.
        </p>
      </div>

      {ficha.evoluciones.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <Note size={28} weight="duotone" className="text-ink-muted" />
            <p className="text-sm text-ink-soft">Todavía no hay evoluciones registradas.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {ficha.evoluciones.map((evolucion) => (
            <CardEvolucion key={evolucion.id} evolucion={evolucion} />
          ))}
        </div>
      )}
    </div>
  );
}

function CardEvolucion({ evolucion }: { evolucion: EvolucionPortal }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-ink">{formatearFecha(evolucion.fechaConsulta)}</h2>
          {evolucion.numeroPieza != null ? (
            <Badge tone="violet">Pieza {etiquetaPieza(evolucion.numeroPieza)}</Badge>
          ) : null}
        </div>

        <div className="mt-3 flex flex-col gap-3">
          <Campo etiqueta="Motivo de consulta" valor={evolucion.motivoConsulta} />
          <Campo etiqueta="Procedimiento realizado" valor={evolucion.procedimientoRealizado} />
          <Campo etiqueta="Observaciones" valor={evolucion.observaciones} />
          <Campo etiqueta="Indicaciones" valor={evolucion.indicaciones} />
        </div>

        {evolucion.proximaAtencion ? (
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-pastel-blue-bg px-3 py-2 text-sm text-pastel-blue-fg">
            <CalendarCheck size={16} weight="duotone" className="shrink-0" />
            Próxima atención: {formatearFecha(evolucion.proximaAtencion)}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Campo({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  const vacio = !valor || !valor.trim();
  return (
    <div>
      <p className="text-xs font-medium text-ink-muted">{etiqueta}</p>
      <p className={`mt-0.5 text-sm ${vacio ? "text-ink-muted" : "text-ink"}`}>{vacio ? "—" : valor}</p>
    </div>
  );
}
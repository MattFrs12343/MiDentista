import { Navigate } from "react-router-dom";
import { useState } from "react";
import { CalendarCheck, Note } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionStatStrip } from "@/components/ui/section-board";
import { usePortalPaciente } from "@/features/portal-paciente/PortalPacienteContext";
import { PortalSubHeader } from "@/features/portal-paciente/PortalHero";
import { PortalCargando, PortalError } from "@/features/portal-paciente/PortalEstado";
import { etiquetaPieza, formatearFecha } from "@/features/portal-paciente/portalFormato";
import { cn } from "@/lib/cn";
import type { EvolucionPortal } from "@/data/api";

export function MisEvolucionesPage() {
  const { ficha, cargando, error, recargar } = usePortalPaciente();

  /* Igual que en la portada: el hook va antes de cualquier return temprano y
     `new Date()` se lee una sola vez por montaje (durante el render es impuro). */
  const [anio] = useState(() => new Date().getFullYear());

  if (cargando) return <PortalCargando />;
  if (error) return <PortalError mensaje={error} onReintentar={() => void recargar()} />;

  if (!ficha) return null;
  if (ficha.sinClinica) return <Navigate to="/portal/buscar" replace />;

  /* `fechaConsulta` es opcional en el tipo, y la API no garantiza orden: sin
     ordenar, "la última atención" podía ser la más antigua. Las sin fecha se
     filtran antes de comparar porque `null` no ordena con `localeCompare`. */
  const conFecha = ficha.evoluciones
    .filter((e): e is EvolucionPortal & { fechaConsulta: string } => e.fechaConsulta != null)
    .sort((a, b) => b.fechaConsulta.localeCompare(a.fechaConsulta));
  const ultima = conFecha[0];
  const delAnio = conFecha.filter((e) => e.fechaConsulta.startsWith(String(anio)));

  return (
    <div className="flex flex-col gap-6">
      <PortalSubHeader
        icono={CalendarCheck}
        titulo="Mis evoluciones"
        descripcion="El registro de cada atención que tu clínica te realizó."
        seccion="evoluciones"
      />

      {ficha.evoluciones.length === 0 ? (
        <Card variant="flat">
          <EmptyState
            icon={Note}
            title="Todavía no hay evoluciones registradas"
            description="Cada consulta que te hagan va a quedar registrada acá."
            size="sm"
          />
        </Card>
      ) : (
        <>
          <SectionStatStrip
            metrics={[
              {
                label: "Evoluciones",
                value: ficha.evoluciones.length,
                icon: CalendarCheck,
                tone: "violet",
                hint: "Atenciones registradas",
                destacado: true,
              },
              {
                label: "Última atención",
                value: ultima?.fechaConsulta ? formatearFecha(ultima.fechaConsulta) : "—",
                icon: Note,
                tone: "blue",
                hint:
                  ultima?.numeroPieza != null
                    ? `Pieza ${etiquetaPieza(ultima.numeroPieza)}`
                    : "Sin pieza asignada",
              },
              {
                label: "Este año",
                value: delAnio.length,
                icon: CalendarCheck,
                tone: "teal",
                hint: "Atenciones en curso",
              },
            ]}
          />

          <div className="flex flex-col gap-3">
            {ficha.evoluciones.map((evolucion) => (
              <CardEvolucion key={evolucion.id} evolucion={evolucion} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CardEvolucion({ evolucion }: { evolucion: EvolucionPortal }) {
  return (
    <Card variant="flat" accent>
      <CardContent className="p-4">
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
          <p className="mt-4 flex items-center gap-2 rounded-tile bg-brand-50 px-3 py-2 text-sm text-brand-700">
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
      <p className={cn("mt-0.5 text-sm", vacio ? "text-ink-muted" : "text-ink")}>{vacio ? "—" : valor}</p>
    </div>
  );
}
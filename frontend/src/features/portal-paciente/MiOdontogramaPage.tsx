import { Navigate } from "react-router-dom";
import { CheckCircle, NotePencil, Tooth } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionStatStrip } from "@/components/ui/section-board";
import { PortalSubHeader } from "@/features/portal-paciente/PortalHero";
import { usePortalPaciente } from "@/features/portal-paciente/PortalPacienteContext";
import { PortalCargando, PortalError } from "@/features/portal-paciente/PortalEstado";
import { etiquetaPieza, formatearFecha } from "@/features/portal-paciente/portalFormato";
import { CONDICION_CLASE, CONDICION_LABEL } from "@/features/portal-paciente/portalOdontograma";
import { Odontograma3D } from "@/features/portal-paciente/Odontograma3D";
import { cn } from "@/lib/cn";

export function MiOdontogramaPage() {
  const { ficha, cargando, error, recargar } = usePortalPaciente();

  if (cargando) return <PortalCargando />;
  if (error) return <PortalError mensaje={error} onReintentar={() => void recargar()} />;

  if (!ficha) return null;
  if (ficha.sinClinica) return <Navigate to="/portal/buscar" replace />;

  const odontograma = ficha.odontograma;
  const piezas = [...(odontograma?.piezas ?? [])].sort((a, b) => a.pieza - b.pieza);

  return (
    <div className="flex flex-col gap-6">
      <PortalSubHeader
        icono={Tooth}
        titulo="Mi odontograma"
        descripcion="El estado de cada una de tus piezas dentales, en 2D y en 3D."
        actualizado={
          odontograma?.actualizadoEl ? formatearFecha(odontograma.actualizadoEl) : undefined
        }
        seccion="odontograma"
      />

      {!odontograma ? (
        <Card variant="flat">
          <EmptyState
            icon={Tooth}
            title="Todavía no hay un odontograma registrado"
            description="Tu clínica lo completa al examinar tus piezas."
            size="sm"
          />
        </Card>
      ) : (
        <>
          <SectionStatStrip
            metrics={[
              {
                label: "Último examen",
                value: formatearFecha(odontograma.fechaExamen),
                icon: Tooth,
                tone: "blue",
                hint: "Registro del odontograma",
                destacado: true,
              },
              {
                label: "Piezas marcadas",
                value: piezas.filter((p) => p.condicion !== "sano").length,
                icon: Tooth,
                tone: "orange",
                hint: `de ${piezas.length} piezas registradas`,
              },
              {
                label: "En buen estado",
                value: piezas.filter((p) => p.condicion === "sano").length,
                icon: CheckCircle,
                tone: "brand",
                hint: "Piezas sin tratamiento",
              },
            ]}
          />

          {odontograma.notas ? (
            <p className="flex items-start gap-2 rounded-tile border border-pastel-yellow-fg/25 bg-pastel-yellow-bg px-3 py-2.5 text-sm text-pastel-yellow-fg">
              <NotePencil size={16} weight="duotone" className="mt-0.5 shrink-0" />
              {odontograma.notas}
            </p>
          ) : null}

          {piezas.length === 0 ? (
            <Card variant="flat">
              <EmptyState icon={Tooth} title="Sin piezas registradas" size="sm" />
            </Card>
          ) : (
            <>
              <Odontograma3D piezas={piezas} />

              <Card variant="flat">
                <CardHeader divided>
                  <CardTitle as="h2">Piezas</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                    {piezas.map((p) => (
                      <Card
                        key={p.pieza}
                        className={cn(
                          "flex flex-col items-center gap-0.5 px-2 py-3 text-center shadow-none",
                          CONDICION_CLASE[p.condicion],
                        )}
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
            </>
          )}
        </>
      )}
    </div>
  );
}
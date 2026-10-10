import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { FileText } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { usePortalPaciente } from "@/features/portal-paciente/PortalPacienteContext";
import { PortalSubHeader } from "@/features/portal-paciente/PortalHero";
import { PortalCargando, PortalError } from "@/features/portal-paciente/PortalEstado";
import { formatearFecha } from "@/features/portal-paciente/portalFormato";
import { cn } from "@/lib/cn";

export function MiHistoriaPage() {
  const { ficha, cargando, error, recargar } = usePortalPaciente();

  if (cargando) return <PortalCargando />;
  if (error) return <PortalError mensaje={error} onReintentar={() => void recargar()} />;

  if (!ficha) return null;
  if (ficha.sinClinica) return <Navigate to="/portal/buscar" replace />;

  const historia = ficha.historia;

  return (
    <div className="flex flex-col gap-6">
      <PortalSubHeader
        icono={FileText}
        titulo="Mi historia clínica"
        descripcion="La información que tu clínica registró sobre tu salud."
        actualizado={historia?.actualizadoEl ? formatearFecha(historia.actualizadoEl) : undefined}
        seccion="historia"
      />

      {!historia ? (
        <Card variant="flat">
          <EmptyState
            icon={FileText}
            title="Todavía no hay historia clínica registrada"
            description="Tu clínica la completa en tu primera consulta."
            size="sm"
          />
        </Card>
      ) : (
        <>
          <Bloque titulo="Motivo de consulta">
            <Campo etiqueta="Motivo de consulta" valor={historia.motivoConsulta} />
          </Bloque>

          <Bloque titulo="Antecedentes">
            <Campo etiqueta="Antecedentes médicos" valor={historia.antecedentesMedicos} />
            <Campo etiqueta="Antecedentes familiares" valor={historia.antecedentesFamiliares} />
            <Campo etiqueta="Antecedentes odontológicos" valor={historia.antecedentesOdontologicos} />
            <Campo etiqueta="Enfermedades actuales" valor={historia.enfermedades} />
          </Bloque>

          <Bloque titulo="Alergias y medicamentos">
            <Campo etiqueta="Alergias" valor={historia.alergias} />
            <Campo etiqueta="Medicamentos actuales" valor={historia.medicamentos} />
          </Bloque>

          <Bloque titulo="Hábitos y observaciones">
            <Campo etiqueta="Hábitos" valor={historia.habitos} />
            <Campo etiqueta="Observaciones" valor={historia.observaciones} />
          </Bloque>
        </>
      )}
    </div>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <Card variant="flat" accent>
      <CardHeader divided>
        <CardTitle as="h2">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">{children}</div>
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
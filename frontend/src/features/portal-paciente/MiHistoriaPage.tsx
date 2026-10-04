import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { FileText, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePortalPaciente } from "@/features/portal-paciente/PortalPacienteContext";
import { formatearFecha } from "@/features/portal-paciente/portalFormato";

export function MiHistoriaPage() {
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

  const historia = ficha.historia;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Mi historia clínica</h1>
        <p className="mt-1 text-sm text-ink-soft">
          La información que tu clínica registró sobre tu salud.
        </p>
      </div>

      {!historia ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <FileText size={28} weight="duotone" className="text-ink-muted" />
            <p className="text-sm text-ink-soft">Todavía no hay historia clínica registrada.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {historia.actualizadoEl ? (
            <p className="text-xs text-ink-muted">
              Última actualización: {formatearFecha(historia.actualizadoEl)}
            </p>
          ) : null}

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
    <Card>
      <CardContent className="p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{titulo}</h2>
        <div className="mt-3 flex flex-col gap-3">{children}</div>
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
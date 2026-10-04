import { Link, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import {
  CalendarBlank,
  FileText,
  MapPin,
  Receipt,
  SpinnerGap,
  Tooth,
  WarningCircle,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePortalPaciente } from "@/features/portal-paciente/PortalPacienteContext";
import { etiquetaEstado, formatearFechaCorta, formatearHora, formatearMoneda, tonoEstado } from "@/features/portal-paciente/portalFormato";

export function PortalHomePage() {
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

  const hoy = new Date().toISOString().slice(0, 10);
  const proximaCita = ficha.citas
    .filter((c) => c.fechaCita >= hoy && (c.estado === "reservada" || c.estado === "confirmada"))
    .sort((a, b) => a.fechaCita.localeCompare(b.fechaCita))[0];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Hola, {ficha.perfil.nombre.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm break-words text-ink-soft">
          Este es el resumen de tu atención en {ficha.clinica?.nombre}.
        </p>
      </div>

      {/* una sola columna en movil: cada card a 320px entra sin recortar y sin
          sumar scroll horizontal */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className="min-w-0">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Clínica</p>
            <p className="mt-1 font-semibold break-words text-ink">{ficha.clinica?.nombre}</p>
            {ficha.clinica?.ciudad ? (
              <p className="mt-0.5 flex items-start gap-1 text-sm text-ink-muted">
                <MapPin size={14} weight="duotone" className="mt-0.5 shrink-0" />{" "}
                <span className="break-words">{ficha.clinica.ciudad}</span>
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Próxima cita</p>
            {proximaCita ? (
              <>
                <p className="mt-1 font-semibold break-words text-ink">
                  {formatearFechaCorta(proximaCita.fechaCita)} · {formatearHora(proximaCita.horaInicio)}
                </p>
                <Badge tone={tonoEstado(proximaCita.estado)} className="mt-1.5">
                  {etiquetaEstado(proximaCita.estado)}
                </Badge>
              </>
            ) : (
              <p className="mt-1 text-sm text-ink-soft">No tenés citas próximas.</p>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Estado de cuenta</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight break-words text-ink">
              {formatearMoneda(ficha.resumen.saldoPendiente)}
            </p>
            <p className="text-sm text-ink-muted">
              Saldo pendiente · Pagado {formatearMoneda(ficha.resumen.totalPagado)}
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardContent className="grid grid-cols-3 gap-1 p-4 text-center sm:p-5 sm:gap-2">
            <Dato icono={CalendarBlank} valor={ficha.evoluciones.length} etiqueta="Evoluciones" />
            <Dato icono={Tooth} valor={ficha.diagnosticos.length} etiqueta="Diagnósticos" />
            <Dato icono={FileText} valor={ficha.planes.length} etiqueta="Tratamientos" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <AccesoRapido to="/portal/historia" icono={<FileText size={16} weight="duotone" />} texto="Ver mi historia" />
        <AccesoRapido to="/portal/odontograma" icono={<Tooth size={16} weight="duotone" />} texto="Ver odontograma" />
        <AccesoRapido to="/portal/pagos" icono={<Receipt size={16} weight="duotone" />} texto="Ver mis pagos" />
      </div>
    </div>
  );
}

function Dato({
  icono: Icono,
  valor,
  etiqueta,
}: {
  icono: typeof CalendarBlank;
  valor: number;
  etiqueta: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 px-0.5">
      <Icono size={18} weight="duotone" className="shrink-0 text-brand-600" />
      <span className="text-lg font-semibold text-ink">{valor}</span>
      <span className="text-[11px] uppercase leading-tight tracking-wide text-balance text-ink-muted">
        {etiqueta}
      </span>
    </div>
  );
}

function AccesoRapido({
  to,
  icono,
  texto,
}: {
  to: string;
  icono: ReactNode;
  texto: string;
}) {
  return (
    <Link
      to={to}
      className="press inline-flex h-12 min-w-0 items-center justify-center gap-2 rounded-full border border-line bg-white px-4 text-center text-sm font-semibold break-words text-ink transition-colors hover:bg-surface-sunken"
    >
      {icono}
      {texto}
    </Link>
  );
}

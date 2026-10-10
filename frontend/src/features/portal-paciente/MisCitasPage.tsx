import { useState } from "react";
import { Navigate } from "react-router-dom";
import {
  CalendarBlank,
  CalendarPlus,
  CheckCircle,
  Clock,
  Envelope,
  MapPin,
  Phone,
} from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { usePortalPaciente } from "@/features/portal-paciente/PortalPacienteContext";
import { PortalSubHeader } from "@/features/portal-paciente/PortalHero";
import { PortalCargando, PortalError } from "@/features/portal-paciente/PortalEstado";
import {
  formatearFecha,
  formatearFechaCorta,
  formatearHora,
} from "@/features/portal-paciente/portalFormato";

/**
 * Citas del paciente y vía para agendar.
 *
 * **Por qué no hay un formulario de reserva.** `citas.odontologo_id` es
 * `not null`: la cita siempre pertenece a un profesional concreto, y la
 * política `citas_insert` solo habilita el insert al personal de la clínica o
 * al superadmin. Un paciente no puede crear la fila, ni aunque la app se lo
 * permita desde el cliente, porque es RLS del servidor.
 *
 * La reserva real la hace el personal de la clínica, así que en vez de un
 * formulario que fallaría al enviar, esta vista da los dos canales que la
 * clínica publica (teléfono y email) y muestra el estado de lo que ya pidió.
 *
 * Para habilitarla de verdad hace falta una RPC `solicitar_cita` con
 * `SECURITY DEFINER` que asigne el profesional y registre la solicitud, más su
 * política RLS. Eso es un cambio de base de datos y necesita la aprobación del
 * PO que describe `CONTRIBUTING.md`.
 */
export function MisCitasPage() {
  const { ficha, cargando, error, recargar } = usePortalPaciente();

  /* `hoy` se lee una vez por montaje y antes de cualquier return temprano:
     `new Date()` en el render es impuro. El día no cambia dentro de una sesión,
     así que el valor es estable entre renders. */
  const [hoy] = useState(() => new Date().toISOString().slice(0, 10));

  if (cargando) return <PortalCargando />;
  if (error) return <PortalError mensaje={error} onReintentar={() => void recargar()} />;

  if (!ficha) return null;
  if (ficha.sinClinica) return <Navigate to="/portal/buscar" replace />;

  const pendientes = ficha.citas
    .filter((c) => c.estado === "reservada" || c.estado === "confirmada")
    .sort((a, b) => a.fechaCita.localeCompare(b.fechaCita));
  const proxima = pendientes.find((c) => c.fechaCita >= hoy) ?? null;
  const passadas = ficha.citas
    .filter((c) => !pendientes.includes(c) || c.fechaCita < hoy)
    .sort((a, b) => b.fechaCita.localeCompare(a.fechaCita));

  return (
    <div className="flex flex-col gap-6">
      <PortalSubHeader
        icono={CalendarBlank}
        titulo="Mis citas"
        descripcion="Pedí una atención y seguí el estado de tus citas."
        seccion="cita"
      />

      {/* Canal de reserva. Va arriba de todo porque es lo que el paciente viene a
          hacer: si es su intención principal, no debería tener que pasar por la
          lista para encontrarla. */}
      <Card variant="raised" tone="brand" accent>
        <CardHeader divided>
          <CardTitle as="h2" className="flex items-center gap-2">
            <CalendarPlus size={18} weight="duotone" aria-hidden />
            Agendar una cita
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 p-4">
          <p className="text-[13px] leading-relaxed text-ink-soft">
            Tu clínica confirma la cita y te asigna el profesional. Llamales o
            escribiles y te atienden directo.
          </p>

          <div className="flex flex-col gap-2">
            {ficha.clinica?.telefono ? (
              <a
                href={`tel:${ficha.clinica.telefono.replace(/\s+/g, "")}`}
                className="press lift-hover flex min-h-14 items-center gap-3 rounded-tile border border-line bg-surface px-4 py-3 shadow-e1"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-tile bg-brand-50 text-brand-600">
                  <Phone size={19} weight="duotone" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                    Llamar a la clínica
                  </span>
                  <span className="block truncate text-sm font-semibold text-ink">
                    {ficha.clinica.telefono}
                  </span>
                </span>
              </a>
            ) : null}

            {ficha.clinica?.email ? (
              <a
                href={`mailto:${ficha.clinica.email}?subject=${encodeURIComponent("Solicitud de cita")}`}
                className="press lift-hover flex min-h-14 items-center gap-3 rounded-tile border border-line bg-surface px-4 py-3 shadow-e1"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-tile bg-brand-50 text-brand-600">
                  <Envelope size={19} weight="duotone" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                    Escribir a la clínica
                  </span>
                  <span className="block truncate text-sm font-semibold text-ink">
                    {ficha.clinica.email}
                  </span>
                </span>
              </a>
            ) : null}

            {!ficha.clinica?.telefono && !ficha.clinica?.email ? (
              <p className="text-[13px] text-ink-muted">
                Tu clínica todavía no publicó un teléfono ni un email de contacto.
                Pedí el dato en tu próxima visita.
              </p>
            ) : null}
          </div>

          {ficha.clinica?.direccion ? (
            <p className="mt-1 flex items-start gap-1.5 text-[12.5px] text-ink-muted">
              <MapPin size={14} weight="duotone" className="mt-0.5 shrink-0" aria-hidden />
              <span className="break-words">{ficha.clinica.direccion}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
          Próximas citas
        </h2>

        {pendientes.length === 0 ? (
          <Card variant="raised">
            <EmptyState
              icon={CalendarBlank}
              title="No tenés citas programadas"
              description="Cuando tu clínica confirme una cita, la vas a ver acá con su fecha y hora."
              size="sm"
            />
          </Card>
        ) : proxima ? (
          /* La próxima cita se destaca con el gradiente de la marca: es el dato
             que el paciente viene a ver, y no debería competir en el mismo
             plano que el resto de la lista. */
          <Card variant="raised" tone="brand" className="overflow-hidden p-0">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex shrink-0 flex-col items-center justify-center rounded-tile bg-brand-50 px-5 py-3 text-center">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-600">
                  {formatearFechaCorta(proxima.fechaCita).split(" ")[0]}
                </span>
                <span className="text-2xl font-bold leading-none text-brand-900 tabular-nums">
                  {proxima.fechaCita.slice(8, 10)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-600">
                  Próxima cita
                </p>
                <p className="mt-0.5 truncate text-[15px] font-semibold text-ink">
                  {proxima.motivoConsulta ?? "Atención en clínica"}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-soft">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarBlank size={14} weight="duotone" aria-hidden />
                    {formatearFecha(proxima.fechaCita)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={14} weight="duotone" aria-hidden />
                    {formatearHora(proxima.horaInicio)}
                  </span>
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 sm:self-center">
                <CheckCircle size={13} weight="fill" aria-hidden />
                {proxima.estado === "confirmada" ? "Confirmada" : "Reservada"}
              </span>
            </div>
          </Card>
        ) : null}
      </section>

      {pendientes.length > (proxima ? 1 : 0) ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            También programadas
          </h2>
          <ul className="flex flex-col gap-2">
            {pendientes
              .filter((c) => c.id !== proxima?.id)
              .map((cita) => (
                <li key={cita.id}>
                  <FilaCita cita={cita} />
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      {passadas.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            Atendidas
          </h2>
          <ul className="flex flex-col gap-2">
            {passadas.slice(0, 5).map((cita) => (
              <li key={cita.id}>
                <FilaCita cita={cita} tenue />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function FilaCita({
  cita,
  tenue = false,
}: {
  cita: { id: string; fechaCita: string; horaInicio: string; estado: string; motivoConsulta: string | null };
  tenue?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-tile border border-line bg-surface px-4 py-3 ${
        tenue ? "opacity-75" : ""
      }`}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-tile bg-surface-sunken text-ink-muted">
        <CalendarBlank size={18} weight="duotone" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">
          {cita.motivoConsulta ?? "Atención en clínica"}
        </span>
        <span className="block truncate text-[12.5px] text-ink-muted">
          {formatearFecha(cita.fechaCita)} · {formatearHora(cita.horaInicio)}
        </span>
      </span>
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        {cita.estado === "atendida" ? "Atendida" : cita.estado}
      </span>
    </div>
  );
}
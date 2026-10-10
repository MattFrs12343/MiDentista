import { CalendarBlank } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TonePanel } from "@/components/ui/tone-panel";
import { cn } from "@/lib/cn";
import { GRADIENTE_SECCION, type SeccionPortal } from "@/features/portal-paciente/portalGradientes";

/**
 * Cabecera de la portada del portal del paciente.
 *
 * Mismo lenguaje que el resto de la app: degradado de módulo (azul de marca,
 * de izquierda a derecha), blobs difusos y los dientes flotantes animados —
 * el fondo dinámico que el paciente ya conoce de cuando entra al portal.
 */
export function PortalHero({
  nombre,
  clinica,
  ciudad,
  proximaCita,
  saldoPendiente,
}: {
  nombre: string;
  clinica: string | null;
  ciudad: string | null;
  proximaCita: { texto: string } | null;
  saldoPendiente: number;
}) {
  const primero = nombre.split(" ")[0] ?? nombre;

  return (
    <TonePanel tone="blue">
      <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar
            nombre={nombre}
            className="size-14 shrink-0 border-2 border-white/25 text-base sm:size-16"
          />
          <div className="min-w-0">
            <h1 className="title-ios truncate text-xl font-semibold text-white sm:text-2xl">
              Hola, {primero}
            </h1>
            <span className="sr-only">{nombre}</span>
            <p className="mt-0.5 truncate text-[13px] text-white/75">
              {clinica ?? "Sin clínica asignada"}
              {ciudad ? ` · ${ciudad}` : ""}
            </p>
          </div>
        </div>

        {saldoPendiente > 0 ? (
          <Badge
            tone="yellow"
            className="shrink-0 border border-white/20 bg-white/15 text-white print:hidden"
          >
            Tenés saldo pendiente
          </Badge>
        ) : null}
      </div>

      {proximaCita ? (
        <div className="relative flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-white/15 px-5 py-3 sm:px-6">
          <CalendarBlank
            size={14}
            weight="duotone"
            className="shrink-0 text-white/60"
            aria-hidden
          />
          <span className="text-[13px] text-white/90">
            Tu próxima cita: <strong className="font-semibold">{proximaCita.texto}</strong>
          </span>
        </div>
      ) : null}
    </TonePanel>
  );
}

/**
 * Encabezado de las vistas internas del portal (historia, evoluciones, pagos,
 * odontograma, citas, buscar clínica).
 *
 * Cada sección lleva el mismo color que su tarjeta de acceso en la portada
 * (`seccion`, de `portalGradientes.ts`): "Mis citas" se ve azul ahí y acá,
 * "Odontograma" violeta ahí y acá, etc. Antes este encabezado era un ícono
 * suelto sobre el canvas — con seis secciones iguales, nada ayudaba a saber
 * en qué parte del portal estabas con solo mirar de reojo.
 */
export function PortalSubHeader({
  icono: Icono,
  titulo,
  descripcion,
  actualizado,
  seccion,
}: {
  icono: Icon;
  titulo: string;
  descripcion: string;
  actualizado?: string;
  seccion: SeccionPortal;
}) {
  return (
    <header className="flex flex-col gap-3">
      <div
        className={cn(
          "relative isolate overflow-hidden rounded-panel bg-gradient-to-r p-5 sm:p-6",
          GRADIENTE_SECCION[seccion],
        )}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden print:hidden">
          <div className="mesh-blob-a absolute -left-1/5 -top-1/3 h-[85%] w-[70%] rounded-full bg-white/10 blur-3xl" />
          <div className="mesh-blob-b absolute -bottom-1/3 -right-1/5 h-[90%] w-[70%] rounded-full bg-white/10 blur-3xl" />
        </div>

        <div className="relative flex min-w-0 items-start gap-3">
          <span
            aria-hidden
            className="grid size-10 shrink-0 place-items-center rounded-tile bg-white/15 text-white ring-1 ring-white/20"
          >
            <Icono size={20} weight="duotone" />
          </span>
          <div className="min-w-0">
            <h1 className="title-ios text-xl font-semibold text-white sm:text-2xl">{titulo}</h1>
            <p className="mt-0.5 text-[13px] break-words text-white/80">{descripcion}</p>
          </div>
        </div>
      </div>
      {actualizado ? (
        <p className="text-xs text-ink-muted">Última actualización: {actualizado}</p>
      ) : null}
    </header>
  );
}

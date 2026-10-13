import { CalendarBlank, EnvelopeSimple, IdentificationCard, Phone } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AnimatedTeeth } from "@/components/ui/animated-teeth";
import { cn } from "@/lib/cn";
import type { Paciente } from "@/types";

/**
 * Cabecera de la ficha del paciente.
 *
 * Todas las demás secciones abren con un `SectionHeroStrip` sobre una foto; la
 * ficha era la única que arrancaba con una tarjeta plana. Eso también tapaba
 * el fondo animado global (`AppBackground`): sus dientes flotantes van a
 * opacidad 0.13-0.16 y, sin un panel propio que los respalde, quedaban
 * completamente ocultos bajo las tarjetas opacas de las pestañas.
 *
 * Aquí el fondo animado se usa en `vivid` sobre el gradiente violeta del
 * module, así se lee como parte de la identidad en vez de como un adorno
 * perdido. El mismo gradiente que usa `TONE_GRADIENT.violet` en `section-hero`.
 */
const GRADIENTO = "from-[#2f2159] via-[#5b3f9f] to-[#9b81d6]";

function Dato({
  icono: Icono,
  children,
}: {
  icono: typeof IdentificationCard;
  children: ReactNode;
}) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <Icono size={13} className="shrink-0 text-white/60" aria-hidden />
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

export function PatientHero({ paciente }: { paciente: Paciente }) {
  const nombre = `${paciente.nombres} ${paciente.apellidos}`.trim();

  return (
    <section
      className={cn(
        "relative isolate overflow-hidden rounded-panel bg-gradient-to-r",
        GRADIENTO,
      )}
    >
      {/* Los blobs replican los de `AppBackground`: sin ellos el gradiente
          queda plano al lado del resto de la app. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden print:hidden"
      >
        <div className="mesh-blob-a absolute -left-1/5 -top-1/3 h-[85%] w-[70%] rounded-full bg-white/10 blur-3xl" />
        <div className="mesh-blob-b absolute -bottom-1/3 -right-1/5 h-[90%] w-[70%] rounded-full bg-brand-200/20 blur-3xl" />
        <AnimatedTeeth tone="vivid" />
      </div>

      <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar
            nombre={nombre}
            className="size-14 shrink-0 border-2 border-white/25 text-base sm:size-16"
          />
          <div className="min-w-0">
            <h1 className="title-ios truncate text-xl font-semibold text-white sm:text-2xl">
              {nombre}
            </h1>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/75">
              {paciente.ci ? (
                <Dato icono={IdentificationCard}>{paciente.ci}</Dato>
              ) : null}
              {paciente.fechaNacimiento ? (
                <Dato icono={CalendarBlank}>{paciente.fechaNacimiento}</Dato>
              ) : null}
              {paciente.telefono ? <Dato icono={Phone}>{paciente.telefono}</Dato> : null}
              {paciente.email ? <Dato icono={EnvelopeSimple}>{paciente.email}</Dato> : null}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 print:hidden">
          <Badge tone="blue">Paciente activo</Badge>
        </div>
      </div>
    </section>
  );
}

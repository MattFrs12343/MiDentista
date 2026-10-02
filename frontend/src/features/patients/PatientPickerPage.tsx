import { useMemo, useState, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlass, ArrowRight, UsersThree, type IconProps } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { SectionHero } from "@/components/ui/section-hero";
import { usePageHeader, type ModuleTone } from "@/components/layout/PageHeaderContext";
import { useClinicaData } from "@/data/store";
import type { TabValue } from "@/features/patients/tabValue";

export function PatientPickerPage({
  titulo,
  subtitulo,
  tab,
  icono,
  tono = "blue",
  foto,
  fotoPosicion = "center",
}: {
  titulo: string;
  subtitulo: string;
  tab: TabValue;
  icono: ComponentType<IconProps>;
  tono?: ModuleTone;
  foto?: string;
  fotoPosicion?: string;
}) {
  usePageHeader({ title: titulo, subtitle: subtitulo, icon: icono, tone: tono });
  const { pacientes } = useClinicaData();
  const [busqueda, setBusqueda] = useState("");
  const navigate = useNavigate();
  const estiloHistoria = tab === "historia";

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return pacientes;
    return pacientes.filter((p) =>
      `${p.nombres} ${p.apellidos} ${p.ci}`.toLowerCase().includes(q),
    );
  }, [pacientes, busqueda]);

  return (
    <div className={estiloHistoria
      ? "flex min-w-0 flex-col gap-5 rounded-2xl bg-[#F4FBFE] p-3 sm:gap-6 sm:p-5"
      : "flex flex-col gap-5"}
    >
      {estiloHistoria ? (
        <section className="fade-in-up relative isolate flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#D6ECF6] bg-gradient-to-br from-[#E4F4FC] to-[#CFEAF8] shadow-diffuse sm:min-h-64 sm:flex-row sm:items-center lg:min-h-72">
          <svg
            aria-hidden
            viewBox="0 0 1000 320"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full"
          >
            <path d="M0 250 Q280 155 580 275 T1000 235 V320 H0Z" className="fill-white/30" />
            <path d="M0 285 Q320 215 620 295 T1000 265 V320 H0Z" className="fill-white/25" />
            <path d="M650 0 Q590 145 1000 200" fill="none" className="stroke-white/40" strokeWidth="2" />
          </svg>
          <div className="relative z-10 w-full px-5 pb-4 pt-8 sm:w-3/5 sm:px-8 sm:py-10 lg:px-10">
            <h2 className="break-words text-3xl font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-4xl lg:text-5xl">
              {titulo}
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-soft sm:text-base">{subtitulo}.</p>
          </div>
          {foto ? (
            <div
              aria-hidden
              className="pointer-events-none relative h-44 w-full overflow-hidden sm:absolute sm:inset-y-0 sm:right-0 sm:h-full sm:w-1/2"
              style={{
                maskImage: "linear-gradient(to right, transparent 0%, black 35%, black 100%)",
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 35%, black 100%)",
              }}
            >
              <img
                src={foto}
                alt=""
                className="absolute right-0 top-0 h-full w-auto max-w-none opacity-90"
                style={{
                  maskImage: "linear-gradient(to right, transparent 0%, transparent 48%, black 68%, black 100%)",
                  WebkitMaskImage: "linear-gradient(to right, transparent 0%, transparent 48%, black 68%, black 100%)",
                }}
              />
            </div>
          ) : null}
        </section>
      ) : (
        <SectionHero
          icon={icono}
          tone={tono}
          kicker="Mi Dentista"
          heading={titulo}
          description={`${subtitulo}.`}
          photo={foto}
          photoPosition={fotoPosicion}
          className="fade-in-up"
        />
      )}

      <div className={estiloHistoria ? "relative w-full min-w-0 sm:max-w-md" : "relative max-w-sm"}>
        <MagnifyingGlass
          size={16}
          className={estiloHistoria
            ? "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-500"
            : "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"}
        />
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, apellido o CI…"
          className={estiloHistoria
            ? "min-w-0 border-[#D6ECF6] bg-[#FBFDFF] pl-10 shadow-diffuse hover:border-brand-200 focus-visible:border-brand-300 focus-visible:ring-brand-100"
            : "pl-9"}
        />
      </div>

      {filtrados.length === 0 ? (
        <Card className={estiloHistoria
          ? "flex min-w-0 flex-col items-center gap-3 border-dashed border-[#D6ECF6] bg-surface px-5 py-10 text-center sm:p-12"
          : "flex flex-col items-center gap-3 border-dashed p-12 text-center"}
        >
          <UsersThree size={28} className={estiloHistoria ? "text-brand-500" : "text-ink-muted"} />
          <p className={estiloHistoria ? "max-w-md break-words text-sm text-ink-muted" : "text-sm text-ink-muted"}>
            No se encontraron pacientes que coincidan con “{busqueda}”.
          </p>
        </Card>
      ) : (
        <Card className={estiloHistoria
          ? "min-w-0 overflow-hidden rounded-2xl border-[#D6ECF6] bg-surface shadow-diffuse"
          : "overflow-hidden"}
        >
          <ul className={estiloHistoria ? "divide-y divide-[#D6ECF6]/70" : "divide-y divide-line"}>
            {filtrados.map((p, i) => (
              <li key={p.id}>
                <button
                  onClick={() => navigate(`/app/pacientes/${p.id}?tab=${tab}`)}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className={estiloHistoria
                    ? "fade-in-up flex w-full min-w-0 items-center justify-between gap-3 bg-surface px-4 py-4 text-left transition-colors duration-150 ease-out hover:bg-[#EEF8FC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-300 sm:px-5"
                    : "fade-in-up flex w-full items-center justify-between px-5 py-3 text-left transition-colors duration-150 ease-out hover:bg-surface-sunken"}
                >
                  <div className={estiloHistoria ? "flex min-w-0 items-center gap-3" : "flex items-center gap-3"}>
                    <Avatar
                      nombre={`${p.nombres} ${p.apellidos}`}
                      className={estiloHistoria ? "h-10 w-10 bg-[#DDF2FC] text-brand-600 ring-1 ring-[#D6ECF6]" : undefined}
                    />
                    <div className={estiloHistoria ? "min-w-0" : undefined}>
                      <p className={estiloHistoria ? "break-words text-sm font-medium text-ink" : "text-sm font-medium text-ink"}>
                        {p.nombres} {p.apellidos}
                      </p>
                      <p className={estiloHistoria ? "mt-1 break-words text-xs text-ink-muted" : "text-xs text-ink-muted"}>CI {p.ci}</p>
                    </div>
                  </div>
                  <ArrowRight size={15} className={estiloHistoria ? "shrink-0 text-brand-400" : "text-ink-muted"} />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

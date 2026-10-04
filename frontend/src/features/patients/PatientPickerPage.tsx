import { useMemo, useState, type ComponentType } from "react";
import { MagnifyingGlass, UsersThree, type IconProps } from "@phosphor-icons/react";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { HangingBanner } from "@/components/ui/hanging-banner";
import { SectionHeroStrip } from "@/components/ui/section-hero";
import { usePageHeader, type ModuleTone } from "@/components/layout/PageHeaderContext";
import { useClinicaData } from "@/data/store";
import { PatientsTable } from "@/features/patients/PatientsTable";
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

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return pacientes;
    return pacientes.filter((p) =>
      `${p.nombres} ${p.apellidos} ${p.ci} ${p.telefono} ${p.email}`
        .toLowerCase()
        .includes(q),
    );
  }, [pacientes, busqueda]);

  return (
    <div className="flex flex-col gap-5">
      <HangingBanner className="max-w-3xl">
        <SectionHeroStrip
          icon={icono}
          tone={tono}
          photo={foto}
          photoPosition={fotoPosicion}
          className="hanger-panel fade-in-up"
        />
      </HangingBanner>

      <div className="relative max-w-sm">
        <MagnifyingGlass
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
        />
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, apellido o CI…"
          className="pl-9"
        />
      </div>

      {filtrados.length === 0 ? (
        <EmptyState
          icon={busqueda.trim() ? MagnifyingGlass : UsersThree}
          iconTone={busqueda.trim() ? "neutral" : "brand"}
          title={busqueda.trim() ? `Sin coincidencias para “${busqueda.trim()}”` : "Todavía no hay pacientes"}
          description={
            busqueda.trim()
              ? "Probá con otra parte del nombre, del apellido o de la CI."
              : "Registrá un paciente en la sección Pacientes para poder seleccionarlo desde acá."
          }
          actionLabel={busqueda.trim() ? "Limpiar búsqueda" : undefined}
          actionVariant="secondary"
          onAction={() => setBusqueda("")}
          live
        />
      ) : (
        <PatientsTable pacientes={filtrados} tab={tab} />
      )}
    </div>
  );
}

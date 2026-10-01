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

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return pacientes;
    return pacientes.filter((p) =>
      `${p.nombres} ${p.apellidos} ${p.ci}`.toLowerCase().includes(q),
    );
  }, [pacientes, busqueda]);

  return (
    <div className="flex flex-col gap-5">
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
        <Card className="flex flex-col items-center gap-3 border-dashed p-12 text-center">
          <UsersThree size={28} className="text-ink-muted" />
          <p className="text-sm text-ink-muted">
            No se encontraron pacientes que coincidan con “{busqueda}”.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {filtrados.map((p, i) => (
              <li key={p.id}>
                <button
                  onClick={() => navigate(`/app/pacientes/${p.id}?tab=${tab}`)}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className="fade-in-up flex w-full items-center justify-between px-5 py-3 text-left transition-colors duration-150 ease-out hover:bg-surface-sunken"
                >
                  <div className="flex items-center gap-3">
                    <Avatar nombre={`${p.nombres} ${p.apellidos}`} />
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {p.nombres} {p.apellidos}
                      </p>
                      <p className="text-xs text-ink-muted">CI {p.ci}</p>
                    </div>
                  </div>
                  <ArrowRight size={15} className="text-ink-muted" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlass, Plus, ArrowRight, UsersThree } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import bannerPacientes from "@/assets/banners/banner-pacientes.jpg";
import { SectionHero } from "@/components/ui/section-hero";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { usePageHeader } from "@/components/layout/PageHeaderContext";
import { useClinicaData } from "@/data/store";
import { PatientForm } from "@/features/patients/PatientForm";

function calcularEdad(fechaNacimiento: string) {
  const nacimiento = new Date(fechaNacimiento);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
}

export function PatientsListPage() {
  const { pacientes, registrarPaciente } = useClinicaData();
  const [busqueda, setBusqueda] = useState("");
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const navigate = useNavigate();

  usePageHeader({
    title: "Pacientes",
    subtitle: "Registra, busca y consulta la ficha de cada paciente",
    icon: UsersThree,
    tone: "blue",
  });

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
        icon={UsersThree}
        tone="blue"
        kicker="Mi Dentista"
        heading="Pacientes"
        description="Registra, busca y consulta la ficha de cada paciente."
        photo={bannerPacientes}
        photoPosition="60% center"
        className="fade-in-up"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
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

        <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
          <DialogTrigger asChild>
            <Button>
              <Plus size={16} weight="bold" /> Nuevo paciente
            </Button>
          </DialogTrigger>
          <DialogContent
            title="Registrar paciente"
            description="Datos mínimos para abrir el expediente clínico."
          >
            <PatientForm
              onSubmit={(datos) => {
                const creado = registrarPaciente(datos);
                setDialogoAbierto(false);
                navigate(`/app/pacientes/${creado.id}`);
              }}
            />
          </DialogContent>
        </Dialog>
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
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-sunken text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-5 py-3 font-semibold">Paciente</th>
                <th className="px-5 py-3 font-semibold">CI</th>
                <th className="px-5 py-3 font-semibold">Edad</th>
                <th className="px-5 py-3 font-semibold">Teléfono</th>
                <th className="px-5 py-3 font-semibold">Registrado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtrados.map((p, i) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/app/pacientes/${p.id}`)}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className="fade-in-up cursor-pointer transition-colors duration-150 ease-out hover:bg-surface-sunken"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar nombre={`${p.nombres} ${p.apellidos}`} />
                      <div>
                        <p className="font-medium text-ink">
                          {p.nombres} {p.apellidos}
                        </p>
                        <p className="text-xs text-ink-muted">{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-ink-soft">{p.ci}</td>
                  <td className="px-5 py-3 text-ink-soft">{calcularEdad(p.fechaNacimiento)} años</td>
                  <td className="px-5 py-3 text-ink-soft">{p.telefono}</td>
                  <td className="px-5 py-3 text-ink-soft">{p.creadoEl}</td>
                  <td className="px-5 py-3 text-right">
                    <ArrowRight size={15} className="ml-auto text-ink-muted" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

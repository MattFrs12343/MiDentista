import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlass, Plus, UsersThree, CaretLeft, CaretRight, Phone, Envelope } from "@phosphor-icons/react";
import bannerPacientes from "@/assets/banners/banner-pacientes.jpg";
import { HangingBanner } from "@/components/ui/hanging-banner";
import { SectionHeroStrip } from "@/components/ui/section-hero";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionStatStrip, SectionToolbar } from "@/components/ui/section-board";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { usePageHeader } from "@/components/layout/PageHeaderContext";
import { useClinicaData } from "@/data/store";
import { PatientForm } from "@/features/patients/PatientForm";
import { PatientsTable } from "@/features/patients/PatientsTable";

const POR_PAGINA = 20;

export function PatientsListPage() {
  const { pacientes, registrarPaciente } = useClinicaData();
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [busquedaVista, setBusquedaVista] = useState("");
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const navigate = useNavigate();

  // Cambiar el filtro de búsqueda vuelve a la primera página. Se ajusta durante
  // el render en lugar de en un efecto para no provocar un segundo render en cascada.
  if (busqueda !== busquedaVista) {
    setBusquedaVista(busqueda);
    setPagina(1);
  }

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
      `${p.nombres} ${p.apellidos} ${p.ci} ${p.telefono} ${p.email}`
        .toLowerCase()
        .includes(q),
    );
  }, [pacientes, busqueda]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);

  const visibles = useMemo(
    () => filtrados.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA),
    [filtrados, paginaSegura],
  );

  const desde = filtrados.length === 0 ? 0 : (paginaSegura - 1) * POR_PAGINA + 1;
  const hasta = Math.min(paginaSegura * POR_PAGINA, filtrados.length);

  return (
    <div className="flex flex-col gap-5">
      <HangingBanner className="max-w-3xl">
        <SectionHeroStrip
          icon={UsersThree}
          tone="blue"
          photo={bannerPacientes}
          photoPosition="60% center"
          className="hanger-panel fade-in-up"
        />
      </HangingBanner>

      <SectionStatStrip
        metrics={[
          {
            label: "Pacientes registrados",
            value: pacientes.length,
            icon: UsersThree,
            tone: "brand",
            hint: "en toda la clínica",
            destacado: true,
          },
          {
            label: "Con teléfono",
            value: pacientes.filter((p) => p.telefono.trim().length > 0).length,
            icon: Phone,
            tone: "teal",
            hint: "contacto directo",
          },
          {
            label: "Con correo",
            value: pacientes.filter((p) => p.email.trim().length > 0).length,
            icon: Envelope,
            tone: "violet",
            hint: "para recordatorios",
          },
          {
            label: "Resultados",
            value: filtrados.length,
            icon: MagnifyingGlass,
            tone: "neutral",
            hint: busqueda.trim() ? `para “${busqueda.trim()}”` : "sin filtro aplicado",
          },
        ]}
      />

      <SectionToolbar>
        <div className="relative min-w-56 flex-1">
          <MagnifyingGlass
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, CI, teléfono o correo…"
            className="border-0 bg-transparent pl-9 shadow-none focus-visible:bg-transparent"
            aria-label="Buscar pacientes"
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
              onSubmit={async (datos) => {
                const creado = await registrarPaciente(datos);
                setDialogoAbierto(false);
                navigate(`/app/pacientes/${creado.id}`);
              }}
            />
          </DialogContent>
        </Dialog>
      </SectionToolbar>

      {filtrados.length === 0 ? (
        <EmptyState
          icon={busqueda.trim() ? MagnifyingGlass : UsersThree}
          iconTone={busqueda.trim() ? "neutral" : "brand"}
          title={busqueda.trim() ? `Sin coincidencias para “${busqueda.trim()}”` : "Todavía no hay pacientes"}
          description={
            busqueda.trim()
              ? "Probá con otra parte del nombre, la CI o el teléfono. También podés buscar por correo."
              : "Registrá el primer paciente de la clínica para poder abrir su historia clínica, su odontograma y su plan de tratamiento."
          }
          actionLabel={busqueda.trim() ? "Limpiar búsqueda" : "Nuevo paciente"}
          actionVariant={busqueda.trim() ? "secondary" : "primary"}
          onAction={() => (busqueda.trim() ? setBusqueda("") : setDialogoAbierto(true))}
          live
        />
      ) : (
        <>
          <PatientsTable pacientes={visibles} tab="datos" />

          {filtrados.length > POR_PAGINA && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-ink-muted">
                Mostrando <span className="font-medium text-ink-soft">{desde}</span>–
                <span className="font-medium text-ink-soft">{hasta}</span> de{" "}
                <span className="font-medium text-ink-soft">{filtrados.length}</span>{" "}
                {filtrados.length === 1 ? "paciente" : "pacientes"}
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={paginaSegura <= 1}
                >
                  <CaretLeft size={14} weight="bold" /> Anterior
                </Button>
                <span className="px-1 text-xs font-medium text-ink-soft">
                  Página {paginaSegura} de {totalPaginas}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaSegura >= totalPaginas}
                >
                  Siguiente <CaretRight size={14} weight="bold" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

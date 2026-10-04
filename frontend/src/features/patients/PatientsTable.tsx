import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, PencilSimple, Printer, Trash, SpinnerGap, UserCircle, WarningCircle } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useClinicaData } from "@/data/store";
import type { Paciente } from "@/types";
import type { TabValue } from "@/features/patients/tabValue";

function calcularEdad(fechaNacimiento: string) {
  const nacimiento = new Date(fechaNacimiento);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
}

const ACCION_BTN =
  "rounded-md p-1.5 text-ink-muted transition-colors duration-150 ease-out hover:bg-surface-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring";

/** La fila no es clickeable: la ficha se abre desde el enlace del nombre o desde
 *  los botones de acciones, y asi el teclado recorre cada destino. */
const ENLACE_FICHA =
  "flex items-center gap-3 px-4 py-3 focus-visible:rounded-ios focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring";

/**
 * Tabla de pacientes con columna de acciones (Ver / Editar / Imprimir /
 * Eliminar), reutilizada por la lista general de Pacientes y por los
 * selectores de Historia Clínica, Odontograma y Diagnóstico y Tratamiento ‐
 * cada uno le pasa el `tab` al que debe navegar Ver/Editar/Imprimir.
 *
 * Montada sobre `DataTable`: el encabezado queda fijo mientras se recorre la
 * lista y la edad se alinea a la derecha en columna tabular, así se lee como
 * cifra y no como texto suelto.
 */
export function PatientsTable({ pacientes, tab }: { pacientes: Paciente[]; tab: TabValue }) {
  const navigate = useNavigate();
  const { eliminarPaciente } = useClinicaData();
  const [porEliminar, setPorEliminar] = useState<Paciente | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  const irA = (id: string, imprimir = false) => {
    navigate(`/app/pacientes/${id}?tab=${tab}${imprimir ? "&print=1" : ""}`);
  };

  const fichaDe = (id: string) => `/app/pacientes/${id}?tab=${tab}`;

  // Las columnas se arman en cada render a proposito: dependen de `tab` y de
  // los manejadores de la fila, y `DataTable` no memoriza nada, asi que
  // envolverlo en useMemo solo agrega dependencia que puede quedar vieja.
  const columnas: DataTableColumn<Paciente>[] = [
    {
      key: "paciente",
      header: "Paciente",
      width: "30%",
      // La celda deja el padding al enlace para que toda la fila de datos
      // sea el area clickeable del link, sin superponer margenes negativos.
      cellClassName: "p-0",
      cell: (p) => (
        <Link to={fichaDe(p.id)} className={ENLACE_FICHA}>
          <Avatar nombre={`${p.nombres} ${p.apellidos}`} />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">
              {p.nombres} {p.apellidos}
            </p>
            <p className="truncate text-xs text-ink-muted">{p.email}</p>
          </div>
        </Link>
      ),
    },
    {
      key: "ci",
      header: "CI",
      width: "12%",
      cell: (p) => p.ci,
    },
    {
      key: "edad",
      header: "Edad",
      width: "9%",
      numeric: true,
      cell: (p) => `${calcularEdad(p.fechaNacimiento)} años`,
    },
    {
      key: "telefono",
      header: "Teléfono",
      width: "16%",
      cell: (p) => p.telefono,
    },
    {
      key: "registrado",
      header: "Registrado",
      width: "18%",
      cell: (p) => p.creadoEl,
    },
    {
      key: "acciones",
      header: "Acciones",
      width: "15%",
      align: "right",
      cellClassName: "whitespace-nowrap",
      cell: (p) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            aria-label={`Ver ${p.nombres} ${p.apellidos}`}
            title="Ver"
            className={ACCION_BTN}
            onClick={() => irA(p.id)}
          >
            <Eye size={16} weight="bold" />
          </button>
          <button
            type="button"
            aria-label={`Editar ${p.nombres} ${p.apellidos}`}
            title="Editar"
            className={ACCION_BTN}
            onClick={() => irA(p.id)}
          >
            <PencilSimple size={16} weight="bold" />
          </button>
          <button
            type="button"
            aria-label={`Imprimir ${p.nombres} ${p.apellidos}`}
            title="Imprimir"
            className={ACCION_BTN}
            onClick={() => irA(p.id, true)}
          >
            <Printer size={16} weight="bold" />
          </button>
          <button
            type="button"
            aria-label={`Eliminar ${p.nombres} ${p.apellidos}`}
            title="Eliminar"
            className={`${ACCION_BTN} hover:bg-pastel-red-bg hover:text-pastel-red-fg`}
            onClick={() => {
              setErrorEliminar(null);
              setPorEliminar(p);
            }}
          >
            <Trash size={16} weight="bold" />
          </button>
        </div>
      ),
    },
  ];

  const confirmarEliminar = async () => {
    if (!porEliminar) return;
    setEliminando(true);
    setErrorEliminar(null);
    try {
      await eliminarPaciente(porEliminar.id);
      setPorEliminar(null);
    } catch {
      setErrorEliminar("No se pudo eliminar el paciente. Probá de nuevo.");
    } finally {
      setEliminando(false);
    }
  };

  return (
    <>
      <DataTable
        columns={columnas}
        data={pacientes}
        rowKey={(p) => p.id}
        label="Listado de pacientes"
        // Sin alto maximo el encabezado sticky no tiene contra que anclarse:
        // el alto le da su propio scroll vertical.
        maxHeight="32rem"
        className="fade-in-up"
        tableClassName="min-w-[46rem]"
        empty={
          <EmptyState
            size="sm"
            icon={UserCircle}
            iconTone="brand"
            title="Todavía no hay pacientes para mostrar"
            description="Registrá el primer paciente de la clínica para empezar a abrir historias clínicas."
          />
        }
      />

      <Dialog
        open={porEliminar !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPorEliminar(null);
            setErrorEliminar(null);
          }
        }}
      >
        <DialogContent title="Eliminar paciente" description="Esta acción no se puede deshacer.">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-soft">
              ¿Seguro que querés eliminar a{" "}
              <strong className="text-ink">
                {porEliminar?.nombres} {porEliminar?.apellidos}
              </strong>
              ? Va a dejar de aparecer en la lista de pacientes de la clínica.
            </p>

            {errorEliminar && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-pastel-red-fg/25 bg-pastel-red-bg px-3.5 py-3 text-sm text-pastel-red-fg"
              >
                <WarningCircle size={17} weight="fill" className="mt-0.5 shrink-0" />
                <span>{errorEliminar}</span>
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setPorEliminar(null)} disabled={eliminando}>
                Cancelar
              </Button>
              <Button type="button" variant="danger" onClick={confirmarEliminar} disabled={eliminando}>
                {eliminando ? (
                  <>
                    <SpinnerGap size={16} className="animate-spin" /> Eliminando…
                  </>
                ) : (
                  "Eliminar"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

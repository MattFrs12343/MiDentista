import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CaretRight,
  Eye,
  PencilSimple,
  Printer,
  Trash,
  SpinnerGap,
  UserCircle,
  WarningCircle,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

/** Acción de la tarjeta móvil: 44px de alto, con su texto y no solo el ícono. */
function BotonAccion({
  icono: Icono,
  etiqueta,
  sr,
  onClick,
  peligro = false,
}: {
  icono: Icon;
  etiqueta: string;
  sr: string;
  onClick: () => void;
  peligro?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={sr}
      onClick={onClick}
      className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-ios px-2 text-[13px] font-medium transition-colors duration-150 ${
        peligro
          ? "text-pastel-red-fg hover:bg-pastel-red-bg"
          : "text-ink-soft hover:bg-surface-sunken hover:text-ink"
      }`}
    >
      <Icono size={16} weight="bold" aria-hidden />
      {etiqueta}
    </button>
  );
}

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
      {/* En celular la tabla no sirve: seis columnas y cuatro acciones obligan a
          arrastrar en horizontal y los botones quedan de 24px. Las tarjetas
          muestran lo mismo con un destino táctil grande. */}
      <ul className="flex flex-col gap-2 md:hidden">
        {pacientes.map((p) => (
          <li key={p.id}>
            <Card className="overflow-hidden p-0">
              <Link
                to={fichaDe(p.id)}
                className="flex min-h-11 items-center gap-3 px-3 py-3 focus-visible:rounded-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring"
              >
                <Avatar nombre={`${p.nombres} ${p.apellidos}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">
                    {p.nombres} {p.apellidos}
                  </p>
                  <p className="truncate text-xs text-ink-muted">{p.email || "Sin correo"}</p>
                </div>
                <CaretRight size={16} className="shrink-0 text-ink-muted" aria-hidden />
              </Link>

              <dl className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line bg-surface-sunken/60 px-3 py-2 text-xs">
                {p.ci ? (
                  <div className="flex gap-1">
                    <dt className="text-ink-muted">CI</dt>
                    <dd className="font-medium tabular-nums text-ink-soft">{p.ci}</dd>
                  </div>
                ) : null}
                <div className="flex gap-1">
                  <dt className="text-ink-muted">Edad</dt>
                  <dd className="font-medium tabular-nums text-ink-soft">
                    {calcularEdad(p.fechaNacimiento)} años
                  </dd>
                </div>
                {p.telefono ? (
                  <div className="flex gap-1">
                    <dt className="text-ink-muted">Tel.</dt>
                    <dd className="font-medium tabular-nums text-ink-soft">{p.telefono}</dd>
                  </div>
                ) : null}
              </dl>

              <div className="flex items-center gap-1 border-t border-line px-2 py-1.5">
                <BotonAccion
                  icono={Eye}
                  etiqueta="Ver"
                  onClick={() => irA(p.id)}
                  sr={`Ver ${p.nombres} ${p.apellidos}`}
                />
                <BotonAccion
                  icono={Printer}
                  etiqueta="Imprimir"
                  onClick={() => irA(p.id, true)}
                  sr={`Imprimir ${p.nombres} ${p.apellidos}`}
                />
                <BotonAccion
                  icono={Trash}
                  etiqueta="Eliminar"
                  onClick={() => {
                    setErrorEliminar(null);
                    setPorEliminar(p);
                  }}
                  sr={`Eliminar ${p.nombres} ${p.apellidos}`}
                  peligro
                />
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <div className="hidden md:block">
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
      </div>

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

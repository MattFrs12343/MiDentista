import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, PencilSimple, Printer, Trash, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
  "rounded-md p-1.5 text-ink-muted transition-colors duration-150 ease-out hover:bg-surface-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-blue/45";

/**
 * Tabla de pacientes con columna de acciones (Ver / Editar / Imprimir /
 * Eliminar), reutilizada por la lista general de Pacientes y por los
 * selectores de Historia Clínica, Odontograma y Diagnóstico y Tratamiento —
 * cada uno le pasa el `tab` al que debe navegar Ver/Editar/Imprimir.
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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-sunken text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-5 py-3 font-semibold">Paciente</th>
              <th className="px-5 py-3 font-semibold">CI</th>
              <th className="px-5 py-3 font-semibold">Edad</th>
              <th className="px-5 py-3 font-semibold">Teléfono</th>
              <th className="px-5 py-3 font-semibold">Registrado</th>
              <th className="px-5 py-3 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {pacientes.map((p, i) => (
              <tr
                key={p.id}
                style={{ animationDelay: `${i * 40}ms` }}
                className="fade-in-up transition-colors duration-150 ease-out hover:bg-surface-sunken"
              >
                <td
                  className="cursor-pointer px-5 py-3"
                  onClick={() => irA(p.id)}
                >
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
                <td className="px-5 py-3">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

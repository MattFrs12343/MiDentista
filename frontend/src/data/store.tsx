import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import type {
  Paciente,
  HistoriaClinica,
  CondicionPieza,
  Diagnostico,
  PlanTratamiento,
  ItemTratamiento,
  Alergia,
} from "@/types";
import {
  pacientesSeed,
  historiasSeed,
  odontogramasSeed,
  diagnosticosSeed,
  planesSeed,
} from "@/data/seed";

function nuevoId(prefijo: string) {
  return `${prefijo}_${Math.random().toString(36).slice(2, 9)}`;
}

function datosActualizacion(responsable?: string) {
  return {
    actualizadoEl: new Date().toISOString(),
    actualizadoPor: responsable,
  };
}

function historiaVacia(pacienteId: string): HistoriaClinica {
  return {
    pacienteId,
    motivoConsulta: "",
    antecedentesPersonales: "",
    antecedentesFamiliares: "",
    antecedentesOdontologicos: "",
    enfermedadesBase: [],
    medicamentosActuales: [],
    alergias: [],
    habitos: [],
    observacionesGenerales: "",
  };
}

interface ClinicaStore {
  pacientes: Paciente[];
  registrarPaciente: (datos: Omit<Paciente, "id" | "creadoEl">) => Paciente;
  actualizarPaciente: (id: string, datos: Partial<Paciente>) => void;
  obtenerPaciente: (id: string) => Paciente | undefined;

  historiaDe: (pacienteId: string) => HistoriaClinica;
  actualizarHistoria: (pacienteId: string, cambios: Partial<HistoriaClinica>) => void;
  agregarAlergia: (pacienteId: string, alergia: Omit<Alergia, "id">) => void;
  quitarAlergia: (pacienteId: string, alergiaId: string) => void;

  odontogramaDe: (pacienteId: string) => CondicionPieza[];
  registrarCondicion: (pacienteId: string, condicion: CondicionPieza) => void;

  diagnosticosDe: (pacienteId: string) => Diagnostico[];
  registrarDiagnostico: (pacienteId: string, descripcion: string, pieza?: number) => void;

  planDe: (pacienteId: string) => PlanTratamiento;
  agregarItemPlan: (pacienteId: string, item: Omit<ItemTratamiento, "id">) => void;
  quitarItemPlan: (pacienteId: string, itemId: string) => void;
  actualizarObservacionesPlan: (pacienteId: string, observaciones: string) => void;
}

const StoreContext = createContext<ClinicaStore | null>(null);

export function ClinicaDataProvider({ children }: { children: ReactNode }) {
  const { sesion } = useAuth();
  const responsable = sesion?.nombre;
  const [pacientes, setPacientes] = useState<Paciente[]>(pacientesSeed);
  const [historias, setHistorias] = useState<Record<string, HistoriaClinica>>(historiasSeed);
  const [odontogramas, setOdontogramas] =
    useState<Record<string, CondicionPieza[]>>(odontogramasSeed);
  const [diagnosticos, setDiagnosticos] =
    useState<Record<string, Diagnostico[]>>(diagnosticosSeed);
  const [planes, setPlanes] = useState<Record<string, PlanTratamiento>>(planesSeed);

  const value = useMemo<ClinicaStore>(
    () => ({
      pacientes,
      registrarPaciente: (datos) => {
        const paciente: Paciente = {
          ...datos,
          id: nuevoId("p"),
          creadoEl: new Date().toISOString().slice(0, 10),
        };
        setPacientes((prev) => [paciente, ...prev]);
        return paciente;
      },
      actualizarPaciente: (id, datos) => {
        setPacientes((prev) => prev.map((p) => (p.id === id ? { ...p, ...datos } : p)));
      },
      obtenerPaciente: (id) => pacientes.find((p) => p.id === id),

      historiaDe: (pacienteId) => historias[pacienteId] ?? historiaVacia(pacienteId),
      actualizarHistoria: (pacienteId, cambios) => {
        const actualizacion = datosActualizacion(responsable);
        setHistorias((prev) => {
          const actual = prev[pacienteId] ?? historiaVacia(pacienteId);
          const sinCambios = Object.entries(cambios).every(
            ([campo, valor]) => actual[campo as keyof HistoriaClinica] === valor,
          );
          if (sinCambios) return prev;
          return {
            ...prev,
            [pacienteId]: { ...actual, ...cambios, ...actualizacion },
          };
        });
      },
      agregarAlergia: (pacienteId, alergia) => {
        const actualizacion = datosActualizacion(responsable);
        setHistorias((prev) => {
          const actual = prev[pacienteId] ?? historiaVacia(pacienteId);
          return {
            ...prev,
            [pacienteId]: {
              ...actual,
              alergias: [...actual.alergias, { ...alergia, id: nuevoId("a") }],
              ...actualizacion,
            },
          };
        });
      },
      quitarAlergia: (pacienteId, alergiaId) => {
        const actualizacion = datosActualizacion(responsable);
        setHistorias((prev) => {
          const actual = prev[pacienteId] ?? historiaVacia(pacienteId);
          return {
            ...prev,
            [pacienteId]: {
              ...actual,
              alergias: actual.alergias.filter((a) => a.id !== alergiaId),
              ...actualizacion,
            },
          };
        });
      },

      odontogramaDe: (pacienteId) => odontogramas[pacienteId] ?? [],
      registrarCondicion: (pacienteId, condicion) => {
        setOdontogramas((prev) => {
          const actual = prev[pacienteId] ?? [];
          const sinPieza = actual.filter((c) => c.pieza !== condicion.pieza);
          return { ...prev, [pacienteId]: [...sinPieza, condicion] };
        });
      },

      diagnosticosDe: (pacienteId) => diagnosticos[pacienteId] ?? [],
      registrarDiagnostico: (pacienteId, descripcion, pieza) => {
        const nuevo: Diagnostico = {
          id: nuevoId("d"),
          descripcion,
          pieza,
          registradoEl: new Date().toISOString().slice(0, 10),
        };
        setDiagnosticos((prev) => ({
          ...prev,
          [pacienteId]: [nuevo, ...(prev[pacienteId] ?? [])],
        }));
      },

      planDe: (pacienteId) =>
        planes[pacienteId] ?? { pacienteId, items: [], observaciones: "" },
      agregarItemPlan: (pacienteId, item) => {
        setPlanes((prev) => {
          const actual = prev[pacienteId] ?? { pacienteId, items: [], observaciones: "" };
          return {
            ...prev,
            [pacienteId]: {
              ...actual,
              items: [...actual.items, { ...item, id: nuevoId("t") }],
            },
          };
        });
      },
      quitarItemPlan: (pacienteId, itemId) => {
        setPlanes((prev) => {
          const actual = prev[pacienteId] ?? { pacienteId, items: [], observaciones: "" };
          return {
            ...prev,
            [pacienteId]: { ...actual, items: actual.items.filter((i) => i.id !== itemId) },
          };
        });
      },
      actualizarObservacionesPlan: (pacienteId, observaciones) => {
        setPlanes((prev) => {
          const actual = prev[pacienteId] ?? { pacienteId, items: [], observaciones: "" };
          return { ...prev, [pacienteId]: { ...actual, observaciones } };
        });
      },
    }),
    [pacientes, historias, odontogramas, diagnosticos, planes, responsable],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useClinicaData() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useClinicaData debe usarse dentro de ClinicaDataProvider");
  return ctx;
}

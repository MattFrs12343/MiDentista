import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import type {
  Paciente,
  HistoriaClinica,
  CondicionPieza,
  Diagnostico,
  PlanTratamiento,
  ItemTratamiento,
  Alergia,
  Cita,
  Horario,
} from "@/types";
import * as api from "@/data/api";
import { puedeTransicionar } from "@/features/agenda/agenda";

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

const planVacio = (pacienteId: string): PlanTratamiento => ({ pacienteId, items: [], observaciones: "" });

interface ClinicaStore {
  pacientes: Paciente[];
  registrarPaciente: (datos: Omit<Paciente, "id" | "creadoEl">) => Promise<Paciente>;
  actualizarPaciente: (id: string, datos: Partial<Paciente>) => Promise<void>;
  eliminarPaciente: (id: string) => Promise<void>;
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

  /** Disponibilidad semanal del odontologo. */
  horarios: Horario[];
  /** Todas las citas, para que la vista las filtre por la semana que mostro. */
  citas: Cita[];
  citasDe: (pacienteId: string) => Cita[];
  registrarCita: (cita: Omit<Cita, "id">) => Promise<Cita>;
  /** Avanza el estado de una cita. Rechaza saltos hacia atras del ciclo de vida. */
  cambiarEstadoCita: (citaId: string, estado: Cita["estado"]) => Promise<boolean>;
  cancelarCita: (citaId: string) => Promise<boolean>;
}

const StoreContext = createContext<ClinicaStore | null>(null);

export function ClinicaDataProvider({ children }: { children: ReactNode }) {
  const { sesion } = useAuth();
  const correo = sesion?.email ?? "";
  const responsable = sesion?.nombre;

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [historias, setHistorias] = useState<Record<string, HistoriaClinica>>({});
  const [odontogramas, setOdontogramas] = useState<Record<string, CondicionPieza[]>>({});
  const [diagnosticos, setDiagnosticos] = useState<Record<string, Diagnostico[]>>({});
  const [planes, setPlanes] = useState<Record<string, PlanTratamiento>>({});
  const [citas, setCitas] = useState<Cita[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);

  // Evita volver a pedir la ficha completa de un paciente cada vez que se
  // vuelve a renderizar su pestaña (historiaDe/odontogramaDe/etc. se llaman
  // directamente en el render de cada tab).
  const fichasPedidas = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!correo) return;
    api.listarPacientes(correo).then(setPacientes).catch((e) => console.error("No se pudieron cargar los pacientes:", e));
    api.listarHorariosApi(correo).then(setHorarios).catch((e) => console.error("No se pudieron cargar los horarios:", e));
    api.listarCitasApi(correo).then(setCitas).catch((e) => console.error("No se pudieron cargar las citas:", e));
  }, [correo]);

  function cargarFicha(pacienteId: string) {
    if (!correo || fichasPedidas.current.has(pacienteId)) return;
    fichasPedidas.current.add(pacienteId);

    api
      .obtenerHistoriaApi(correo, pacienteId)
      .then((h) => setHistorias((prev) => ({ ...prev, [pacienteId]: h })))
      .catch((e) => console.error("No se pudo cargar la historia clínica:", e));

    api
      .obtenerOdontogramaApi(correo, pacienteId)
      .then((p) => setOdontogramas((prev) => ({ ...prev, [pacienteId]: p })))
      .catch((e) => console.error("No se pudo cargar el odontograma:", e));

    api
      .listarDiagnosticosApi(correo, pacienteId)
      .then((d) => setDiagnosticos((prev) => ({ ...prev, [pacienteId]: d })))
      .catch((e) => console.error("No se pudieron cargar los diagnósticos:", e));

    api
      .obtenerPlanApi(correo, pacienteId)
      .then((p) => setPlanes((prev) => ({ ...prev, [pacienteId]: p })))
      .catch((e) => console.error("No se pudo cargar el plan de tratamiento:", e));
  }

  const value = useMemo<ClinicaStore>(
    () => ({
      pacientes,
      registrarPaciente: async (datos) => {
        const creado = await api.crearPaciente(correo, datos);
        setPacientes((prev) => [creado, ...prev]);
        return creado;
      },
      actualizarPaciente: async (id, datos) => {
        const actualizado = await api.actualizarPacienteApi(correo, id, datos);
        setPacientes((prev) => prev.map((p) => (p.id === id ? actualizado : p)));
      },
      eliminarPaciente: async (id) => {
        await api.eliminarPacienteApi(correo, id);
        setPacientes((prev) => prev.filter((p) => p.id !== id));
      },
      obtenerPaciente: (id) => pacientes.find((p) => p.id === id),

      historiaDe: (pacienteId) => {
        cargarFicha(pacienteId);
        return historias[pacienteId] ?? historiaVacia(pacienteId);
      },
      actualizarHistoria: (pacienteId, cambios) => {
        // Optimista: se ve el cambio al toque; si el servidor difiere (p. ej.
        // actualizadoEl/actualizadoPor) se reconcilia cuando responde.
        setHistorias((prev) => {
          const actual = prev[pacienteId] ?? historiaVacia(pacienteId);
          return { ...prev, [pacienteId]: { ...actual, ...cambios } };
        });
        api
          .actualizarHistoriaApi(correo, pacienteId, cambios, responsable)
          .then((h) => setHistorias((prev) => ({ ...prev, [pacienteId]: h })))
          .catch((e) => console.error("No se pudo guardar la historia clínica:", e));
      },
      agregarAlergia: (pacienteId, alergia) => {
        api
          .agregarAlergiaApi(correo, pacienteId, alergia, responsable)
          .then((h) => setHistorias((prev) => ({ ...prev, [pacienteId]: h })))
          .catch((e) => console.error("No se pudo agregar la alergia:", e));
      },
      quitarAlergia: (pacienteId, alergiaId) => {
        api
          .quitarAlergiaApi(correo, pacienteId, alergiaId)
          .then((h) => setHistorias((prev) => ({ ...prev, [pacienteId]: h })))
          .catch((e) => console.error("No se pudo quitar la alergia:", e));
      },

      odontogramaDe: (pacienteId) => {
        cargarFicha(pacienteId);
        return odontogramas[pacienteId] ?? [];
      },
      registrarCondicion: (pacienteId, condicion) => {
        setOdontogramas((prev) => {
          const actual = prev[pacienteId] ?? [];
          const sinPieza = actual.filter((c) => c.pieza !== condicion.pieza);
          return { ...prev, [pacienteId]: [...sinPieza, condicion] };
        });
        api
          .registrarCondicionApi(correo, pacienteId, condicion)
          .then((piezas) => setOdontogramas((prev) => ({ ...prev, [pacienteId]: piezas })))
          .catch((e) => console.error("No se pudo guardar la condición de la pieza:", e));
      },

      diagnosticosDe: (pacienteId) => {
        cargarFicha(pacienteId);
        return diagnosticos[pacienteId] ?? [];
      },
      registrarDiagnostico: (pacienteId, descripcion, pieza) => {
        api
          .registrarDiagnosticoApi(correo, pacienteId, descripcion, pieza)
          .then((nuevo) =>
            setDiagnosticos((prev) => ({
              ...prev,
              [pacienteId]: [nuevo, ...(prev[pacienteId] ?? [])],
            })),
          )
          .catch((e) => console.error("No se pudo registrar el diagnóstico:", e));
      },

      planDe: (pacienteId) => {
        cargarFicha(pacienteId);
        return planes[pacienteId] ?? planVacio(pacienteId);
      },
      agregarItemPlan: (pacienteId, item) => {
        api
          .agregarItemPlanApi(correo, pacienteId, item)
          .then((plan) => setPlanes((prev) => ({ ...prev, [pacienteId]: plan })))
          .catch((e) => console.error("No se pudo agregar el procedimiento:", e));
      },
      quitarItemPlan: (pacienteId, itemId) => {
        api
          .quitarItemPlanApi(correo, pacienteId, itemId)
          .then((plan) => setPlanes((prev) => ({ ...prev, [pacienteId]: plan })))
          .catch((e) => console.error("No se pudo quitar el procedimiento:", e));
      },
      actualizarObservacionesPlan: (pacienteId, observaciones) => {
        api
          .actualizarObservacionesPlanApi(correo, pacienteId, observaciones)
          .then((plan) => setPlanes((prev) => ({ ...prev, [pacienteId]: plan })))
          .catch((e) => console.error("No se pudieron guardar las observaciones del plan:", e));
      },

      horarios,
      citas,
      citasDe: (pacienteId) =>
        citas
          .filter((c) => c.pacienteId === pacienteId)
          .sort((a, b) => (a.fechaCita < b.fechaCita ? 1 : a.fechaCita > b.fechaCita ? -1 : 0)),
      registrarCita: async (datos) => {
        const cita = await api.registrarCitaApi(correo, datos);
        setCitas((prev) => [...prev, cita]);
        return cita;
      },
      cambiarEstadoCita: async (citaId, estado) => {
        const actual = citas.find((c) => c.id === citaId);
        if (!actual || !puedeTransicionar(actual.estado, estado)) return false;
        const actualizada = await api.cambiarEstadoCitaApi(correo, citaId, estado);
        setCitas((prev) => prev.map((c) => (c.id === citaId ? actualizada : c)));
        return true;
      },
      cancelarCita: async (citaId) => {
        const actual = citas.find((c) => c.id === citaId);
        if (!actual || !puedeTransicionar(actual.estado, "cancelada")) return false;
        const actualizada = await api.cambiarEstadoCitaApi(correo, citaId, "cancelada");
        setCitas((prev) => prev.map((c) => (c.id === citaId ? actualizada : c)));
        return true;
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pacientes, historias, odontogramas, diagnosticos, planes, citas, horarios, correo, responsable],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useClinicaData() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useClinicaData debe usarse dentro de ClinicaDataProvider");
  return ctx;
}

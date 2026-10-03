import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import type {
  Paciente,
  HistoriaClinica,
  CondicionPieza,
  Diagnostico,
  PlanTratamiento,
  ItemTratamiento,
  PrioridadTratamiento,
  Alergia,
  Cita,
  Horario,
} from "@/types";
import { obtenerSupabase } from "@/lib/supabase";
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

// ----------------------------------------------------------------------------
// Mapeos entre columnas de Postgres (snake_case) y los tipos del frontend.
// ----------------------------------------------------------------------------

const GENERO_A_SEXO: Record<string, Paciente["sexo"]> = { M: "masculino", F: "femenino", Otro: "otro" };
const SEXO_A_GENERO: Record<Paciente["sexo"], string> = { masculino: "M", femenino: "F", otro: "Otro" };

function fechaCorta(valor: string | null | undefined): string {
  return valor ? String(valor).slice(0, 10) : "";
}

function horaCorta(valor: string | null | undefined): string {
  return valor ? String(valor).slice(0, 5) : "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPaciente(r: any): Paciente {
  return {
    id: r.id,
    nombres: r.nombres ?? "",
    apellidos: r.apellidos ?? "",
    ci: r.ci ?? "",
    fechaNacimiento: fechaCorta(r.fecha_nacimiento),
    sexo: GENERO_A_SEXO[r.genero] ?? "otro",
    telefono: r.telefono ?? "",
    email: r.email ?? "",
    direccion: r.direccion ?? "",
    creadoEl: fechaCorta(r.creado_en),
  };
}

function jsonLista(texto: string | null | undefined): string[] {
  if (!texto) return [];
  try {
    const valor = JSON.parse(texto);
    return Array.isArray(valor) ? valor : [];
  } catch {
    return [];
  }
}

function jsonAlergias(texto: string | null | undefined): Alergia[] {
  if (!texto) return [];
  try {
    const valor = JSON.parse(texto);
    return Array.isArray(valor) ? valor : [];
  } catch {
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapHistoria(r: any, pacienteId: string): HistoriaClinica {
  if (!r) return historiaVacia(pacienteId);
  return {
    pacienteId,
    motivoConsulta: r.motivo_consulta ?? "",
    antecedentesPersonales: r.antecedentes_medicos ?? "",
    antecedentesFamiliares: r.antecedentes_familiares ?? "",
    antecedentesOdontologicos: r.antecedentes_odontologicos ?? "",
    enfermedadesBase: jsonLista(r.enfermedades),
    medicamentosActuales: jsonLista(r.medicamentos),
    alergias: jsonAlergias(r.alergias),
    habitos: jsonLista(r.habitos),
    observacionesGenerales: r.observaciones ?? "",
    actualizadoEl: r.actualizado_en ?? undefined,
    actualizadoPor: r.actualizado_por ?? undefined,
  };
}

const CONDICIONES_VALIDAS = new Set<string>([
  "sano",
  "caries",
  "obturado",
  "corona",
  "endodoncia",
  "ausente",
  "extraccion_indicada",
  "implante",
]);

/** Los datos semilla viejos de odontogramas tienen otra forma ({numero,
 * condiciones:[...]}) que no coincide con lo que espera el frontend — se
 * descartan en vez de mostrarse rotos. */
function piezasValidas(piezas: unknown): CondicionPieza[] {
  if (!Array.isArray(piezas)) return [];
  return piezas.filter(
    (p): p is CondicionPieza =>
      Boolean(p) && typeof p.pieza === "number" && CONDICIONES_VALIDAS.has(p.condicion),
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDiagnostico(r: any): Diagnostico {
  return {
    id: r.id,
    descripcion: r.descripcion,
    pieza: r.numero_pieza ?? undefined,
    registradoEl: fechaCorta(r.fecha_diagnostico),
  };
}

const PRIORIDAD_DB_A_FRONT: Record<string, PrioridadTratamiento> = {
  urgente: "alta",
  alta: "alta",
  normal: "media",
  baja: "baja",
};
const PRIORIDAD_FRONT_A_DB: Record<PrioridadTratamiento, string> = { alta: "alta", media: "normal", baja: "baja" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapItemTratamiento(r: any): ItemTratamiento {
  return {
    id: r.id,
    procedimiento: r.descripcion,
    pieza: r.numero_pieza ?? undefined,
    costoEstimado: Number(r.costo ?? 0),
    prioridad: PRIORIDAD_DB_A_FRONT[r.prioridad] ?? "media",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCita(r: any): Cita {
  return {
    id: r.id,
    pacienteId: r.paciente_id,
    fechaCita: fechaCorta(r.fecha_cita),
    horaInicio: horaCorta(r.hora_inicio),
    horaFin: horaCorta(r.hora_fin),
    estado: r.estado,
    motivoConsulta: r.motivo_consulta ?? "",
    notas: r.notas ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapHorario(r: any): Horario {
  return {
    id: r.id,
    diaSemana: r.dia_semana,
    horaInicio: horaCorta(r.hora_inicio),
    horaFin: horaCorta(r.hora_fin),
    activo: r.activo,
  };
}

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
  const supabase = obtenerSupabase();

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [historias, setHistorias] = useState<Record<string, HistoriaClinica>>({});
  const [odontogramas, setOdontogramas] = useState<Record<string, CondicionPieza[]>>({});
  const [diagnosticos, setDiagnosticos] = useState<Record<string, Diagnostico[]>>({});
  const [planes, setPlanes] = useState<Record<string, PlanTratamiento>>({});
  const [citas, setCitas] = useState<Cita[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  // El perfil (id + clinica_id) del usuario logueado. RLS ya filtra las
  // lecturas solo, pero los INSERT necesitan que nosotros mismos mandemos
  // clinica_id/odontologo_id (la politica "with check" los exige).
  const [miPerfil, setMiPerfil] = useState<{ id: string; clinicaId: string } | null>(null);

  const fichasPedidas = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!correo) {
      setMiPerfil(null);
      return;
    }
    let cancelado = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const authUserId = userData.user?.id;
      if (!authUserId) return;
      const { data } = await supabase
        .from("perfiles")
        .select("id, clinica_id")
        .eq("auth_user_id", authUserId)
        .maybeSingle();
      if (!cancelado && data) setMiPerfil({ id: data.id, clinicaId: data.clinica_id });
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [correo]);

  useEffect(() => {
    if (!correo) return;
    supabase
      .from("pacientes")
      .select("*")
      .eq("activo", true)
      .order("creado_en", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("No se pudieron cargar los pacientes:", error);
        else setPacientes((data ?? []).map(mapPaciente));
      });
    supabase
      .from("horarios")
      .select("*")
      .order("dia_semana")
      .then(({ data, error }) => {
        if (error) console.error("No se pudieron cargar los horarios:", error);
        else setHorarios((data ?? []).map(mapHorario));
      });
    supabase
      .from("citas")
      .select("*")
      .order("fecha_cita")
      .then(({ data, error }) => {
        if (error) console.error("No se pudieron cargar las citas:", error);
        else setCitas((data ?? []).map(mapCita));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [correo]);

  function cargarFicha(pacienteId: string) {
    if (!correo || fichasPedidas.current.has(pacienteId)) return;
    fichasPedidas.current.add(pacienteId);

    supabase
      .from("historiales_clinicos")
      .select("*")
      .eq("paciente_id", pacienteId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error("No se pudo cargar la historia clínica:", error);
        else setHistorias((prev) => ({ ...prev, [pacienteId]: mapHistoria(data, pacienteId) }));
      });

    supabase
      .from("odontogramas")
      .select("piezas")
      .eq("paciente_id", pacienteId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error("No se pudo cargar el odontograma:", error);
        else setOdontogramas((prev) => ({ ...prev, [pacienteId]: piezasValidas(data?.piezas) }));
      });

    supabase
      .from("diagnosticos")
      .select("*")
      .eq("paciente_id", pacienteId)
      .order("creado_en", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("No se pudieron cargar los diagnósticos:", error);
        else setDiagnosticos((prev) => ({ ...prev, [pacienteId]: (data ?? []).map(mapDiagnostico) }));
      });

    cargarPlan(pacienteId);
  }

  async function obtenerOCrearPlanRow(pacienteId: string) {
    const existente = await supabase
      .from("planes_tratamiento")
      .select("*")
      .eq("paciente_id", pacienteId)
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existente.data) return existente.data;

    if (!miPerfil) throw new Error("No se pudo identificar tu perfil");
    const creado = await supabase
      .from("planes_tratamiento")
      .insert({ clinica_id: miPerfil.clinicaId, paciente_id: pacienteId, odontologo_id: miPerfil.id })
      .select("*")
      .single();
    if (creado.error || !creado.data) throw creado.error ?? new Error("No se pudo crear el plan");
    return creado.data;
  }

  async function construirPlan(pacienteId: string): Promise<PlanTratamiento> {
    const plan = await obtenerOCrearPlanRow(pacienteId);
    const { data: items } = await supabase
      .from("procedimientos_tratamiento")
      .select("*")
      .eq("plan_tratamiento_id", plan.id)
      .order("creado_en", { ascending: true });
    return {
      pacienteId,
      items: (items ?? []).map(mapItemTratamiento),
      observaciones: plan.notas ?? "",
    };
  }

  function cargarPlan(pacienteId: string) {
    construirPlan(pacienteId)
      .then((plan) => setPlanes((prev) => ({ ...prev, [pacienteId]: plan })))
      .catch((e) => console.error("No se pudo cargar el plan de tratamiento:", e));
  }

  async function obtenerHistoriaRowId(pacienteId: string): Promise<string | null> {
    const { data } = await supabase
      .from("historiales_clinicos")
      .select("id")
      .eq("paciente_id", pacienteId)
      .maybeSingle();
    return data?.id ?? null;
  }

  async function guardarHistoria(pacienteId: string, combinado: HistoriaClinica) {
    if (!miPerfil) throw new Error("No se pudo identificar tu perfil");
    const payload = {
      motivo_consulta: combinado.motivoConsulta,
      antecedentes_medicos: combinado.antecedentesPersonales,
      antecedentes_familiares: combinado.antecedentesFamiliares,
      antecedentes_odontologicos: combinado.antecedentesOdontologicos,
      enfermedades: JSON.stringify(combinado.enfermedadesBase),
      medicamentos: JSON.stringify(combinado.medicamentosActuales),
      alergias: JSON.stringify(combinado.alergias),
      habitos: JSON.stringify(combinado.habitos),
      observaciones: combinado.observacionesGenerales,
      actualizado_por: responsable ?? null,
    };

    const rowId = await obtenerHistoriaRowId(pacienteId);
    if (rowId) {
      const { data, error } = await supabase
        .from("historiales_clinicos")
        .update(payload)
        .eq("id", rowId)
        .select("*")
        .single();
      if (error) throw error;
      return mapHistoria(data, pacienteId);
    }
    const { data, error } = await supabase
      .from("historiales_clinicos")
      .insert({ ...payload, clinica_id: miPerfil.clinicaId, paciente_id: pacienteId })
      .select("*")
      .single();
    if (error) throw error;
    return mapHistoria(data, pacienteId);
  }

  const value = useMemo<ClinicaStore>(
    () => ({
      pacientes,
      registrarPaciente: async (datos) => {
        if (!miPerfil) throw new Error("No se pudo identificar tu perfil");
        const nombreCompleto = `${datos.nombres} ${datos.apellidos}`.trim();
        const { data, error } = await supabase
          .from("pacientes")
          .insert({
            clinica_id: miPerfil.clinicaId,
            nombres: datos.nombres,
            apellidos: datos.apellidos,
            nombre_completo: nombreCompleto,
            ci: datos.ci,
            fecha_nacimiento: datos.fechaNacimiento || null,
            genero: SEXO_A_GENERO[datos.sexo] ?? "Otro",
            telefono: datos.telefono,
            email: datos.email,
            direccion: datos.direccion,
          })
          .select("*")
          .single();
        if (error || !data) throw error ?? new Error("No se pudo registrar el paciente");
        const creado = mapPaciente(data);
        setPacientes((prev) => [creado, ...prev]);
        return creado;
      },
      actualizarPaciente: async (id, datos) => {
        const actual = pacientes.find((p) => p.id === id);
        const nombres = datos.nombres ?? actual?.nombres ?? "";
        const apellidos = datos.apellidos ?? actual?.apellidos ?? "";
        const payload: Record<string, unknown> = {
          nombres,
          apellidos,
          nombre_completo: `${nombres} ${apellidos}`.trim(),
        };
        if (datos.ci !== undefined) payload.ci = datos.ci;
        if (datos.fechaNacimiento !== undefined) payload.fecha_nacimiento = datos.fechaNacimiento || null;
        if (datos.sexo !== undefined) payload.genero = SEXO_A_GENERO[datos.sexo];
        if (datos.telefono !== undefined) payload.telefono = datos.telefono;
        if (datos.email !== undefined) payload.email = datos.email;
        if (datos.direccion !== undefined) payload.direccion = datos.direccion;

        const { data, error } = await supabase.from("pacientes").update(payload).eq("id", id).select("*").single();
        if (error || !data) throw error ?? new Error("No se pudo actualizar el paciente");
        const actualizado = mapPaciente(data);
        setPacientes((prev) => prev.map((p) => (p.id === id ? actualizado : p)));
      },
      eliminarPaciente: async (id) => {
        const { error } = await supabase.from("pacientes").update({ activo: false }).eq("id", id);
        if (error) throw error;
        setPacientes((prev) => prev.filter((p) => p.id !== id));
      },
      obtenerPaciente: (id) => pacientes.find((p) => p.id === id),

      historiaDe: (pacienteId) => {
        cargarFicha(pacienteId);
        return historias[pacienteId] ?? historiaVacia(pacienteId);
      },
      actualizarHistoria: (pacienteId, cambios) => {
        // Optimista: se ve el cambio al toque; se reconcilia cuando responde.
        const base = historias[pacienteId] ?? historiaVacia(pacienteId);
        const combinado = { ...base, ...cambios };
        setHistorias((prev) => ({ ...prev, [pacienteId]: combinado }));
        guardarHistoria(pacienteId, combinado)
          .then((h) => setHistorias((prev) => ({ ...prev, [pacienteId]: h })))
          .catch((e) => console.error("No se pudo guardar la historia clínica:", e));
      },
      agregarAlergia: (pacienteId, alergia) => {
        const base = historias[pacienteId] ?? historiaVacia(pacienteId);
        const nueva = { ...alergia, id: `a_${Math.random().toString(36).slice(2, 9)}` };
        const combinado = { ...base, alergias: [...base.alergias, nueva] };
        guardarHistoria(pacienteId, combinado)
          .then((h) => setHistorias((prev) => ({ ...prev, [pacienteId]: h })))
          .catch((e) => console.error("No se pudo agregar la alergia:", e));
      },
      quitarAlergia: (pacienteId, alergiaId) => {
        const base = historias[pacienteId] ?? historiaVacia(pacienteId);
        const combinado = { ...base, alergias: base.alergias.filter((a) => a.id !== alergiaId) };
        guardarHistoria(pacienteId, combinado)
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

        (async () => {
          if (!miPerfil) throw new Error("No se pudo identificar tu perfil");
          const existente = await supabase
            .from("odontogramas")
            .select("id, piezas")
            .eq("paciente_id", pacienteId)
            .maybeSingle();
          const piezasActuales = piezasValidas(existente.data?.piezas);
          const piezasNuevas = [...piezasActuales.filter((c) => c.pieza !== condicion.pieza), condicion];

          if (existente.data) {
            const { error } = await supabase
              .from("odontogramas")
              .update({ piezas: piezasNuevas })
              .eq("id", existente.data.id);
            if (error) throw error;
          } else {
            const { error } = await supabase.from("odontogramas").insert({
              clinica_id: miPerfil.clinicaId,
              paciente_id: pacienteId,
              odontologo_id: miPerfil.id,
              piezas: piezasNuevas,
            });
            if (error) throw error;
          }
          setOdontogramas((prev) => ({ ...prev, [pacienteId]: piezasNuevas }));
        })().catch((e) => console.error("No se pudo guardar la condición de la pieza:", e));
      },

      diagnosticosDe: (pacienteId) => {
        cargarFicha(pacienteId);
        return diagnosticos[pacienteId] ?? [];
      },
      registrarDiagnostico: (pacienteId, descripcion, pieza) => {
        (async () => {
          if (!miPerfil) throw new Error("No se pudo identificar tu perfil");
          const { data, error } = await supabase
            .from("diagnosticos")
            .insert({
              clinica_id: miPerfil.clinicaId,
              paciente_id: pacienteId,
              odontologo_id: miPerfil.id,
              numero_pieza: pieza ?? null,
              descripcion,
            })
            .select("*")
            .single();
          if (error || !data) throw error ?? new Error("No se pudo registrar el diagnóstico");
          const nuevo = mapDiagnostico(data);
          setDiagnosticos((prev) => ({ ...prev, [pacienteId]: [nuevo, ...(prev[pacienteId] ?? [])] }));
        })().catch((e) => console.error("No se pudo registrar el diagnóstico:", e));
      },

      planDe: (pacienteId) => {
        cargarFicha(pacienteId);
        return planes[pacienteId] ?? planVacio(pacienteId);
      },
      agregarItemPlan: (pacienteId, item) => {
        (async () => {
          const plan = await obtenerOCrearPlanRow(pacienteId);
          const { error } = await supabase.from("procedimientos_tratamiento").insert({
            clinica_id: miPerfil?.clinicaId,
            plan_tratamiento_id: plan.id,
            numero_pieza: item.pieza ?? null,
            descripcion: item.procedimiento,
            prioridad: PRIORIDAD_FRONT_A_DB[item.prioridad] ?? "normal",
            costo: item.costoEstimado ?? 0,
          });
          if (error) throw error;
          const actualizado = await construirPlan(pacienteId);
          setPlanes((prev) => ({ ...prev, [pacienteId]: actualizado }));
        })().catch((e) => console.error("No se pudo agregar el procedimiento:", e));
      },
      quitarItemPlan: (pacienteId, itemId) => {
        (async () => {
          const { error } = await supabase.from("procedimientos_tratamiento").delete().eq("id", itemId);
          if (error) throw error;
          const actualizado = await construirPlan(pacienteId);
          setPlanes((prev) => ({ ...prev, [pacienteId]: actualizado }));
        })().catch((e) => console.error("No se pudo quitar el procedimiento:", e));
      },
      actualizarObservacionesPlan: (pacienteId, observaciones) => {
        (async () => {
          const plan = await obtenerOCrearPlanRow(pacienteId);
          const { error } = await supabase
            .from("planes_tratamiento")
            .update({ notas: observaciones })
            .eq("id", plan.id);
          if (error) throw error;
          const actualizado = await construirPlan(pacienteId);
          setPlanes((prev) => ({ ...prev, [pacienteId]: actualizado }));
        })().catch((e) => console.error("No se pudieron guardar las observaciones del plan:", e));
      },

      horarios,
      citas,
      citasDe: (pacienteId) =>
        citas
          .filter((c) => c.pacienteId === pacienteId)
          .sort((a, b) => (a.fechaCita < b.fechaCita ? 1 : a.fechaCita > b.fechaCita ? -1 : 0)),
      registrarCita: async (datos) => {
        if (!miPerfil) throw new Error("No se pudo identificar tu perfil");
        const { data, error } = await supabase
          .from("citas")
          .insert({
            clinica_id: miPerfil.clinicaId,
            odontologo_id: miPerfil.id,
            paciente_id: datos.pacienteId,
            fecha_cita: datos.fechaCita,
            hora_inicio: datos.horaInicio,
            hora_fin: datos.horaFin,
            estado: datos.estado ?? "reservada",
            motivo_consulta: datos.motivoConsulta,
            notas: datos.notas ?? null,
          })
          .select("*")
          .single();
        if (error || !data) throw error ?? new Error("No se pudo registrar la cita");
        const cita = mapCita(data);
        setCitas((prev) => [...prev, cita]);
        return cita;
      },
      cambiarEstadoCita: async (citaId, estado) => {
        const actual = citas.find((c) => c.id === citaId);
        if (!actual || !puedeTransicionar(actual.estado, estado)) return false;
        const { data, error } = await supabase
          .from("citas")
          .update({ estado })
          .eq("id", citaId)
          .select("*")
          .single();
        if (error || !data) return false;
        const actualizada = mapCita(data);
        setCitas((prev) => prev.map((c) => (c.id === citaId ? actualizada : c)));
        return true;
      },
      cancelarCita: async (citaId) => {
        const actual = citas.find((c) => c.id === citaId);
        if (!actual || !puedeTransicionar(actual.estado, "cancelada")) return false;
        const { data, error } = await supabase
          .from("citas")
          .update({ estado: "cancelada" })
          .eq("id", citaId)
          .select("*")
          .single();
        if (error || !data) return false;
        const actualizada = mapCita(data);
        setCitas((prev) => prev.map((c) => (c.id === citaId ? actualizada : c)));
        return true;
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pacientes, historias, odontogramas, diagnosticos, planes, citas, horarios, correo, responsable, miPerfil],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useClinicaData() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useClinicaData debe usarse dentro de ClinicaDataProvider");
  return ctx;
}

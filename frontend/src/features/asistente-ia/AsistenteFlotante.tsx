import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChatCircleDots,
  Microphone,
  PaperPlaneTilt,
  SpeakerHigh,
  SpeakerSlash,
  SpinnerGap,
  X,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { useAuth, ROLE_LABEL } from "@/features/auth/AuthContext";
import { useClinicaData } from "@/data/store";
import { listarClinicas, listarPersonalApi, type PerfilAdmin } from "@/data/api";
import type { Paciente } from "@/types";
import { buscarAccion, intencionesParaRol, type IntencionAccion } from "@/features/asistente-ia/intenciones";
import { extraerNombreBuscado, resolverIntencion } from "@/features/asistente-ia/interprete";
import { buscarPacientePorNombre } from "@/features/asistente-ia/buscarPaciente";
import {
  dentroDeRango,
  detectarFormato,
  esRespuestaTodos,
  interpretarRangoFechas,
  PASOS_REPORTE,
  preguntaDelPaso,
  type EstadoReporte,
  type TipoReporteAsistente,
} from "@/features/asistente-ia/reporteConversacional";
import {
  esAfirmacion,
  esAgradecimiento,
  esDespedida,
  esSaludo,
  generarNoEntendido,
  generarPreguntaDesambiguacion,
  generarRespuestaAfirmacionAmbigua,
  generarRespuestaAgradecimiento,
  generarRespuestaDespedida,
  generarSaludo,
} from "@/features/asistente-ia/conversacion";
import { cargarResumenOdontograma, cargarResumenTratamiento } from "@/features/asistente-ia/datosResumen";
import { ReporteImprimible } from "@/features/reportes/ReporteImprimible";
import { construirCsv, descargarCsv } from "@/features/reportes/exportarCsv";
import { cargarHistoriaClinica } from "@/features/clinical/clinicalHistoryService";
import { cargarPresupuestos, cargarPresupuestosClinica } from "@/features/presupuestos/presupuestoService";
import { totalPresupuestado } from "@/features/presupuestos/calculoTotal";
import { cargarPagos, calcularEstadoCuenta } from "@/features/pagos/pagoService";
import { formatearMoneda } from "@/features/pagos/pagoFormato";

interface Mensaje {
  id: string;
  autor: "usuario" | "asistente";
  texto?: string;
  cargando?: boolean;
  tarjeta?: ReactNode;
}

const SIN_INTENCIONES: readonly IntencionAccion[] = [];

let contadorMensajes = 0;
function idMensaje(): string {
  contadorMensajes += 1;
  return `m${contadorMensajes}`;
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** "Pensando" en voz alta — es teatro de carga (el árbol de reglas resuelve
 * al instante), pero es justamente lo que pidió el producto: que se sienta
 * a una IA trabajando, no a un formulario respondiendo de golpe. */
const FASES_PENSANDO = ["Cargando…", "Analizando…", "Pensando…", "Empaquetando…"];
// 380ms era un parpadeo, 650ms seguía sintiéndose apurado — 850ms (4 fases
// ≈ 3.4s) da tiempo real a leer cada fase antes de que cambie.
const DURACION_FASE_MS = 850;

/** Las cuatro secciones que son "por paciente" en la navegación real (ver
 * `PatientPickerPage`/tabs de `PatientProfilePage`) — a diferencia de
 * presupuestos, que es un listado transversal de la clínica. */
type AccionPorPaciente = "pagos" | "historia_clinica" | "odontograma" | "diagnostico_tratamiento";
const ACCIONES_POR_PACIENTE: readonly AccionPorPaciente[] = [
  "pagos",
  "historia_clinica",
  "odontograma",
  "diagnostico_tratamiento",
];

const COLUMNAS_REPORTE_PACIENTES = ["Nombre completo", "CI", "Teléfono", "Correo", "Dirección", "Registrado el"] as const;
const COLUMNAS_REPORTE_PERSONAL = ["Nombre", "Correo", "Rol", "Clínica", "Estado"] as const;

// Lógica del flujo de preguntas del reporte (formato → alcance): ver
// reporteConversacional.ts — vive aparte para poder testearla.

/** Forma mínima de la Web Speech API que de verdad usamos — no está en los
 * tipos de TS por defecto, así que se declara acá en vez de traer `any`
 * suelto por el resto del componente. */
interface ResultadoReconocimiento {
  isFinal: boolean;
  [indiceAlternativa: number]: { transcript: string };
}
interface ReconocimientoVoz {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((evento: { results: { length: number; [i: number]: ResultadoReconocimiento } }) => void) | null;
  onerror: ((evento: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type ConstructorReconocimiento = new () => ReconocimientoVoz;

function obtenerConstructorReconocimiento(): ConstructorReconocimiento | null {
  if (typeof window === "undefined") return null;
  const ventana = window as unknown as {
    SpeechRecognition?: ConstructorReconocimiento;
    webkitSpeechRecognition?: ConstructorReconocimiento;
  };
  return ventana.SpeechRecognition ?? ventana.webkitSpeechRecognition ?? null;
}

function soportaVozSalida(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function TarjetaAcciones({ children }: { children: ReactNode }) {
  return <div className="mt-2 flex flex-wrap gap-2">{children}</div>;
}

function BotonTarjeta({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
    >
      {children}
    </button>
  );
}

function TarjetaPacientes({
  pacientes,
  onAbrir,
  onVerTodos,
}: {
  pacientes: readonly Paciente[];
  onAbrir: (id: string) => void;
  onVerTodos: () => void;
}) {
  const primeros = pacientes.slice(0, 6);
  return (
    <div className="flex flex-col gap-2">
      <p className="font-semibold">
        Tenés {pacientes.length} {pacientes.length === 1 ? "paciente" : "pacientes"}
        {pacientes.length > 0 ? ". Los más recientes:" : "."}
      </p>
      {primeros.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {primeros.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onAbrir(p.id)}
                className="press text-left text-brand-700 underline-offset-2 hover:underline"
              >
                {p.nombres} {p.apellidos}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {pacientes.length > primeros.length ? (
        <p className="text-xs text-ink-muted">y {pacientes.length - primeros.length} más…</p>
      ) : null}
      <TarjetaAcciones>
        <BotonTarjeta onClick={onVerTodos}>Ver todos</BotonTarjeta>
      </TarjetaAcciones>
    </div>
  );
}

function TarjetaReporte({
  titulo,
  formato,
  nota,
  onDescargar,
}: {
  titulo: string;
  formato: "pdf" | "csv";
  nota?: string;
  onDescargar: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-semibold">{titulo}</p>
      <p className="text-ink-soft">Lo armé con el formato y el alcance que me dijiste — lo descargás directo desde aquí.</p>
      {nota ? <p className="text-xs text-ink-muted">{nota}</p> : null}
      <TarjetaAcciones>
        <BotonTarjeta onClick={onDescargar}>Descargar {formato.toUpperCase()}</BotonTarjeta>
      </TarjetaAcciones>
    </div>
  );
}

function TarjetaVerFicha({ onVerFicha }: { onVerFicha: () => void }) {
  return (
    <TarjetaAcciones>
      <BotonTarjeta onClick={onVerFicha}>Ver ficha completa</BotonTarjeta>
    </TarjetaAcciones>
  );
}

/**
 * "MiDentista IA" — asistente flotante por rol (módulo 17, pieza B). Árbol
 * de reglas + coincidencia difusa (ver `interprete.ts`), sin ningún LLM
 * real detrás — ver docs/modules/17-asistente-ia/README.md y
 * motor-interpretacion.md. Exclusivo de los 4 roles de staff: se monta en
 * `AppShell`, que nunca envuelve al portal del paciente.
 *
 * Todo pasa adentro del chat: ninguna intención navega por su cuenta. Cada
 * tarjeta de resultado es un resumen compacto armado con los mismos
 * servicios que usa la pantalla real; el único momento en que se navega es
 * si el usuario toca explícitamente "Ver ficha completa" / "Ver todos"
 * dentro de la tarjeta.
 */
export function AsistenteFlotante() {
  const { sesion } = useAuth();
  const { pacientes, miPerfil } = useClinicaData();
  const navigate = useNavigate();

  const [abierto, setAbierto] = useState(false);
  const [notado, setNotado] = useState(false);
  const [texto, setTexto] = useState("");
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [candidatosPendientes, setCandidatosPendientes] = useState<string[] | null>(null);
  const [pendientePaciente, setPendientePaciente] = useState<AccionPorPaciente | null>(null);
  const [estadoReporte, setEstadoReporte] = useState<EstadoReporte | null>(null);
  const [escuchando, setEscuchando] = useState(false);
  const [vozActiva, setVozActiva] = useState(true);
  // Datos para los `ReporteImprimible` ocultos: se completan recién cuando
  // se pide ese reporte, para no traer "personal" de toda la cuenta sin que
  // nadie lo haya pedido.
  const [pacientesParaReporte, setPacientesParaReporte] = useState<readonly Paciente[]>([]);
  const [personalParaReporte, setPersonalParaReporte] = useState<readonly PerfilAdmin[]>([]);
  const reconocimientoRef = useRef<ReconocimientoVoz | null>(null);
  const finalRef = useRef<HTMLDivElement | null>(null);

  // Referencia estable: `intencionesParaRol` ya devuelve el mismo array del
  // módulo para un rol dado, pero sin sesión el `[]` literal cambiaba de
  // identidad en cada render y disparaba de nuevo todos los callbacks que
  // dependen de `intenciones`.
  const intenciones = useMemo(
    () => (sesion ? intencionesParaRol(sesion.rol) : SIN_INTENCIONES),
    [sesion],
  );
  const hayVozEntrada = Boolean(obtenerConstructorReconocimiento());
  const hayVozSalida = soportaVozSalida();

  useEffect(() => {
    finalRef.current?.scrollIntoView({ block: "nearest" });
  }, [mensajes, abierto]);

  // Detiene el reconocimiento si el componente se desmonta (cambio de ruta
  // con el micrófono todavía escuchando no debería seguir corriendo).
  useEffect(() => () => reconocimientoRef.current?.stop(), []);

  const agregarMensaje = useCallback((autor: Mensaje["autor"], contenido: string) => {
    setMensajes((actuales) => [...actuales, { id: idMensaje(), autor, texto: contenido }]);
  }, []);

  /**
   * Toda respuesta de texto simple (saludo, pregunta aclaratoria, "no
   * entendí"...) pasa por la misma secuencia de "pensando" que las
   * tarjetas de datos — nunca contesta de golpe, aunque no haya ninguna
   * consulta real detrás. `rate: 1.15` en la voz: un poco más ágil que el
   * 1.0 por defecto, sin que suene atropellada.
   */
  const responder = useCallback(
    async (contenido: string) => {
      const idTarjeta = idMensaje();
      setMensajes((actuales) => [
        ...actuales,
        { id: idTarjeta, autor: "asistente", texto: FASES_PENSANDO[0], cargando: true },
      ]);
      for (let i = 1; i < FASES_PENSANDO.length; i++) {
        await esperar(DURACION_FASE_MS);
        const fase = FASES_PENSANDO[i];
        setMensajes((actuales) => actuales.map((m) => (m.id === idTarjeta ? { ...m, texto: fase } : m)));
      }
      setMensajes((actuales) =>
        actuales.map((m) => (m.id === idTarjeta ? { id: m.id, autor: "asistente", texto: contenido } : m)),
      );
      if (vozActiva && hayVozSalida) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(contenido);
        utterance.lang = "es-ES";
        utterance.rate = 1.15;
        window.speechSynthesis.speak(utterance);
      }
    },
    [vozActiva, hayVozSalida],
  );

  // Saludo proactivo la primera vez que se abre el panel.
  useEffect(() => {
    if (!abierto || mensajes.length > 0 || !sesion) return;
    void responder(generarSaludo(sesion.nombre, intenciones.map((i) => i.etiqueta)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  /**
   * Muestra la secuencia de "pensando" y después reemplaza ese mismo mensaje
   * con la tarjeta real. La promesa de datos arranca en paralelo a las
   * fases de texto, así una consulta lenta no "miente" terminando antes de
   * tiempo, y una rápida no se siente apurada.
   */
  const mostrarConPensando = useCallback(
    async <T,>(obtenerDatos: () => Promise<T>, renderizar: (datos: T) => ReactNode) => {
      const idTarjeta = idMensaje();
      setMensajes((actuales) => [
        ...actuales,
        { id: idTarjeta, autor: "asistente", texto: FASES_PENSANDO[0], cargando: true },
      ]);

      const promesaDatos = obtenerDatos();
      for (let i = 1; i < FASES_PENSANDO.length; i++) {
        await esperar(DURACION_FASE_MS);
        const fase = FASES_PENSANDO[i];
        setMensajes((actuales) => actuales.map((m) => (m.id === idTarjeta ? { ...m, texto: fase } : m)));
      }

      try {
        const datos = await promesaDatos;
        setMensajes((actuales) =>
          actuales.map((m) => (m.id === idTarjeta ? { id: m.id, autor: "asistente", tarjeta: renderizar(datos) } : m)),
        );
      } catch {
        setMensajes((actuales) =>
          actuales.map((m) =>
            m.id === idTarjeta
              ? { id: m.id, autor: "asistente", texto: "No pude traer esa información ahora mismo. Probá de nuevo en un momento." }
              : m,
          ),
        );
      }
    },
    [],
  );

  const mostrarPacientes = useCallback(() => {
    void mostrarConPensando(
      async () => pacientes,
      (lista) => (
        <TarjetaPacientes
          pacientes={lista}
          onAbrir={(id) => navigate(`/app/pacientes/${id}`)}
          onVerTodos={() => navigate("/app/pacientes")}
        />
      ),
    );
  }, [mostrarConPensando, pacientes, navigate]);

  const generarReportePacientes = useCallback(
    (formato: "pdf" | "csv", rangoDias: number | null, paciente: Paciente | null) => {
      void mostrarConPensando(
        async () => {
          let lista = paciente
            ? [paciente]
            : rangoDias != null
              ? pacientes.filter((p) => dentroDeRango(p.creadoEl, rangoDias))
              : pacientes;
          // El filtro de fecha dejó la lista vacía: en vez de un reporte
          // inútil de "0 pacientes" sin explicación, se cae a todos y se
          // avisa — es justo el caso que se reportó como "no me dio la lista".
          let sinResultadosEnRango = false;
          if (!paciente && rangoDias != null && lista.length === 0) {
            lista = pacientes;
            sinResultadosEnRango = true;
          }
          setPacientesParaReporte(lista);
          return { lista, sinResultadosEnRango };
        },
        ({ lista, sinResultadosEnRango }) => (
          <TarjetaReporte
            titulo={`Reporte de pacientes (${lista.length})`}
            formato={formato}
            nota={
              sinResultadosEnRango
                ? "No encontré pacientes en ese rango de fechas — te muestro todos en su lugar."
                : undefined
            }
            onDescargar={() =>
              formato === "pdf"
                ? window.print()
                : descargarCsv(
                    "pacientes.csv",
                    construirCsv(
                      COLUMNAS_REPORTE_PACIENTES,
                      lista.map((p) => [`${p.nombres} ${p.apellidos}`, p.ci, p.telefono, p.email, p.direccion, p.creadoEl]),
                    ),
                  )
            }
          />
        ),
      );
    },
    [mostrarConPensando, pacientes],
  );

  const generarReportePersonal = useCallback(
    (formato: "pdf" | "csv", especialidad: string | null, clinicaBuscada: string | null) => {
      void mostrarConPensando(
        async () => {
          let lista = await listarPersonalApi();
          if (especialidad) {
            const buscado = especialidad.toLowerCase();
            lista = lista.filter((p) => (p.especialidad ?? "").toLowerCase().includes(buscado));
          }
          if (clinicaBuscada) {
            lista = lista.filter((p) => (p.clinica ?? "").toLowerCase().includes(clinicaBuscada));
          }
          setPersonalParaReporte(lista);
          return lista;
        },
        (lista) => (
          <TarjetaReporte
            titulo={`Reporte de personal (${lista.length})`}
            formato={formato}
            onDescargar={() =>
              formato === "pdf"
                ? window.print()
                : descargarCsv(
                    "personal-midentista.csv",
                    construirCsv(
                      COLUMNAS_REPORTE_PERSONAL,
                      lista.map((p) => [
                        p.nombre,
                        p.email,
                        ROLE_LABEL[p.rol],
                        p.clinica ?? "Sin clínica (superadmin)",
                        p.invitacionPendiente ? "Invitación pendiente" : p.activo ? "Activo" : "Inactivo",
                      ]),
                    ),
                  )
            }
          />
        ),
      );
  }, [mostrarConPensando]);

  const iniciarFlujoReporte = useCallback(
    (tipo: TipoReporteAsistente) => {
      setEstadoReporte({ tipo, indicePaso: 0 });
      void responder(preguntaDelPaso(PASOS_REPORTE[tipo][0]));
    },
    [responder],
  );

  /**
   * Procesa la respuesta a la pregunta actual del flujo de reporte y, o
   * bien pasa a la siguiente pregunta, o bien (último paso) genera el
   * reporte con todo lo juntado. Nunca se traba: una fecha o un nombre que
   * no reconoce simplemente cae en "sin filtro", no repite la pregunta.
   */
  const manejarRespuestaReporte = useCallback(
    (textoUsuario: string) => {
      if (!estadoReporte) return;
      const pasos = PASOS_REPORTE[estadoReporte.tipo];
      const pasoActual = pasos[estadoReporte.indicePaso];

      if (pasoActual === "formato") {
        const formato = detectarFormato(textoUsuario);
        if (!formato) {
          void responder('No entendí el formato. Decime "PDF" o "CSV".');
          return;
        }
        const siguiente: EstadoReporte = { ...estadoReporte, formato, indicePaso: estadoReporte.indicePaso + 1 };
        setEstadoReporte(siguiente);
        void responder(preguntaDelPaso(pasos[siguiente.indicePaso]));
        return;
      }

      if (pasoActual === "fechas") {
        const siguiente: EstadoReporte = {
          ...estadoReporte,
          rangoDias: interpretarRangoFechas(textoUsuario),
          indicePaso: estadoReporte.indicePaso + 1,
        };
        setEstadoReporte(siguiente);
        void responder(preguntaDelPaso(pasos[siguiente.indicePaso]));
        return;
      }

      if (pasoActual === "area") {
        const siguiente: EstadoReporte = {
          ...estadoReporte,
          especialidad: esRespuestaTodos(textoUsuario) ? null : textoUsuario.trim(),
          indicePaso: estadoReporte.indicePaso + 1,
        };
        setEstadoReporte(siguiente);
        void responder(preguntaDelPaso(pasos[siguiente.indicePaso]));
        return;
      }

      // Último paso ("paciente" o "clinica"): ya hay todo lo necesario, se genera.
      setEstadoReporte(null);
      const esTodos = esRespuestaTodos(textoUsuario);
      if (estadoReporte.tipo === "reporte") {
        const paciente = esTodos ? null : buscarPacientePorNombre(pacientes, textoUsuario);
        generarReportePacientes(estadoReporte.formato ?? "pdf", estadoReporte.rangoDias ?? null, paciente);
      } else {
        generarReportePersonal(
          estadoReporte.formato ?? "pdf",
          estadoReporte.especialidad ?? null,
          esTodos ? null : textoUsuario.trim().toLowerCase(),
        );
      }
    },
    [estadoReporte, responder, pacientes, generarReportePacientes, generarReportePersonal],
  );

  const mostrarPanelGeneral = useCallback(() => {
    void mostrarConPensando(
      async () => pacientes,
      (lista) => (
        <div className="flex flex-col gap-1">
          <p className="font-semibold">Panel general</p>
          <p>
            Tenés <strong>{lista.length}</strong> {lista.length === 1 ? "paciente" : "pacientes"} registrados en tu
            clínica.
          </p>
        </div>
      ),
    );
  }, [mostrarConPensando, pacientes]);

  const mostrarPanelAdmin = useCallback(() => {
    void mostrarConPensando(
      async () => {
        const [clinicas, personal] = await Promise.all([listarClinicas(), listarPersonalApi()]);
        return { clinicas, personal };
      },
      ({ clinicas, personal }) => (
        <div className="flex flex-col gap-1">
          <p className="font-semibold">Panel de administración</p>
          <p>
            Hay <strong>{clinicas.length}</strong> {clinicas.length === 1 ? "clínica" : "clínicas"} y{" "}
            <strong>{personal.length}</strong> personas en el equipo.
          </p>
        </div>
      ),
    );
  }, [mostrarConPensando]);

  const mostrarPresupuestos = useCallback(() => {
    if (!miPerfil) {
      void responder("No pude identificar tu clínica todavía. Probá de nuevo en un momento.");
      return;
    }
    const clinicaId = miPerfil.clinicaId;
    void mostrarConPensando(
      () => cargarPresupuestosClinica(clinicaId),
      (lista) => {
        const total = totalPresupuestado(lista);
        const pendientes = lista.filter((p) => p.estado === "enviado" || p.estado === "borrador").length;
        return (
          <div className="flex flex-col gap-1">
            <p className="font-semibold">Presupuestos de la clínica</p>
            <p>
              Hay <strong>{lista.length}</strong> presupuestos registrados, <strong>{pendientes}</strong> todavía sin
              aceptar.
            </p>
            <p>
              Total presupuestado: <strong>{formatearMoneda(total)}</strong>.
            </p>
          </div>
        );
      },
    );
  }, [mostrarConPensando, miPerfil, responder]);

  const ejecutarConPaciente = useCallback(
    (accionId: AccionPorPaciente, paciente: Paciente) => {
      const nombreCompleto = `${paciente.nombres} ${paciente.apellidos}`;
      if (accionId === "pagos") {
        void mostrarConPensando(
          async () => {
            const [presupuestos, pagos] = await Promise.all([
              cargarPresupuestos(paciente.id),
              cargarPagos(paciente.id),
            ]);
            return calcularEstadoCuenta(paciente.id, pagos, totalPresupuestado(presupuestos));
          },
          (estado) => (
            <div className="flex flex-col gap-1">
              <p className="font-semibold">Cuenta de {nombreCompleto}</p>
              <p>
                Pagado: <strong>{formatearMoneda(estado.totalPagado)}</strong>
              </p>
              <p>
                Saldo pendiente: <strong>{formatearMoneda(estado.saldoPendiente)}</strong>
              </p>
              <TarjetaVerFicha onVerFicha={() => navigate(`/app/pacientes/${paciente.id}?tab=pagos`)} />
            </div>
          ),
        );
        return;
      }
      if (accionId === "historia_clinica") {
        void mostrarConPensando(
          () => cargarHistoriaClinica(paciente.id),
          (historia) => (
            <div className="flex flex-col gap-1">
              <p className="font-semibold">Historia clínica de {nombreCompleto}</p>
              <p>Motivo de consulta: {historia.motivoConsulta || "No registrado"}</p>
              <p>
                Alergias:{" "}
                {historia.alergias.length ? historia.alergias.map((a) => a.sustancia).join(", ") : "Ninguna registrada"}
              </p>
              <TarjetaVerFicha onVerFicha={() => navigate(`/app/pacientes/${paciente.id}?tab=historia`)} />
            </div>
          ),
        );
        return;
      }
      if (accionId === "odontograma") {
        void mostrarConPensando(
          () => cargarResumenOdontograma(paciente.id),
          (resumen) => (
            <div className="flex flex-col gap-1">
              <p className="font-semibold">Odontograma de {nombreCompleto}</p>
              {resumen.tieneRegistro ? (
                <p>
                  <strong>{resumen.piezasSanas}</strong> de <strong>{resumen.totalPiezas}</strong> piezas registradas
                  como sanas. Último examen: {resumen.fechaExamen ?? "sin fecha"}.
                </p>
              ) : (
                <p>Todavía no tiene un odontograma registrado.</p>
              )}
              <TarjetaVerFicha onVerFicha={() => navigate(`/app/pacientes/${paciente.id}?tab=odontograma`)} />
            </div>
          ),
        );
        return;
      }
      // diagnostico_tratamiento
      void mostrarConPensando(
        () => cargarResumenTratamiento(paciente.id),
        (resumen) => (
          <div className="flex flex-col gap-1">
            <p className="font-semibold">Diagnóstico y tratamiento de {nombreCompleto}</p>
            <p>
              <strong>{resumen.diagnosticosActivos}</strong> diagnósticos activos, <strong>{resumen.planesActivos}</strong>{" "}
              {resumen.planesActivos === 1 ? "plan" : "planes"} de tratamiento en curso.
            </p>
            {resumen.planesActivos > 0 ? (
              <p>Costo total estimado: {formatearMoneda(resumen.costoTotalPlanes)}.</p>
            ) : null}
            <TarjetaVerFicha onVerFicha={() => navigate(`/app/pacientes/${paciente.id}?tab=tratamiento`)} />
          </div>
        ),
      );
    },
    [mostrarConPensando, navigate],
  );

  const ejecutarAccion = useCallback(
    (accion: IntencionAccion, textoOriginal: string) => {
      if ((ACCIONES_POR_PACIENTE as readonly string[]).includes(accion.id)) {
        const accionId = accion.id as AccionPorPaciente;
        const nombreBuscado = extraerNombreBuscado(textoOriginal);
        const encontrado = nombreBuscado ? buscarPacientePorNombre(pacientes, nombreBuscado) : null;
        if (encontrado) {
          ejecutarConPaciente(accionId, encontrado);
        } else {
          setPendientePaciente(accionId);
          void responder(`¿De qué paciente querés ver ${accion.etiqueta.toLowerCase()}? Decime el nombre completo.`);
        }
        return;
      }
      switch (accion.id) {
        case "pacientes":
          mostrarPacientes();
          return;
        case "reporte":
          iniciarFlujoReporte("reporte");
          return;
        case "reporte_personal":
          iniciarFlujoReporte("reporte_personal");
          return;
        case "panel_general":
          mostrarPanelGeneral();
          return;
        case "panel_admin":
          mostrarPanelAdmin();
          return;
        case "presupuestos":
          mostrarPresupuestos();
          return;
        default:
          return;
      }
    },
    [
      pacientes,
      ejecutarConPaciente,
      responder,
      mostrarPacientes,
      iniciarFlujoReporte,
      mostrarPanelGeneral,
      mostrarPanelAdmin,
      mostrarPresupuestos,
    ],
  );

  const procesarTexto = useCallback(
    (textoUsuario: string) => {
      agregarMensaje("usuario", textoUsuario);

      // Cortesía antes que cualquier otra cosa: un "hola" o un "gracias" no
      // deberían caer en "no entendí" ni interpretarse como nombre de paciente.
      if (esSaludo(textoUsuario)) {
        void responder(generarSaludo(sesion?.nombre ?? "", intenciones.map((i) => i.etiqueta)));
        return;
      }
      if (esDespedida(textoUsuario)) {
        void responder(generarRespuestaDespedida());
        return;
      }
      if (esAgradecimiento(textoUsuario)) {
        void responder(generarRespuestaAgradecimiento());
        return;
      }

      // ¿Estábamos en medio del flujo de "qué reporte querés"? Cada
      // respuesta avanza un paso (formato → alcance) hasta generarlo.
      if (estadoReporte) {
        manejarRespuestaReporte(textoUsuario);
        return;
      }

      // ¿Estábamos esperando que diga de qué paciente? Si no encuentra uno
      // único, se lo vuelve a preguntar en vez de caer en "no entendí".
      if (pendientePaciente) {
        const accionPendiente = pendientePaciente;
        const intentoDirecto = buscarPacientePorNombre(pacientes, textoUsuario);
        const nombreExtraido = extraerNombreBuscado(textoUsuario);
        const encontrado = intentoDirecto ?? (nombreExtraido ? buscarPacientePorNombre(pacientes, nombreExtraido) : null);
        if (!encontrado) {
          void responder("No encontré un paciente único con ese nombre. ¿Podés escribir el nombre completo, tal como está registrado?");
          return;
        }
        setPendientePaciente(null);
        ejecutarConPaciente(accionPendiente, encontrado);
        return;
      }

      // Si había una desambiguación pendiente, primero se intenta resolver
      // solo contra esas opciones reducidas (p. ej. el usuario repite el
      // nombre de una de ellas).
      const catalogoReducido = candidatosPendientes
        ? intenciones.filter((i) => candidatosPendientes.includes(i.id))
        : null;

      // Un "sí"/"así es" sin nombrar ninguna opción no es un pedido nuevo:
      // es responder a nuestra propia pregunta con una sola palabra, que
      // sin un LLM no alcanza para saber a cuál se refería. Se lo vuelve a
      // preguntar en vez de entenderlo como "no entendí" (eso sonaba a que
      // el usuario se equivocó, cuando en realidad la pregunta era ambigua).
      if (catalogoReducido && esAfirmacion(textoUsuario)) {
        void responder(generarRespuestaAfirmacionAmbigua(catalogoReducido.map((i) => i.etiqueta)));
        return;
      }
      setCandidatosPendientes(null);

      const resultado = resolverIntencion(textoUsuario, catalogoReducido ?? intenciones);
      if (resultado.tipo === "ejecutar") {
        const accion = buscarAccion(intenciones, resultado.intencionId);
        if (accion) ejecutarAccion(accion, textoUsuario);
        return;
      }
      if (resultado.tipo === "desambiguar") {
        setCandidatosPendientes(resultado.opciones.map((o) => o.id));
        void responder(generarPreguntaDesambiguacion(resultado.opciones.map((o) => o.etiqueta)));
        return;
      }

      // No entendido contra el catálogo reducido no es definitivo: puede ser
      // una pregunta nueva, no una respuesta a la desambiguación. Se prueba
      // una vez más contra el catálogo completo antes de rendirse.
      if (catalogoReducido) {
        const resultadoCompleto = resolverIntencion(textoUsuario, intenciones);
        if (resultadoCompleto.tipo === "ejecutar") {
          const accion = buscarAccion(intenciones, resultadoCompleto.intencionId);
          if (accion) {
            ejecutarAccion(accion, textoUsuario);
            return;
          }
        }
      }
      void responder(generarNoEntendido(intenciones.map((i) => i.etiqueta)));
    },
    [
      agregarMensaje,
      candidatosPendientes,
      pendientePaciente,
      estadoReporte,
      manejarRespuestaReporte,
      pacientes,
      intenciones,
      ejecutarAccion,
      ejecutarConPaciente,
      responder,
      sesion,
    ],
  );

  const enviarTexto = () => {
    const limpio = texto.trim();
    if (!limpio) return;
    setTexto("");
    procesarTexto(limpio);
  };

  const alternarEscucha = async () => {
    if (escuchando) {
      reconocimientoRef.current?.stop();
      setEscuchando(false);
      return;
    }
    const Constructor = obtenerConstructorReconocimiento();
    if (!Constructor) return;

    // Pedir el permiso de micrófono ANTES de arrancar el reconocimiento. Si
    // se llama a `.start()` directo, el reconocimiento puede iniciar su
    // ventana de espera de audio mientras el usuario todavía está
    // respondiendo al diálogo de permiso del navegador — y para cuando
    // acepta, esa ventana ya se agotó ("no-speech") sin haber escuchado
    // nada. Pedirlo por separado con `getUserMedia` evita la carrera.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((pista) => pista.stop());
    } catch {
      void responder("No pude acceder al micrófono. Revisá los permisos del navegador para este sitio.");
      return;
    }

    // El reconocimiento de Chrome no es local: manda el audio a los
    // servidores de Google, así que un error "network" no siempre significa
    // que falte internet — puede ser una VPN, un antivirus con inspección
    // HTTPS, o el servicio gratuito fallando un momento. Es intermitente
    // por naturaleza, así que antes de mostrarlo se reintenta un par de
    // veces en silencio.
    const MAX_REINTENTOS_RED = 2;

    const iniciar = (intentosRestantes: number) => {
      const reconocimiento = new Constructor();
      // Mismo idioma que la síntesis de voz de salida, por consistencia.
      reconocimiento.lang = "es-ES";
      // `continuous: false` cortaba la escucha apenas detectaba el primer
      // silencio (o a los pocos segundos si no detectaba nada) — eso es lo
      // que se veía como "se prende y después se apaga solo". En modo
      // continuo con resultados intermedios, el texto va apareciendo en
      // vivo en el input mientras el usuario habla (confirma que el
      // micrófono sí está capturando algo) y solo se envía cuando llega un
      // resultado final; ahí mismo se detiene la escucha.
      reconocimiento.continuous = true;
      reconocimiento.interimResults = true;
      reconocimiento.onresult = (evento) => {
        const ultimo = evento.results[evento.results.length - 1];
        const transcripcion = ultimo?.[0]?.transcript ?? "";
        if (ultimo?.isFinal) {
          setTexto("");
          reconocimiento.stop();
          setEscuchando(false);
          if (transcripcion.trim()) procesarTexto(transcripcion.trim());
          return;
        }
        setTexto(transcripcion);
      };
      reconocimiento.onerror = (evento) => {
        if (evento.error === "network" && intentosRestantes > 0) {
          iniciar(intentosRestantes - 1);
          return;
        }
        setEscuchando(false);
        if (evento.error === "aborted") return; // lo detuvo el propio usuario o el "final" de arriba
        const mensaje =
          evento.error === "no-speech"
            ? "No te escuché. Tocá el micrófono y hablá apenas se active."
            : evento.error === "not-allowed" || evento.error === "service-not-allowed"
              ? "No tengo permiso para usar el micrófono. Revisá los permisos del navegador para este sitio."
              : evento.error === "audio-capture"
                ? "No encontré un micrófono disponible en este dispositivo."
                : evento.error === "network"
                  ? "No pude conectarme al servicio de reconocimiento de voz (puede ser tu conexión, una VPN o un antivirus). Probá de nuevo en un momento."
                  : `Hubo un problema con el micrófono (${evento.error}). Probá de nuevo.`;
        void responder(mensaje);
      };
      reconocimiento.onend = () => {
        // Si ya se está reintentando, `reconocimientoRef` apunta a la
        // instancia nueva: no apagar el indicador de "escuchando" por el
        // `onend` de la instancia vieja que está siendo reemplazada.
        if (reconocimientoRef.current === reconocimiento) setEscuchando(false);
      };
      reconocimientoRef.current = reconocimiento;
      setEscuchando(true);
      reconocimiento.start();
    };

    iniciar(MAX_REINTENTOS_RED);
  };

  if (!sesion || intenciones.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      {abierto ? (
        <div
          role="dialog"
          aria-label="MiDentista IA"
          // `bottom-40` en móvil: deja espacio para `MobileTabBar` (barra
          // fija inferior, z-50) más el propio botón flotante encima de
          // ella. Desde `lg` no hay tab bar y el panel baja a `bottom-24`.
          className="pointer-events-auto fixed bottom-40 right-4 flex h-[min(28rem,60vh)] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-panel border border-line bg-surface shadow-e3 lg:bottom-24 lg:right-6 lg:h-[min(32rem,70vh)]"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line bg-surface-sunken px-4 py-3">
            <div className="flex items-center gap-2">
              <ChatCircleDots size={18} weight="duotone" className="text-brand-600" />
              <span className="text-sm font-semibold text-ink">MiDentista IA</span>
            </div>
            <div className="flex items-center gap-1">
              {hayVozSalida ? (
                <button
                  type="button"
                  onClick={() => setVozActiva((actual) => !actual)}
                  aria-label={vozActiva ? "Silenciar respuestas habladas" : "Activar respuestas habladas"}
                  className="press rounded-full p-1.5 text-ink-muted hover:bg-line hover:text-ink"
                >
                  {vozActiva ? <SpeakerHigh size={16} weight="bold" /> : <SpeakerSlash size={16} weight="bold" />}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar asistente"
                className="press rounded-full p-1.5 text-ink-muted hover:bg-line hover:text-ink"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            <div className="flex flex-col gap-2">
              {mensajes.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[85%] rounded-tile px-3 py-2 text-sm",
                    m.autor === "usuario" ? "ml-auto bg-ink text-white" : "bg-surface-sunken text-ink",
                  )}
                >
                  {m.cargando ? (
                    <span key={m.texto} className="fase-pensando flex items-center gap-2 text-ink-soft">
                      <SpinnerGap size={14} className="animate-spin" />
                      {m.texto}
                    </span>
                  ) : m.tarjeta ? (
                    m.tarjeta
                  ) : (
                    m.texto
                  )}
                </div>
              ))}
            </div>
            <div ref={finalRef} />
          </div>

          <form
            className="flex shrink-0 items-center gap-2 border-t border-line p-3"
            onSubmit={(e) => {
              e.preventDefault();
              enviarTexto();
            }}
          >
            {hayVozEntrada ? (
              <button
                type="button"
                onClick={() => void alternarEscucha()}
                aria-pressed={escuchando}
                aria-label={escuchando ? "Detener micrófono" : "Hablarle al asistente"}
                className={cn(
                  "press shrink-0 rounded-full p-2.5",
                  escuchando ? "bg-ios-red text-white" : "bg-surface-sunken text-ink-soft hover:text-ink",
                )}
              >
                <Microphone size={18} weight={escuchando ? "fill" : "bold"} />
              </button>
            ) : null}
            <Input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribí o hablá..."
              aria-label="Mensaje para el asistente"
              className="flex-1"
            />
            <Button type="submit" size="icon" aria-label="Enviar" disabled={!texto.trim()}>
              <PaperPlaneTilt size={16} weight="bold" />
            </Button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setAbierto((actual) => !actual);
          setNotado(true);
        }}
        aria-label={abierto ? "Cerrar MiDentista IA" : "Abrir MiDentista IA"}
        aria-expanded={abierto}
        // `bottom-24` en móvil para despejar `MobileTabBar` (z-50, fija
        // abajo de todo); desde `lg` no existe esa barra y baja a `bottom-6`.
        className={cn(
          "press pointer-events-auto fixed bottom-24 right-4 flex size-14 items-center justify-center rounded-full bg-ink text-white shadow-e3 hover:bg-ink/90 lg:bottom-6 lg:right-6",
          !notado && !abierto && "fab-aviso",
        )}
      >
        {abierto ? <X size={22} weight="bold" /> : <ChatCircleDots size={24} weight="fill" />}
      </button>

      {/* Portales ocultos para "Descargar PDF": se imprimen con los mismos
          datos que ya se muestran en la tarjeta de reporte, sin navegar. */}
      <ReporteImprimible
        titulo="REPORTE DE PACIENTES"
        clinica={sesion.clinica}
        columnas={COLUMNAS_REPORTE_PACIENTES}
        filas={pacientesParaReporte.map((p) => [`${p.nombres} ${p.apellidos}`, p.ci, p.telefono, p.email, p.direccion, p.creadoEl])}
      />
      {sesion.rol === "superadmin" ? (
        <ReporteImprimible
          titulo="REPORTE DE PERSONAL"
          clinica={null}
          columnas={COLUMNAS_REPORTE_PERSONAL}
          filas={personalParaReporte.map((p) => [
            p.nombre,
            p.email,
            ROLE_LABEL[p.rol],
            p.clinica ?? "Sin clínica (superadmin)",
            p.invitacionPendiente ? "Invitación pendiente" : p.activo ? "Activo" : "Inactivo",
          ])}
        />
      ) : null}
    </div>
  );
}

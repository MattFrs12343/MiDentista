import type { Role } from "../../types/index.ts";
import type { Intencion } from "./interprete.ts";

/**
 * Catálogo de intenciones por rol — reflejan exactamente lo que ese rol ya
 * ve en `Sidebar.tsx`/`AppShell.tsx` (ver tabla en
 * docs/modules/17-asistente-ia/README.md, pieza B). `odontologo`,
 * `odontologo_admin` y `recepcionista` comparten el mismo menú hoy (el
 * sidebar real no los distingue salvo superadmin), así que comparten
 * catálogo. `paciente` no tiene este asistente — ver README.
 */
export interface IntencionAccion extends Intencion {
  ruta: string;
  /** Lo que dice el asistente al ejecutar esta acción. */
  mensaje: string;
}

const INTENCIONES_STAFF: readonly IntencionAccion[] = [
  {
    id: "panel_general",
    etiqueta: "Panel general",
    ruta: "/app",
    mensaje: "Te llevo al panel general.",
    palabrasClave: ["panel", "panel general", "inicio", "resumen", "dashboard"],
  },
  {
    id: "pacientes",
    etiqueta: "Pacientes",
    ruta: "/app/pacientes",
    mensaje: "Te llevo a la lista de pacientes.",
    palabrasClave: ["paciente", "pacientes", "lista de pacientes", "buscar paciente", "mis pacientes"],
  },
  {
    id: "historia_clinica",
    etiqueta: "Historia clínica",
    ruta: "/app/historia-clinica",
    mensaje: "Te llevo a historia clínica.",
    palabrasClave: ["historia", "historia clinica", "antecedentes"],
  },
  {
    id: "odontograma",
    etiqueta: "Odontograma",
    ruta: "/app/odontograma",
    mensaje: "Te llevo al odontograma.",
    palabrasClave: ["odontograma", "piezas", "dientes"],
  },
  {
    id: "diagnostico_tratamiento",
    etiqueta: "Diagnóstico y tratamiento",
    ruta: "/app/diagnostico-tratamiento",
    mensaje: "Te llevo a diagnóstico y tratamiento.",
    palabrasClave: ["diagnostico", "tratamiento", "plan de tratamiento", "diagnostico y tratamiento"],
  },
  {
    id: "presupuestos",
    etiqueta: "Presupuestos",
    ruta: "/app/presupuestos",
    mensaje: "Te llevo a presupuestos.",
    palabrasClave: ["presupuesto", "presupuestos", "cotizacion"],
  },
  {
    id: "pagos",
    etiqueta: "Pagos y cuentas",
    ruta: "/app/pagos",
    mensaje: "Te llevo a pagos y cuentas.",
    palabrasClave: ["pago", "pagos", "cobro", "cuenta", "cuentas", "qr de cobro"],
  },
  {
    id: "reporte",
    etiqueta: "Reporte de pacientes",
    ruta: "/app/pacientes",
    mensaje: "Te llevo a Pacientes — ahí arriba tenés \"Descargar PDF\" y \"Descargar CSV\" para el reporte.",
    // Frases completas primero: sin ellas, "reporte de pacientes" empataba
    // con la intención "pacientes" (ambas puntúan por la palabra suelta
    // "pacientes") y quedaba en loop de desambiguación pidiendo elegir
    // entre las dos, una y otra vez, sin poder avanzar nunca.
    palabrasClave: [
      "reporte de pacientes",
      "informe de pacientes",
      "exportar pacientes",
      "descargar pacientes",
      "reporte",
      "reportes",
      "informe",
      "exportar",
      "descargar reporte",
      "descargar informe",
    ],
  },
];

const INTENCIONES_SUPERADMIN: readonly IntencionAccion[] = [
  {
    id: "panel_admin",
    etiqueta: "Panel de administración",
    ruta: "/app/admin",
    mensaje: "Te llevo al panel de administración.",
    palabrasClave: ["panel", "administracion", "clinicas", "personal", "panel de administracion"],
  },
  {
    id: "reporte_personal",
    etiqueta: "Reporte de personal",
    ruta: "/app/admin",
    mensaje: "Te llevo al panel de administración — ahí arriba tenés \"Descargar PDF\" y \"Descargar CSV\" del personal.",
    // Mismo criterio que "reporte" (ver su comentario): frases completas
    // primero para no empatar con "panel_admin" por la palabra "personal".
    palabrasClave: [
      "reporte de personal",
      "reporte del personal",
      "informe de personal",
      "exportar personal",
      "reporte",
      "reportes",
      "informe",
      "exportar",
      "descargar reporte",
      "descargar informe",
    ],
  },
];

export function intencionesParaRol(rol: Role): readonly IntencionAccion[] {
  return rol === "superadmin" ? INTENCIONES_SUPERADMIN : INTENCIONES_STAFF;
}

export function buscarAccion(
  intenciones: readonly IntencionAccion[],
  id: string,
): IntencionAccion | undefined {
  return intenciones.find((intencion) => intencion.id === id);
}

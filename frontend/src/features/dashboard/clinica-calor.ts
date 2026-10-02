/**
 * Salud de la clinica a partir de los odontogramas de todos los pacientes.
 *
 * Logica pura (sin React) para poder razonarla y probarla aparte de la vista.
 *
 * El panel general antes mostraba tres contadores ("14 pacientes, 23
 * diagnosticos, 40 items"): numeros que la aplicacion ya conocia y que no
 * cambian ninguna decision clinica. Esto responde la pregunta que un odontologo
 * si se hace al abrir la pantalla: donde se me acumula la patologia.
 */

import type { CondicionDiente, CondicionPieza, PlanTratamiento } from "@/types";
import {
  CONDICION_LABEL,
  CUADRANTE_INFERIOR_DERECHO,
  CUADRANTE_INFERIOR_IZQUIERDO,
  CUADRANTE_SUPERIOR_DERECHO,
  CUADRANTE_SUPERIOR_IZQUIERDO,
} from "@/features/odontogram/odontogramLayout";

/**
 * Los cuadrantes vienen de `odontogramLayout`, la misma fuente que usa el
 * odontograma clinico. Si el mapa redefiniera su propio orden FDI, el dentista
 * veria dos arcadas distintas y dejaria de confiar en el panel.
 */
export const ARCADA_SUPERIOR_DERECHA = CUADRANTE_SUPERIOR_DERECHO;
export const ARCADA_SUPERIOR_IZQUIERDA = CUADRANTE_SUPERIOR_IZQUIERDO;
export const ARCADA_INFERIOR_DERECHA = CUADRANTE_INFERIOR_DERECHO;
export const ARCADA_INFERIOR_IZQUIERDA = CUADRANTE_INFERIOR_IZQUIERDO;

export const PIEZAS_FDI = [
  ...ARCADA_SUPERIOR_DERECHA,
  ...ARCADA_SUPERIOR_IZQUIERDA,
  ...ARCADA_INFERIOR_IZQUIERDA,
  ...ARCADA_INFERIOR_DERECHA,
];

const ES_PIEZA_FDI = new Set(PIEZAS_FDI);

/**
 * De mayor a menor urgencia clinica. Al elegir el color de una pieza se gana la
 * condicion mas urgente presente, no la mas frecuente: si un mismo diente tiene
 * una caries en un paciente y un implante en otro, el mapa debe avisar de la
 * caries, que es lo que requiere accion hoy.
 *
 * `obturado`, `corona` e `implante` son tratamientos ya realizados, por eso
 * quedan al final: no generan accion, solo contexto.
 */
export const ORDEN_URGENCIA: CondicionDiente[] = [

  "caries",
  "extraccion_indicada",
  "endodoncia",
  "ausente",
  "obturado",
  "corona",
  "implante",
  "sano",
];

export type MapaPieza = Record<number, Partial<Record<CondicionDiente, string[]>>>;

/**
 * Cuenta, para cada pieza FDI, cuantos pacientes la tienen en cada condicion.
 * `pacienteId` es parte del valor porque el detalle necesita nombrarlos.
 */
export function agregaPorPieza(
  odontogramas: Record<string, CondicionPieza[]>,
): MapaPieza {
  const mapa: MapaPieza = {};
  // se recorren las entradas (no los valores) porque la clave es el pacienteId,
  // que es lo que permite nombrar a quien tiene cada condicion en el detalle
  for (const [pacienteId, condiciones] of Object.entries(odontogramas)) {
    for (const { pieza, condicion } of condiciones) {
      // se descartan piezas fuera delCatalogo: un FDI mal capturado no debe
      // crear entradas fantasma ni inflar el total de piezas afectadas
      if (!ES_PIEZA_FDI.has(pieza)) continue;
      if (!CONDICIONES_VALIDAS.has(condicion)) continue;
      const porPieza = (mapa[pieza] ??= {});
      const lista = (porPieza[condicion] ??= []);
      if (!lista.includes(pacienteId)) lista.push(pacienteId);
    }
  }
  return mapa;
}

const CONDICIONES_VALIDAS = new Set<CondicionDiente>(ORDEN_URGENCIA);

export interface ResumenPieza {
  pieza: number;
  /** condicion que manda en el color, por urgencia */
  dominante: CondicionDiente;
  /** pacientes con la condicion dominante */
  pacientesDominante: number;
  /** ids de esos pacientes, para nombrarlos en el detalle */
  idsDominante: string[];
  /** pacientes que tienen alguna condicion registrada (no "sano") */
  pacientesAfectados: number;
  /** total de pacientes de la clinica, para normalizar la intensidad */
  totalPacientes: number;
  /** desglose completo, para el panel de detalle */
  detalle: { condicion: CondicionDiente; n: number }[];
}

/**
 * Intensidad del color: quantos pacientes tienen ese problema sobre el total.
 * Es lo que convierte el mapa en un mapa de calor y no en un semaforo binario.
 */
export function intensidadDe(resumen: ResumenPieza): number {
  if (resumen.totalPacientes <= 0) return 0.25;
  const ratio = resumen.pacientesDominante / resumen.totalPacientes;
  // rango 0.45..1 para que incluso 1 de 20 pacientes se vea, sin llegar a 0
  return 0.45 + Math.min(ratio, 1) * 0.55;
}

export function resumenDePieza(pieza: number, mapa: MapaPieza, totalPacientes: number): ResumenPieza {
  const porPieza = mapa[pieza] ?? {};
  let dominante: CondicionDiente = "sano";
  for (const condicion of ORDEN_URGENCIA) {
    if (porPieza[condicion]?.length) {
      dominante = condicion;
      break;
    }
  }
  const detalle = ORDEN_URGENCIA.filter((c) => porPieza[c]?.length).map((condicion) => ({
    condicion,
    n: porPieza[condicion]!.length,
  }));
  return {
    pieza,
    dominante,
    pacientesDominante: porPieza[dominante]?.length ?? 0,
    idsDominante: porPieza[dominante] ?? [],
    pacientesAfectados: detalle.reduce((acc, d) => acc + d.n, 0),
    totalPacientes,
    detalle,
  };
}

/**
 * Solo el color; la etiqueta sale de `CONDICION_LABEL` para que el mapa y el
 * odontograma nombren cada condicion exactamente igual.
 */
const COLOR_CLASE: Record<CondicionDiente, string> = {
  caries: "text-ios-red",
  extraccion_indicada: "text-[#b3261e]",
  endodoncia: "text-ios-orange",
  ausente: "text-[#8e8e93]",
  obturado: "text-[#5aa86f]",
  corona: "text-ios-green",
  implante: "text-ios-teal",
  sano: "text-[#c9c5bb]",
};

export const COLOR_CONDICION: Record<
  CondicionDiente,
  { clase: string; etiqueta: string }
> = Object.fromEntries(
  ORDEN_URGENCIA.map((c) => [c, { clase: COLOR_CLASE[c], etiqueta: CONDICION_LABEL[c] }]),
) as Record<CondicionDiente, { clase: string; etiqueta: string }>;

export interface Alerta {
  id: string;
  severidad: "grave" | "atencion";
  titulo: string;
  detalle: string;
  pacienteId: string;
}

const RANKEO: Record<Alerta["severidad"], number> = { grave: 0, atencion: 1 };

/**
 * Alertas clinicas derivadas de datos estructurados, no de heuristicas sobre
 * texto libre: el campo `Diagnostico.descripcion` es texto plano, asi que
 * clasificarlo por palabras seria inventar informacion.
 *
 * Se detectan tres casos que en la practica se escapan:
 *  - alergia grave registrada (es una senal de seguridad, no una estadistica)
 *  - pieza con extraccion indicada y ningun item de plan para esa pieza
 *  - pieza con caries y ningun item de plan para esa pieza
 *
 * Los titulos se arman con `CONDICION_LABEL` para que una alerta diga
 * "Extracción indicada" y no "Extraccion indicada": el mismo nombre que ya
 * usan el mapa de calor y el odontograma.
 */
export function detectaAlertas({
  pacientes,
  odontogramas,
  planes,
  alergiasPorPaciente,
}: {
  pacientes: { id: string; nombres: string; apellidos: string }[];
  odontogramas: Record<string, CondicionPieza[]>;
  planes: Record<string, PlanTratamiento>;
  alergiasPorPaciente: Record<string, { sustancia: string; severidad: string }[]>;
}): Alerta[] {
  const alertas: Alerta[] = [];

  for (const paciente of pacientes) {
    const alergias = alergiasPorPaciente[paciente.id] ?? [];
    const graves = alergias.filter((a) => a.severidad === "grave");
    if (graves.length) {
      alertas.push({
        id: `alergia-${paciente.id}`,
        severidad: "grave",
        titulo: "Alergia grave registrada",
        detalle: `${graves.map((a) => a.sustancia).join(", ")} - revisar antes de administrar anestesia`,
        pacienteId: paciente.id,
      });
    }

    const items = planes[paciente.id]?.items ?? [];
    const piezasConPlan = new Set(items.map((i) => i.pieza).filter((n): n is number => typeof n === "number"));

    for (const { pieza, condicion } of odontogramas[paciente.id] ?? []) {
      if (condicion !== "extraccion_indicada" && condicion !== "caries") continue;
      if (piezasConPlan.has(pieza)) continue;
      alertas.push({
        id: `${paciente.id}-${pieza}-${condicion}`,
        severidad: "atencion",
        titulo:
          condicion === "extraccion_indicada"
            ? `${CONDICION_LABEL.extraccion_indicada} sin plan`
            : `${CONDICION_LABEL.caries} sin tratamiento planeado`,
        detalle: `Pieza ${pieza} (${nombreCorto(pieza)}) sin item en el plan de tratamiento`,
        pacienteId: paciente.id,
      });
    }
  }

  return alertas.sort((a, b) => RANKEO[a.severidad] - RANKEO[b.severidad]);
}

function nombreCorto(pieza: number): string {
  const posicion = pieza % 10;
  return (
    ["Incisivo central", "Incisivo lateral", "Canino", "Primer premolar", "Segundo premolar",
      "Primer molar", "Segundo molar", "Tercer molar"][posicion - 1] ?? "Pieza"
  );
}

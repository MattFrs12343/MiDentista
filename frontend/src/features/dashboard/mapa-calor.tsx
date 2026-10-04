import { useMemo, useState } from "react";
import { DienteSvg } from "@/features/odontogram/DienteSvg";
import { nombrePieza } from "@/features/odontogram/toothNames";
import type { CondicionPieza } from "@/types";
import { cn } from "@/lib/cn";
import {
  ARCADA_INFERIOR_DERECHA,
  ARCADA_INFERIOR_IZQUIERDA,
  ARCADA_SUPERIOR_DERECHA,
  ARCADA_SUPERIOR_IZQUIERDA,
  COLOR_CONDICION,
  agregaPorPieza,
  intensidadDe,
  resumenDePieza,
  type MapaPieza,
  type ResumenPieza,
} from "@/features/dashboard/clinica-calor";

/**
 * Mapa de calor de los 32 dientes FDI de la clinica: cada pieza se tiñe segun la
 * condicion mas urgente presente entre todos los pacientes, y la intensidad
 * crece con cuantos pacientes la tienen.
 *
 * Reutiliza `DienteSvg` para que las siluetas sean las mismas del odontograma
 * clinico: el odontologo lee este mapa con la misma anatomia de siempre.
 *
 * Interaccion por click, no por hover: el panel corre en movil y `hover` no
 * existe en un dedo.
 */
export function MapaCalor({
  odontogramas,
  nombresPorId,
}: {
  odontogramas: Record<string, CondicionPieza[]>;
  /** id -> "Nombres Apellidos", para nombrar pacientes en el detalle */
  nombresPorId: Record<string, string>;
}) {
  const [seleccion, setSeleccion] = useState<ResumenPieza | null>(null);

  const mapa = useMemo<MapaPieza>(() => agregaPorPieza(odontogramas), [odontogramas]);
  const total = Object.keys(odontogramas).length;

  const resumen = (pieza: number) => resumenDePieza(pieza, mapa, total);

  return (
    <div className="flex flex-col gap-4">
      {/* las arcadas se apilan por debajo de `lg`: emparejadas necesitan ~780px
          y el mapa vive en una columna estrecha, asi que antes de eso cada
          cuadrante ocupa el ancho completo y se lee sin desplazamiento */}
      <FilaArcadas
        izquierda={ARCADA_SUPERIOR_DERECHA}
        derecha={ARCADA_SUPERIOR_IZQUIERDA}
        arcada="superior"
        etiquetaIzquierda="Superior derecho"
        etiquetaDerecha="Superior izquierdo"
        resumen={resumen}
        seleccion={seleccion}
        onSelect={setSeleccion}
      />
      <FilaArcadas
        izquierda={ARCADA_INFERIOR_DERECHA}
        derecha={ARCADA_INFERIOR_IZQUIERDA}
        arcada="inferior"
        etiquetaIzquierda="Inferior derecho"
        etiquetaDerecha="Inferior izquierdo"
        resumen={resumen}
        seleccion={seleccion}
        onSelect={setSeleccion}
      />

      <Leyenda />

      <DetallePieza resumen={seleccion} nombresPorId={nombresPorId} />
    </div>
  );
}

function FilaArcadas({
  izquierda,
  derecha,
  arcada,
  etiquetaIzquierda,
  etiquetaDerecha,
  resumen,
  seleccion,
  onSelect,
}: {
  izquierda: number[];
  derecha: number[];
  arcada: "superior" | "inferior";
  etiquetaIzquierda: string;
  etiquetaDerecha: string;
  resumen: (pieza: number) => ResumenPieza;
  seleccion: ResumenPieza | null;
  onSelect: (r: ResumenPieza) => void;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
      <Arcada
        piezas={izquierda}
        arcada={arcada}
        etiqueta={etiquetaIzquierda}
        resumen={resumen}
        seleccion={seleccion}
        onSelect={onSelect}
      />
      <Arcada
        piezas={derecha}
        arcada={arcada}
        etiqueta={etiquetaDerecha}
        resumen={resumen}
        seleccion={seleccion}
        onSelect={onSelect}
      />
    </div>
  );
}

function Arcada({
  piezas,
  arcada,
  etiqueta,
  resumen,
  seleccion,
  onSelect,
}: {
  piezas: number[];
  arcada: "superior" | "inferior";
  etiqueta: string;
  resumen: (pieza: number) => ResumenPieza;
  seleccion: ResumenPieza | null;
  onSelect: (r: ResumenPieza) => void;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-label-3">
        {etiqueta}
      </p>
      {/* 8 piezas a 36px caben en un movil de 390; a partir de lg grows a 44px
          para cumplir el objetivo tactil de iOS donde hay espacio de sobra */}
      <ul className="flex w-full gap-1 overflow-x-auto overscroll-x-contain pb-1 lg:gap-0.5">
        {piezas.map((pieza) => {
          const r = resumen(pieza);
          const activo = seleccion?.pieza === pieza;
          const color = COLOR_CONDICION[r.dominante];
          const vacio = r.pacientesAfectados === 0;
          return (
            <li key={pieza}>
              <button
                type="button"
                onClick={() => onSelect(r)}
                aria-pressed={activo}
                aria-label={`Pieza ${pieza}, ${nombrePieza(pieza)}. ${color.etiqueta} en ${r.pacientesDominante} de ${r.totalPacientes} pacientes`}
                className={cn(
                  "press flex w-9 flex-col items-center gap-0.5 rounded-xl p-1 hover:bg-black/[0.04] lg:w-11",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
                  activo && "bg-black/[0.06] ring-2 ring-brand-400",
                )}
              >
                <span
                  className={cn("flex h-8 w-8 items-center justify-center", color.clase)}
                  style={{ opacity: vacio ? 0.28 : intensidadDe(r) }}
                >
                  <DienteSvg pieza={pieza} arcada={arcada} className="h-full w-full" />
                </span>
                <span
                  className={cn(
                    "text-[9px] font-semibold tabular-nums",
                    vacio ? "text-label-3" : "text-label-2",
                  )}
                >
                  {pieza}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Leyenda() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line pt-3">
      {(["caries", "extraccion_indicada", "endodoncia", "ausente", "obturado", "implante"] as const).map(
        (c) => (
          <span key={c} className="flex items-center gap-1.5 text-[11px] text-label-2">
            <span className={cn("h-2.5 w-2.5 rounded-full bg-current", COLOR_CONDICION[c].clase)} />
            {COLOR_CONDICION[c].etiqueta}
          </span>
        ),
      )}
      <span className="ml-auto text-[11px] text-label-3">
        Mas intenso = mas pacientes con esa condicion
      </span>
    </div>
  );
}

function DetallePieza({
  resumen,
  nombresPorId,
}: {
  resumen: ResumenPieza | null;
  nombresPorId: Record<string, string>;
}) {
  if (!resumen) {
    return (
      <p className="rounded-ios-lg bg-black/[0.03] px-4 py-3 text-[13px] text-label-2">
        Toca una pieza para ver quienes la tienen afectada.
      </p>
    );
  }
  if (resumen.pacientesAfectados === 0) {
    return (
      <div className="rounded-ios-lg bg-black/[0.03] px-4 py-3">
        <p className="text-[13px] font-semibold text-label">
          Pieza {resumen.pieza} - {nombrePieza(resumen.pieza)}
        </p>
        <p className="mt-0.5 text-[13px] text-label-2">
          Sin condiciones registradas en ningun paciente.
        </p>
      </div>
    );
  }

  return (
    <div className="press-row rounded-ios-lg bg-black/[0.03] px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[13px] font-semibold text-label">
          Pieza {resumen.pieza} - {nombrePieza(resumen.pieza)}
        </p>
        <p className="text-[11px] text-label-3">
          {resumen.pacientesAfectados} de {resumen.totalPacientes} pacientes
        </p>
      </div>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {resumen.detalle.map((d) => {
          const color = COLOR_CONDICION[d.condicion];
          return (
            <li
              key={d.condicion}
              className={cn(
                "flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-label",
                "shadow-[0_1px_2px_rgba(0,0,0,0.06)]",
              )}
            >
              <span className={cn("h-2 w-2 rounded-full bg-current", color.clase)} />
              {color.etiqueta}
              <span className="tabular-nums text-label-3">{d.n}</span>
            </li>
          );
        })}
      </ul>
      {/* se nombran los pacientes de la condicion dominante: el conteo solo dice
          cuantas piezas hay, el nombre dice a quien hay que llamar */}
      {resumen.idsDominante.length ? (
        <p className="mt-2 text-[12px] leading-snug text-label-2">
          <span className="font-semibold text-label">
            {COLOR_CONDICION[resumen.dominante].etiqueta}
          </span>
          {" en "}
          {resumen.idsDominante.map((id) => nombresPorId[id] ?? id).join(", ")}
        </p>
      ) : null}
    </div>
  );
}

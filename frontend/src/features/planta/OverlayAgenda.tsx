import { COLOR_PLANO, COLOR_TIPO } from "@/features/planta/plantaLayout";
import { fraccion, minutosDeAhora, type EjeDia, type OcupacionZona } from "@/features/planta/plantaAgenda";
import type { CitaDePlanta, Zona } from "./tipos";

/**
 * Agenda dibujada encima de la planta, dentro de cada zona.
 *
 * Son dos capas y por eso son dos lecturas:
 *
 *  - Una barra con la jornada, para ver de un vistazo si hay huecos entre
 *    citas. Los minutos salen de `ejeDelDia`, no de las citas: si el eje se
 *    armara con ellas, un dia de una sola cita llenaria la barra.
 *  - La marca de "ahora", solo dentro de la jornada. Fuera de ella no se dibuja,
 *    porque una linea en el extremo hace creer que hay turno.
 *
 * Todo es SVG puro y sin librerias de graficos: el overlay tiene que aparecer
 * igual en el modo 2D, que es el que no puede fallar.
 */

const ALTO_BARRA = 10;
const MARGEN_INFERIOR = 8;
const MARGEN_LATERAL = 6;

/** Color de marca por estado. Los mismos tonos que usa la agenda. */
const COLOR_ESTADO: Record<CitaDePlanta["estado"], string> = {
  reservada: "#3d648b",
  confirmada: "#2b5c8f",
  atendida: "#2f6b48",
  cancelada: "#8e8e93",
};

export function OverlayAgenda({
  zona,
  dato,
  eje,
  x,
  y,
  ancho,
  alto,
  ahora = minutosDeAhora(),
}: {
  zona: Zona;
  dato: OcupacionZona;
  eje: EjeDia;
  /** Esquina superior izquierda de la zona, en unidades de dibujo. */
  x: number;
  y: number;
  ancho: number;
  alto: number;
  /** Minutos desde medianoche. Se pasa para que todas las zonas dibujen la misma marca. */
  ahora?: number;
}) {
  const anchoUtil = Math.max(0, ancho - MARGEN_LATERAL * 2);
  const barraY = y + alto - MARGEN_INFERIOR - ALTO_BARRA;
  const marca = fraccion(eje, ahora);
  const enJornada = ahora >= eje.inicio && ahora <= eje.fin;

  return (
    <g className="pointer-events-none">
      {/* pista de la jornada */}
      <rect
        x={x + MARGEN_LATERAL}
        y={barraY}
        width={anchoUtil}
        height={ALTO_BARRA}
        rx={ALTO_BARRA / 2}
        fill={COLOR_PLANO.suelo}
        stroke={COLOR_PLANO.muro}
        strokeWidth={0.75}
      />

      {/* una marca por cita. Las canceladas se muestran apagadas: no ocupan el
          consultorio y no pueden leerse como si lo hicieran */}
      {dato.citas.map((cita) => {
        const desde = fraccion(eje, minutosDe(cita.horaInicio));
        const hasta = fraccion(eje, minutosDe(cita.horaFin));
        if (hasta <= 0 || desde >= 1) return null;
        return (
          <rect
            key={cita.id}
            x={x + MARGEN_LATERAL + Math.max(0, desde) * anchoUtil}
            y={barraY}
            width={Math.max(1.5, (Math.min(1, hasta) - Math.max(0, desde)) * anchoUtil)}
            height={ALTO_BARRA}
            rx={ALTO_BARRA / 2}
            fill={COLOR_ESTADO[cita.estado]}
            opacity={cita.estado === "cancelada" ? 0.45 : 0.95}
          />
        );
      })}

      {enJornada ? (
        <g>
          <line
            x1={x + MARGEN_LATERAL + marca * anchoUtil}
            y1={barraY - 3}
            x2={x + MARGEN_LATERAL + marca * anchoUtil}
            y2={barraY + ALTO_BARRA + 3}
            stroke={COLOR_PLANO.texto}
            strokeWidth={1.5}
          />
          <circle cx={x + MARGEN_LATERAL + marca * anchoUtil} cy={barraY - 4} r={2.5} fill={COLOR_PLANO.texto} />
        </g>
      ) : null}

      {ancho > 150 ? (
        <text
          x={x + ancho / 2}
          y={barraY - 9}
          textAnchor="middle"
          fill={COLOR_PLANO.textoTenue}
          fontSize={10.5}
          fontWeight={600}
        >
          {textoDeOcupacion(dato)}
        </text>
      ) : null}
      {/* el color de la zona se repite en la barra para que el overlay siga
          identificando la sala cuando el nombre ya no cabe */}
      <rect
        x={x + MARGEN_LATERAL}
        y={barraY - 3}
        width={3}
        height={ALTO_BARRA + 6}
        rx={1.5}
        fill={COLOR_TIPO[zona.tipo] ?? COLOR_PLANO.texto}
      />
    </g>
  );
}

/** "3 citas · 2 h 30" sobre la barra de la zona. */
export function textoDeOcupacion(dato: OcupacionZona): string {
  if (!dato.activas) return "Sin citas";
  const horas = Math.floor(dato.minutosOcupados / 60);
  const minutos = dato.minutosOcupados % 60;
  const duracion = horas ? (minutos ? `${horas} h ${minutos}` : `${horas} h`) : `${minutos} min`;
  return `${dato.activas} ${dato.activas === 1 ? "cita" : "citas"} · ${duracion}`;
}

function minutosDe(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}
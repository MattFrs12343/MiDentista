import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { GRADIENTE_SECCION, type SeccionPortal } from "@/features/portal-paciente/portalGradientes";

/**
 * Las seis tarjetas de acceso de la portada.
 *
 * Cada una tiene su propio degradado de izquierda a derecha — no solo la
 * principal — para que la portada se lea viva y con buena visibilidad desde
 * el primer vistazo. El color identifica la sección (azul = citas, violeta =
 * odontograma, verde = historia, dorado = pagos, turquesa = evoluciones,
 * celeste = clínica), reutilizando los mismos tonos de módulo que ya usa el
 * resto de la app en sus heroes, para que no se sientan colores inventados.
 *
 * "Agendar cita" sigue siendo la acción principal: ocupa dos columnas en
 * pantallas medianas y su motivo decorativo es un poco más grande, pero ya
 * no es la única con color — con las seis vívidas, la jerarquía la da el
 * tamaño, no el contraste entre "una de color" y "cinco en blanco".
 *
 * Decorativo: un motivo de línea muy sutil por tarjeta, un barrido de brillo
 * al pasar el mouse/foco, y una deriva lenta del motivo en bucle.
 */

const svgBase = "pointer-events-none select-none";

/** Cita: reloj con las agujas marcando la hora de la atención. */
function MotivoCita({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden className={cn(svgBase, className)}>
      <circle cx="32" cy="32" r="21" stroke="currentColor" strokeWidth="1.2" />
      <path d="M32 19v13l9 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 8v-4M44 8V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/** Odontograma: arco de piezas dental en línea fina. */
function MotivoOdontograma({ className }: { className?: string }) {
  const piezas = Array.from({ length: 13 }, (_, i) => {
    const t = (i - 6) / 6;
    return { x: 50 + t * 42, y: 66 - (1 - t * t) * 13, rot: -t * 24 };
  });
  return (
    <svg viewBox="0 0 100 74" fill="none" aria-hidden className={cn(svgBase, className)}>
      <path d="M8 66C26 44 74 44 92 66" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      {piezas.map((p, i) => (
        <rect key={i} x={p.x - 1.9} y={p.y - 4.4} width="3.8" height="8.8" rx="1.6" stroke="currentColor" strokeWidth="1" />
      ))}
    </svg>
  );
}

/** Historia: hoja de historia clínica con su tabla de piezas. */
function MotivoHistoria({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 80" fill="none" aria-hidden className={cn(svgBase, className)}>
      <path d="M12 6h30l10 10v58H12Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M42 6v10h10" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M21 30h22M21 40h14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M21 52h22v14H21z" stroke="currentColor" strokeWidth="1" />
      <path d="M21 59h22M32 52v14" stroke="currentColor" strokeWidth="0.9" />
    </svg>
  );
}

/** Pagos: borde en sierra de comprobante, con su renglón de total. */
function MotivoPagos({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 24" fill="none" aria-hidden className={cn(svgBase, className)}>
      <path
        d="M0 6 5 1l5 5 5-5 5 5 5-5 5 5 5-5 5 5 5-5 5 5 5-5 5 5 5-5 5 5 5-5 5 5 5-5 5 5 5-5 5 5 5-5 5 5 5-5 5 5 5-5 5 5 5-5 5 5 5-5 5 5 5-5 5 5 5-5 5 5 5-5 5 5V24H0Z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path d="M140 15h44" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/** Evoluciones: calendario con los días ya atendidos marcados. */
function MotivoEvoluciones({ className }: { className?: string }) {
  const marcados = new Set([1, 4, 8, 9, 12]);
  return (
    <svg viewBox="0 0 68 68" fill="none" aria-hidden className={cn(svgBase, className)}>
      <rect x="8" y="12" width="52" height="48" rx="6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 26h52" stroke="currentColor" strokeWidth="1.2" />
      <path d="M22 7v9M46 7v9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      {Array.from({ length: 12 }, (_, i) => {
        const x = 15 + (i % 4) * 11;
        const y = 33 + Math.floor(i / 4) * 9;
        return marcados.has(i) ? (
          <rect key={i} x={x} y={y} width="7" height="6.5" rx="1.6" fill="currentColor" />
        ) : (
          <rect key={i} x={x} y={y} width="7" height="6.5" rx="1.6" stroke="currentColor" strokeWidth="0.9" />
        );
      })}
    </svg>
  );
}

/** Clínica: anillos de radio del buscador con el pin en el centro. */
function MotivoClinica({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 68 68" fill="none" aria-hidden className={cn(svgBase, className)}>
      <circle cx="34" cy="34" r="30" stroke="currentColor" strokeWidth="1" />
      <circle cx="34" cy="34" r="20" stroke="currentColor" strokeWidth="1" />
      <path
        d="M34 18c-5 0-9 4-9 9 0 7 9 17 9 17s9-10 9-17c0-5-4-9-9-9Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const MOTIVOS = {
  cita: MotivoCita,
  odontograma: MotivoOdontograma,
  historia: MotivoHistoria,
  pagos: MotivoPagos,
  evoluciones: MotivoEvoluciones,
  clinica: MotivoClinica,
} as const;

export type VarianteAcceso = SeccionPortal;

export function CardAcceso({
  to,
  icono,
  titulo,
  detalle,
  variante,
  destacada = false,
  badge,
  /** 0-100. Solo lo usa pagos, para la barra de lo pagado. */
  avance,
}: {
  to: string;
  icono: ReactNode;
  titulo: string;
  detalle: string;
  variante: VarianteAcceso;
  destacada?: boolean;
  badge?: string;
  avance?: number;
}) {
  const Motivo = MOTIVOS[variante];

  return (
    <Link
      to={to}
      className={cn(
        "acento-tarjeta press group relative isolate flex min-w-0 flex-col overflow-hidden rounded-panel bg-gradient-to-r p-4 text-left text-white",
        GRADIENTE_SECCION[variante],
        "shadow-e1 transition-[box-shadow,transform] duration-200 ease-out hover:shadow-e2",
        destacada && "sm:col-span-2 lg:col-span-1",
      )}
    >
      {/* Capa del brillo de hover. Va dentro del `isolate` y por debajo del
          contenido, para que el texto nunca pase por debajo del blanco. */}
      <div aria-hidden className="acento-barrido absolute inset-0" />

      {/* Adorno: el motivo en línea, al 12-16% y anclado a la esquina inferior
          derecha, en la diagonal opuesta al texto. */}
      <Motivo
        aria-hidden
        className={cn(
          "acceso-deriva pointer-events-none absolute -bottom-3 -right-3 h-16 w-16 opacity-[0.14] text-white",
          destacada && "h-20 w-20 opacity-[0.16]",
        )}
      />

      <div className="relative flex items-start justify-between gap-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-white/15 text-white ring-1 ring-white/20 transition-transform duration-200 ease-out group-hover:scale-[1.04]">
          {icono}
        </span>
        {badge ? (
          <span className="shrink-0 rounded-full bg-white/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-white ring-1 ring-white/25">
            {badge}
          </span>
        ) : null}
      </div>

      <div className="relative mt-3 flex items-end justify-between gap-2">
        <span className="min-w-0">
          <span className="block text-[13.5px] font-semibold leading-snug tracking-[-0.01em] text-white">
            {titulo}
          </span>
          <span className="mt-0.5 block truncate text-[12px] font-medium leading-snug text-white/85">{detalle}</span>
          {/* Solo donde hay un porcentaje real. */}
          {typeof avance === "number" ? (
            <span aria-hidden className="mt-2 block h-[3px] w-full overflow-hidden rounded-full bg-white/25">
              <span
                className="block h-full rounded-full bg-white transition-[width] duration-500 ease-out"
                style={{ width: `${Math.max(3, Math.min(100, avance))}%` }}
              />
            </span>
          ) : null}
        </span>
        <ArrowUpRight
          size={15}
          weight="bold"
          aria-hidden
          className="mb-0.5 shrink-0 text-white/70 transition-[transform,color] duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white"
        />
      </div>
    </Link>
  );
}

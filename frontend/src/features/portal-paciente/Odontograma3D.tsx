import { lazy, Suspense, useState } from "react";
import {
  ArrowsClockwise,
  Bone,
  Cube,
  HandTap,
  SpinnerGap,
  Tooth,
  WarningCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { CONDICION_LABEL, CONDICION_CLASE } from "@/features/portal-paciente/portalOdontograma";
import { etiquetaPieza } from "@/features/portal-paciente/portalFormato";
import { nombrePieza } from "@/features/odontogram/toothNames";
import type { CondicionDiente, CondicionPieza } from "@/types";

/**
 * El chunk con three.js pesa lo suyo, así que el modelo (1,4 MB) no se pide al
 * entrar al portal: se pide cuando el paciente pide ver el 3D. En un celular
 * con datos, esa decisión evita 1,4 MB de descarga no solicitada.
 */
const DentalArch3D = lazy(() =>
  import("@/features/odontogram/DentalArch3D").then((m) => ({ default: m.DentalArch3D })),
);

type Anatomia = "encias" | "hueso";

export function Odontograma3D({ piezas }: { piezas: CondicionPieza[] }) {
  const [pedido, setPedido] = useState(false);
  const [anatomia, setAnatomia] = useState<Anatomia>("encias");
  const [seleccionada, setSeleccionada] = useState<number | null>(null);

  const pieza = seleccionada !== null ? piezas.find((p) => p.pieza === seleccionada) : undefined;

  if (!pedido) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
          <span className="grid size-12 place-items-center rounded-ios bg-brand-50 text-brand-600">
            <Cube size={26} weight="duotone" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-ink">Ver tu odontograma en 3D</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
              Gira tu arcada dental y mira cómo están tus encías y cada pieza. Girá con un dedo y
              acercá con dos.
            </p>
          </div>
          <Button type="button" onClick={() => setPedido(true)}>
            <Cube size={16} weight="duotone" /> Cargar la vista 3D
          </Button>
          <p className="text-xs text-ink-muted">Descarga unos 1,4 MB la primera vez.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
              <Cube size={18} weight="duotone" className="text-ios-teal" />
              Tu arcada en 3D
            </h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
              <ArrowsClockwise size={12} /> Un dedo para girar · dos para acercar · tocá una pieza
            </p>
          </div>

          <div
            role="group"
            aria-label="Nivel de anatomía visible"
            className="flex overflow-hidden rounded-ios border border-line bg-surface-sunken p-0.5"
          >
            {(
              [
                { valor: "encias", etiqueta: "Encías", icon: Tooth },
                { valor: "hueso", etiqueta: "Con hueso", icon: Bone },
              ] as const
            ).map(({ valor, etiqueta, icon: Icono }) => (
              <button
                key={valor}
                type="button"
                aria-pressed={anatomia === valor}
                onClick={() => setAnatomia(valor)}
                className={cn(
                  "flex min-h-11 items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-medium transition-colors duration-150",
                  anatomia === valor
                    ? "bg-surface text-ink shadow-e1"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                <Icono size={15} weight="duotone" />
                {etiqueta}
              </button>
            ))}
          </div>
        </div>

        {/* La altura se acota al alto de la pantalla: en un celular, un canvas
            fijo de 420px empujaba el resto de la página fuera de vista. */}
        <div className="h-[min(62vh,420px)] w-full overflow-hidden rounded-tile bg-surface-sunken">
          <Suspense
            fallback={
              <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                <SpinnerGap size={26} className="animate-spin text-ios-teal" />
                <p className="text-sm text-ink-muted">Cargando tu arcada…</p>
              </div>
            }
          >
            <DentalArch3D
              piezas={piezas}
              seleccionada={seleccionada}
              anatomia={anatomia}
              onSelect={setSeleccionada}
              className="h-full w-full"
            />
          </Suspense>
        </div>

        {seleccionada !== null ? (
          <div className="flex items-start gap-3 rounded-tile border border-line bg-surface-sunken/60 p-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-ios bg-surface font-semibold tabular-nums text-ink">
              {etiquetaPieza(seleccionada)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{nombrePieza(seleccionada)}</p>
              {pieza ? (
                <span
                  className={cn(
                    "mt-1 inline-block rounded-full px-2 py-0.5 text-[12px] font-semibold",
                    CONDICION_CLASE[pieza.condicion as CondicionDiente],
                  )}
                >
                  {CONDICION_LABEL[pieza.condicion as CondicionDiente]}
                </span>
              ) : (
                <p className="mt-0.5 text-[13px] text-ink-muted">
                  Sin registro: tu odontólogo todavía no anotó esta pieza.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSeleccionada(null)}
              className="min-h-11 shrink-0 self-center rounded-ios px-3 text-[13px] font-medium text-ink-muted hover:bg-surface hover:text-ink"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <p className="flex items-center gap-2 px-1 text-[13px] text-ink-muted">
            <HandTap size={14} /> Tocá una pieza para ver en qué estado está.
          </p>
        )}

        {piezas.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 border-t border-line pt-3">
            {piezas.map((p) => (
              <button
                key={p.pieza}
                type="button"
                onClick={() => setSeleccionada(p.pieza)}
                aria-label={`${etiquetaPieza(p.pieza)}: ${CONDICION_LABEL[p.condicion as CondicionDiente]}`}
                className={cn(
                  "min-h-9 rounded-full px-2.5 text-[12px] font-semibold tabular-nums",
                  CONDICION_CLASE[p.condicion as CondicionDiente],
                  seleccionada === p.pieza && "ring-2 ring-brand-500 ring-offset-1",
                )}
              >
                {etiquetaPieza(p.pieza)}
              </button>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Aviso de que el 3D no se pudo cargar, sin romper el resto de la página. */
export function Aviso3DNoDisponible() {
  return (
    <p className="flex items-start gap-2 rounded-tile border border-pastel-red-fg/25 bg-pastel-red-bg px-3 py-2 text-[13px] text-pastel-red-fg">
      <WarningCircle size={16} weight="fill" className="mt-px shrink-0" aria-hidden />
      <span>No se pudo cargar la vista 3D. Podés ver el estado de cada pieza en la lista de abajo.</span>
    </p>
  );
}

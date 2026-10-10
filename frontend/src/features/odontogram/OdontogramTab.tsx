import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowsClockwise, HandTap, Printer, SpinnerGap, Tooth, Warning, Prohibit, Cube } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorBoundary, TarjetaError } from "@/components/ui/error-boundary";
import { SectionStatStrip } from "@/components/ui/section-board";
import { EmptyState } from "@/components/ui/empty-state";
import { useClinicaData } from "@/data/store";
import { useAuth } from "@/features/auth/AuthContext";
import { ToothButton } from "@/features/odontogram/ToothButton";
import { ToothEditorCard } from "@/features/odontogram/ToothEditorCard";
import { OdontogramPrint } from "@/features/odontogram/OdontogramPrint";
import {
  CUADRANTE_SUPERIOR_DERECHO,
  CUADRANTE_SUPERIOR_IZQUIERDO,
  CUADRANTE_INFERIOR_DERECHO,
  CUADRANTE_INFERIOR_IZQUIERDO,
  CONDICION_ESTILO,
  CONDICION_LABEL,
} from "@/features/odontogram/odontogramLayout";
import { precargarVista3D } from "@/features/odontogram/precargaVista3D";
import type { CondicionDiente, CondicionPieza } from "@/types";

const DentalArch3D = lazy(() =>
  import("@/features/odontogram/DentalArch3D").then((m) => ({ default: m.DentalArch3D })),
);

const MAX_REINTENTOS_AUTO = 2;

/** Tras una excepción en la vista 3D, reintenta sola hasta agotar los intentos
 * disponibles mientras muestra el spinner; así un fallo transitorio no obliga
 * al usuario a pulsar "Reintentar". */
function ReintentoAutomatico({ onReintentar }: { onReintentar: () => void }) {
  useEffect(() => {
    const id = setTimeout(onReintentar, 700);
    return () => clearTimeout(id);
  }, [onReintentar]);

  return (
    <div className="flex h-80 w-full flex-col items-center justify-center gap-2 rounded-xl bg-brand-100/50">
      <SpinnerGap size={28} className="animate-spin text-brand-700" />
      <p className="text-sm text-ink-muted">Reintentando cargar la vista 3D…</p>
    </div>
  );
}

export function OdontogramTab({ pacienteId }: { pacienteId: string }) {
  const { odontogramaDe, registrarCondicion, obtenerPaciente } = useClinicaData();
  const { sesion } = useAuth();
  const paciente = obtenerPaciente(pacienteId);
  const piezas = odontogramaDe(pacienteId);
  const [seleccionada, setSeleccionada] = useState<number | null>(null);
  // Cambiar esta key remonta el ErrorBoundary + Suspense desde cero, lo que
  // permite reintentar la carga del modelo 3D tras limpiar su caché (ver
  // limpiarCacheVista3D en DentalArch3D.tsx).
  const [intentoVista3d, setIntentoVista3d] = useState(0);
  const autoReintentos = useRef(0);
  const [searchParams, setSearchParams] = useSearchParams();

  const reintentarVista3D = useCallback(async () => {
    autoReintentos.current += 1;
    const mod = await import("@/features/odontogram/DentalArch3D");
    mod.limpiarCacheVista3D();
    setIntentoVista3d((n) => n + 1);
  }, []);

  const reintentarManualVista3D = useCallback(() => {
    autoReintentos.current = 0;
    void reintentarVista3D();
  }, [reintentarVista3D]);

  // Empieza a descargar el chunk 3D y el modelo apenas se abre la ficha, para
  // que el arco esté listo (o casi) cuando el Suspense lo reclame.
  useEffect(() => {
    void precargarVista3D().catch(() => {});
  }, []);

  // Llegar con ?print=1 (desde el botón "Imprimir" de la tabla de pacientes)
  // dispara la impresión automáticamente. El odontograma se carga async desde
  // la API, así que se espera un instante breve a que llegue antes de imprimir.
  useEffect(() => {
    if (searchParams.get("print") !== "1") return;
    const id = setTimeout(() => window.print(), 600);
    searchParams.delete("print");
    setSearchParams(searchParams, { replace: true });
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const condicionDe = (pieza: number) => piezas.find((c) => c.pieza === pieza);

  const guardarPieza = (pieza: number, condicion: CondicionDiente, nota: string) => {
    registrarCondicion(pacienteId, {
      pieza,
      condicion,
      nota: nota || undefined,
      actualizadoEl: new Date().toISOString().slice(0, 10),
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <SectionStatStrip
        metrics={[
          {
            label: "Piezas marcadas",
            value: piezas.length,
            icon: Tooth,
            tone: "teal",
            hint: "de 32 permanentes",
            destacado: true,
          },
          {
            label: "A atender",
            value: piezas.filter((c) => c.condicion === "caries" || c.condicion === "obturado").length,
            icon: Warning,
            tone: "red",
            hint: "caries u obturación",
          },
          {
            label: "Ausentes",
            value: piezas.filter((c) => c.condicion === "ausente").length,
            icon: Prohibit,
            tone: "neutral",
            hint: "no se pueden editar",
          },
          {
            label: "En edición",
            value: seleccionada ?? "—",
            icon: HandTap,
            tone: "brand",
            hint: seleccionada !== null ? `pieza ${seleccionada} (FDI)` : "ninguna seleccionada",
          },
        ]}
      />

      {/* La vista 3D encabeza la sección y el editor queda en una columna fija al
          lado. Antes el editor aparecía debajo del canvas, así que al seleccionar
          una pieza había que bajar la página para editarla. */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Cube size={18} weight="duotone" className="text-ios-teal" />
                  Vista 3D del arco dental
                </CardTitle>
                <CardDescription className="flex items-center gap-1.5">
                  <ArrowsClockwise size={13} /> Arrastra para girar · rueda o +/− para acercar · toca
                  una pieza para seleccionarla
                </CardDescription>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => window.print()} disabled={!paciente}>
                <Printer size={15} /> Imprimir
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ErrorBoundary
              key={intentoVista3d}
              fallback={
                autoReintentos.current < MAX_REINTENTOS_AUTO ? (
                  <ReintentoAutomatico onReintentar={reintentarVista3D} />
                ) : (
                  <TarjetaError
                    mensaje="No se pudo cargar la vista 3D. Puedes seguir trabajando con el odontograma 2D de abajo mientras lo revisamos."
                    onRetry={reintentarManualVista3D}
                  />
                )
              }
            >
              <Suspense
                fallback={
                  <div className="flex h-[420px] w-full flex-col items-center justify-center gap-2 bg-brand-100/40">
                    <SpinnerGap size={28} className="animate-spin text-brand-700" />
                    <p className="text-sm text-ink-muted">Cargando vista 3D…</p>
                  </div>
                }
              >
                <DentalArch3D
                  piezas={piezas}
                  seleccionada={seleccionada}
                  onSelect={setSeleccionada}
                  className="h-[420px] w-full"
                />
              </Suspense>
            </ErrorBoundary>
          </CardContent>
        </Card>

        <div className="xl:sticky xl:top-4 xl:self-start">
          {seleccionada !== null ? (
            <ToothEditorCard
              pieza={seleccionada}
              condicion={condicionDe(seleccionada)}
              onGuardar={guardarPieza}
              onCerrar={() => setSeleccionada(null)}
            />
          ) : (
            <EmptyState
              icon={HandTap}
              iconTone="brand"
              title="Ninguna pieza seleccionada"
              description="Selecciona una pieza en el 3D o en el 2D para ver y editar su condición aquí."
            />
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Odontograma (notación FDI)</CardTitle>
          <CardDescription>
            Selecciona una pieza para registrar su condición clínica actual.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-8 overflow-x-auto py-4">
          <Arcada
            etiqueta="Arcada superior"
            derecha={CUADRANTE_SUPERIOR_DERECHO}
            izquierda={CUADRANTE_SUPERIOR_IZQUIERDO}
            arcada="superior"
            condicionDe={condicionDe}
            seleccionada={seleccionada}
            onSelect={setSeleccionada}
          />
          <div className="h-px w-full max-w-2xl bg-line" />
          <Arcada
            etiqueta="Arcada inferior"
            derecha={CUADRANTE_INFERIOR_DERECHO}
            izquierda={CUADRANTE_INFERIOR_IZQUIERDO}
            arcada="inferior"
            condicionDe={condicionDe}
            seleccionada={seleccionada}
            onSelect={setSeleccionada}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leyenda</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {(Object.entries(CONDICION_LABEL) as [CondicionDiente, string][]).map(([value, label]) => (
            <div key={value} className="flex items-center gap-2 text-xs text-ink-soft">
              <span className={`h-4 w-4 rounded border ${CONDICION_ESTILO[value]}`} />
              {label}
            </div>
          ))}
        </CardContent>
      </Card>

      {piezas.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Piezas con condición registrada</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-line">
            {piezas
              .slice()
              .sort((a, b) => a.pieza - b.pieza)
              .map((c) => (
                <button
                  key={c.pieza}
                  onClick={() => setSeleccionada(c.pieza)}
                  className="flex items-center justify-between py-2.5 text-left text-sm transition-colors duration-150 ease-out hover:text-brand-700"
                >
                  <div>
                    <span className="font-medium text-ink">Pieza {c.pieza}</span>
                    <span className="ml-2 text-ink-muted">{CONDICION_LABEL[c.condicion]}</span>
                    {c.nota ? <span className="ml-2 text-ink-muted">· {c.nota}</span> : null}
                  </div>
                  <span className="text-xs text-ink-muted">{c.actualizadoEl}</span>
                </button>
              ))}
          </CardContent>
        </Card>
      ) : null}

      {paciente ? (
        <OdontogramPrint paciente={paciente} piezas={piezas} clinica={sesion?.clinica} />
      ) : null}
    </div>
  );
}

function Arcada({
  etiqueta,
  derecha,
  izquierda,
  arcada,
  condicionDe,
  seleccionada,
  onSelect,
}: {
  etiqueta: string;
  derecha: number[];
  izquierda: number[];
  arcada: "superior" | "inferior";
  condicionDe: (pieza: number) => CondicionPieza | undefined;
  seleccionada: number | null;
  onSelect: (pieza: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{etiqueta}</p>
      <div className="flex gap-3">
        <div className="flex gap-1.5 border-r border-dashed border-line-strong pr-3">
          {derecha.map((pieza) => (
            <ToothButton
              key={pieza}
              pieza={pieza}
              condicion={condicionDe(pieza)}
              seleccionada={seleccionada === pieza}
              arcada={arcada}
              onSelect={onSelect}
            />
          ))}
        </div>
        <div className="flex gap-1.5 pl-3">
          {izquierda.map((pieza) => (
            <ToothButton
              key={pieza}
              pieza={pieza}
              condicion={condicionDe(pieza)}
              seleccionada={seleccionada === pieza}
              arcada={arcada}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

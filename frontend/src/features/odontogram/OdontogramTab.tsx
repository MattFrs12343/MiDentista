import { lazy, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowsClockwise, HandTap, Printer, SpinnerGap } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorBoundary, TarjetaError } from "@/components/ui/error-boundary";
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
import type { CondicionDiente, CondicionPieza } from "@/types";

const DentalArch3D = lazy(() =>
  import("@/features/odontogram/DentalArch3D").then((m) => ({ default: m.DentalArch3D })),
);

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
  const [searchParams, setSearchParams] = useSearchParams();

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
      <div className="flex justify-end">
        <Button type="button" variant="secondary" onClick={() => window.print()} disabled={!paciente}>
          <Printer size={15} /> Imprimir
        </Button>
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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardHeader>
            <CardTitle>Vista 3D del arco dental</CardTitle>
            <CardDescription className="flex items-center gap-1.5">
              <ArrowsClockwise size={13} /> Arrastra para girar · rueda o +/− para acercar · toca
              una pieza para seleccionarla
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ErrorBoundary
              key={intentoVista3d}
              fallback={
                <TarjetaError
                  mensaje="No se pudo cargar la vista 3D. Puedes seguir trabajando con el odontograma 2D de arriba mientras lo revisamos."
                  onRetry={async () => {
                    const mod = await import("@/features/odontogram/DentalArch3D");
                    mod.limpiarCacheVista3D();
                    setIntentoVista3d((n) => n + 1);
                  }}
                />
              }
            >
              <Suspense
                fallback={
                  <div className="flex h-80 w-full flex-col items-center justify-center gap-2 rounded-xl bg-brand-100/50">
                    <SpinnerGap size={28} className="animate-spin text-brand-700" />
                    <p className="text-sm text-ink-muted">Cargando vista 3D…</p>
                  </div>
                }
              >
                <DentalArch3D
                  piezas={piezas}
                  seleccionada={seleccionada}
                  onSelect={setSeleccionada}
                  className="h-80 w-full"
                />
              </Suspense>
            </ErrorBoundary>
          </CardContent>
        </Card>

        {seleccionada !== null ? (
          <ToothEditorCard
            pieza={seleccionada}
            condicion={condicionDe(seleccionada)}
            onGuardar={guardarPieza}
            onCerrar={() => setSeleccionada(null)}
          />
        ) : (
          <Card className="flex flex-col items-center justify-center gap-2 border-dashed p-8 text-center">
            <HandTap size={22} className="text-ink-muted" />
            <p className="text-sm text-ink-muted">
              Selecciona una pieza en el 2D o en el 3D para ver y editar su condición aquí.
            </p>
          </Card>
        )}
      </div>

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

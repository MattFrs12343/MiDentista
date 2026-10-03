import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useClinicaData } from "@/data/store";
import { AgendaPlantaMini } from "@/features/agenda/AgendaPlantaMini";
import { hoyISO } from "@/features/agenda/agenda";
import {
  citasComoDePlanta,
  minutosDeAhora,
  ocupacionDePlanta,
  OCUPACION_VACIA,
  type OcupacionZona,
} from "./plantaAgenda";
import { encuadre, zonasDemo } from "./plantaLayout";
import { cargarAgendaDePlanta, cargarPlanta, obtenerClinicaIdPropia } from "./plantaService";
import type { CitaDePlanta, NivelOcupacion, Zona } from "./tipos";
import { DetalleZona } from "./DetalleZona";
import { LeyendaZonas } from "./LeyendaZonas";
import { PlantaSvg } from "./PlantaSvg";
import { SelectorModo } from "./SelectorModo";

/**
 * Vista de la planta: el 2D siempre, el 3D si lo pides.
 *
 * El 3D se carga solo cuando se pide. `three` pesa mas que toda la app junta,
 * asi que meterlo en el bundle de la ruta haria que entrar a la planta tarde en
 * un celular. Ademas, con el 3D dentro de `Suspense`, un fallo de descarga
 * deja el 2D montado en su lugar en vez de dejar la pagina en blanco.
 */
const Planta3D = lazy(() => import("./Planta3D").then((m) => ({ default: m.Planta3D })));

export function PlantaVista() {
  const { citas, horarios } = useClinicaData();
  const [modo, setModo] = useState<"2d" | "3d">("2d");
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [citasDePlanta, setCitasDePlanta] = useState<CitaDePlanta[]>([]);
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const [encuadrada, setEncuadrada] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * "Ahora" se fija al montar y se refresca cada minuto, no en cada render.
   *
   * Calcularlo en cada render moveria la marca de la hora con cualquier cambio
   * de estado y obligaria a redibujar el plano entero sin motivo.
   */
  const [ahora, setAhora] = useState(() => minutosDeAhora());
  useEffect(() => {
    const temporizador = setInterval(() => setAhora(minutosDeAhora()), 60_000);
    return () => clearInterval(temporizador);
  }, []);

  /**
   * Carga de la planta.
   *
   * Sin sesion de clinica (superadmin) o con un `SELECT` vacio que puede ser
   * RLS, se cae al plano de demostracion en vez de dejar la pantalla vacia. La
   * demo se anuncia como demo: un plano de ejemplo que parece el real es peor
   * que no tener plano.
   */
  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);

    (async () => {
      const clinicaId = await obtenerClinicaIdPropia();
      const usarDemo = () => {
        if (!vigente) return;
        setZonas(zonasDemo());
        setCitasDePlanta(citasComoDePlanta(citas));
        setDemo(true);
      };

      if (!clinicaId) {
        usarDemo();
        return;
      }

      const [planta, agenda] = await Promise.all([
        cargarPlanta(clinicaId),
        cargarAgendaDePlanta(clinicaId, hoyISO()),
      ]);
      if (!planta.length) {
        usarDemo();
        return;
      }
      if (!vigente) return;
      setZonas(planta);
      setCitasDePlanta(agenda);
      setDemo(false);
    })()
      .catch((e: unknown) => {
        if (!vigente) return;
        setError(e instanceof Error ? e.message : "No se pudo cargar la planta.");
        setZonas(zonasDemo());
        setCitasDePlanta(citasComoDePlanta(citas));
        setDemo(true);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
    // El store se lee una vez al entrar: recargar la planta con cada cita que
    // registre otro modulo no hace falta y hace parpadear el plano.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ocupacion = useMemo(
    () => ocupacionDePlanta(citasDePlanta, horarios, hoyISO(), zonas, ahora),
    [citasDePlanta, horarios, zonas, ahora],
  );

  const zonaSeleccionada = zonas.find((z) => z.id === seleccionada) ?? null;
  const datoSeleccionado =
    (seleccionada ? ocupacion.porZona.get(seleccionada) : null) ?? OCUPACION_VACIA;

  /** Tocar la zona ya seleccionada la deselecciona: volver a tocar es cerrar. */
  const alternarZona = useCallback(
    (zonaId: string) => setSeleccionada((actual) => (actual === zonaId ? null : zonaId)),
    [],
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-10">
      <Encabezado
        zonas={zonas}
        totalCitas={ocupacion.totalCitas}
        zonasEnCurso={ocupacion.zonasEnCurso}
        demo={demo}
        modo={modo}
        onModo={setModo}
        cargando={cargando}
      />

      {error ? (
        <p className="rounded-ios bg-pastel-yellow-bg px-3 py-2 text-[12px] text-pastel-yellow-fg">
          {error} Se muestra el plano de demostración.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="rounded-ios-lg border border-line bg-surface p-3">
            {modo === "2d" ? (
              <PlantaSvg
                zonas={zonas}
                ocupacion={ocupacion.porZona}
                eje={ocupacion.eje}
                ahora={ahora}
                seleccionada={seleccionada}
                encuadrada={encuadrada}
                onSelect={alternarZona}
                onHover={setEncuadrada}
              />
            ) : (
              <Suspense
                fallback={
                  <p className="rounded-ios bg-black/[0.03] px-4 py-10 text-center text-[13px] text-ink-muted">
                    Preparando la vista 3D…
                  </p>
                }
              >
                <Planta3D
                  zonas={zonas}
                  ocupacion={nivelesDe(ocupacion.porZona)}
                  encuadre={encuadre(zonas)}
                  seleccionada={seleccionada}
                  onSelect={alternarZona}
                  onHover={setEncuadrada}
                />
              </Suspense>
            )}
          </div>

          <LeyendaZonas zonas={zonas} />
        </div>

        <aside className="flex min-w-0 flex-col gap-3">
          <DetalleZona zona={zonaSeleccionada} dato={datoSeleccionado} />

          {/* Las citas que el plano no puede ubicar no se esconden: si no se
              dice, el plano parece completo y no lo es. */}
          {ocupacion.sinZona.length > 0 ? (
            <p className="rounded-ios bg-black/[0.03] px-3 py-2 text-[12px] text-ink-muted">
              {ocupacion.sinZona.length === 1
                ? "Hay 1 cita que el plano no muestra porque no tiene zona asignada."
                : `Hay ${ocupacion.sinZona.length} citas que el plano no muestran porque no tienen zona asignada.`}
            </p>
          ) : null}

          <AgendaPlantaMini
            citas={citasDePlanta}
            zonasPorId={new Map(zonas.map((z) => [z.id, z]))}
            ahora={ahora}
            onElegirZona={setSeleccionada}
          />
        </aside>
      </div>
    </div>
  );
}

function Encabezado({
  zonas,
  totalCitas,
  zonasEnCurso,
  demo,
  modo,
  onModo,
  cargando,
}: {
  zonas: Zona[];
  totalCitas: number;
  zonasEnCurso: number;
  demo: boolean;
  modo: "2d" | "3d";
  onModo: (modo: "2d" | "3d") => void;
  cargando: boolean;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 pt-4">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">Planta de la clínica</h1>
        <p className="mt-0.5 text-[13px] text-ink-muted">
          {cargando
            ? "Cargando el plano…"
            : demo
              ? "Plano de demostración: así se ve cuando la clínica todavía no dibuja su planta."
              : `${zonas.length} zonas · ${totalCitas} ${totalCitas === 1 ? "cita" : "citas"} hoy · ${zonasEnCurso} en curso`}
        </p>
      </div>
      <SelectorModo modo={modo} onChange={onModo} />
    </header>
  );
}

/** El 3D solo necesita el nivel de ocupacion, no los minutos y las citas. */
function nivelesDe(porZona: Map<string, OcupacionZona>): Map<string, NivelOcupacion> {
  return new Map([...porZona].map(([id, dato]) => [id, dato.nivel]));
}

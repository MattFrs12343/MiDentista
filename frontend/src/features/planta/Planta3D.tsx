import { useEffect, useMemo, useState } from "react";
import { Suspense } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { COLOR_TIPO } from "@/features/planta/plantaLayout";
import type { NivelOcupacion, Zona } from "@/features/planta/tipos";
import { distanciaDeEscena, Vista3DBase } from "./three/Vista3DBase";
import {
  geometriaDeZona,
  metricasDeEscena,
  prepararZonas,
  radioDeEscena,
  type ZonaEnEscena,
} from "./three/geometria";
import { ZonasInstanciadas } from "./three/ZonasInstanciadas";

/**
 * Planta en 3D: una mejora opcional del 2D, nunca su sustituto.
 *
 * Las zonas se dibujan con `instancedMesh` y geometria procedural (ver
 * `three/geometria.ts` y `three/ZonasInstanciadas.tsx`), sin `.glb`: una planta
 * es un conjunto de cajas, y con una instancia por sala el costo por frame no
 * cambia al crecer de 4 a 20 consultorios.
 *
 * El 3D se dibuja siempre en modo "activo" (ver `Vista3DBase`): si el equipo no
 * tiene WebGL, `soportaWebGL()` lo detecta antes de montar y la pagina se
 * queda en el 2D, que es la vista que no puede fallar.
 */

export function Planta3D({
  zonas,
  ocupacion,
  encuadre,
  seleccionada,
  onSelect,
  onHover,
  onListo,
}: {
  zonas: Zona[];
  /** Nivel de ocupacion por zona, para el tono de cada caja. */
  ocupacion: Map<string, NivelOcupacion>;
  /** Encuadre en metros: define el origen y la escala de la escena. */
  encuadre: { x: number; y: number; ancho: number; alto: number };
  seleccionada: string | null;
  onSelect: (zonaId: string) => void;
  onHover: (zonaId: string | null) => void;
  /** Se avisa en cuanto el canvas esta montado, para quitar el mensaje de carga. */
  onListo?: () => void;
}) {
  const [soportado] = useState(soportaWebGL);

  const centro = useMemo(
    () => ({ x: encuadre.x + encuadre.ancho / 2, y: encuadre.y + encuadre.alto / 2 }),
    [encuadre],
  );

  const enEscena = useMemo(
    () =>
      prepararZonas(
        zonas.map((z) => ({
          id: z.id,
          tipo: z.tipo,
          cx: z.x + z.ancho / 2,
          cy: z.y + z.alto / 2,
          ancho: z.ancho,
          alto: z.alto,
        })),
        centro,
      ),
    [zonas, centro],
  );

  const metricas = useMemo(() => metricasDeEscena(enEscena), [enEscena]);
  const distancia = useMemo(() => distanciaDeEscena(radioDeEscena(enEscena)), [enEscena]);

  if (!soportado || !enEscena.length) return null;

  return (
    <div className="flex flex-col gap-2">
      <Vista3DBase
        distanciaBase={distancia}
        className="h-[min(62vh,520px)] w-full overflow-hidden rounded-ios-lg"
      >
        <Suspense fallback={null}>
          <ZonasInstanciadas
            zonas={enEscena}
            nivelDe={ocupacion}
            onSelect={onSelect}
            onHover={onHover}
          />
          <MarcaDeZona zona={enEscena.find((z) => z.id === seleccionada) ?? null} />
          <AvisoListo onListo={onListo} />
        </Suspense>
      </Vista3DBase>

      {/* Las metricas se muestran en pantalla a proposito: el presupuesto de
          12K triangulos y 25 draw calls es una promesa de rendimiento, y una
          promesa sin verificacion no sirve. */}
      <p className="text-[11px] tabular-nums text-ink-muted">
        Arrastra para girar · rueda para acercar ·{" "}
        {metricas.dentroDePresupuesto
          ? `${metricas.triangulos} triángulos · ${metricas.drawCalls} draw calls · ${metricas.instancias} zonas`
          : "escena fuera del presupuesto de render"}
      </p>
    </div>
  );
}

/**
 * Detecta WebGL una sola vez, al montar.
 *
 * `getContext` puede lanzar si el navegador tiene el driver bloqueado, y un
 * equipo sin aceleracion es justo el caso donde el 3D tiene que desaparecer en
 * silencio: la vista 2D sigue dando la misma informacion.
 */
export function soportaWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Avisa al padre una vez que el canvas esta listo. */
function AvisoListo({ onListo }: { onListo?: () => void }) {
  const invalidate = useThree((estado) => estado.invalidate);
  useEffect(() => {
    invalidate();
    onListo?.();
    // Solo al montar: despues el canvas ya esta y avisar otra vez no aporta.
  }, [invalidate, onListo]);
  return null;
}

/**
 * Marco de la zona seleccionada.
 *
 * Son `EdgesGeometry` y no un `mesh`: el borde de una caja no es una cara, y con
 * una caja transparente se veria la pared de la zona de al lado a traves de la
 * seleccion. Aqui son cuatro aristas y ya.
 */
function MarcaDeZona({ zona }: { zona: ZonaEnEscena | null }) {
  const geometria = useMemo(() => {
    if (!zona) return null;
    const { posicion, escala } = geometriaDeZona(zona);
    const caja = new THREE.BoxGeometry(escala[0], escala[1], escala[2]);
    caja.translate(posicion[0], posicion[1], posicion[2]);
    return new THREE.EdgesGeometry(caja);
  }, [zona]);

  useEffect(() => {
    // La geometria vive fuera del ciclo de React: si no se libera, WebGL
    // mantiene el buffer aunque la zona seleccionada cambie cien veces.
    return () => geometria?.dispose();
  }, [geometria]);

  if (!geometria) return null;
  return (
    <lineSegments geometry={geometria}>
      <lineBasicMaterial color={COLOR_TIPO.consultorio} />
    </lineSegments>
  );
}

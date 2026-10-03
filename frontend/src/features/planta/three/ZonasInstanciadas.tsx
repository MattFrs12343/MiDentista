import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { COLOR_TIPO } from "@/features/planta/plantaLayout";
import { ESPESOR_SUELO, geometriaDeZona, instanciasPorTipo, type ZonaEnEscena } from "./geometria";
import type { NivelOcupacion } from "../tipos";

/**
 * Las zonas dibujadas con `instancedMesh`: una instancia por consultorio.
 *
 * Por que instanciadas y no un `<mesh>` por zona: 15 cajas sueltas son 15 draw
 * calls y 15 objetos que el navegador recorre en cada frame. Con instanciado,
 * todas las salas del mismo tipo caben en **una** llamada de dibujo y el color
 * de cada una se cambia en el atributo `instanceColor`. Como la vista corre con
 * `frameloop="demand"`, el costo se paga solo al mover la camara.
 *
 * El layout se escribe una vez por cambio de zonas en la matriz de cada
 * instancia; despues, mover la camara no toca nada de esto.
 */

export function ZonasInstanciadas({
  zonas,
  nivelDe,
  onSelect,
  onHover,
}: {
  zonas: ReadonlyArray<ZonaEnEscena>;
  /** Nivel de ocupacion por id de zona, para el tono de cada caja. */
  nivelDe: Map<string, NivelOcupacion>;
  onSelect: (zonaId: string) => void;
  onHover: (zonaId: string | null) => void;
}) {
  const grupos = useMemo(() => instanciasPorTipo(zonas), [zonas]);
  const medidas = useMemo(() => medidasDeSuelo(zonas), [zonas]);

  return (
    <group>
      {[...grupos.entries()].map(([tipo, delTipo]) => (
        <GrupoTipo
          key={tipo}
          tipo={tipo}
          zonas={delTipo}
          nivelDe={nivelDe}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
      <mesh position={[0, -ESPESOR_SUELO / 2, 0]} receiveShadow>
        <boxGeometry args={[medidas.ancho, ESPESOR_SUELO, medidas.profundidad]} />
        <meshStandardMaterial color="#f5f3ef" roughness={0.95} metalness={0} />
      </mesh>
      <Muros medidas={medidas} />
    </group>
  );
}

function GrupoTipo({
  tipo,
  zonas,
  nivelDe,
  onSelect,
  onHover,
}: {
  tipo: string;
  zonas: ReadonlyArray<ZonaEnEscena>;
  nivelDe: Map<string, NivelOcupacion>;
  onSelect: (zonaId: string) => void;
  onHover: (zonaId: string | null) => void;
}) {
  const malla = useRef<THREE.InstancedMesh>(null);
  const matriz = useMemo(() => new THREE.Matrix4(), []);
  const escala = useMemo(() => new THREE.Vector3(), []);
  const posicion = useMemo(() => new THREE.Vector3(), []);
  const color = useMemo(() => new THREE.Color(), []);

  /**
   * Matriz y color por instancia.
   *
   * Se escribe una sola vez por cambio de zonas o de ocupacion, y despues no se
   * vuelve a tocar: con `frameloop="demand"` los cambios de React llegan antes
   * de que three vuelva a dibujar, asi que el buffer siempre esta al dia.
   */
  useEffect(() => {
    const objetivo = malla.current;
    if (!objetivo) return;

    zonas.forEach((zona, indice) => {
      const geo = geometriaDeZona(zona);
      posicion.fromArray(geo.posicion);
      escala.fromArray(geo.escala);
      matriz.compose(posicion, new THREE.Quaternion(), escala);
      objetivo.setMatrixAt(indice, matriz);

      // Una zona con citas se ve mas intensa que una libre: el mismo color de
      // tipo con distinto brillo, sin inventar colores nuevos.
      color.set(COLOR_TIPO[tipo] ?? "#aea89a");
      const cargada = nivelDe.get(zona.id) === "ocupada" || nivelDe.get(zona.id) === "llena";
      color.multiplyScalar(cargada ? 1 : 0.78);
      objetivo.setColorAt(indice, color);
    });

    objetivo.instanceMatrix.needsUpdate = true;
    if (objetivo.instanceColor) objetivo.instanceColor.needsUpdate = true;
    // Sin esto el rayo de picking necesita recorrer todas las instancias para
    // acertar, y el hover se siente lento en cuanto hay muchas salas.
    objetivo.computeBoundingSphere();
  }, [zonas, tipo, nivelDe, matriz, posicion, escala, color]);

  return (
    <instancedMesh
      ref={malla}
      args={[undefined, undefined, zonas.length]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (e.instanceId === undefined) return;
        onSelect(zonas[e.instanceId].id);
      }}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        if (e.instanceId === undefined) return;
        onHover(zonas[e.instanceId].id);
      }}
      onPointerOut={() => onHover(null)}
    >
      {/* caja unidad: el tamano real va en la matriz de cada instancia */}
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.72} metalness={0.04} />
    </instancedMesh>
  );
}

/** Medidas del suelo, en el espacio de three (la Y del plano ya va invertida). */
function medidasDeSuelo(zonas: ReadonlyArray<ZonaEnEscena>): {
  ancho: number;
  profundidad: number;
} {
  if (!zonas.length) return { ancho: 8, profundidad: 6 };
  let izquierda = Infinity;
  let derecha = -Infinity;
  let arriba = Infinity;
  let abajo = -Infinity;
  for (const z of zonas) {
    izquierda = Math.min(izquierda, z.cx - z.ancho / 2);
    derecha = Math.max(derecha, z.cx + z.ancho / 2);
    arriba = Math.min(arriba, z.cy - z.alto / 2);
    abajo = Math.max(abajo, z.cy + z.alto / 2);
  }
  return { ancho: Math.max(2, derecha - izquierda), profundidad: Math.max(2, abajo - arriba) };
}

/**
 * Muros: el contorno del rectangulo de la planta.
 *
 * Es lo que hace que el 3D se lea como un edificio y no como cajas sueltas. Son
 * cuatro barras finas en un solo `group`, no un muro por borde.
 */
function Muros({ medidas }: { medidas: { ancho: number; profundidad: number } }) {
  const invalidar = useThree((estado) => estado.invalidate);
  useEffect(() => {
    invalidar();
  }, [medidas, invalidar]);

  const { ancho, profundidad } = medidas;
  const grosor = 0.12;
  const altura = 0.9;
  const largoX = ancho + grosor;
  const largoZ = profundidad + grosor;

  return (
    <group>
      <mesh position={[0, altura / 2, profundidad / 2 + grosor / 2]}>
        <boxGeometry args={[largoX, altura, grosor]} />
        <meshStandardMaterial color="#aea89a" roughness={0.85} />
      </mesh>
      <mesh position={[0, altura / 2, -profundidad / 2 - grosor / 2]}>
        <boxGeometry args={[largoX, altura, grosor]} />
        <meshStandardMaterial color="#aea89a" roughness={0.85} />
      </mesh>
      <mesh position={[ancho / 2 + grosor / 2, altura / 2, 0]}>
        <boxGeometry args={[grosor, altura, largoZ]} />
        <meshStandardMaterial color="#aea89a" roughness={0.85} />
      </mesh>
      <mesh position={[-ancho / 2 - grosor / 2, altura / 2, 0]}>
        <boxGeometry args={[grosor, altura, largoZ]} />
        <meshStandardMaterial color="#aea89a" roughness={0.85} />
      </mesh>
    </group>
  );
}

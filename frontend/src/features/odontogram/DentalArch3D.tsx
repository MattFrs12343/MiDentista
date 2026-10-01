import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { Canvas, useFrame, useLoader, useThree, type ThreeEvent } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import * as THREE from "three";
import { Plus, Minus } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { CONDICION_COLOR_3D } from "@/features/odontogram/odontogramLayout";
import { nombrePieza } from "@/features/odontogram/toothNames";
import type { CondicionPieza } from "@/types";

const MODEL_URL = "/models/dental-arch.glb";
const GUM_COLOR = "#e3a79c";
const SELECCION_COLOR = new THREE.Color("#3d84b8");

interface Interaction {
  dragging: boolean;
  pendingDeltaX: number;
  pendingDeltaY: number;
  moved: boolean;
  azimuth: number;
  polar: number;
  zoom: number;
}

const POLAR_MIN = 0.25 * Math.PI;
const POLAR_MAX = 0.85 * Math.PI;
const ZOOM_MIN = 0.55;
const ZOOM_MAX = 2.2;

function useDentalAssets() {
  const gltf = useLoader(GLTFLoader, MODEL_URL, (loader) => {
    loader.setMeshoptDecoder(MeshoptDecoder);
  });

  return useMemo(() => {
    const dientes = new Map<number, THREE.Object3D>();
    const encias: THREE.Object3D[] = [];

    gltf.scene.traverse((obj) => {
      const dienteMatch = /^tooth-(\d{2})$/.exec(obj.name);
      const esEncia = /^gingiva-/.test(obj.name);
      const esHueso = /mandible|maxilla|sinus/.test(obj.name);

      if (dienteMatch) {
        const fdi = Number(dienteMatch[1]);
        dientes.set(fdi, obj);
        obj.traverse((hijo) => {
          if (hijo instanceof THREE.Mesh) {
            hijo.material = new THREE.MeshStandardMaterial({
              color: "#f4f1ea",
              roughness: 0.35,
              metalness: 0.05,
            });
          }
        });
      } else if (esEncia) {
        encias.push(obj);
        obj.traverse((hijo) => {
          if (hijo instanceof THREE.Mesh) {
            hijo.material = new THREE.MeshStandardMaterial({ color: GUM_COLOR, roughness: 0.65 });
          }
        });
      } else if (esHueso) {
        obj.visible = false;
      }
    });

    const caja = new THREE.Box3().setFromObject(gltf.scene);
    const centro = caja.getCenter(new THREE.Vector3());
    const radio = caja.getSize(new THREE.Vector3()).length() / 2;

    return { escena: gltf.scene, dientes, encias, centro, radio };
  }, [gltf]);
}

function Diente({
  fdi,
  objeto,
  condicion,
  seleccionado,
  onSelect,
  onHover,
  interaction,
}: {
  fdi: number;
  objeto: THREE.Object3D;
  condicion: CondicionPieza | undefined;
  seleccionado: boolean;
  onSelect: (pieza: number) => void;
  onHover: (pieza: number | null) => void;
  interaction: MutableRefObject<Interaction>;
}) {
  const escalaActual = useRef(1);
  const escalaOriginal = useRef<THREE.Vector3 | null>(null);
  if (escalaOriginal.current === null) {
    escalaOriginal.current = objeto.scale.clone();
  }
  const radioAnillo = useMemo(() => {
    const caja = new THREE.Box3().setFromObject(objeto);
    const tamano = caja.getSize(new THREE.Vector3());
    return Math.max(tamano.x, tamano.z) / 2 + 0.03;
  }, [objeto]);

  useEffect(() => {
    objeto.visible = condicion?.condicion !== "ausente";
  }, [objeto, condicion?.condicion]);

  // El color del material depende ÚNICAMENTE de la condición clínica: la
  // selección nunca lo toca, así el cambio de color siempre es visible.
  // Se busca el material directamente en el objeto (no por prop) para
  // garantizar que siempre se pinte el material que realmente se renderiza.
  useEffect(() => {
    const colorHex = CONDICION_COLOR_3D[condicion?.condicion ?? "sano"];
    const esExtraccion = condicion?.condicion === "extraccion_indicada";
    objeto.traverse((hijo) => {
      if (hijo instanceof THREE.Mesh && hijo.material instanceof THREE.MeshStandardMaterial) {
        hijo.material.color.set(colorHex);
        hijo.material.transparent = esExtraccion;
        hijo.material.opacity = esExtraccion ? 0.4 : 1;
      }
    });
  }, [objeto, condicion?.condicion]);

  useFrame((_, delta) => {
    const base = escalaOriginal.current;
    if (!base) return;
    const objetivoEscala = seleccionado ? 1.18 : 1;
    escalaActual.current += (objetivoEscala - escalaActual.current) * Math.min(1, delta * 10);
    objeto.scale.copy(base).multiplyScalar(escalaActual.current);
  });

  return (
    <>
      <primitive
        object={objeto}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (interaction.current.moved) return;
          onSelect(fdi);
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onHover(fdi);
        }}
        onPointerOut={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onHover(null);
        }}
      />
      {seleccionado ? (
        <mesh position={objeto.position} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radioAnillo * 0.82, radioAnillo, 28]} />
          <meshBasicMaterial color={SELECCION_COLOR} side={THREE.DoubleSide} transparent opacity={0.85} />
        </mesh>
      ) : null}
    </>
  );
}

function Escena({
  piezas,
  seleccionada,
  onSelect,
  onHover,
  interaction,
}: {
  piezas: CondicionPieza[];
  seleccionada: number | null;
  onSelect: (pieza: number) => void;
  onHover: (pieza: number | null) => void;
  interaction: MutableRefObject<Interaction>;
}) {
  const { dientes, encias, centro, radio } = useDentalAssets();
  const condicionDe = (pieza: number) => piezas.find((c) => c.pieza === pieza);
  const { camera } = useThree();
  const distanciaBase = radio / Math.sin((40 * Math.PI) / 360) / 1.3;

  useFrame(() => {
    const state = interaction.current;
    // El objeto debe girar en la misma dirección del arrastre (como si lo tomaras con la mano),
    // así que la cámara orbita en sentido contrario.
    state.azimuth -= state.pendingDeltaX * 0.008;
    state.polar = Math.min(
      POLAR_MAX,
      Math.max(POLAR_MIN, state.polar - state.pendingDeltaY * 0.008),
    );
    state.pendingDeltaX = 0;
    state.pendingDeltaY = 0;

    const r = distanciaBase * state.zoom;
    camera.position.set(
      r * Math.sin(state.polar) * Math.sin(state.azimuth),
      r * Math.cos(state.polar),
      r * Math.sin(state.polar) * Math.cos(state.azimuth),
    );
    camera.lookAt(0, 0, 0);
  });

  return (
    <group>
      <group position={[-centro.x, -centro.y, -centro.z]}>
        {encias.map((obj, i) => (
          <primitive key={i} object={obj} />
        ))}
        {Array.from(dientes.entries()).map(([fdi, objeto]) => (
          <Diente
            key={fdi}
            fdi={fdi}
            objeto={objeto}
            condicion={condicionDe(fdi)}
            seleccionado={seleccionada === fdi}
            onSelect={onSelect}
            onHover={onHover}
            interaction={interaction}
          />
        ))}
      </group>
    </group>
  );
}

export function DentalArch3D({
  piezas,
  seleccionada,
  onSelect,
  className,
}: {
  piezas: CondicionPieza[];
  seleccionada: number | null;
  onSelect: (pieza: number) => void;
  className?: string;
}) {
  const interaction = useRef<Interaction>({
    dragging: false,
    pendingDeltaX: 0,
    pendingDeltaY: 0,
    moved: false,
    azimuth: 0,
    polar: 0.55 * Math.PI,
    zoom: 0.75,
  });
  const lastPos = useRef({ x: 0, y: 0 });
  const [hover, setHover] = useState<{ pieza: number; x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    interaction.current.dragging = true;
    interaction.current.moved = false;
    lastPos.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (hover && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setHover((h) => (h ? { ...h, x: e.clientX - rect.left, y: e.clientY - rect.top } : h));
    }
    if (!interaction.current.dragging) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) interaction.current.moved = true;
    interaction.current.pendingDeltaX += dx;
    interaction.current.pendingDeltaY += dy;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const endDrag = () => {
    interaction.current.dragging = false;
    setTimeout(() => {
      interaction.current.moved = false;
    }, 0);
  };

  const aplicarZoom = (factor: number) => {
    interaction.current.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, interaction.current.zoom * factor));
  };

  const handleWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    aplicarZoom(Math.exp(e.deltaY * 0.001));
  };

  const handleHover = (pieza: number | null) => {
    if (pieza === null) {
      setHover(null);
      return;
    }
    setHover((h) => (h?.pieza === pieza ? h : { pieza, x: h?.x ?? 0, y: h?.y ?? 0 }));
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative cursor-grab touch-none active:cursor-grabbing", className)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onWheel={handleWheel}
      onPointerLeave={endDrag}
    >
      <Canvas camera={{ position: [0, 0, 2.6], fov: 40 }} dpr={[1, 1.75]}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[2, 3, 4]} intensity={1.1} />
        <pointLight position={[-2, -1, 2]} intensity={0.35} color="#bcdff5" />
        <Escena
          piezas={piezas}
          seleccionada={seleccionada}
          onSelect={onSelect}
          onHover={handleHover}
          interaction={interaction}
        />
      </Canvas>

      {hover ? (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-line bg-ink px-2.5 py-1.5 text-xs font-medium text-white shadow-diffuse"
          style={{ left: hover.x, top: hover.y - 10 }}
        >
          {hover.pieza} — {nombrePieza(hover.pieza)}
        </div>
      ) : null}

      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute bottom-3 right-3 z-10 flex flex-col overflow-hidden rounded-lg border border-line-strong bg-surface shadow-diffuse"
      >
        <button
          type="button"
          aria-label="Acercar"
          onClick={() => aplicarZoom(0.8)}
          className="flex h-8 w-8 items-center justify-center text-ink-soft transition-colors duration-150 ease-out hover:bg-surface-sunken hover:text-ink"
        >
          <Plus size={15} weight="bold" />
        </button>
        <div className="h-px bg-line" />
        <button
          type="button"
          aria-label="Alejar"
          onClick={() => aplicarZoom(1.25)}
          className="flex h-8 w-8 items-center justify-center text-ink-soft transition-colors duration-150 ease-out hover:bg-surface-sunken hover:text-ink"
        >
          <Minus size={15} weight="bold" />
        </button>
      </div>
    </div>
  );
}

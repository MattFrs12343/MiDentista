import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { cn } from "@/lib/cn";
import { consumirPendientes, posicionDesdeOrbita, useOrbitaManual } from "./useOrbitaManual";

/**
 * Base de toda vista 3D: canvas, camara con orbita manual y luces.
 *
 * Dos decisiones que importan:
 *
 *  - **`frameloop="demand"`**: la planta no se anima. Con el bucle continuo de
 *    three el canvas pediria frames aunque nada cambiase, y en un celular eso es
 *    bateria gastada en un dibujo quieto. En `demand` solo se dibuja cuando algo
 *    pasa, y eso obliga a pedir el frame a mano en cada gesto (de ahi
 *    `alCambiar`). Los cambios de color que llegan por React ya invalidan solos.
 *  - **Sin `OrbitControls` ni `drei`**: la orbita es de `useOrbitaManual`.
 */

export interface Vista3DBaseProps {
  children: ReactNode;
  /** Distancia de la camara al origen, antes del zoom del usuario. */
  distanciaBase: number;
  className?: string;
}

export function Vista3DBase({ children, distanciaBase, className }: Vista3DBaseProps) {
  const pedirFrame = useRef<(() => void) | null>(null);
  const registrarPeticion = useCallback((fn: (() => void) | null) => {
    pedirFrame.current = fn;
  }, []);
  const orbita = useOrbitaManual({ alCambiar: () => pedirFrame.current?.() });

  return (
    <div
      className={cn("relative cursor-grab touch-none active:cursor-grabbing", className)}
      {...orbita.handlers}
    >
      <Canvas
        frameloop="demand"
        dpr={[1, 1.75]}
        camera={{ position: [0, distanciaBase * 0.6, distanciaBase * 0.8], fov: 42 }}
        gl={{ antialias: true }}
      >
        {/* El puente vive dentro del canvas porque `invalidate` sale de
            `useThree`, y la orbita vive fuera porque los gestos del canvas son
            eventos del DOM. Es el unico puente entre los dos mundos. */}
        <PuenteFrame alPoner={registrarPeticion} />
        <CamaraFollowing estado={orbita.estado.current} distanciaBase={distanciaBase} />
        <ambientLight intensity={0.95} />
        <directionalLight position={[6, 12, 8]} intensity={1.15} />
        <pointLight position={[-8, 5, -6]} intensity={0.4} color="#bcdff5" />
        {children}
      </Canvas>
    </div>
  );
}

function PuenteFrame({ alPoner }: { alPoner: (fn: (() => void) | null) => void }) {
  const invalidate = useThree((estado) => estado.invalidate);
  useEffect(() => {
    alPoner(() => invalidate());
    // Al desmontar se deja una funcion vacia: si un gesto llega tarde, no se
    // llama `invalidate` sobre un canvas que ya no existe.
    return () => alPoner(null);
  }, [invalidate, alPoner]);
  return null;
}

/** Aplica la orbita a la camara en cada frame que se dibuje. */
function CamaraFollowing({
  estado,
  distanciaBase,
}: {
  estado: Parameters<typeof consumirPendientes>[0];
  distanciaBase: number;
}) {
  const camara = useThree((estado) => estado.camera);

  useFrame(() => {
    consumirPendientes(estado);
    const [x, y, z] = posicionDesdeOrbita(estado, distanciaBase);
    camara.position.set(x, y, z);
    camara.lookAt(0, 0, 0);
  });

  return null;
}

/**
 * Distancia de camara para una escena de radio dado, con el mismo criterio que
 * usa el odontograma: entra el radio completo y sobra un poco, para que el plano
 * no toque los bordes del visor.
 */
export function distanciaDeEscena(radio: number, fovGrados = 42): number {
  const fov = (fovGrados * Math.PI) / 180;
  return (radio / Math.sin(fov / 2)) * 0.85;
}
import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type WheelEvent as ReactWheelEvent,
} from "react";

/**
 * Orbita manual, sin `OrbitControls`.
 *
 * El proyecto no usa `@react-three/fiber/drei` (ver AGENTS.md seccion 3), asi
 * que la camara se mueve a mano. Este hook saca del `DentalArch3D` la parte que
 * es igual en cualquier vista: arrastrar gira, la rueda hace zoom y un arrastre
 * no dispara un click.
 *
 * El estado vive en un `ref` y no en `useState` a proposito: se actualiza
 * decenas de veces por segundo mientras se arrastra y un `setState` por evento
 * provocaria un render por frame. Lo que React necesita saber (si se arrastra,
 * que zona esta enfocada) si es estado normal.
 */

export interface Orbita {
  /** Lectura por frame, sin provocar renders. */
  estado: RefObject<EstadoOrbita>;
  arrastrando: boolean;
  /** Se pone en `true` tras un arrastre de mas de este desplazamiento en px. */
  movido: boolean;
  handlers: {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
    onPointerLeave: () => void;
    onWheel: (e: ReactWheelEvent<HTMLElement>) => void;
  };
  aplicarZoom: (factor: number) => void;
  reiniciar: () => void;
}

export interface EstadoOrbita {
  azimuth: number;
  polar: number;
  zoom: number;
  /** Desplazamiento acumulado entre frames. */
  pendienteX: number;
  pendienteY: number;
}

export const POLAR_MIN = 0.18 * Math.PI;
export const POLAR_MAX = 0.85 * Math.PI;
export const ZOOM_MIN = 0.55;
export const ZOOM_MAX = 2.6;

/** Cuantos pixeles se tolera antes de considerar que el gesto fue un arrastre. */
const UMBRAL_CLICK = 4;

const SENSIBILIDAD = 0.008;

export function useOrbitaManual({
  polarInicial = 0.62 * Math.PI,
  zoomInicial = 0.85,
  alCambiar,
}: {
  polarInicial?: number;
  zoomInicial?: number;
  /**
   * Se llama en cada gesto. La vista 3D corre con `frameloop="demand"`, asi que
   * sin esto el canvas no se repintaria hasta que pasara algo externo.
   */
  alCambiar?: () => void;
} = {}): Orbita {
  const estado = useRef<EstadoOrbita>({
    azimuth: 0,
    polar: polarInicial,
    zoom: zoomInicial,
    pendienteX: 0,
    pendienteY: 0,
  });
  const ultimo = useRef({ x: 0, y: 0 });
  const arrastre = useRef(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [movido, setMovido] = useState(false);

  const aplicarZoom = useCallback(
    (factor: number) => {
      estado.current.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, estado.current.zoom * factor));
      alCambiar?.();
    },
    [alCambiar],
  );

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    arrastre.current = true;
    ultimo.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    setArrastrando(true);
  }, []);

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (!arrastre.current) return;
      const dx = e.clientX - ultimo.current.x;
      const dy = e.clientY - ultimo.current.y;
      if (!movido && (Math.abs(dx) > UMBRAL_CLICK || Math.abs(dy) > UMBRAL_CLICK)) {
        setMovido(true);
      }
      // El objeto gira con el dedo, asi que la camara orbita al reves.
      estado.current.pendienteX += dx;
      estado.current.pendienteY += dy;
      ultimo.current = { x: e.clientX, y: e.clientY };
      alCambiar?.();
    },
    [alCambiar, movido],
  );

  const terminar = useCallback(() => {
    if (!arrastre.current) return;
    arrastre.current = false;
    setArrastrando(false);
    // El `moved` se limpia despues del click: si se limpiara ya, el click que
    // cierra un arrastre pasaria como seleccion.
    setTimeout(() => setMovido(false), 0);
  }, []);

  const onWheel = useCallback(
    (e: ReactWheelEvent<HTMLElement>) => {
      e.preventDefault();
      const factor = Math.exp(e.deltaY * 0.001);
      estado.current.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, estado.current.zoom * factor));
      alCambiar?.();
    },
    [alCambiar],
  );

  const reiniciar = useCallback(() => {
    estado.current.azimuth = 0;
    estado.current.polar = polarInicial;
    estado.current.zoom = zoomInicial;
    estado.current.pendienteX = 0;
    estado.current.pendienteY = 0;
    alCambiar?.();
  }, [alCambiar, polarInicial, zoomInicial]);

  return {
    estado,
    arrastrando,
    movido,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: terminar,
      onPointerCancel: terminar,
      onPointerLeave: terminar,
      onWheel,
    },
    aplicarZoom,
    reiniciar,
  };
}

/**
 * Aplica el desplazamiento acumulado desde el ultimo frame y lo deja a cero.
 *
 * Se acumula el arrastre en pixeles y se convierte una vez por frame en vez de
 * mover la camara en cada evento: si la pantalla manda 120 eventos por segundo
 * y el frame va a 60, la camara daría saltos y se senteria pegajosa.
 */
export function consumirPendientes(estado: EstadoOrbita): void {
  estado.azimuth -= estado.pendienteX * SENSIBILIDAD;
  estado.polar = Math.min(POLAR_MAX, Math.max(POLAR_MIN, estado.polar - estado.pendienteY * SENSIBILIDAD));
  estado.pendienteX = 0;
  estado.pendienteY = 0;
}

/**
 * Camara en coordenadas esfericas alrededor del origen, a partir de la orbita.
 *
 * Se separa del hook porque corre DENTRO del canvas (necesita `useThree`) y los
 * hooks no se pueden llamar condicionalmente: quedaria mal si el usuario nunca
 * monta la vista 3D.
 */
export function posicionDesdeOrbita(estado: EstadoOrbita, distanciaBase: number): [number, number, number] {
  const r = distanciaBase * estado.zoom;
  const polar = Math.min(POLAR_MAX, Math.max(POLAR_MIN, estado.polar));
  return [
    r * Math.sin(polar) * Math.sin(estado.azimuth),
    r * Math.cos(polar),
    r * Math.sin(polar) * Math.cos(estado.azimuth),
  ];
}
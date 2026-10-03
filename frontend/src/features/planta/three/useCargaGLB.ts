import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { useMemo } from "react";
import * as THREE from "three";

/**
 * Carga de `.glb` para las vistas 3D.
 *
 * La planta NO usa esto (su geometria es procedural, ver `geometria.ts`): el
 * odontograma si, con `dental-arch.glb`. Vive aqui para que la logica de
 * reintento no viva dentro de un componente.
 */

/**
 * `useLoader` cachea la promesa del modelo fuera de React (en un Map global de
 * `suspend-react`). Si la primera carga falla por algo transitorio (red lenta,
 * descarga cortada), esa promesa rechazada queda cacheada para siempre y
 * cualquier intento posterior de montar la vista 3D vuelve a fallar al
 * instante, sin reintentar la descarga. Hay que limpiar esta entrada
 * explicitamente antes de reintentar.
 */
export function limpiarCacheVista3D(url: string) {
  useLoader.clear(GLTFLoader, url);
}

export interface AssetsCargados {
  escena: THREE.Object3D;
  /** Radio de la esfera que envuelve el modelo, para el encuadre de la camara. */
  radio: number;
  centro: THREE.Vector3;
}

export function useCargaGLB(url: string): AssetsCargados {
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.setMeshoptDecoder(MeshoptDecoder);
  });

  return useMemo(() => {
    const caja = new THREE.Box3().setFromObject(gltf.scene);
    const centro = caja.getCenter(new THREE.Vector3());
    const radio = caja.getSize(new THREE.Vector3()).length() / 2;
    return { escena: gltf.scene, centro, radio };
  }, [gltf]);
}
import { MODEL_URL } from "@/features/odontogram/modeloArco";

let precarga: Promise<void> | null = null;

/**
 * Calienta el chunk 3D (three.js + `DentalArch3D`) y el modelo del arco antes
 * de que el usuario abra la pestaña de odontograma, para que el `Suspense` no
 * tenga que esperar la descarga completa. Las importaciones son dinámicas a
 * propósito: three.js no debe entrar en el bundle inicial.
 */
export function precargarVista3D(): Promise<void> {
  if (precarga) return precarga;
  precarga = (async () => {
    const [{ useLoader }, { GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
      import("@react-three/fiber"),
      import("three/examples/jsm/loaders/GLTFLoader.js"),
      import("three/examples/jsm/libs/meshopt_decoder.module.js"),
    ]);
    useLoader.preload(GLTFLoader, MODEL_URL, (loader) => {
      loader.setMeshoptDecoder(MeshoptDecoder);
    });
    await import("@/features/odontogram/DentalArch3D");
  })().catch((fallo) => {
    precarga = null;
    throw fallo;
  });
  return precarga;
}

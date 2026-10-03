import { PlantaVista } from "./PlantaVista";

/**
 * Ruta `/app/planta`.
 *
 * Es una pagina deliberadamente fina: toda la logica esta en `PlantaVista`, que
 * es donde vive la decision de cuando se cae al plano de demostracion. Asi el
 * componente de ruta no depende de three ni de Supabase, y el `lazy()` de
 * `App.tsx` sigue siendo lo unico que decide cuando se descarga el 3D.
 */
export function PlantaPage() {
  return <PlantaVista />;
}

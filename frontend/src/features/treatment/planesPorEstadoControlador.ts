import { clinicaParaVista, exigirEstadoFiltro, TAMANO_PLANES_ESTADO } from "./planesPorEstado.ts";
import type { PaginaPlanesEstado, PlanPorEstado } from "./planesPorEstado.ts";
import type { EstadoPlanTratamiento, PerfilDiagnosticos } from "./tipos.ts";

export interface VistaPlanesEstado {
  estado: "loading" | "error" | "success"; filtro: EstadoPlanTratamiento; pagina: number;
  planes: PlanPorEstado[]; total: number; error: string | null;
}
export function crearVistaPlanesEstado(perfil: PerfilDiagnosticos | null,
  listar: (clinica: string, estado: EstadoPlanTratamiento, pagina: number) => Promise<PaginaPlanesEstado>, clinicaExplicita?: string) {
  let vista: VistaPlanesEstado = { estado: "loading", filtro: "propuesto", pagina: 1, planes: [], total: 0, error: null };
  let activo = false; let revision = 0; let pendiente: Promise<void> | null = null;
  const observadores = new Set<() => void>();
  const publicar = (cambio: Partial<VistaPlanesEstado>) => { vista = { ...vista, ...cambio }; for (const f of observadores) f(); };
  function cargar(): Promise<void> {
    if (!activo) return Promise.resolve();
    if (pendiente) return pendiente;
    const version = ++revision; const { filtro, pagina } = vista;
    publicar({ estado: "loading", planes: [], error: null });
    const solicitud = (async () => {
      try {
        const clinica = clinicaParaVista(perfil, clinicaExplicita);
        const resultado = await listar(clinica, filtro, pagina);
        if (!activo || version !== revision) return;
        const ultima = Math.max(1, Math.ceil(resultado.total / TAMANO_PLANES_ESTADO));
        if (pagina > ultima) {
          pendiente = null; publicar({ pagina: ultima }); await cargar(); return;
        }
        publicar({ estado: "success", ...resultado });
      } catch (causa) {
        if (activo && version === revision) publicar({ estado: "error", planes: [], error: causa instanceof Error ? causa.message : "No se pudieron cargar los planes." });
      }
    })();
    // finally registrado fuera de la tarea permite manejar validaciones síncronas.
    pendiente = solicitud;
    void solicitud.finally(() => { if (version === revision) pendiente = null; });
    return solicitud;
  }
  function actualizar() { revision++; pendiente = null; return cargar(); }
  return {
    obtener: () => vista,
    suscribir(f: () => void) { observadores.add(f); return () => { observadores.delete(f); }; },
    activar() { activo = true; }, desactivar() { activo = false; revision++; pendiente = null; },
    cargar, actualizar,
    filtrar(filtro: EstadoPlanTratamiento) { exigirEstadoFiltro(filtro); publicar({ filtro, pagina: 1 }); return actualizar(); },
    paginar(pagina: number) {
      if (vista.estado !== "success" || !Number.isSafeInteger(pagina) || pagina < 1
          || pagina > Math.max(1, Math.ceil(vista.total / TAMANO_PLANES_ESTADO))) throw new Error("Página no disponible.");
      publicar({ pagina }); return actualizar();
    },
  };
}

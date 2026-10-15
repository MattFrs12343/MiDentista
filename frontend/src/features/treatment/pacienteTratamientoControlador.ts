import { puedeLeerDiagnosticos } from "./diagnosticoPermisos.ts";
import { exigirUuid } from "./diagnosticoMapper.ts";
import type { PacienteTratamiento } from "./pacienteTratamientoService.ts";
import type { PerfilDiagnosticos } from "./tipos.ts";

export function crearContextoPacienteTratamiento(contexto: { pacienteId: string; email: string; rol: string; habilitado: boolean; clinicaSesion?: string },
  servicios: { perfil: (email: string) => Promise<PerfilDiagnosticos>; paciente: (id: string, perfil: PerfilDiagnosticos) => Promise<PacienteTratamiento> }) {
  let resultado: { estado: "idle" | "loading" | "error" | "success"; datos: PacienteTratamiento | null; error: string | null } = {
    estado: contexto.habilitado ? "loading" : "idle", datos: null, error: null,
  };
  let activo = false; let revision = 0; let lectura: Promise<void> | null = null;
  const observadores = new Set<() => void>();
  const publicar = (nuevo: typeof resultado) => { resultado = nuevo; for (const f of observadores) f(); };
  async function cargar(): Promise<void> {
    if (!activo || !contexto.habilitado) return;
    if (lectura) return lectura;
    const version = revision;
    publicar({ estado: "loading", datos: null, error: null });
    lectura = (async () => {
      try {
        exigirUuid(contexto.pacienteId, "pacienteId");
        if (!contexto.email || contexto.rol === "paciente") throw new Error("Sesión sin acceso a la ficha clínica.");
        const perfil = await servicios.perfil(contexto.email);
        if (!puedeLeerDiagnosticos(perfil)) throw new Error("Perfil sin acceso a la ficha clínica.");
        if (!activo || version !== revision) return;
        const datos = await servicios.paciente(contexto.pacienteId, perfil);
        if (!activo || version !== revision) return;
        if (datos.paciente.id !== contexto.pacienteId.toLowerCase() || (perfil.clinicaId && datos.clinicaId !== perfil.clinicaId.toLowerCase())) throw new Error("Paciente fuera del contexto solicitado.");
        publicar({ estado: "success", datos, error: null });
      } catch (causa) {
        if (activo && version === revision) publicar({ estado: "error", datos: null, error: causa instanceof Error ? causa.message : "No se confirmó la ficha." });
      }
    })().finally(() => { lectura = null; if (activo && version !== revision) void cargar(); });
    return lectura;
  }
  return { obtener: () => resultado,
    suscribir(f: () => void) { observadores.add(f); return () => { observadores.delete(f); }; },
    activar() { activo = true; }, desactivar() { activo = false; revision++; }, cargar };
}

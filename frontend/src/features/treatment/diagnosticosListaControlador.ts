import { puedeLeerDiagnosticos } from "./diagnosticoPermisos.ts";
import { compararDiagnosticos, incorporarDiagnosticoConfirmado, type ResultadoListaDiagnosticos } from "./diagnosticosLista.ts";
import type { DiagnosticoPaciente, PerfilDiagnosticos } from "./tipos.ts";

export interface ContextoListaDiagnosticos { pacienteId: string; email: string; rol: string }
export interface LecturasDiagnosticos {
  obtenerPerfil: (email: string) => Promise<PerfilDiagnosticos>;
  listar: (pacienteId: string, clinicaId: string | null) => Promise<DiagnosticoPaciente[]>;
}

/** Extrae el ciclo de lectura del hook para probar su reintento y reconciliación.
 * No tiene otra implementación de Supabase: recibe el servicio ya validado. */
export function crearControladorListaDiagnosticos(contexto: ContextoListaDiagnosticos, lecturas: LecturasDiagnosticos) {
  const clave = JSON.stringify([contexto.pacienteId.toLowerCase(), contexto.email.toLowerCase(), contexto.rol]);
  let resultado: ResultadoListaDiagnosticos = { clave, estado: "loading", diagnosticos: [], perfil: null, error: null };
  let activo = false;
  let pendiente: Promise<void> | null = null;
  const observadores = new Set<() => void>();
  function publicar(nuevo: ResultadoListaDiagnosticos) {
    resultado = nuevo;
    for (const observar of observadores) observar();
  }
  return {
    obtener: () => resultado,
    suscribir(callback: () => void) { observadores.add(callback); return () => { observadores.delete(callback); }; },
    activar() { activo = true; },
    desactivar() { activo = false; },
    cargando: () => pendiente !== null,
    cargar(): Promise<void> {
      if (!activo) return Promise.resolve();
      if (pendiente) return pendiente; // StrictMode y doble reintento comparten lectura.
      publicar({ ...resultado, estado: "loading", error: null });
      pendiente = (async () => {
        try {
          if (!contexto.email || contexto.rol === "paciente") throw new Error("Esta sesión no tiene acceso al flujo clínico de diagnósticos.");
          const perfil = await lecturas.obtenerPerfil(contexto.email);
          if (!puedeLeerDiagnosticos(perfil)) throw new Error("Tu perfil no tiene acceso a los diagnósticos clínicos.");
          if (!activo) return;
          const diagnosticos = await lecturas.listar(contexto.pacienteId, perfil.clinicaId);
          if (activo) publicar({ clave, estado: "success", perfil, diagnosticos: [...diagnosticos].sort(compararDiagnosticos), error: null });
        } catch (causa) {
          if (activo) publicar({ clave, estado: "error", perfil: null, diagnosticos: [],
            error: causa instanceof Error ? causa.message : "No se pudieron cargar los diagnósticos." });
        }
      })().finally(() => { pendiente = null; });
      return pendiente;
    },
    confirmar(diagnostico: DiagnosticoPaciente) {
      if (!activo || resultado.estado !== "success") throw new Error("La lista ya no está disponible en esta ficha.");
      if (diagnostico.pacienteId !== contexto.pacienteId.toLowerCase()
          || (resultado.perfil?.clinicaId && diagnostico.clinicaId !== resultado.perfil.clinicaId)) {
        throw new Error("El diagnóstico confirmado no corresponde al paciente o clínica de la lista.");
      }
      publicar({ ...resultado, diagnosticos: incorporarDiagnosticoConfirmado(resultado.diagnosticos, diagnostico) });
    },
  };
}

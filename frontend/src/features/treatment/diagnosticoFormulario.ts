import { diagnosticoParaGuardar, piezaDesdeTexto } from "./diagnosticoMapper.ts";
import type { ContenidoDiagnostico, DiagnosticoPaciente, EstadoDiagnostico } from "./tipos.ts";

export interface CamposDiagnostico {
  descripcion: string;
  numeroPieza: string;
  observaciones: string;
  estado: EstadoDiagnostico;
}
export interface EstadoFormularioDiagnostico {
  campos: CamposDiagnostico;
  guardando: boolean;
  error: string | null;
  exito: string | null;
}
export type AccionFormularioDiagnostico = "contenido" | "estado";

export function camposDiagnostico(diagnostico?: DiagnosticoPaciente): CamposDiagnostico {
  return { descripcion: diagnostico?.descripcion ?? "", numeroPieza: diagnostico?.numeroPieza?.toString() ?? "",
    observaciones: diagnostico?.observaciones ?? "", estado: diagnostico?.estado ?? "activo" };
}

export function contenidoDesdeCampos(campos: CamposDiagnostico): ContenidoDiagnostico {
  const contenido = { descripcion: campos.descripcion, numeroPieza: piezaDesdeTexto(campos.numeroPieza), observaciones: campos.observaciones };
  diagnosticoParaGuardar(contenido);
  return contenido;
}

/** Ciclo de envío usado por el formulario: bloqueo síncrono, borrador y resultado
 * confirmado. Puede probarse sin DOM y no depende de una respuesta optimista. */
export function crearControladorFormularioDiagnostico(
  diagnostico: DiagnosticoPaciente | undefined,
  guardar: (accion: AccionFormularioDiagnostico, campos: CamposDiagnostico) => Promise<DiagnosticoPaciente>,
) {
  let estado: EstadoFormularioDiagnostico = { campos: camposDiagnostico(diagnostico), guardando: false, error: null, exito: null };
  let activo = true;
  let version = 0;
  let guardarActual = guardar;
  let observador: ((estado: EstadoFormularioDiagnostico) => void) | null = null;
  const publicar = (nuevo: EstadoFormularioDiagnostico) => { estado = nuevo; observador?.(estado); };
  return {
    obtener: () => estado,
    actualizarGuardar(callback: typeof guardar) { guardarActual = callback; },
    suscribir(callback: (estado: EstadoFormularioDiagnostico) => void) {
      activo = true;
      observador = callback;
      callback(estado);
      return () => { activo = false; version++; observador = null; };
    },
    cambiar<K extends keyof CamposDiagnostico>(campo: K, valor: CamposDiagnostico[K]) {
      if (estado.guardando) return;
      publicar({ ...estado, campos: { ...estado.campos, [campo]: valor }, error: null, exito: null });
    },
    async enviar(accion: AccionFormularioDiagnostico): Promise<DiagnosticoPaciente | null> {
      if (!activo || estado.guardando) return null;
      const intento = { ...estado.campos };
      const revision = version;
      publicar({ ...estado, guardando: true, error: null, exito: null });
      try {
        if (accion === "contenido") contenidoDesdeCampos(intento);
        if (accion === "estado" && !diagnostico) throw new Error("Primero debes crear el diagnóstico.");
        const confirmado = await guardarActual(accion, intento);
        if (!confirmado) throw new Error("No se confirmó el diagnóstico guardado.");
        if (!activo || version !== revision) return null;
        const campos = !diagnostico ? camposDiagnostico()
          : accion === "estado" ? { ...intento, estado: confirmado.estado }
          : { ...camposDiagnostico(confirmado), estado: intento.estado };
        publicar({ campos, guardando: false, error: null,
          exito: accion === "estado" ? "Estado del diagnóstico actualizado." : diagnostico ? "Diagnóstico actualizado." : "Diagnóstico creado." });
        return confirmado;
      } catch (causa) {
        if (activo && version === revision) publicar({ campos: intento, guardando: false, exito: null,
          error: causa instanceof Error ? causa.message : "No se confirmó el guardado. Revisa la conexión antes de reintentar." });
        return null;
      }
    },
  };
}

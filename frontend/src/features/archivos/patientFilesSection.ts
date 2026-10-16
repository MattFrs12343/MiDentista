import { esUuid } from "./archivoMapper.ts";
import type { Archivo } from "./tipos.ts";
import type { ContextoPacienteArchivos } from "./patientFilesSectionService.ts";

export type PerfilArchivos = { id: string; clinicaId: string | null };
export type ContextoSeccionArchivos = ContextoPacienteArchivos & { perfilId: string };
export type InformeSubida = {
  estado: "idle" | "uploading" | "success" | "error";
  requiereRevision: boolean;
  /** Solo para confirmar una escritura terminada tras desmontar su formulario. */
  archivo?: Archivo;
};
export type ObservadorSubida = (informe: InformeSubida) => void;

export function capacidadesArchivos(pacienteId: string, contexto: ContextoPacienteArchivos | null, perfil: PerfilArchivos | null, rol: string | null) {
  const valido = esUuid(pacienteId) && contexto !== null && perfil !== null
    && esUuid(contexto.pacienteId) && esUuid(contexto.clinicaId) && esUuid(perfil.id)
    && typeof perfil.clinicaId === "string" && esUuid(perfil.clinicaId)
    && contexto.pacienteId.toLowerCase() === pacienteId.toLowerCase()
    && contexto.clinicaId.toLowerCase() === perfil.clinicaId.toLowerCase();
  // Esta ficha es de personal; no inventar navegación/privilegios de otros roles.
  const equipo = rol === "odontologo" || rol === "odontologo_admin" || rol === "recepcionista";
  return { imagen: valido && equipo, pdf: valido && equipo };
}

export function archivoDelContexto(archivo: Archivo, contexto: ContextoSeccionArchivos): boolean {
  return archivo.pacienteId.toLowerCase() === contexto.pacienteId.toLowerCase()
    && archivo.clinicaId.toLowerCase() === contexto.clinicaId.toLowerCase()
    && archivo.subidoPor.toLowerCase() === contexto.perfilId.toLowerCase();
}

/** Confirmación idempotente: un fallo de refresh no convierte INSERT en fallo. */
export function crearCoordinadorArchivos(contexto: ContextoSeccionArchivos, efectos: {
  vigente: () => boolean;
  cerrar: () => void;
  confirmar: (archivo: Archivo) => void;
  reload: () => Promise<void>;
  errorRefresh: () => void;
}) {
  const confirmados = new Set<string>();
  return async (archivo: Archivo | null): Promise<boolean> => {
    if (!archivo || !efectos.vigente() || !archivoDelContexto(archivo, contexto) || confirmados.has(archivo.id)) return false;
    confirmados.add(archivo.id);
    efectos.cerrar();
    efectos.confirmar(archivo);
    try { await efectos.reload(); }
    catch { if (efectos.vigente()) efectos.errorRefresh(); }
    return true;
  };
}

export function mensajePublicoSubida(error: { etapa: string; requiereRevision: boolean }): string {
  if (error.requiereRevision) return "No se confirmó la operación. Revisa el intento antes de volver a subir el archivo.";
  if (error.etapa === "validacion") return "Revisa el formato, tamaño y datos seleccionados antes de subir.";
  if (error.etapa === "autoria") return "No pudimos confirmar el acceso al paciente o al destino seleccionado.";
  return "No pudimos subir y registrar el archivo. Intenta nuevamente.";
}

export type EstadoEscritura = { subiendo: boolean; requiereRevision: boolean };
type RegistroEscritura = {
  leer: () => EstadoEscritura;
  suscribir: (listener: () => void) => () => void;
  observarConfirmacion: (listener: (archivo: Archivo) => void) => () => void;
  publicar: ObservadorSubida;
};
// Solo flags en memoria, nunca File/Blob/rutas/tokens. Sobrevive a cerrar pestaña
// clínica o diálogo dentro de la SPA para no habilitar reintentos inciertos.
const registros = new Map<string, RegistroEscritura>();
export function registroEscritura(clave: string): RegistroEscritura {
  const existente = registros.get(clave);
  if (existente) return existente;
  let estado: EstadoEscritura = { subiendo: false, requiereRevision: false };
  const listeners = new Set<() => void>();
  const confirmaciones = new Set<(archivo: Archivo) => void>();
  const registro: RegistroEscritura = {
    leer: () => estado,
    suscribir(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    observarConfirmacion(listener) { confirmaciones.add(listener); return () => { confirmaciones.delete(listener); }; },
    publicar(informe) {
      estado = { subiendo: informe.estado === "uploading", requiereRevision: estado.requiereRevision || informe.requiereRevision };
      for (const listener of listeners) listener();
      if (informe.archivo) for (const listener of confirmaciones) listener(informe.archivo);
      // Un resultado terminado sin alertas y sin consumidores ya no necesita flags.
      if (!estado.subiendo && !estado.requiereRevision && listeners.size === 0) registros.delete(clave);
    },
  };
  registros.set(clave, registro);
  return registro;
}

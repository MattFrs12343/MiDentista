// Lógica pura compartida por el handler y las pruebas locales (sin red/secretos).
export const BUCKET_ARCHIVOS = "archivos-clinica";
export const LIMITE_PRODUCCION = 5_000_000_000;
export const MAX_ARCHIVO = 10_485_760;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type PerfilReal = { id: string; auth_user_id: string; clinica_id: string | null; rol: string; activo: boolean };
export type PacienteReal = { id: string; clinica_id: string; perfil_id: string | null };
export type DatosArchivo = {
  nombre: string; mime: string; tipo_archivo: string; descripcion: string;
  evolucion_clinica_id: string | null; plan_tratamiento_id: string | null;
};

export function hayEspacio(ocupados: number, reservados: number, nuevos: number, limite: number): boolean {
  return [ocupados, reservados, nuevos, limite].every((v) => Number.isSafeInteger(v) && v >= 0)
    && nuevos > 0 && limite > 0 && nuevos <= limite - ocupados - reservados;
}

export function exigirAlcance(perfil: PerfilReal, paciente: PacienteReal, datos: DatosArchivo) {
  if (!perfil.activo || !UUID.test(perfil.id) || !UUID.test(paciente.id) || !UUID.test(paciente.clinica_id)
      || !["odontologo", "odontologo_admin", "recepcionista", "paciente", "superadmin"].includes(perfil.rol)
      || (perfil.rol !== "superadmin" && perfil.clinica_id !== paciente.clinica_id)
      || (perfil.rol === "paciente" && (paciente.perfil_id !== perfil.id || datos.mime === "application/pdf"
        || datos.evolucion_clinica_id !== null || datos.plan_tratamiento_id !== null))
      || (perfil.rol === "recepcionista" && datos.evolucion_clinica_id !== null)) {
    throw new Error("ACCESO_DENEGADO");
  }
}

export function exigirAuditor(perfil: PerfilReal) {
  if (!perfil.activo || perfil.rol !== "superadmin") throw new Error("AUDITORIA_DENEGADA");
}

/** Cabeceras reales: no aceptar solo Content-Type/extensión controlados por caller. */
export function validarContenido(bytes: Uint8Array, datos: DatosArchivo) {
  const { nombre, mime, tipo_archivo, evolucion_clinica_id: evo, plan_tratamiento_id: plan } = datos;
  if (bytes.length === 0 || bytes.length > MAX_ARCHIVO || !nombre.trim() || nombre.length > 1024
      || datos.descripcion.length > 10_000
      || !["fotografia", "radiografia", "documento"].includes(tipo_archivo)
      || (evo !== null && !UUID.test(evo)) || (plan !== null && !UUID.test(plan))
      || (evo !== null && plan !== null)) throw new Error("ARCHIVO_INVALIDO");
  const ascii = (inicio: number, fin: number) => String.fromCharCode(...bytes.slice(inicio, fin));
  const formatos: Record<string, { valido: boolean; extension: RegExp }> = {
    "image/jpeg": { valido: bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255, extension: /\.jpe?g$/i },
    "image/png": { valido: [137,80,78,71,13,10,26,10].every((v, i) => bytes[i] === v), extension: /\.png$/i },
    "image/webp": { valido: bytes.length >= 12 && ascii(0,4) === "RIFF" && ascii(8,12) === "WEBP", extension: /\.webp$/i },
    "application/pdf": { valido: ascii(0,5) === "%PDF-" && tipo_archivo === "documento", extension: /\.pdf$/i },
  };
  const formato = formatos[mime];
  if (!formato?.valido || !formato.extension.test(nombre)) throw new Error("ARCHIVO_INVALIDO");
}

import { MAX_FILE_SIZE } from "./archivoSeleccion.ts";
import { TIPOS_VISUALIZABLES, type Archivo, type CategoriaArchivo, type TipoArchivo } from "./tipos.ts";

/** Fila de `public.archivos`. Ver `docs/modules/10-archivos/sql.sql`. */
export interface ArchivoFila {
  id: string;
  clinica_id: string;
  paciente_id: string;
  nombre: string;
  ruta: string;
  mime: string;
  tamano: number;
  categoria: CategoriaArchivo;
  tipo_archivo: TipoArchivo;
  descripcion: string | null;
  subido_por: string;
  creado_en: string;
  evolucion_clinica_id: string | null;
  plan_tratamiento_id: string | null;
}

/**
 * Solo los campos que la UI escribe. `id` y `creado_en` los pone la base:
 * mandarlos como null anularía sus valores por defecto.
 */
export type ArchivoPayload = Omit<ArchivoFila, "id" | "creado_en">;

export function esUuid(valor: string): boolean {
  return typeof valor === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);
}

const CATEGORIAS: readonly CategoriaArchivo[] = ["clinico", "administrativo", "portal"];
const TIPOS: readonly TipoArchivo[] = ["fotografia", "radiografia", "documento"];

function validarMetadata(fila: ArchivoPayload) {
  validarReferencias(fila.evolucion_clinica_id, fila.plan_tratamiento_id);
  for (const [campo, valor] of [
    ["clinica_id", fila.clinica_id], ["paciente_id", fila.paciente_id], ["subido_por", fila.subido_por],
  ]) {
    if (!esUuid(valor)) throw new Error(`${campo} debe ser un UUID obligatorio válido.`);
  }
  if (!CATEGORIAS.includes(fila.categoria)) throw new Error("Categoría de archivo desconocida.");
  if (!TIPOS.includes(fila.tipo_archivo)) throw new Error("Clasificación de archivo desconocida.");
  if (typeof fila.nombre !== "string" || !fila.nombre.trim()) throw new Error("Nombre de archivo inválido.");
  if (!Number.isSafeInteger(fila.tamano) || fila.tamano < 0 || fila.tamano > MAX_FILE_SIZE) {
    throw new Error("Tamaño de archivo inválido.");
  }
  if (!TIPOS_VISUALIZABLES.some((mime) => mime === fila.mime)
      || (fila.tipo_archivo !== "documento" && fila.mime === "application/pdf")) {
    throw new Error("MIME incompatible con el tipo de archivo.");
  }
  if (fila.descripcion !== null && typeof fila.descripcion !== "string") {
    throw new Error("Descripción de archivo inválida.");
  }
  const segmentos = typeof fila.ruta === "string" ? fila.ruta.split("/") : [];
  if (segmentos.length !== 3 || segmentos[0] !== fila.clinica_id.toLowerCase()
      || segmentos[1] !== fila.paciente_id.toLowerCase() || !segmentos[2].trim()
      || segmentos[2] === "." || segmentos[2] === "..") {
    throw new Error("Ruta de archivo incompatible con clínica y paciente.");
  }
}

export function archivoDesdeFila(fila: ArchivoFila): Archivo {
  validarMetadata(fila);
  if (!esUuid(fila.id) || typeof fila.creado_en !== "string" || !Number.isFinite(Date.parse(fila.creado_en))) {
    throw new Error("La fila no contiene un ID y una fecha de creación válidos.");
  }
  return {
    id: fila.id,
    clinicaId: fila.clinica_id,
    pacienteId: fila.paciente_id,
    nombre: fila.nombre,
    ruta: fila.ruta,
    mime: fila.mime,
    tamano: fila.tamano,
    categoria: fila.categoria,
    tipoArchivo: fila.tipo_archivo,
    descripcion: fila.descripcion ?? "",
    subidoPor: fila.subido_por,
    creadoEl: fila.creado_en,
    evolucionClinicaId: fila.evolucion_clinica_id,
    planTratamientoId: fila.plan_tratamiento_id,
  };
}

export function archivoParaGuardar(archivo: Omit<Archivo, "id" | "creadoEl">): ArchivoPayload {
  if (!esUuid(archivo.clinicaId) || !esUuid(archivo.pacienteId) || !esUuid(archivo.subidoPor)) {
    throw new Error("Clínica, paciente y subido_por deben ser UUID obligatorios válidos.");
  }
  if (typeof archivo.descripcion !== "string") throw new Error("Descripción de archivo inválida.");
  const payload: ArchivoPayload = {
    clinica_id: archivo.clinicaId.toLowerCase(),
    paciente_id: archivo.pacienteId.toLowerCase(),
    nombre: archivo.nombre,
    ruta: archivo.ruta,
    mime: archivo.mime,
    tamano: archivo.tamano,
    categoria: archivo.categoria,
    tipo_archivo: archivo.tipoArchivo,
    descripcion: archivo.descripcion.trim() || null,
    subido_por: archivo.subidoPor.toLowerCase(),
    evolucion_clinica_id: archivo.evolucionClinicaId?.toLowerCase() ?? null,
    plan_tratamiento_id: archivo.planTratamientoId?.toLowerCase() ?? null,
  };
  validarMetadata(payload);
  return payload;
}

export function validarReferencias(evolucion: unknown, plan: unknown): void {
  if (evolucion !== null && (typeof evolucion !== "string" || !esUuid(evolucion))) throw new Error("La evolución debe ser UUID o null.");
  if (plan !== null && (typeof plan !== "string" || !esUuid(plan))) throw new Error("El plan debe ser UUID o null.");
  if (evolucion !== null && plan !== null) throw new Error("Solo puede elegirse una asociación clínica.");
}

/** Valida también payloads manipulados fuera del contrato TypeScript. */
export function referenciasDesdeAsociacion(asociacion: unknown) {
  const general = { evolucion_clinica_id: null, plan_tratamiento_id: null };
  if (asociacion === undefined) return general;
  if (!asociacion || typeof asociacion !== "object" || !("tipo" in asociacion)) throw new Error("Asociación inválida.");
  const dato = asociacion as Record<string, unknown>;
  const claves = dato.tipo === "general" ? ["tipo"] : dato.tipo === "evolucion"
    ? ["tipo", "evolucionClinicaId"] : dato.tipo === "plan" ? ["tipo", "planTratamientoId"] : [];
  if (claves.length === 0 || Object.keys(dato).some((clave) => !claves.includes(clave))) throw new Error("Asociación inválida o simultánea.");
  if (dato.tipo === "general") return general;
  const id = dato.tipo === "evolucion" ? dato.evolucionClinicaId : dato.planTratamientoId;
  if (typeof id !== "string" || !esUuid(id)) throw new Error("La asociación requiere un UUID válido.");
  return dato.tipo === "evolucion"
    ? { evolucion_clinica_id: id.toLowerCase(), plan_tratamiento_id: null }
    : { evolucion_clinica_id: null, plan_tratamiento_id: id.toLowerCase() };
}

/** Clave nueva por intento, sin nombres originales ni datos clínicos. */
export function rutaEnBucket(clinicaId: string, pacienteId: string, mime: string): string {
  if (!esUuid(clinicaId) || !esUuid(pacienteId)) throw new Error("La ruta requiere UUID reales.");
  const extension = mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png"
    : mime === "image/webp" ? "webp" : mime === "application/pdf" ? "pdf" : null;
  if (!extension) throw new Error("La ruta requiere MIME JPG, PNG, WEBP o PDF.");
  if (typeof globalThis.crypto?.randomUUID !== "function") {
    throw new Error("crypto.randomUUID() no está disponible. Utiliza un navegador compatible en un contexto seguro.");
  }
  return `${clinicaId.toLowerCase()}/${pacienteId.toLowerCase()}/${globalThis.crypto.randomUUID()}.${extension}`;
}

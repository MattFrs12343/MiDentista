import type { Archivo, CategoriaArchivo } from "./tipos.ts";

/** Fila de `public.archivos`. Ver `docs/modules/10-archivos/sql.sql`. */
export interface ArchivoFila {
  id: string;
  clinica_id: string;
  paciente_id: string;
  nombre: string;
  ruta: string;
  mime: string;
  tamano: number | null;
  categoria: string | null;
  descripcion: string | null;
  subido_por: string | null;
  creado_en: string | null;
}

/**
 * Solo los campos que la UI escribe. `id` y `creado_en` los pone la base:
 * mandarlos como null anularía sus valores por defecto.
 */
export type ArchivoPayload = Omit<ArchivoFila, "id" | "creado_en">;

export function esUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);
}

/** Las categorías válidas están en el CHECK del DDL; aquí se degradan igual. */
const CATEGORIAS: readonly CategoriaArchivo[] = ["clinico", "administrativo", "portal"];

function categoriaDesdeTexto(valor: string | null): CategoriaArchivo {
  return CATEGORIAS.find((c) => c === valor) ?? "administrativo";
}

export function archivoDesdeFila(fila: ArchivoFila): Archivo {
  return {
    id: fila.id,
    clinicaId: fila.clinica_id,
    pacienteId: fila.paciente_id,
    nombre: fila.nombre,
    ruta: fila.ruta,
    mime: fila.mime,
    tamano: fila.tamano ?? 0,
    categoria: categoriaDesdeTexto(fila.categoria),
    descripcion: fila.descripcion ?? "",
    subidoPor: fila.subido_por,
    creadoEl: fila.creado_en ?? "",
  };
}

export function archivoParaGuardar(archivo: Archivo): ArchivoPayload {
  return {
    clinica_id: archivo.clinicaId,
    paciente_id: archivo.pacienteId,
    nombre: archivo.nombre,
    ruta: archivo.ruta,
    mime: archivo.mime,
    tamano: archivo.tamano,
    categoria: archivo.categoria,
    descripcion: archivo.descripcion,
    subido_por: archivo.subidoPor,
  };
}

/**
 * La clave del objeto en Storage no la elige el usuario: se compone aquí.
 *
 * `pacienteId` y `id` son UUIDs, así que la ruta no puede atravesar niveles de
 * bucket ni colisionar entre pacientes. El nombre original va al final y
 * completo para que quien lo abra lo reconozca.
 */
export function rutaEnBucket(clinicaId: string, pacienteId: string, nombreOriginal: string): string {
  return `${clinicaId}/${pacienteId}/${nombreOriginal}`;
}

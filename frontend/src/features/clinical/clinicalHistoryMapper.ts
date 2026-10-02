import type { Alergia, HistoriaClinica } from "@/types";

export interface HistorialClinicoFila {
  id: string;
  clinica_id: string;
  paciente_id: string;
  motivo_consulta: string | null;
  antecedentes_medicos: string | null;
  antecedentes_odontologicos: string | null;
  alergias: string | null;
  medicamentos: string | null;
  enfermedades: string | null;
  habitos: string | null;
  observaciones: string | null;
  creado_en: string | null;
  actualizado_en: string | null;
}

export type HistorialClinicoContenido = Omit<
  HistorialClinicoFila,
  "id" | "clinica_id" | "paciente_id" | "creado_en" | "actualizado_en"
>;

export function esUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);
}

export function crearHistoriaClinicaVacia(pacienteId: string): HistoriaClinica {
  return {
    pacienteId,
    motivoConsulta: "",
    antecedentesPersonales: "",
    antecedentesFamiliares: "",
    antecedentesOdontologicos: "",
    enfermedadesBase: [],
    medicamentosActuales: [],
    alergias: [],
    habitos: [],
    observacionesGenerales: "",
  };
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/** Conserva texto legado; JSON malformado no se convierte silenciosamente en vacío. */
function leerTexto(valor: string | null, columna: string): unknown {
  if (valor === null || !valor.trim()) return null;
  if (!/^[{["]/.test(valor.trim())) return valor;
  try {
    return JSON.parse(valor);
  } catch {
    throw new Error(`El contenido de ${columna} no es JSON válido. Revisa el registro existente.`);
  }
}

function leerLista(valor: string | null, columna: string): string[] {
  const contenido = leerTexto(valor, columna);
  if (contenido === null) return [];
  // Un texto antiguo se conserva como un solo elemento, sin separadores ambiguos.
  if (typeof contenido === "string") return [contenido];
  if (Array.isArray(contenido) && contenido.every((item) => typeof item === "string")) {
    return contenido;
  }
  throw new Error(`La columna ${columna} debe contener una lista JSON de textos.`);
}

function leerAntecedentes(valor: string | null): { personales: string; familiares: string } {
  const contenido = leerTexto(valor, "antecedentes_medicos");
  if (contenido === null) return { personales: "", familiares: "" };
  if (typeof contenido === "string") return { personales: contenido, familiares: "" };
  if (esObjeto(contenido)
    && typeof contenido.personales === "string"
    && typeof contenido.familiares === "string") {
    return { personales: contenido.personales, familiares: contenido.familiares };
  }
  throw new Error("antecedentes_medicos debe contener personales y familiares como textos JSON.");
}

function leerAlergias(valor: string | null): Alergia[] {
  const contenido = leerTexto(valor, "alergias");
  if (contenido === null) return [];
  if (!Array.isArray(contenido)) {
    throw new Error(
      "Las alergias existentes no tienen sustancia y severidad en formato JSON. Requieren revisión; no se asignará una severidad automáticamente.",
    );
  }

  return contenido.map((item, indice) => {
    if (!esObjeto(item)
      || typeof item.sustancia !== "string"
      || (item.severidad !== "leve" && item.severidad !== "moderada" && item.severidad !== "grave")
      || (item.id !== undefined && (typeof item.id !== "string" || !item.id))) {
      throw new Error("Una alergia contiene datos inválidos: se requieren sustancia y severidad.");
    }
    return {
      // Identificador local para listas antiguas sin id; no es un UUID de BD.
      id: typeof item.id === "string" ? item.id : `alergia-local-${indice}`,
      sustancia: item.sustancia,
      severidad: item.severidad,
    };
  });
}

export function historiaDesdeFila(fila: HistorialClinicoFila): HistoriaClinica {
  const antecedentes = leerAntecedentes(fila.antecedentes_medicos);
  return {
    pacienteId: fila.paciente_id,
    motivoConsulta: fila.motivo_consulta ?? "",
    antecedentesPersonales: antecedentes.personales,
    antecedentesFamiliares: antecedentes.familiares,
    antecedentesOdontologicos: fila.antecedentes_odontologicos ?? "",
    enfermedadesBase: leerLista(fila.enfermedades, "enfermedades"),
    medicamentosActuales: leerLista(fila.medicamentos, "medicamentos"),
    alergias: leerAlergias(fila.alergias),
    habitos: leerLista(fila.habitos, "habitos"),
    observacionesGenerales: fila.observaciones ?? "",
    ...(fila.actualizado_en ? { actualizadoEl: fila.actualizado_en } : {}),
  };
}

export function historiaParaGuardar(historia: HistoriaClinica): HistorialClinicoContenido {
  return {
    motivo_consulta: historia.motivoConsulta,
    antecedentes_medicos: JSON.stringify({
      personales: historia.antecedentesPersonales,
      familiares: historia.antecedentesFamiliares,
    }),
    antecedentes_odontologicos: historia.antecedentesOdontologicos,
    alergias: JSON.stringify(historia.alergias),
    medicamentos: JSON.stringify(historia.medicamentosActuales),
    enfermedades: JSON.stringify(historia.enfermedadesBase),
    habitos: JSON.stringify(historia.habitos),
    observaciones: historia.observacionesGenerales,
  };
}

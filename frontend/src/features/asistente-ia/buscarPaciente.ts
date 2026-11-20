import type { Paciente } from "../../types/index.ts";

function normalizarNombre(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/**
 * Busca por coincidencia de substring sobre nombre completo normalizado.
 * Si hay más de una coincidencia no elige por vos: devuelve `null` para que
 * el asistente navegue al listado general en vez de arriesgarse a abrir la
 * ficha equivocada (ver guardrail de T-17.10 en tasks.md).
 */
export function buscarPacientePorNombre(pacientes: readonly Paciente[], nombreBuscado: string): Paciente | null {
  const buscado = normalizarNombre(nombreBuscado);
  if (!buscado) return null;
  const coincidencias = pacientes.filter((p) =>
    normalizarNombre(`${p.nombres} ${p.apellidos}`).includes(buscado),
  );
  return coincidencias.length === 1 ? coincidencias[0] : null;
}

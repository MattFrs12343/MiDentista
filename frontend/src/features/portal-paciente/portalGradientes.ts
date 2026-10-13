/**
 * Degradados por sección del portal, de izquierda a derecha.
 *
 * Única fuente de verdad: `CardAcceso` (las tarjetas de la portada) y
 * `PortalSubHeader` (el encabezado de cada sección interna) pintan con el
 * mismo color por sección. Si vivieran duplicados en los dos archivos,
 * tarde o temprano alguien cambia uno y no el otro, y "Mis citas" deja de
 * ser azul en la tarjeta de la portada pero sigue azul en su encabezado (o
 * viceversa) sin que nadie lo note hasta que un paciente lo señala.
 */
export type SeccionPortal = "cita" | "odontograma" | "historia" | "pagos" | "evoluciones" | "clinica";

export const GRADIENTE_SECCION: Record<SeccionPortal, string> = {
  cita: "from-brand-800 via-brand-600 to-brand-400",
  odontograma: "from-[#2f2159] via-[#5b3f9f] to-[#9b81d6]",
  historia: "from-[#123a26] via-[#2f6b48] to-[#6fb890]",
  pagos: "from-[#4a3208] via-[#93641c] to-[#d9a54a]",
  evoluciones: "from-[#0d3f3f] via-[#1c7a72] to-[#5fd0c0]",
  clinica: "from-[#0c3a52] via-[#1f6f93] to-[#7cc9e8]",
};

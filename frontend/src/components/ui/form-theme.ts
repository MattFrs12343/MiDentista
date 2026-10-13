import { createContext, useContext } from "react";

/**
 * Identidad visual de un formulario, distinta por sección.
 *
 * El color por sección ya existía (`ModuleTone`) pero solo llegaba al hero y
 * al banner: ningún formulario lo consumía, así que todas las pantallas se
 * veían igual. Este tema baja ese mismo criterio al interior de los
 * formularios y, además del acento, cambia el tratamiento de la etiqueta, del
 * control y de la barra de acciones para que cada sección se reconozca de
 * entrada.
 *
 * Se propaga por contexto (ver `FormShell`): los controles lo leen solos, así
 * que una sección cambia de aspecto con una sola línea en vez de reescribir
 * veinte campos.
 *
 * Este archivo solo lleva el tema y el contexto; los componentes viven en
 * `form-parts.tsx` para no mezclar exports de componente y de valor en el
 * mismo módulo.
 */
export type FormSection =
  | "pacientes"
  | "historia"
  | "odontograma"
  | "tratamiento"
  | "evolucion"
  | "pagos"
  | "agenda"
  | "archivos"
  | "presupuestos"
  | "admin"
  | "auth"
  | "portal";

export interface FormTheme {
  /** Ritmo vertical del formulario. */
  shell: string;
  /** Encabezado de un bloque con título. */
  eyebrow: string;
  /** Etiqueta de campo. */
  label: string;
  /** Texto de ayuda bajo el campo. */
  hint: string;
  /** Control: input, textarea y disparador de select. */
  control: string;
  /** Opción del desplegable. */
  item: string;
  /** Contenedor de un bloque de campos. */
  group: string;
  /** Barra de acciones (guardar / cancelar). */
  actions: string;
  /** Cifras y montos. */
  numerico: string;
}

/**
 * Tema por defecto: vacío a propósito. Un control fuera de `FormShell` no
 * recibe clases extra y se comporta exactamente como antes de este sistema.
 */
const NEUTRAL: FormTheme = {
  shell: "",
  eyebrow: "",
  label: "",
  hint: "",
  control: "",
  item: "",
  group: "",
  actions: "",
  numerico: "",
};

/**
 * `pacientes` — ficha y alta. Paneles agrupados con etiqueta en azul de marca:
 * es la sección más densa, donde conviene ver de un golpe qué grupo es cuál.
 */
const PACIENTES: FormTheme = {
  shell: "flex flex-col gap-5",
  eyebrow: "flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-brand-700",
  label: "text-[11px] font-bold uppercase tracking-[0.08em] text-brand-700",
  hint: "text-ios text-[12px] leading-relaxed text-ink-muted",
  control: "border-line-field bg-white",
  item: "data-[highlighted]:bg-brand-50",
  group: "flex flex-col gap-4 rounded-panel border border-ink/[0.07] bg-surface-sunken/60 p-4",
  actions: "mt-1 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4",
  numerico: "tabular-nums",
};

/**
 * `historia` — la historia clínica se lee como un documento, no como un
 * formulario. Los controles pierden su caja y quedan subrayados: el texto
 * parece parte de la historia y solo se vuelve campo al enfocarlo. Las
 * etiquetas van en versalitas suaves para no competir con el contenido.
 */
const HISTORIA: FormTheme = {
  shell: "flex flex-col gap-3",
  eyebrow: "flex items-center gap-2 text-[11px] font-semibold tracking-[0.06em] text-pastel-violet-fg",
  label: "text-[11px] font-medium normal-case tracking-normal text-ink-muted",
  hint: "text-ios text-[12px] leading-relaxed text-ink-muted",
  control:
    "rounded-lg border border-transparent border-b-line-field bg-transparent px-2 shadow-none hover:border-line hover:bg-surface-sunken/70 focus-visible:border-transparent focus-visible:bg-white",
  item: "data-[highlighted]:bg-pastel-violet-bg",
  group: "flex flex-col gap-3",
  actions: "flex flex-wrap items-center justify-end gap-2 pt-1",
  numerico: "tabular-nums",
};

/**
 * `pagos` — libro mayor. Etiqueta verde en versalitas, controles de radio
 * corto y barra de acciones sobre una banda teñida: los importes se leen
 * como una columna contable y no como un formulario más.
 */
const PAGOS: FormTheme = {
  shell: "flex flex-col gap-4",
  eyebrow: "flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-pastel-green-fg",
  label: "text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft",
  hint: "text-ios text-[12px] leading-relaxed text-ink-muted",
  control: "rounded-tile border-line-field bg-white",
  item: "data-[highlighted]:bg-pastel-green-bg",
  group: "flex flex-col gap-4 rounded-panel border border-pastel-green-fg/20 bg-pastel-green-bg/35 p-4",
  actions:
    "flex flex-wrap items-center gap-2 rounded-panel border border-pastel-green-fg/20 bg-pastel-green-bg/45 px-4 py-3",
  numerico: "tabular-nums font-semibold",
};

const ODONTOGRAMA: FormTheme = {
  ...NEUTRAL,
  shell: "flex flex-col gap-3",
  label: "text-[11px] font-bold uppercase tracking-[0.08em] text-brand-600",
  control: "rounded-tile border-line-field bg-white",
  item: "data-[highlighted]:bg-brand-50",
  group: "flex flex-col gap-3 rounded-tile border border-ink/[0.07] bg-surface-sunken/60 p-3",
  actions: "flex flex-wrap items-center gap-2",
  numerico: "tabular-nums",
};

const TRATAMIENTO: FormTheme = {
  ...NEUTRAL,
  shell: "flex flex-col gap-3",
  label: "text-[11px] font-bold uppercase tracking-[0.08em] text-pastel-yellow-fg",
  control: "rounded-tile border-line-field bg-white",
  item: "data-[highlighted]:bg-pastel-yellow-bg",
  group: "flex flex-col gap-3 rounded-tile border border-pastel-yellow-fg/25 bg-pastel-yellow-bg/40 p-3",
  actions: "flex flex-wrap items-center gap-2",
  numerico: "tabular-nums",
};

const EVOLUCION: FormTheme = {
  ...NEUTRAL,
  shell: "flex flex-col gap-4",
  label: "text-[11px] font-bold uppercase tracking-[0.08em] text-pastel-green-fg",
  control: "border-line-field bg-white",
  item: "data-[highlighted]:bg-pastel-green-bg",
  group: "flex flex-col gap-4 rounded-panel border border-pastel-green-fg/20 bg-pastel-green-bg/30 p-4",
  actions: "flex flex-wrap items-center justify-end gap-2 pt-1",
  numerico: "tabular-nums",
};

const AGENDA: FormTheme = {
  ...NEUTRAL,
  shell: "flex flex-col gap-4",
  label: "text-[11px] font-bold uppercase tracking-[0.08em] text-brand-700",
  control: "border-line-field bg-white",
  item: "data-[highlighted]:bg-brand-50",
  group: "flex flex-col gap-4 rounded-panel border border-ink/[0.07] bg-surface-sunken/60 p-4",
  actions: "flex flex-wrap items-center justify-end gap-2 pt-1",
  numerico: "tabular-nums",
};

const ARCHIVOS: FormTheme = {
  ...NEUTRAL,
  shell: "flex flex-col gap-4",
  label: "text-[11px] font-bold uppercase tracking-[0.08em] text-pastel-violet-fg",
  control: "border-line-field bg-white",
  item: "data-[highlighted]:bg-pastel-violet-bg",
  group: "flex flex-col gap-4 rounded-panel border border-pastel-violet-fg/20 bg-pastel-violet-bg/30 p-4",
  actions: "flex flex-wrap items-center justify-end gap-2 pt-1",
};

const PRESUPUESTOS: FormTheme = {
  ...NEUTRAL,
  shell: "flex flex-col gap-4",
  label: "text-[11px] font-bold uppercase tracking-[0.08em] text-pastel-yellow-fg",
  control: "rounded-tile border-line-field bg-white",
  item: "data-[highlighted]:bg-pastel-yellow-bg",
  group: "flex flex-col gap-4 rounded-panel border border-pastel-yellow-fg/25 bg-pastel-yellow-bg/35 p-4",
  actions:
    "flex flex-wrap items-center gap-2 rounded-panel border border-pastel-yellow-fg/25 bg-pastel-yellow-bg/45 px-4 py-3",
  numerico: "tabular-nums font-semibold",
};

const ADMIN: FormTheme = {
  ...NEUTRAL,
  shell: "flex flex-col gap-4",
  label: "text-[11px] font-bold uppercase tracking-[0.08em] text-pastel-violet-fg",
  control: "border-line-field bg-white",
  item: "data-[highlighted]:bg-pastel-violet-bg",
  group: "flex flex-col gap-4 rounded-panel border border-pastel-violet-fg/20 bg-pastel-violet-bg/30 p-4",
  actions: "flex flex-wrap items-center justify-end gap-2 pt-1",
};

const AUTH: FormTheme = {
  ...NEUTRAL,
  shell: "flex flex-col gap-5",
  label: "text-[11px] font-semibold normal-case tracking-normal text-ink-soft",
  control: "border-transparent bg-white/90 shadow-none focus-visible:bg-white",
  item: "data-[highlighted]:bg-brand-50",
  group: "flex flex-col gap-4",
  actions: "flex flex-col gap-3",
};

/**
 * `portal` — el paciente no es usuario técnico: controles más altos, menos
 * ruido y etiquetas en lenguaje claro.
 */
const PORTAL: FormTheme = {
  ...NEUTRAL,
  shell: "flex flex-col gap-5",
  label: "text-[12px] font-semibold normal-case tracking-normal text-ink-soft",
  control: "h-12 border-line-field bg-white/90 focus-visible:bg-white",
  item: "data-[highlighted]:bg-brand-50",
  group: "flex flex-col gap-4 rounded-panel border border-white/40 bg-white/45 p-4",
  actions: "flex flex-col gap-2 pt-1",
};

export const FORM_THEME: Record<FormSection, FormTheme> = {
  pacientes: PACIENTES,
  historia: HISTORIA,
  odontograma: ODONTOGRAMA,
  tratamiento: TRATAMIENTO,
  evolucion: EVOLUCION,
  pagos: PAGOS,
  agenda: AGENDA,
  archivos: ARCHIVOS,
  presupuestos: PRESUPUESTOS,
  admin: ADMIN,
  auth: AUTH,
  portal: PORTAL,
};

export const FormThemeContext = createContext<FormTheme>(NEUTRAL);

/** Tema de la sección activa. Vacío si el control está fuera de un `FormShell`. */
export function useFormTheme(): FormTheme {
  return useContext(FormThemeContext);
}

export function formThemeFor(section: FormSection): FormTheme {
  return FORM_THEME[section];
}

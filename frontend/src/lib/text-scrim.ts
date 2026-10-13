/**
 * Velo oscuro para texto blanco sobre un degradado de módulo.
 *
 * Los degradados de módulo (`TONE_GRADIENT`, `GRADIENTE_SECCION`) terminan en
 * un tono claro a propósito — es lo que les da vida — pero un tono claro con
 * texto blanco encima da ~2-3:1 de contraste, muy por debajo del 4.5:1 de
 * WCAG AA. Este velo resuelve eso sin tocar los colores de identidad: oscurece
 * fuerte donde vive el texto (la izquierda, en los paneles con layout "texto a
 * la izquierda, color a la derecha") y se desvanece hacia la derecha, donde
 * solo hay decoración.
 *
 * Única fuente: antes vivía solo en `section-hero.tsx`, así que los paneles
 * que lo necesitaban del mismo modo (`PortalSubHeader`, `CardAcceso`) no lo
 * tenían y el texto quedaba ilegible en el extremo claro del degradado.
 */
export const TEXT_SCRIM_STRONG =
  "linear-gradient(to right, rgba(22,35,58,0.93) 0%, rgba(22,35,58,0.78) 38%, rgba(22,35,58,0.28) 64%, rgba(22,35,58,0.06) 100%)";

/**
 * Velo tenue: para fotos/degradados SIN texto encima (`SectionHeroStrip`),
 * donde no hay nada que proteger y solo hace falta una sombra de borde
 * apenas perceptible. 0.42 de pico (el valor original) ya se leía como una
 * capa oscura tapando la foto, que es justo lo que este velo no debería
 * hacer cuando no hay texto que justifique oscurecer nada.
 */
export const TEXT_SCRIM_LIGHT =
  "linear-gradient(to right, rgba(22,35,58,0.16) 0%, rgba(22,35,58,0.06) 55%, rgba(22,35,58,0) 100%)";

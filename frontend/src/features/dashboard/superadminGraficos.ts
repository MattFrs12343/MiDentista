/**
 * Agregaciones para gráficos del dashboard del superadministrador (T-13.7).
 *
 * Lógica pura: toma los conteos derivados de las filas de Supabase (los calcula
 * `dashboardSuperadminService` sobre lo ya consultado) y los convierte en
 * `SerieGrafica` para los SVG. Sin React, sin consultas y sin librerías.
 */

import type { PuntoSerie, SerieGrafica } from "./tipos";
import type { ConteoUsuariosPorRol, DistribucionClinicasEstado } from "./superadminResumen";

/** Serie de usuarios agrupados por rol. */
export function serieUsuariosPorRol(conteo: ConteoUsuariosPorRol): SerieGrafica {
  const puntos: PuntoSerie[] = conteo.items.map((it) => ({
    etiqueta: it.rol,
    valor: it.cantidad,
  }));

  return {
    id: "usuarios-por-rol",
    titulo: "Usuarios por rol",
    puntos,
    unidad: conteo.total === 1 ? "usuario" : "usuarios",
  };
}

/** Serie de clínicas activas vs inactivas. */
export function serieClinicasPorEstado(dist: DistribucionClinicasEstado): SerieGrafica {
  const puntos: PuntoSerie[] = [
    { etiqueta: "Activas", valor: dist.activas },
    { etiqueta: "Inactivas", valor: dist.inactivas },
  ];

  return {
    id: "clinicas-por-estado",
    titulo: "Clínicas activas vs inactivas",
    puntos,
    unidad: dist.total === 1 ? "clínica" : "clínicas",
  };
}

/**
 * Lógica pura del panel del superadministrador (T-13.2).
 *
 * Este archivo no importa React ni Supabase ni ningún `.tsx`: separa el
 * conteo de filas de la consulta y del render, para poder probarlo con
 * `node --test`, igual que `dashboardCards.ts` o `clinica-calor.ts`.
 *
 * El panel del superadmin (US-13.1) resume el sistema entero: cuántas clínicas
 * hay (totales y activas) y cuántos usuarios (activos y totales). No define
 * ninguna métrica de negocio nueva: solo cuenta lo que existe.
 */

import type { Indicador } from "./tipos";

/** Proyección mínima de una fila de `public.clinicas`. */
export interface FilaClinica {
  activo: boolean;
}

/** Proyección mínima de una fila de `public.perfiles`. */
export interface FilaPerfil {
  rol: string;
  activo: boolean;
}

export interface ConteoClinicas {
  total: number;
  activas: number;
}

export interface ConteoUsuarios {
  total: number;
  activos: number;
}

/** Resumen del sistema que alimenta las tarjetas del panel. */
export interface ResumenSuperadmin {
  clinicas: ConteoClinicas;
  usuarios: ConteoUsuarios;
  /**
   * Agregaciones para los gráficos del panel (T-13.7). Son opcionales porque
   * `crearResumenVacio` y `resumirSuperadmin` (T-13.2) describen solo los
   * conteos; el servicio las añade a partir de las mismas filas ya consultadas.
   */
  usuariosPorRol?: ConteoUsuariosPorRol;
  clinicasPorEstado?: DistribucionClinicasEstado;
}

/** Conteo de usuarios por rol (valores no vacíos y no nulos). */
export interface ConteoRol {
  rol: string;
  cantidad: number;
}

export interface ConteoUsuariosPorRol {
  total: number;
  items: ConteoRol[];
}

/** Distribución de clínicas activas/inactivas. */
export interface DistribucionClinicasEstado {
  activas: number;
  inactivas: number;
  total: number;
}

/** Resumen en ceros: estado inicial antes de la respuesta del servidor. */
export function crearResumenVacio(): ResumenSuperadmin {
  return {
    clinicas: { total: 0, activas: 0 },
    usuarios: { total: 0, activos: 0 },
  };
}

/**
 * Cuenta las clínicas totales y las activas.
 *
 * `activo` puede venir nulo en bases viejas; un valor falsy (null, undefined,
 * false) cuenta como inactiva, nunca como activa. El total es el largo del
 * arreglo, no la suma de activas: una clínica inactiva sigue existiendo.
 */
export function contarClinicas(clinicas: readonly FilaClinica[]): ConteoClinicas {
  let activas = 0;
  for (const clinica of clinicas) {
    if (clinica.activo) activas++;
  }
  return { total: clinicas.length, activas };
}

/**
 * Cuenta los usuarios totales y los activos.
 *
 * Mismo criterio que las clínicas: `activo` falsy no se cuenta como activo, y
 * el total incluye a los inactivos.
 */
export function contarUsuarios(perfiles: readonly FilaPerfil[]): ConteoUsuarios {
  let activos = 0;
  for (const perfil of perfiles) {
    if (perfil.activo) activos++;
  }
  return { total: perfiles.length, activos };
}

export function resumirSuperadmin(
  clinicas: readonly FilaClinica[],
  perfiles: readonly FilaPerfil[],
): ResumenSuperadmin {
  return {
    clinicas: contarClinicas(clinicas),
    usuarios: contarUsuarios(perfiles),
  };
}

/** Cuenta usuarios por rol, ignorando filas con `rol` nulo/vacío. */
export function contarUsuariosPorRol(perfiles: readonly FilaPerfil[]): ConteoUsuariosPorRol {
  const mapa = new Map<string, number>();
  let total = 0;

  for (const p of perfiles) {
    total += 1;
    const clave = p.rol;
    if (!clave) continue;
    if (clave.trim().length === 0) continue;
    mapa.set(clave, (mapa.get(clave) ?? 0) + 1);
  }

  const items: ConteoRol[] = Array.from(mapa.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([rol, cantidad]) => ({ rol, cantidad }));

  return { total, items };
}

/** Distribución de clínicas activas/inactivas a partir de las filas. */
export function distribuirClinicasPorEstado(clinicas: readonly FilaClinica[]): DistribucionClinicasEstado {
  let total = 0;
  let activas = 0;
  for (const c of clinicas) {
    total += 1;
    if (c.activo === true) activas += 1;
  }
  const inactivas = total - activas;
  return { activas, inactivas, total };
}

/**
 * ¿No hay nada que mostrar?
 *
 * Solo cuando no existe ni una clínica ni un usuario. Un resumen con totales
 * en cero pero con filas inactivas no es "vacío": la cifra cero es real y se
 * muestra como tal. Se usa como predicado de `DashboardEmptyState`.
 */
export function estaVacioResumen(resumen: ResumenSuperadmin): boolean {
  return resumen.clinicas.total === 0 && resumen.usuarios.total === 0;
}

/**
 * Arma las tarjetas del panel a partir del resumen.
 *
 * Los `icono` son nombres del registro de `DashboardStatCard` (`Buildings` y
 * `UsersThree`). Los valores se formatean con `String`: el conteo es un número
 * real, nunca un valor fijo.
 */
export function indicadoresSuperadmin(resumen: ResumenSuperadmin): Indicador[] {
  return [
    {
      id: "clinicas-totales",
      etiqueta: "Clínicas",
      valor: String(resumen.clinicas.total),
      icono: "Buildings",
      tono: "blue",
    },
    {
      id: "clinicas-activas",
      etiqueta: "Clínicas activas",
      valor: String(resumen.clinicas.activas),
      icono: "Buildings",
      tono: "green",
    },
    {
      id: "usuarios-activos",
      etiqueta: "Usuarios activos",
      valor: String(resumen.usuarios.activos),
      icono: "UsersThree",
      tono: "violet",
    },
    {
      id: "usuarios-totales",
      etiqueta: "Usuarios",
      valor: String(resumen.usuarios.total),
      icono: "UsersThree",
      tono: "neutral",
    },
  ];
}

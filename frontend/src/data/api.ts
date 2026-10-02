import type { Role } from "@/types";

export interface Clinica {
  id: string;
  nombre: string;
  slug: string;
  ciudad: string | null;
  pais: string | null;
  email: string | null;
  telefono: string | null;
}

/** Cuenta de personal resuelta desde la BD, ya con su clínica asociada. */
export interface Cuenta {
  email: string;
  nombre: string;
  rol: Role;
  especialidad: string | null;
  clinica: string;
  clinicaSlug: string;
  ciudad: string | null;
}

export class ApiError extends Error {
  readonly estado: number;

  constructor(message: string, estado: number) {
    super(message);
    this.name = "ApiError";
    this.estado = estado;
  }
}

async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`/api${ruta}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor de la clínica", 0);
  }

  const cuerpo = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    throw new ApiError(
      (cuerpo as { error?: string } | null)?.error ?? "Ocurrió un error inesperado",
      respuesta.status,
    );
  }

  return cuerpo as T;
}

export function listarClinicas(signal?: AbortSignal): Promise<Clinica[]> {
  return pedir<Clinica[]>("/clinicas", { signal });
}

export function resolverCuenta(correo: string): Promise<Cuenta> {
  return pedir<Cuenta>("/sesion", {
    method: "POST",
    body: JSON.stringify({ correo }),
  });
}

import type { Role } from "@/types";

interface StaffRecord {
  nombre: string;
  rol: Role;
}

const staffDirectory: Record<string, StaffRecord> = {
  "ayrthon.rojas@dentalcristorey.bo": { nombre: "Ayrthon Rojas", rol: "odontologo_admin" },
  "carla.fernandez@dentalcristorey.bo": { nombre: "Carla Fernández", rol: "odontologo" },
  "maria.lopez@dentalcristorey.bo": { nombre: "María López", rol: "recepcionista" },
};

function nombreDesdeCorreo(correo: string) {
  return correo
    .split("@")[0]
    .split(".")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export function resolverCuentaPorCorreo(correo: string): StaffRecord {
  const registrado = staffDirectory[correo.trim().toLowerCase()];
  if (registrado) return registrado;
  return { nombre: nombreDesdeCorreo(correo) || "Usuario", rol: "odontologo" };
}

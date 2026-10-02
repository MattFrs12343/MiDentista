import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Sesion, Role } from "@/types";
import type { Cuenta } from "@/data/api";

interface AuthState {
  sesion: Sesion | null;
  iniciarSesion: (cuenta: Cuenta, recordar?: boolean) => void;
  cerrarSesion: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const CLAVE = "midentista:sesion";

const ROLES: readonly Role[] = ["odontologo_admin", "odontologo", "recepcionista"];

function esSesion(valor: unknown): valor is Sesion {
  if (typeof valor !== "object" || valor === null) return false;
  const s = valor as Record<string, unknown>;
  return (
    typeof s.nombre === "string" &&
    typeof s.clinica === "string" &&
    ROLES.includes(s.rol as Role)
  );
}

function leerSesion(): Sesion | null {
  for (const store of [sessionStorage, localStorage]) {
    try {
      const crudo = store.getItem(CLAVE);
      if (!crudo) continue;
      const parsed: unknown = JSON.parse(crudo);
      if (esSesion(parsed)) return parsed;
    } catch {
      // storage bloqueado: se ignora y se sigue solo con memoria
    }
  }
  return null;
}

function borrarSesion() {
  for (const store of [sessionStorage, localStorage]) {
    try {
      store.removeItem(CLAVE);
    } catch {
      // sin permisos de storage
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(leerSesion);
  const [recordar, setRecordar] = useState<boolean>(() => {
    try {
      return localStorage.getItem(CLAVE) !== null;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!sesion) return;
    try {
      const destino = recordar ? localStorage : sessionStorage;
      destino.setItem(CLAVE, JSON.stringify(sesion));
      if (recordar) sessionStorage.removeItem(CLAVE);
      else localStorage.removeItem(CLAVE);
    } catch {
      // modo privado o cuota llena: la sesion sigue viva solo en memoria
    }
  }, [sesion, recordar]);

  // La clínica y el nombre del profesional llegan resueltos desde la BD: cada
  // afiliado ve los suyos, no un valor fijo en el bundle.
  const iniciarSesion = (cuenta: Cuenta, mantener = false) => {
    setRecordar(mantener);
    setSesion({
      nombre: cuenta.nombre,
      rol: cuenta.rol,
      clinica: cuenta.clinica,
      clinicaSlug: cuenta.clinicaSlug,
      ciudad: cuenta.ciudad,
      email: cuenta.email,
      especialidad: cuenta.especialidad,
    });
  };

  const cerrarSesion = () => {
    borrarSesion();
    setRecordar(false);
    setSesion(null);
  };

  return (
    <AuthContext.Provider value={{ sesion, iniciarSesion, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}

export const ROLE_LABEL: Record<Role, string> = {
  odontologo_admin: "Odontólogo administrador",
  odontologo: "Odontólogo",
  recepcionista: "Recepcionista",
};

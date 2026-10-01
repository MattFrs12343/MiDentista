import { createContext, useContext, useState, type ReactNode } from "react";
import type { Sesion, Role } from "@/types";

interface AuthState {
  sesion: Sesion | null;
  iniciarSesion: (nombre: string, rol: Role) => void;
  cerrarSesion: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);

  const iniciarSesion = (nombre: string, rol: Role) => {
    setSesion({ nombre, rol, clinica: "Dental Cristo Rey" });
  };

  const cerrarSesion = () => setSesion(null);

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

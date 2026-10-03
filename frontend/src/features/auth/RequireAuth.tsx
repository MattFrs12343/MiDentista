import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/features/auth/AuthContext";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { sesion, cargando } = useAuth();
  // Mientras se resuelve la sesión inicial (getSession + lookup de perfil)
  // no redirigimos todavía: evita un flash a /login en cada recarga.
  if (cargando) return null;
  if (!sesion) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

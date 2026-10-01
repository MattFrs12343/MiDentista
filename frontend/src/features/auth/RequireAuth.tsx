import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/features/auth/AuthContext";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { sesion } = useAuth();
  if (!sesion) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

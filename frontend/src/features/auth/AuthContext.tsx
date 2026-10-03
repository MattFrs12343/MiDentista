import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Sesion, Role } from "@/types";
import { obtenerSupabase } from "@/lib/supabase";

interface AuthState {
  sesion: Sesion | null;
  /** true mientras se resuelve la sesión inicial (getSession + lookup de perfil). */
  cargando: boolean;
  iniciarSesion: (sesion: Sesion) => void;
  cerrarSesion: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * Dado un usuario de Supabase Auth ya autenticado, busca su perfil (nombre,
 * rol, clínica). RLS permite a cualquier usuario ver su propia fila de
 * `perfiles` (auth_user_id = auth.uid()), así que esta consulta no necesita
 * ningún privilegio especial.
 */
export async function resolverSesionDesdeUsuario(email: string | undefined): Promise<Sesion | null> {
  if (!email) return null;
  const supabase = obtenerSupabase();
  const { data } = await supabase
    .from("perfiles")
    .select("nombre_completo, rol, especialidad, activo, clinicas(nombre, slug, ciudad, activo)")
    .ilike("email", email)
    .eq("activo", true)
    .maybeSingle();

  if (!data) return null;
  const clinica = Array.isArray(data.clinicas) ? data.clinicas[0] : data.clinicas;
  // El superadmin no pertenece a ninguna clínica (solo audita el sistema),
  // así que para esa cuenta no exigimos una clínica activa.
  const esSuperadmin = data.rol === "superadmin";
  if (!esSuperadmin && !clinica?.activo) return null;

  return {
    nombre: data.nombre_completo,
    rol: data.rol as Role,
    clinica: esSuperadmin ? null : clinica.nombre,
    clinicaSlug: esSuperadmin ? null : clinica.slug,
    ciudad: esSuperadmin ? null : clinica.ciudad,
    email,
    especialidad: data.especialidad,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const supabase = obtenerSupabase();
    let activo = true;

    const procesarSesion = async (session: Session | null) => {
      const resuelta = await resolverSesionDesdeUsuario(session?.user?.email);
      if (activo) setSesion(resuelta);
    };

    supabase.auth.getSession().then(({ data }) => {
      procesarSesion(data.session).finally(() => {
        if (activo) setCargando(false);
      });
    });

    // Mantiene la sesión sincronizada ante login/logout en otra pestaña,
    // refresco de token, etc. El login propio (iniciarSesion) ya actualiza
    // el estado al toque; esto es la red de seguridad para todo lo demás.
    const { data: suscripcion } = supabase.auth.onAuthStateChange((_evento, session) => {
      procesarSesion(session);
    });

    return () => {
      activo = false;
      suscripcion.subscription.unsubscribe();
    };
  }, []);

  const iniciarSesion = (nueva: Sesion) => {
    setSesion(nueva);
    setCargando(false);
  };

  const cerrarSesion = () => {
    obtenerSupabase().auth.signOut();
    setSesion(null);
  };

  return (
    <AuthContext.Provider value={{ sesion, cargando, iniciarSesion, cerrarSesion }}>
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
  odontologo: "Odontólogo",
  odontologo_admin: "Odontólogo administrador",
  recepcionista: "Recepcionista",
  paciente: "Paciente",
  superadmin: "Administrador",
};

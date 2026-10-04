import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Sesion, Role } from "@/types";
import { obtenerSupabase } from "@/lib/supabase";

interface AuthState {
  sesion: Sesion | null;
  /** true mientras se resuelve la sesión inicial (getSession + lookup de perfil). */
  cargando: boolean;
  /** true cuando hay un usuario de Auth autenticado pero todavía no tiene fila
   * en `perfiles` (primer ingreso del paciente con Google). */
  necesitaOnboarding: boolean;
  /** true si hay un usuario autenticado en Supabase Auth, aunque todavía no
   * tenga fila en `perfiles`. Sirve para no rebotar al login durante el
   * primer ingreso. */
  hayUsuarioAuth: boolean;
  iniciarSesion: (sesion: Sesion) => void;
  cerrarSesion: () => void;
  /** Marca que el usuario autenticado está en su primer ingreso (sin perfil),
   * para no depender de una resolución asíncrona antes de navegar. */
  iniciarOnboarding: () => void;
  /** Vuelve a resolver la sesión actual (p. ej. tras crear el perfil o
   * afiliarse a una clínica). */
  refrescarSesion: () => Promise<Sesion | null>;
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
  // El superadmin no pertenece a ninguna clínica (solo audita el sistema) y el
  // paciente puede no estar afiliado todavía (completa eso en el portal), así
  // que para ninguno de los dos exigimos una clínica activa.
  const esSuperadmin = data.rol === "superadmin";
  const esPaciente = data.rol === "paciente";
  if (!esSuperadmin && !esPaciente && !clinica?.activo) return null;

  const sinClinica = !clinica;
  return {
    nombre: data.nombre_completo,
    rol: data.rol as Role,
    clinica: esSuperadmin || sinClinica ? null : clinica.nombre,
    clinicaSlug: esSuperadmin || sinClinica ? null : clinica.slug,
    ciudad: esSuperadmin || sinClinica ? null : clinica.ciudad,
    email,
    especialidad: data.especialidad,
  };
}

/** true si ya existe una fila en `perfiles` para ese correo (RLS solo deja ver
 * la propia). Sirve para distinguir "correo nuevo" (onboarding) de "cuenta
 * inactiva" (se rechaza). */
export async function existePerfilDeUsuario(email: string | undefined): Promise<boolean> {
  if (!email) return false;
  const { data } = await obtenerSupabase().from("perfiles").select("id").ilike("email", email).maybeSingle();
  return Boolean(data);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [necesitaOnboarding, setNecesitaOnboarding] = useState(false);
  const [hayUsuarioAuth, setHayUsuarioAuth] = useState(false);

  useEffect(() => {
    const supabase = obtenerSupabase();
    let activo = true;

    const procesarSesion = async (session: Session | null) => {
      const resuelta = await resolverSesionDesdeUsuario(session?.user?.email);
      let onboarding = false;
      if (!resuelta && session?.user?.email) {
        onboarding = !(await existePerfilDeUsuario(session.user.email));
      }
      if (activo) {
        setSesion(resuelta);
        setNecesitaOnboarding(onboarding);
        setHayUsuarioAuth(Boolean(session?.user));
      }
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
    setNecesitaOnboarding(false);
    setHayUsuarioAuth(true);
    setCargando(false);
  };

  const cerrarSesion = () => {
    obtenerSupabase().auth.signOut();
    setSesion(null);
    setNecesitaOnboarding(false);
    setHayUsuarioAuth(false);
  };

  const iniciarOnboarding = () => {
    setSesion(null);
    setNecesitaOnboarding(true);
    setHayUsuarioAuth(true);
    setCargando(false);
  };

  const refrescarSesion = async (): Promise<Sesion | null> => {
    const { data } = await obtenerSupabase().auth.getSession();
    const resuelta = await resolverSesionDesdeUsuario(data.session?.user?.email);
    setSesion(resuelta);
    setNecesitaOnboarding(false);
    setHayUsuarioAuth(Boolean(data.session?.user));
    return resuelta;
  };

  return (
    <AuthContext.Provider
      value={{ sesion, cargando, necesitaOnboarding, hayUsuarioAuth, iniciarSesion, cerrarSesion, iniciarOnboarding, refrescarSesion }}
    >
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

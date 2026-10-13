import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Logo, LogoMark } from "@/components/ui/logo";
import { GoogleIcon } from "@/components/ui/google-icon";
import { MeshBackground } from "@/components/ui/mesh-background";
import { AnimatedTeeth } from "@/components/ui/animated-teeth";
import { obtenerSupabase } from "@/lib/supabase";
import { useAuth, resolverSesionDesdeUsuario, existePerfilDeUsuario } from "@/features/auth/AuthContext";

export function GoogleCallbackPage() {
  const navigate = useNavigate();
  const { iniciarSesion, iniciarOnboarding } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const procesado = useRef(false);

  useEffect(() => {
    const supabase = obtenerSupabase();

    const procesarSesion = async (email: string | undefined) => {
      if (procesado.current) return;
      procesado.current = true;
      try {
        // La política de RLS de "perfiles" ya permite a cualquier usuario
        // autenticado leer su propia fila. Si todavía no existe, es un primer
        // ingreso de paciente: lo mandamos a completar el formulario en vez de
        // rechazarlo. Si existe pero no es utilizable (inactivo), sí se rechaza.
        const sesion = await resolverSesionDesdeUsuario(email);
        if (sesion) {
          iniciarSesion(sesion);
          navigate(sesion.rol === "paciente" ? "/portal" : "/app", { replace: true });
          return;
        }
        if (!(await existePerfilDeUsuario(email))) {
          // Marca el onboarding de forma síncrona antes de navegar: evita que
          // el guard de /onboarding rebote al login mientras el AuthProvider
          // todavía no resolvió la sesión de forma asíncrona.
          iniciarOnboarding();
          navigate("/onboarding", { replace: true });
          return;
        }
        throw new Error("Tu cuenta está inactiva. Contactá a la clínica.");
      } catch (fallo) {
        await supabase.auth.signOut();
        setError(fallo instanceof Error ? fallo.message : "No se pudo iniciar sesión con Google");
      }
    };

    // supabase-js detecta el token en la URL al cargar y dispara este evento
    // (o ya puede haber una sesión lista si el efecto corre después).
    const { data: suscripcion } = supabase.auth.onAuthStateChange((_evento, session) => {
      if (session) procesarSesion(session.user?.email);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) procesarSesion(data.session.user?.email);
    });

    const tiempoLimite = setTimeout(() => {
      if (!procesado.current) {
        setError("No se pudo completar el inicio de sesión con Google. Probá de nuevo.");
      }
    }, 6000);

    return () => {
      suscripcion.subscription.unsubscribe();
      clearTimeout(tiempoLimite);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 sm:p-8">
      <MeshBackground />
      <AnimatedTeeth />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[28px] border border-white/30 border-t-white/60 bg-white/55 p-6 shadow-[0_40px_100px_-30px_rgba(20,40,75,0.55)] backdrop-blur-xl sm:p-10">
        <Logo size={28} />

        {error ? (
          <div className="mt-7 flex flex-col items-center gap-4 py-2 text-center">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-pastel-red-bg text-pastel-red-fg">
              <WarningCircle size={26} weight="fill" />
            </span>
            <p className="text-sm break-words text-ink-soft">{error}</p>
            <Button type="button" onClick={() => navigate("/login")} className="w-full">
              Volver al login
            </Button>
          </div>
        ) : (
          <div className="mt-7 flex flex-col items-center gap-5 py-4 text-center">
            {/* Dos marcas, un vínculo: la "G" de Google y el diente de
                MiDentista, unidos por una línea punteada que corre en bucle —
                se lee como "conectando una cuenta con la otra", no como un
                spinner genérico que podría ser cualquier pantalla de carga. */}
            <div className="flex items-center gap-3">
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-white shadow-e2 ring-1 ring-line">
                <GoogleIcon size={26} />
              </span>

              <svg width="40" height="12" viewBox="0 0 40 12" aria-hidden className="shrink-0 text-brand-300">
                <line
                  x1="2" y1="6" x2="38" y2="6"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="0.5 7"
                  className="google-callback-enlace"
                />
              </svg>

              <span className="relative grid size-14 shrink-0 place-items-center">
                <svg viewBox="0 0 56 56" aria-hidden className="absolute inset-0 h-full w-full">
                  <circle cx="28" cy="28" r="25" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-brand-100" />
                  <circle
                    cx="28" cy="28" r="25" fill="none" stroke="currentColor" strokeWidth="3"
                    strokeLinecap="round" strokeDasharray="44 113"
                    className="anillo-cargando text-brand-500"
                  />
                </svg>
                <span className="relative grid size-11 place-items-center rounded-full bg-brand-50">
                  <LogoMark size={22} />
                </span>
              </span>
            </div>

            <p className="text-sm text-ink-soft">Conectando tu cuenta de Google con MiDentista…</p>
          </div>
        )}
      </div>
    </div>
  );
}

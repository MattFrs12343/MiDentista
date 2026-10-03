import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import logoMark from "@/assets/banners/logo-mark.jpg";
import { Button } from "@/components/ui/button";
import { MeshBackground } from "@/components/ui/mesh-background";
import { AnimatedTeeth } from "@/components/ui/animated-teeth";
import { obtenerSupabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError, resolverCuentaGoogle } from "@/data/api";

export function GoogleCallbackPage() {
  const navigate = useNavigate();
  const { iniciarSesion } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const procesado = useRef(false);

  useEffect(() => {
    const supabase = obtenerSupabase();

    const procesarSesion = async (accessToken: string) => {
      if (procesado.current) return;
      procesado.current = true;
      try {
        const cuenta = await resolverCuentaGoogle(accessToken);
        iniciarSesion(cuenta, true);
        navigate("/app", { replace: true });
      } catch (fallo) {
        await supabase.auth.signOut();
        setError(fallo instanceof ApiError ? fallo.message : "No se pudo iniciar sesión con Google");
      }
    };

    // supabase-js detecta el token en la URL al cargar y dispara este evento
    // (o ya puede haber una sesión lista si el efecto corre después).
    const { data: suscripcion } = supabase.auth.onAuthStateChange((_evento, session) => {
      if (session?.access_token) procesarSesion(session.access_token);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.access_token) procesarSesion(data.session.access_token);
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

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[28px] border border-white/30 border-t-white/60 bg-white/55 p-8 shadow-[0_40px_100px_-30px_rgba(20,40,75,0.55)] backdrop-blur-xl sm:p-12">
        <img src={logoMark} alt="MiDentista" className="h-8 w-auto object-contain" />

        {error ? (
          <div className="mt-8 flex flex-col items-center gap-4 py-4 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-pastel-red-bg text-pastel-red-fg">
              <WarningCircle size={26} weight="fill" />
            </span>
            <p className="text-sm text-ink-soft">{error}</p>
            <Button type="button" onClick={() => navigate("/login")} className="w-full">
              Volver al login
            </Button>
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center gap-3 py-6 text-center">
            <SpinnerGap size={28} className="animate-spin text-ink-soft" />
            <p className="text-sm text-ink-soft">Iniciando sesión con Google…</p>
          </div>
        )}
      </div>
    </div>
  );
}

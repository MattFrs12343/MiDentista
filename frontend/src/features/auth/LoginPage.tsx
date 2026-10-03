import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, SpinnerGap, Tooth, WarningCircle } from "@phosphor-icons/react";
import logoBadge from "@/assets/banners/logo-badge.jpg";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { GoogleIcon } from "@/components/ui/google-icon";
import { Input } from "@/components/ui/input";
import { MeshBackground } from "@/components/ui/mesh-background";
import { AnimatedTeeth } from "@/components/ui/animated-teeth";
import { useAuth } from "@/features/auth/AuthContext";
import { ForgotPasswordDialog } from "@/features/auth/ForgotPasswordDialog";
import { ApiError, iniciarSesionApi } from "@/data/api";
import { obtenerSupabase } from "@/lib/supabase";

// Misma validación simple que aplica el servidor: solo atajar formatos
// claramente inválidos antes de llamar a la API.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginPage() {
  const { sesion, iniciarSesion } = useAuth();
  const navigate = useNavigate();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargandoGoogle, setCargandoGoogle] = useState(false);

  if (sesion) return <Navigate to="/app" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (cargando) return;

    setError(null);

    if (!EMAIL_REGEX.test(correo.trim())) {
      setError("El correo no tiene un formato válido");
      return;
    }

    setCargando(true);

    try {
      const { sesion, session } = await iniciarSesionApi(correo.trim(), clave);
      // Establece la sesión real de Supabase (access/refresh token) para que
      // las consultas protegidas por RLS se autentiquen como este usuario.
      await obtenerSupabase().auth.setSession(session);
      iniciarSesion(sesion);
      navigate("/app", { replace: true });
    } catch (fallo) {
      setError(
        fallo instanceof ApiError ? fallo.message : "No se pudo iniciar sesión",
      );
      setCargando(false);
    }
  };

  const handleGoogle = async () => {
    if (cargandoGoogle) return;
    setError(null);
    setCargandoGoogle(true);
    try {
      const supabase = obtenerSupabase();
      const { error: fallo } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      // Si signInWithOAuth funciona, el navegador ya se está yendo a Google;
      // este código solo corre si falló antes de llegar a redirigir.
      if (fallo) {
        setError(fallo.message || "No se pudo iniciar sesión con Google");
        setCargandoGoogle(false);
      }
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo iniciar sesión con Google");
      setCargandoGoogle(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 sm:p-8">
      <MeshBackground />
      <AnimatedTeeth />

      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/30 border-t-white/60 bg-white/55 shadow-[0_40px_100px_-30px_rgba(20,40,75,0.55)] backdrop-blur-xl lg:min-h-[640px] lg:grid-cols-[1fr_1.1fr]">
        <div className="relative hidden lg:block">
          <img
            src={logoBadge}
            alt="MiDentista"
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex flex-col justify-center gap-8 p-8 sm:p-12 lg:p-14">
          {/* En desktop el isotipo va en el panel de la izquierda (logoBadge);
              en móvil, sin ese panel, un JPG con fondo blanco sólido quedaba
              como una caja fea sobre el fondo con degradé. Este lockup en
              brand-* no tiene fondo propio, así que se funde con la tarjeta. */}
          <div className="fade-in-up flex items-center gap-2 lg:hidden">
            <Tooth size={26} weight="duotone" className="text-brand-600" />
            <span className="text-lg font-semibold tracking-tight">
              <span className="text-brand-400">Mi</span>{" "}
              <span className="text-brand-800">Dentista</span>
            </span>
          </div>

          <div className="fade-in-up" style={{ animationDelay: "40ms" }}>
            <h2 className="text-[2rem] font-semibold leading-tight tracking-[-0.02em] text-ink">
              Bienvenido de vuelta
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              Ingresa con el correo con el que tu clínica te registró para continuar la atención de
              tus pacientes.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="fade-in-up" style={{ animationDelay: "80ms" }}>
              <Field label="Correo electrónico" htmlFor="correo" labelClassName="text-ink-soft">
                <Input
                  id="correo"
                  type="email"
                  required
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="tu.nombre@tuclinica.com"
                  autoComplete="username"
                  className="bg-white/90"
                />
              </Field>
            </div>

            <div className="fade-in-up" style={{ animationDelay: "120ms" }}>
              <Field label="Contraseña" htmlFor="clave" labelClassName="text-ink-soft">
                <Input
                  id="clave"
                  type="password"
                  required
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  placeholder="••••••••"
                  className="bg-white/90"
                />
              </Field>
            </div>

            <div
              className="fade-in-up flex items-center justify-end text-xs"
              style={{ animationDelay: "160ms" }}
            >
              <ForgotPasswordDialog>
                <button
                  type="button"
                  className="font-semibold text-brand-700 transition-colors hover:text-brand-800"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </ForgotPasswordDialog>
            </div>

            <div className="fade-in-up" style={{ animationDelay: "200ms" }}>
              {/* Siempre montado (incluso sin error) para que el alto de esta
                  columna no cambie al aparecer/desaparecer: en desktop esta
                  tarjeta es un grid de 2 columnas y la foto de la izquierda
                  se estira para igualar el alto de este lado, así que un
                  cambio de alto acá se sentía como que "toda la tarjeta
                  cambiaba de forma" al tipear o enviar el form. */}
              <p
                role="alert"
                aria-hidden={!error}
                className={`flex items-start gap-2 rounded-xl border px-3.5 py-3 text-sm transition-opacity duration-150 ${
                  error
                    ? "border-pastel-red-fg/25 bg-pastel-red-bg text-pastel-red-fg opacity-100"
                    : "pointer-events-none select-none border-transparent bg-transparent text-transparent opacity-0"
                }`}
              >
                <WarningCircle size={17} weight="fill" className="mt-0.5 shrink-0" />
                <span>{error || "placeholder"}</span>
              </p>

              <Button type="submit" size="lg" disabled={cargando} className="mt-1 w-full group">
                {cargando ? (
                  <>
                    <SpinnerGap size={16} className="animate-spin" /> Verificando…
                  </>
                ) : (
                  <>
                    Iniciar sesión
                    <ArrowRight
                      size={16}
                      weight="bold"
                      className="transition-transform duration-150 ease-out group-hover:translate-x-0.5"
                    />
                  </>
                )}
              </Button>

              <div className="my-4 flex items-center gap-3 text-xs text-ink-muted">
                <div className="h-px flex-1 bg-line" />
                o
                <div className="h-px flex-1 bg-line" />
              </div>

              <Button
                type="button"
                variant="secondary"
                size="lg"
                disabled={cargandoGoogle}
                onClick={handleGoogle}
                // Replica el boton oficial "Sign in with Google": fondo
                // blanco, borde gris sutil, esquinas poco redondeadas,
                // texto gris oscuro y elevacion suave solo al hover.
                className="h-11 w-full gap-3 rounded-lg border border-[#dadce0] bg-white text-[15px] font-medium text-[#3c4043] shadow-none hover:bg-[#f8f9fa] hover:shadow-[0_1px_2px_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] active:bg-[#f1f3f4]"
              >
                {cargandoGoogle ? (
                  <SpinnerGap size={16} className="animate-spin text-[#3c4043]" />
                ) : (
                  <GoogleIcon size={18} />
                )}
                Continuar con Google
              </Button>
            </div>

            <p
              className="fade-in-up text-center text-xs text-ink-soft"
              style={{ animationDelay: "230ms" }}
            >
              El rol y los permisos quedan definidos por la cuenta de tu clínica.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

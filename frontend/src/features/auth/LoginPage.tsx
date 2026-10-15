import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  CheckCircle,
  Eye,
  EyeSlash,
  SpinnerGap,
  WarningCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { GoogleIcon } from "@/components/ui/google-icon";
import { Input } from "@/components/ui/input";
import { Logo, LogoMark } from "@/components/ui/logo";
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
  const [verClave, setVerClave] = useState(false);
  const [recordar, setRecordar] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargandoGoogle, setCargandoGoogle] = useState(false);

  if (sesion) return <Navigate to={sesion.rol === "paciente" ? "/portal" : "/app"} replace />;

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

      // "Mantener sesión iniciada" desmarcado: Supabase persiste en
      // localStorage por defecto (sobrevive a cerrar el navegador), así que
      // sin un storage propio por sesión la única forma de desarmar eso sin
      // tocar el cliente compartido es cerrar sesión al cerrar la pestaña.
      // `scope: "local"` es limpieza sincrónica de storage, no un pedido de
      // red: llega a tiempo en `beforeunload`, a diferencia de un signOut
      // normal (que sí golpea al servidor y el navegador puede cortarlo a
      // mitad de camino).
      if (!recordar) {
        window.addEventListener("beforeunload", () => {
          void obtenerSupabase().auth.signOut({ scope: "local" });
        });
      }

      iniciarSesion(sesion);
      navigate(sesion.rol === "paciente" ? "/portal" : "/app", { replace: true });
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

      <div className="fade-in-up relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/30 border-t-white/60 bg-white/55 shadow-[0_40px_100px_-30px_rgba(20,40,75,0.55)] backdrop-blur-xl lg:min-h-[640px] lg:grid-cols-[1fr_1.1fr]">
        {/* Panel de marca. Antes era `logo-badge.jpg` con `object-cover`: un JPG
            de 1200x1200 sobre fondo blanco que se leia como un cuadrado blanco
            recortado contra el degradé de la tarjeta. Ahora es un degradé claro
            en tokens brand-* con dos manchas suaves y una trama de puntos: el
            logo (SVG, sin fondo) queda flotando, sin caja detrás. */}
        <div className="relative hidden overflow-hidden lg:block">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-brand-100 to-brand-200" />
          <div className="mesh-blob-a absolute -left-1/4 -top-1/3 h-[70%] w-[70%] rounded-full bg-brand-300/45 blur-3xl" />
          <div className="mesh-blob-b absolute -bottom-1/3 -right-1/4 h-[75%] w-[75%] rounded-full bg-brand-400/35 blur-3xl" />
          <div
            aria-hidden
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(28,60,92,0.16) 1px, transparent 0)",
              backgroundSize: "22px 22px",
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/70 to-transparent" />

          <div className="relative flex h-full flex-col justify-between gap-10 p-10 xl:p-12">
            <Logo size={34} className="fade-in-up" />

            <div className="fade-in-up flex flex-col gap-5" style={{ animationDelay: "60ms" }}>
              <p className="max-w-[26ch] text-lg font-semibold leading-snug tracking-tight text-brand-900">
                La consulta de tu clínica, ordenada de punta a punta.
              </p>
              <ul className="flex flex-col gap-2.5 text-sm text-ink-soft">
                <li className="flex items-start gap-2.5">
                  <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-brand-600" />
                  Agenda, historia clínica y odontograma del paciente
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-brand-600" />
                  Presupuestos, pagos y cuentas al día
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-brand-600" />
                  Portal privado para cada paciente
                </li>
              </ul>
            </div>

            <p className="fade-in-up text-xs text-ink-muted" style={{ animationDelay: "120ms" }}>
              MiDentista · Software de gestión odontológica
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:justify-center">
          {/* En desktop el logo y la bajada viven en el panel de branding de la
              izquierda; acá es la versión compacta para cuando ese panel no se
              renderiza (móvil/tablet) — antes era solo el isotipo suelto sobre
              el vidrio, sin ningún color propio, así que el login se sentía sin
              marca hasta el formulario. Mismo degradé ya probado en el resto de
              la app (oscuro → brand-600, nunca hasta el extremo claro): texto
              blanco encima necesita ese piso de contraste. */}
          <div className="relative overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 px-5 pt-5 pb-7 sm:px-10 sm:pt-8 sm:pb-14 lg:hidden">
            <div className="mesh-blob-a absolute -right-1/4 -top-1/2 h-[160%] w-[65%] rounded-full bg-white/10 blur-3xl" />
            <div className="relative flex items-center gap-2.5">
              <LogoMark size={28} className="text-white" />
              <span className="text-[1.15rem] font-semibold tracking-tight text-white">
                <span className="text-brand-200">Mi</span>Dentista
              </span>
            </div>
            <p className="relative mt-2 max-w-[30ch] text-[13px] leading-snug text-white/85">
              La consulta de tu clínica, ordenada de punta a punta.
            </p>

            {/* Ola en vez de borde recto: sin esto, la franja de marca y el
                formulario blanco se leían como dos rectángulos apilados con
                una línea dura en el medio — mismo lenguaje que la ola de la
                barra de navegación móvil (`MobileTabBar`), para que el corte
                se sienta parte del mismo sistema visual. */}
            <svg
              aria-hidden
              viewBox="0 0 400 28"
              preserveAspectRatio="none"
              className="absolute inset-x-0 bottom-0 h-7 w-full translate-y-px"
            >
              <path
                d="M0,28 L0,17 C55,3 95,3 145,14 C205,27 250,11 305,6 C345,2 375,7 400,15 L400,28 Z"
                fill="white"
              />
            </svg>
          </div>

          <div className="flex flex-col gap-5 p-5 sm:gap-8 sm:p-10 lg:gap-8 lg:p-12">
          <div className="fade-in-up" style={{ animationDelay: "40ms" }}>
            <h2 className="text-[1.6rem] font-semibold leading-tight tracking-[-0.02em] text-ink min-[380px]:text-[2rem]">
              Bienvenido de vuelta
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              Ingresa con el correo con el que tu clínica te registró para continuar la atención de
              tus pacientes.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5">
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
                <div className="relative">
                  <Input
                    id="clave"
                    type={verClave ? "text" : "password"}
                    required
                    value={clave}
                    onChange={(e) => setClave(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="bg-white/90 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setVerClave((v) => !v)}
                    aria-label={verClave ? "Ocultar contraseña" : "Mostrar contraseña"}
                    aria-pressed={verClave}
                    tabIndex={-1}
                    className="press absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    {verClave ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </Field>
            </div>

            <div
              className="fade-in-up flex items-center justify-between gap-2 text-xs"
              style={{ animationDelay: "160ms" }}
            >
              <label className="flex cursor-pointer select-none items-center gap-2 text-ink-soft">
                <input
                  type="checkbox"
                  checked={recordar}
                  onChange={(e) => setRecordar(e.target.checked)}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className={`grid size-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors ${
                    recordar ? "border-brand-600 bg-brand-600" : "border-line-field bg-white"
                  }`}
                >
                  {recordar ? <Check size={12} weight="bold" className="text-white" /> : null}
                </span>
                Mantener sesión iniciada
              </label>

              <ForgotPasswordDialog>
                <button
                  type="button"
                  className="shrink-0 font-semibold text-brand-700 transition-colors hover:text-brand-800"
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
                  cambiaba de forma" al tipear o enviar el form. Ese problema
                  no existe en móvil (no hay columna que igualar), así que ahí
                  se oculta del todo sin error: reservar ~50px fijos era lo que
                  empujaba el botón de Google fuera de la pantalla. */}
              <p
                role="alert"
                aria-hidden={!error}
                className={`items-start gap-2 rounded-xl border px-3.5 py-3 text-sm transition-opacity duration-150 ${
                  error
                    ? "flex border-pastel-red-fg/25 bg-pastel-red-bg text-pastel-red-fg opacity-100"
                    : "hidden pointer-events-none select-none border-transparent bg-transparent text-transparent opacity-0 lg:flex"
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

              <div className="my-3 flex items-center gap-3 text-xs text-ink-muted sm:my-4">
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
                className="h-11 w-full gap-3 rounded-lg border border-[#dadce0] bg-white px-4 text-[15px] font-medium text-[#3c4043] shadow-none hover:bg-[#f8f9fa] hover:shadow-[0_1px_2px_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] active:bg-[#f1f3f4] sm:px-6"
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
    </div>
  );
}

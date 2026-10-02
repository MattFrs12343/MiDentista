import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import logoBadge from "@/assets/banners/logo-badge.jpg";
import logoMark from "@/assets/banners/logo-mark.jpg";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MeshBackground } from "@/components/ui/mesh-background";
import { AnimatedTeeth } from "@/components/ui/animated-teeth";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError, listarClinicas, resolverCuenta } from "@/data/api";

export function LoginPage() {
  const { sesion, iniciarSesion } = useAuth();
  const navigate = useNavigate();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [mantener, setMantener] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clinicas, setClinicas] = useState<string[]>([]);

  useEffect(() => {
    const control = new AbortController();
    listarClinicas(control.signal)
      .then((lista) => setClinicas(lista.map((c) => c.nombre)))
      .catch(() => setClinicas([]));
    return () => control.abort();
  }, []);

  if (sesion) return <Navigate to="/app" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (cargando) return;

    setCargando(true);
    setError(null);

    try {
      const cuenta = await resolverCuenta(correo);
      iniciarSesion(cuenta, mantener);
      navigate("/app", { replace: true });
    } catch (fallo) {
      setError(
        fallo instanceof ApiError ? fallo.message : "No se pudo iniciar sesión",
      );
      setCargando(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 sm:p-8">
      <MeshBackground />
      <AnimatedTeeth />

      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/30 border-t-white/60 bg-white/55 shadow-[0_40px_100px_-30px_rgba(20,40,75,0.55)] backdrop-blur-xl lg:grid-cols-[1fr_1.1fr]">
        <div className="relative hidden lg:block">
          <img
            src={logoBadge}
            alt="MiDentista"
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex flex-col justify-center gap-8 p-8 sm:p-12 lg:p-14">
          <img src={logoMark} alt="MiDentista" className="fade-in-up h-8 w-auto object-contain lg:hidden" />

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
              className="fade-in-up flex items-center justify-between text-xs"
              style={{ animationDelay: "160ms" }}
            >
              <label className="flex items-center gap-2 text-ink-soft">
                <input
                  type="checkbox"
                  checked={mantener}
                  onChange={(e) => setMantener(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-line-strong"
                />
                Mantener sesión iniciada
              </label>
              <a href="#" className="font-semibold text-brand-700 transition-colors hover:text-brand-800">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <div className="fade-in-up" style={{ animationDelay: "200ms" }}>
              {error && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-pastel-red-fg/25 bg-pastel-red-bg px-3.5 py-3 text-sm text-pastel-red-fg"
                >
                  <WarningCircle size={17} weight="fill" className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </p>
              )}

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
            </div>

            <p
              className="fade-in-up text-center text-xs text-ink-soft"
              style={{ animationDelay: "230ms" }}
            >
              {clinicas.length > 0 ? (
                clinicas.join(" · ")
              ) : (
                "El rol y los permisos quedan definidos por la cuenta de tu clínica."
              )}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

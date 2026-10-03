import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import logoMark from "@/assets/banners/logo-mark.jpg";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MeshBackground } from "@/components/ui/mesh-background";
import { AnimatedTeeth } from "@/components/ui/animated-teeth";
import { obtenerSupabase } from "@/lib/supabase";

// Misma política que ya valida el backend para las otras rutas de contraseña.
const CLAVE_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

type Estado = "verificando" | "listo-para-cambiar" | "link-invalido" | "exito";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [estado, setEstado] = useState<Estado>("verificando");
  const [claveNueva, setClaveNueva] = useState("");
  const [claveConfirmar, setClaveConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const supabase = obtenerSupabase();

    // El link del correo de recuperación hace que supabase-js establezca una
    // sesión temporal de tipo "recovery" al cargar la página (lee el token
    // del fragmento de la URL automáticamente). Si no llega ese evento ni hay
    // ya una sesión de recuperación activa, el link es inválido o expiró.
    const { data: suscripcion } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "PASSWORD_RECOVERY") setEstado("listo-para-cambiar");
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setEstado((actual) => (actual === "verificando" ? "listo-para-cambiar" : actual));
    });

    const expiracion = setTimeout(() => {
      setEstado((actual) => (actual === "verificando" ? "link-invalido" : actual));
    }, 4000);

    return () => {
      suscripcion.subscription.unsubscribe();
      clearTimeout(expiracion);
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (cargando) return;
    setError(null);

    if (!CLAVE_REGEX.test(claveNueva)) {
      setError("La contraseña debe tener al menos 8 caracteres, con letras y números");
      return;
    }
    if (claveNueva !== claveConfirmar) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setCargando(true);
    const supabase = obtenerSupabase();
    const { error: fallo } = await supabase.auth.updateUser({ password: claveNueva });
    setCargando(false);

    if (fallo) {
      setError(fallo.message || "No se pudo actualizar la contraseña");
      return;
    }

    await supabase.auth.signOut();
    setEstado("exito");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 sm:p-8">
      <MeshBackground />
      <AnimatedTeeth />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[28px] border border-white/30 border-t-white/60 bg-white/55 p-8 shadow-[0_40px_100px_-30px_rgba(20,40,75,0.55)] backdrop-blur-xl sm:p-12">
        <img src={logoMark} alt="MiDentista" className="fade-in-up h-8 w-auto object-contain" />

        {estado === "verificando" && (
          <div className="mt-8 flex flex-col items-center gap-3 py-6 text-center">
            <SpinnerGap size={28} className="animate-spin text-ink-soft" />
            <p className="text-sm text-ink-soft">Verificando tu link de recuperación…</p>
          </div>
        )}

        {estado === "link-invalido" && (
          <div className="mt-8 flex flex-col items-center gap-4 py-4 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-pastel-red-bg text-pastel-red-fg">
              <WarningCircle size={26} weight="fill" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Este link no es válido o ya expiró</p>
              <p className="mt-1 text-sm text-ink-muted">
                Volvé al login y pedí un nuevo correo de recuperación.
              </p>
            </div>
            <Button type="button" onClick={() => navigate("/login")} className="w-full">
              Volver al login
            </Button>
          </div>
        )}

        {estado === "listo-para-cambiar" && (
          <>
            <div className="fade-in-up mt-6" style={{ animationDelay: "40ms" }}>
              <h2 className="text-[1.6rem] font-semibold leading-tight tracking-[-0.02em] text-ink">
                Elegí una contraseña nueva
              </h2>
              <p className="mt-2 text-sm text-ink-soft">
                Mínimo 8 caracteres, con letras y números.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
              <Field label="Contraseña nueva" htmlFor="clave-nueva" labelClassName="text-ink-soft">
                <Input
                  id="clave-nueva"
                  type="password"
                  required
                  autoFocus
                  value={claveNueva}
                  onChange={(e) => setClaveNueva(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="bg-white/90"
                />
              </Field>

              <Field label="Confirmar contraseña" htmlFor="clave-confirmar" labelClassName="text-ink-soft">
                <Input
                  id="clave-confirmar"
                  type="password"
                  required
                  value={claveConfirmar}
                  onChange={(e) => setClaveConfirmar(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="bg-white/90"
                />
              </Field>

              {error && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-pastel-red-fg/25 bg-pastel-red-bg px-3.5 py-3 text-sm text-pastel-red-fg"
                >
                  <WarningCircle size={17} weight="fill" className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </p>
              )}

              <Button type="submit" size="lg" disabled={cargando} className="w-full group">
                {cargando ? (
                  <>
                    <SpinnerGap size={16} className="animate-spin" /> Guardando…
                  </>
                ) : (
                  <>
                    Guardar contraseña
                    <ArrowRight
                      size={16}
                      weight="bold"
                      className="transition-transform duration-150 ease-out group-hover:translate-x-0.5"
                    />
                  </>
                )}
              </Button>
            </form>
          </>
        )}

        {estado === "exito" && (
          <div className="mt-8 flex flex-col items-center gap-4 py-4 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-pastel-green-bg text-pastel-green-fg">
              <CheckCircle size={26} weight="fill" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Contraseña actualizada</p>
              <p className="mt-1 text-sm text-ink-muted">Ya podés iniciar sesión con tu contraseña nueva.</p>
            </div>
            <Button type="button" onClick={() => navigate("/login")} className="w-full">
              Ir al login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

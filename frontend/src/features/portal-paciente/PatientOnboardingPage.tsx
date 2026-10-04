import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { MeshBackground } from "@/components/ui/mesh-background";
import { AnimatedTeeth } from "@/components/ui/animated-teeth";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError, registrarPacientePortalApi } from "@/data/api";
import { obtenerSupabase } from "@/lib/supabase";

/** Primer ingreso del paciente con Google: todavía no existe su fila en
 * `perfiles`, así que completa sus datos básicos antes de buscar clínica. */
export function PatientOnboardingPage() {
  const navigate = useNavigate();
  const { sesion, cargando, hayUsuarioAuth, refrescarSesion } = useAuth();
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void obtenerSupabase()
      .auth.getUser()
      .then(({ data }) => {
        const usuario = data.user;
        if (!usuario) return;
        setEmail(usuario.email ?? "");
        const metaNombre = usuario.user_metadata?.full_name ?? usuario.user_metadata?.name;
        if (typeof metaNombre === "string") setNombreCompleto((actual) => actual || metaNombre);
      });
  }, []);

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <SpinnerGap size={28} className="animate-spin text-ink-soft" />
      </div>
    );
  }

  if (sesion) return <Navigate to={sesion.rol === "paciente" ? "/portal" : "/app"} replace />;
  if (!hayUsuarioAuth) return <Navigate to="/login" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (enviando) return;
    setError(null);
    setEnviando(true);
    try {
      await registrarPacientePortalApi({ nombreCompleto: nombreCompleto.trim(), telefono: telefono.trim() || undefined });
      const resuelta = await refrescarSesion();
      if (!resuelta) throw new Error("No se pudo iniciar tu perfil de paciente");
      navigate("/portal", { replace: true });
    } catch (fallo) {
      setError(fallo instanceof ApiError ? fallo.message : "No se pudo completar tu registro");
      setEnviando(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 sm:p-8">
      <MeshBackground />
      <AnimatedTeeth />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[28px] border border-white/30 border-t-white/60 bg-white/55 p-6 shadow-[0_40px_100px_-30px_rgba(20,40,75,0.55)] backdrop-blur-xl sm:p-10">
        <Logo size={28} />

        <div className="mt-6">
          <h2 className="text-[1.5rem] font-semibold leading-tight tracking-[-0.02em] text-ink min-[380px]:text-[1.6rem]">
            Completá tu perfil
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            Es tu primer ingreso. Contanos tus datos básicos para continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
          <Field label="Correo electrónico" htmlFor="email">
            <Input id="email" type="email" value={email} readOnly disabled className="bg-surface-sunken" />
          </Field>

          <Field label="Nombre completo" htmlFor="nombre">
            <Input
              id="nombre"
              required
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              placeholder="Ana Pérez"
              autoComplete="name"
              className="bg-white/90"
            />
          </Field>

          <Field label="Teléfono" htmlFor="telefono">
            <Input
              id="telefono"
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="77123456"
              autoComplete="tel"
              className="bg-white/90"
            />
          </Field>

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

          <Button type="submit" size="lg" disabled={enviando} className="w-full group">
            {enviando ? (
              <>
                <SpinnerGap size={16} className="animate-spin" /> Guardando…
              </>
            ) : (
              <>
                Continuar
                <ArrowRight
                  size={16}
                  weight="bold"
                  className="transition-transform duration-150 ease-out group-hover:translate-x-0.5"
                />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

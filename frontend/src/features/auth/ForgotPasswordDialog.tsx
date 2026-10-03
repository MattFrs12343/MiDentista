import { useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { obtenerSupabase } from "@/lib/supabase";

// Misma validación simple que aplica el servidor: solo atajar formatos
// claramente inválidos antes de llamar a la API.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordDialog({ children }: { children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const [correo, setCorreo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setAbierto(open);
    if (!open) {
      // Reseteamos todo para que la próxima apertura empiece limpia.
      setCorreo("");
      setCargando(false);
      setError(null);
      setEnviado(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (cargando) return;

    if (!EMAIL_REGEX.test(correo.trim())) {
      setError("El correo no tiene un formato válido");
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const { error: fallo } = await obtenerSupabase().auth.resetPasswordForEmail(correo.trim(), {
        redirectTo: `${window.location.origin}/recuperar-contrasena`,
      });
      if (fallo) throw fallo;
      setCargando(false);
      setEnviado(true);
    } catch (fallo) {
      setCargando(false);
      setError(fallo instanceof Error ? fallo.message : "No se pudo solicitar la recuperación");
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        title="Recuperar contraseña"
        description={enviado ? undefined : "Te enviaremos un correo con un link para restablecer tu contraseña."}
      >
        {enviado ? (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-pastel-green-bg text-pastel-green-fg">
              <CheckCircle size={26} weight="fill" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Revisá tu correo</p>
              <p className="mt-1 text-sm text-ink-muted">
                Si <strong>{correo.trim()}</strong> está registrado, te llegará un correo con un link
                para elegir una contraseña nueva.
              </p>
            </div>
            <Button type="button" onClick={() => handleOpenChange(false)} className="w-full">
              Cerrar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Correo electrónico" htmlFor="correo-recuperacion">
              <Input
                id="correo-recuperacion"
                type="email"
                required
                autoFocus
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="tu.nombre@tuclinica.com"
                autoComplete="username"
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

            <Button type="submit" disabled={cargando} className="w-full">
              {cargando ? (
                <>
                  <SpinnerGap size={16} className="animate-spin" /> Enviando…
                </>
              ) : (
                "Enviar correo de recuperación"
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

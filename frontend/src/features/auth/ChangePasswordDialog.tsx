import { useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError, cambiarContrasenaPropiaApi } from "@/data/api";

// Misma política que valida el servidor: solo da feedback inmediato, la
// verificación real ocurre en la API.
const CLAVE_NUEVA_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export function ChangePasswordDialog({ children }: { children: ReactNode }) {
  const { sesion } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const [claveActual, setClaveActual] = useState("");
  const [claveNueva, setClaveNueva] = useState("");
  const [confirmarClave, setConfirmarClave] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  const resetear = () => {
    setClaveActual("");
    setClaveNueva("");
    setConfirmarClave("");
    setCargando(false);
    setError(null);
    setExito(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetear();
    setAbierto(open);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (cargando) return;

    setError(null);

    if (!claveActual || !claveNueva || !confirmarClave) {
      setError("Completá los tres campos para continuar");
      return;
    }

    if (!CLAVE_NUEVA_REGEX.test(claveNueva)) {
      setError("La contraseña nueva debe tener al menos 8 caracteres, con letras y números");
      return;
    }

    if (claveNueva !== confirmarClave) {
      setError("La confirmación no coincide con la contraseña nueva");
      return;
    }

    if (!sesion?.email) {
      setError("No se pudo identificar tu cuenta. Volvé a iniciar sesión.");
      return;
    }

    setCargando(true);

    try {
      await cambiarContrasenaPropiaApi(claveActual, claveNueva);
      setExito(true);
      setCargando(false);
    } catch (fallo) {
      setError(fallo instanceof ApiError ? fallo.message : "No se pudo cambiar la contraseña");
      setCargando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        title="Cambiar contraseña"
        description="Actualizá la contraseña de tu cuenta"
      >
        {exito ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-pastel-green-bg text-pastel-green-fg">
              <CheckCircle size={26} weight="fill" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Contraseña actualizada</p>
              <p className="mt-1 text-sm text-ink-muted">
                A partir de ahora usá tu nueva contraseña para iniciar sesión.
              </p>
            </div>
            <Button type="button" onClick={() => handleOpenChange(false)} className="mt-1 w-full">
              Listo
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Contraseña actual" htmlFor="clave-actual">
              <Input
                id="clave-actual"
                type="password"
                required
                autoComplete="current-password"
                value={claveActual}
                onChange={(e) => setClaveActual(e.target.value)}
                placeholder="••••••••"
              />
            </Field>

            <Field label="Contraseña nueva" htmlFor="clave-nueva" hint="Mínimo 8 caracteres, con letras y números">
              <Input
                id="clave-nueva"
                type="password"
                required
                autoComplete="new-password"
                value={claveNueva}
                onChange={(e) => setClaveNueva(e.target.value)}
                placeholder="••••••••"
              />
            </Field>

            <Field label="Confirmar contraseña nueva" htmlFor="confirmar-clave">
              <Input
                id="confirmar-clave"
                type="password"
                required
                autoComplete="new-password"
                value={confirmarClave}
                onChange={(e) => setConfirmarClave(e.target.value)}
                placeholder="••••••••"
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

            <div className="mt-1 flex justify-end gap-2">
              <Button type="submit" disabled={cargando}>
                {cargando ? (
                  <>
                    <SpinnerGap size={16} className="animate-spin" /> Guardando…
                  </>
                ) : (
                  "Guardar contraseña"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

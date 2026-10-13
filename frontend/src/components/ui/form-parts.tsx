import type { ReactNode } from "react";
import { WarningCircle, CheckCircle } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import {
  FormThemeContext,
  formThemeFor,
  useFormTheme,
  type FormSection,
} from "@/components/ui/form-theme";

/**
 * Publica el tema de la sección para todo el formulario. Es la única línea que
 * hace falta añadir en una pantalla nueva para que adopte su identidad: los
 * `Field`, `Input`, `Textarea` y `Select` de adentro lo leen por contexto.
 */
export function FormShell({
  section,
  className,
  children,
}: {
  section: FormSection;
  className?: string;
  children: ReactNode;
}) {
  const tema = formThemeFor(section);
  return (
    <FormThemeContext.Provider value={tema}>
      <div className={cn(tema.shell, className)} data-form-section={section}>
        {children}
      </div>
    </FormThemeContext.Provider>
  );
}

/** Bloque de campos con título. Sustituye al `fieldset` + `legend` sueltos. */
export function FormGroup({
  titulo,
  descripcion,
  className,
  children,
}: {
  titulo?: string;
  descripcion?: string;
  className?: string;
  children: ReactNode;
}) {
  const tema = useFormTheme();
  if (!titulo) {
    return <div className={cn(tema.group, className)}>{children}</div>;
  }
  return (
    <fieldset className={cn(tema.group, "min-w-0", className)}>
      <legend className={cn(tema.eyebrow, "mb-1 px-1")}>{titulo}</legend>
      {descripcion ? (
        <p className="mb-1 text-[12px] leading-relaxed text-ink-muted">{descripcion}</p>
      ) : null}
      {children}
    </fieldset>
  );
}

/** Barra de acciones. Cada sección la alinea donde le conviene. */
export function FormActions({ className, children }: { className?: string; children: ReactNode }) {
  const tema = useFormTheme();
  return <div className={cn(tema.actions, className)}>{children}</div>;
}

/**
 * Aviso de error o de éxito. Antes cada formulario tenía su propio estilo
 * (había cinco tratamientos distintos); este los unifica.
 */
export function FormAlert({
  tone = "error",
  className,
  children,
}: {
  tone?: "error" | "success" | "info";
  className?: string;
  children: ReactNode;
}) {
  const esError = tone === "error";
  const esExito = tone === "success";
  const Icono = esError ? WarningCircle : CheckCircle;
  return (
    <p
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-tile px-3 py-2 text-[13px] leading-snug",
        esError && "border border-pastel-red-fg/25 bg-pastel-red-bg text-pastel-red-fg",
        esExito && "border border-pastel-green-fg/25 bg-pastel-green-bg text-pastel-green-fg",
        tone === "info" && "border border-brand-200 bg-brand-50 text-brand-700",
        className,
      )}
    >
      <Icono size={16} weight="fill" className="mt-px shrink-0" aria-hidden />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

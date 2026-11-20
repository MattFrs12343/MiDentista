import { useEffect, useState } from "react";
import { WarningCircle } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { cargarPrediagnostico } from "@/features/portal-paciente/sintomasService";
import type { PrediagnosticoContenido } from "@/features/portal-paciente/sintomasMapper";
import { TARJETAS_SINTOMAS, calcularCondicionPosible, type Severidad } from "@/features/portal-paciente/sintomasArbol";

const ETIQUETA_SINTOMA = new Map(TARJETAS_SINTOMAS.map((t) => [t.id, t.etiqueta]));

const ETIQUETA_SEVERIDAD: Record<Severidad, string> = {
  emergencia: "Posible emergencia",
  urgente: "Atención pronto",
  rutina: "Rutina",
};

const TONO_SEVERIDAD: Record<Severidad, string> = {
  emergencia: "border-pastel-red-fg/40 bg-pastel-red-bg",
  urgente: "border-pastel-yellow-fg/40 bg-pastel-yellow-bg",
  rutina: "border-line bg-surface-sunken",
};

/**
 * Resultado del wizard de síntomas que el paciente completó al afiliarse
 * (módulo 17, pieza A — ver docs/modules/17-asistente-ia/arbol-sintomas.md).
 * Solo lectura: nunca se edita desde la ficha. No se muestra nada si el
 * paciente lo omitió o todavía no se afilió por esta vía.
 */
export function PrediagnosticoBanner({ pacienteId }: { pacienteId: string }) {
  const [contenido, setContenido] = useState<PrediagnosticoContenido | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    cargarPrediagnostico(pacienteId)
      .then((resultado) => {
        if (activo) setContenido(resultado);
      })
      .catch(() => {
        // Es un dato auxiliar: si falla la consulta, la ficha sigue andando
        // sin el banner en vez de romper toda la pantalla.
        if (activo) setContenido(null);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [pacienteId]);

  if (cargando || !contenido) return null;

  const etiquetas = contenido.sintomas.map((id) => ETIQUETA_SINTOMA.get(id) ?? id).join(", ");
  const condicionPosible = calcularCondicionPosible(contenido.sintomas, contenido.intensidad);

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-tile border p-3 text-sm",
        TONO_SEVERIDAD[contenido.severidad],
      )}
    >
      <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0 text-ink-soft" />
      <div className="min-w-0">
        <p className="font-semibold text-ink">
          Pre-diagnóstico del paciente · {ETIQUETA_SEVERIDAD[contenido.severidad]}
        </p>
        <p className="text-ink-soft">{etiquetas}</p>
        {condicionPosible ? (
          <p className="mt-1 text-ink-soft">
            <span className="font-medium text-ink">{condicionPosible.nombre}.</span> Orientativo, a confirmar con examen.
          </p>
        ) : null}
      </div>
    </div>
  );
}

import { WarningCircle } from "@phosphor-icons/react";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionLoader } from "@/components/ui/section-loader";

/**
 * Carga y error de `usePortalPaciente()`.
 *
 * Las seis vistas del portal (portada, citas, pagos, historia, odontograma,
 * evoluciones) leen la misma ficha y repetían el mismo spinner y la misma
 * tarjeta de error una por una. Además de la duplicación, el error había
 * quedado inconsistente entre vistas: algunas lo pintaban en rojo
 * (`tone="red"`) y otras en el gris por defecto de `Card`, así que el mismo
 * problema se veía distinto según en qué sección ocurriera.
 *
 * El spinner es `SectionLoader`, el mismo diente de marca que usan las
 * pestañas del odontólogo (p. ej. "Cargando pagos"): antes el portal tenía
 * su propio ícono genérico (`SpinnerGap`) y la carga se sentía como una app
 * distinta según el rol que tuviera la sesión.
 */
export function PortalCargando() {
  return <SectionLoader label="Cargando" className="min-h-[50vh]" />;
}

export function PortalError({
  mensaje,
  onReintentar,
}: {
  mensaje: string;
  onReintentar: () => void;
}) {
  return (
    <EmptyState
      icon={WarningCircle}
      iconTone="danger"
      iconWeight="fill"
      title={mensaje}
      description="Probá de nuevo en un momento."
      actionLabel="Reintentar"
      onAction={onReintentar}
    />
  );
}

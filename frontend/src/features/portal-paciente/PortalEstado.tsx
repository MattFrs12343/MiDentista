import { SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Carga y error de `usePortalPaciente()`.
 *
 * Las seis vistas del portal (portada, citas, pagos, historia, odontograma,
 * evoluciones) leen la misma ficha y repetían el mismo spinner y la misma
 * tarjeta de error una por una. Además de la duplicación, el error había
 * quedado inconsistente entre vistas: algunas lo pintaban en rojo
 * (`tone="red"`) y otras en el gris por defecto de `Card`, así que el mismo
 * problema se veía distinto según en qué sección ocurriera.
 */
export function PortalCargando() {
  return (
    <div className="flex items-center justify-center py-20">
      <SpinnerGap size={26} className="animate-spin text-ink-soft" aria-label="Cargando" />
    </div>
  );
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

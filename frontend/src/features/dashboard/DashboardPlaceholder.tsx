import type { ComponentType } from "react";
import type { IconProps } from "@phosphor-icons/react";
import { Hourglass } from "@phosphor-icons/react";
import { EmptyState } from "@/components/ui/empty-state";
import { usePageHeader, type ModuleTone } from "@/components/layout/PageHeaderContext";
import "./dashboard.css";

/**
 * Andamiaje temporal de la matriz de roles (T-13.1).
 *
 * Cada rol tiene su propio archivo de dashboard, pero los que todavia no se
 * implementaron (T-13.2 a T-13.5) usan este bloque para dejar claro que la
 * vista esta pendiente. A proposito NO inventa indicadores ni datos clinicos:
 * solo anuncia que el panel todavia no existe. Se reemplaza por el dashboard
 * real de cada rol cuando se desarrolle su tarea.
 */
export function DashboardPlaceholder({
  titulo,
  subtitulo,
  icono,
  tono = "blue",
  descripcion,
}: {
  titulo: string;
  subtitulo?: string;
  icono?: ComponentType<IconProps>;
  tono?: ModuleTone;
  descripcion: string;
}) {
  usePageHeader({ title: titulo, subtitle: subtitulo, icon: icono, tone: tono });

  return (
    <div className="dashboard-page">
      <EmptyState
        icon={Hourglass}
        iconTone="neutral"
        title="Panel pendiente de implementar"
        description={descripcion}
      />
    </div>
  );
}

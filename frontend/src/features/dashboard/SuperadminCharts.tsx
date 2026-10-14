import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { SerieGrafica } from "./tipos";
import type { ResumenSuperadmin } from "./superadminResumen";
import { serieClinicasPorEstado, serieUsuariosPorRol } from "./superadminGraficos";

const BAR_COLORS = [
  "bg-brand-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-rose-500",
  "bg-zinc-500",
] as const;

interface BarraHorizontalProps {
  serie: SerieGrafica;
  /** Clase de color aplicada a la barra. */
  colorClase?: string;
}

function BarraHorizontal({ serie, colorClase = BAR_COLORS[0] }: BarraHorizontalProps) {
  const puntos = serie.puntos.filter((p) => p.valor > 0);
  const maximo = puntos.length > 0 ? Math.max(...puntos.map((p) => p.valor)) : 1;
  const total = puntos.reduce((acc, p) => acc + p.valor, 0);

  if (puntos.length === 0) {
    return (
      <p className="text-[13px] text-label-2">
        Sin datos para mostrar en "{serie.titulo.toLowerCase()}".
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {puntos.map((punto, idx) => {
        const porcentaje = Math.max(4, (punto.valor / maximo) * 100);
        const color = colorClase ?? BAR_COLORS[idx % BAR_COLORS.length];
        return (
          <div key={`${serie.id}-${punto.etiqueta}`} className="flex items-center gap-3">
            <span className="w-36 shrink-0 truncate text-[13px] text-label-2" title={punto.etiqueta}>
              {punto.etiqueta}
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-[3px] bg-black/[0.04]">
              <div
                className={cn("h-full rounded-r-[4px] transition-[width] duration-500 ease-out", color)}
                style={{ width: `${porcentaje}%` }}
                aria-label={`${punto.etiqueta}: ${punto.valor} ${serie.unidad ?? ""}`}
                role="meter"
                aria-valuenow={punto.valor}
                aria-valuemin={0}
                aria-valuemax={maximo}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-[13px] font-semibold tabular-nums text-label">
              {punto.valor}
            </span>
          </div>
        );
      })}
      {total > 0 && (
        <p className="text-[12px] text-label-3">
          Total: {total} {serie.unidad ?? ""}
        </p>
      )}
    </div>
  );
}

/** Contenedor vacío cuando el servicio no adjuntó las agregaciones. */
function serieVacia(id: string, titulo: string): SerieGrafica {
  return { id, titulo, puntos: [] };
}

/**
 * Gráficos resumen del panel del superadministrador (T-13.7).
 *
 * Recibe el `ResumenSuperadmin` ya cargado por el hook: las agregaciones salen
 * de las mismas filas que alimentan las tarjetas, así que no hay consulta extra
 * ni cifra inventada.
 */
export function SuperadminCharts({ resumen }: { resumen: ResumenSuperadmin }) {
  const serieRoles = resumen.usuariosPorRol
    ? serieUsuariosPorRol(resumen.usuariosPorRol)
    : serieVacia("usuarios-por-rol", "Usuarios por rol");
  const serieEstado = resumen.clinicasPorEstado
    ? serieClinicasPorEstado(resumen.clinicasPorEstado)
    : serieVacia("clinicas-por-estado", "Clínicas activas vs inactivas");

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card accent tone="brand">
        <CardHeader>
          <CardTitle>{serieRoles.titulo}</CardTitle>
          <CardDescription>Distribución de usuarios según su rol en el sistema</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3.5">
          <BarraHorizontal serie={serieRoles} colorClase={BAR_COLORS[0]} />
        </CardContent>
      </Card>

      <Card accent tone="brand">
        <CardHeader>
          <CardTitle>{serieEstado.titulo}</CardTitle>
          <CardDescription>Comparación entre clínicas activas e inactivas</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3.5">
          <BarraHorizontal serie={serieEstado} colorClase={BAR_COLORS[3]} />
        </CardContent>
      </Card>
    </section>
  );
}

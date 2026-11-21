import { Button } from "@/components/ui/button";
import { disponibleCuota, formatearBytesCuota, type CuotaArchivos as ResumenCuota } from "./archivoCuotaService.ts";

export function CuotaArchivos({ cuota, cargando, error, onActualizar }: {
  cuota: ResumenCuota | null; cargando: boolean; error: boolean; onActualizar: () => void;
}) {
  return <section aria-label="Almacenamiento de la clínica" className="rounded-xl border border-line bg-surface-sunken p-4 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-semibold text-ink">Almacenamiento de la clínica</h3>
      <Button type="button" variant="ghost" disabled={cargando} onClick={onActualizar}>Actualizar uso</Button>
    </div>
    {cargando ? <p role="status" className="text-ink-muted">Consultando almacenamiento…</p> : null}
    {error ? <p role="alert" className="text-ink-muted">No pudimos consultar el almacenamiento. El servidor verificará el espacio antes de subir.</p> : null}
    {cuota ? <div className="mt-2 flex flex-col gap-1 text-ink-muted" aria-live="polite">
      <p>Usado: {formatearBytesCuota(cuota.bytesOcupados)} / {formatearBytesCuota(cuota.limiteBytes)}</p>
      <p>Disponible: {formatearBytesCuota(disponibleCuota(cuota))}</p>
      {cuota.bytesReservados > 0 ? <p>Reservado por operaciones pendientes: {formatearBytesCuota(cuota.bytesReservados)}</p> : null}
      <progress className="mt-2 h-2 w-full accent-current" max={cuota.limiteBytes}
        value={Math.min(cuota.limiteBytes, cuota.bytesOcupados + cuota.bytesReservados)} aria-label="Almacenamiento contabilizado y reservado" />
      {disponibleCuota(cuota) === 0 ? <p role="alert">No hay espacio suficiente en el almacenamiento de la clínica.</p> : null}
      <p className="text-xs">Solo Archivos e Imágenes. Contabilidad conservadora; los intentos inciertos conservan su reserva.</p>
    </div> : null}
  </section>;
}

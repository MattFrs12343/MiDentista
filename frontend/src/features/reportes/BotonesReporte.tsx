import { DownloadSimple, Printer } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { construirCsv, descargarCsv } from "@/features/reportes/exportarCsv";

/**
 * Par de botones "Descargar PDF" / "Descargar CSV" — se usa junto a un
 * `<ReporteImprimible>` montado con las mismas `columnas`/`filas` (ver
 * docs/modules/17-asistente-ia/README.md, pieza C).
 */
export function BotonesReporte({
  nombreArchivoCsv,
  columnas,
  filas,
}: {
  /** Incluir la extensión, ej. "pacientes-dental-cristo-rey.csv". */
  nombreArchivoCsv: string;
  columnas: readonly string[];
  filas: readonly (readonly (string | number)[])[];
}) {
  return (
    <div className="flex items-center gap-2 print:hidden">
      <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>
        <Printer size={14} weight="bold" /> Descargar PDF
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => descargarCsv(nombreArchivoCsv, construirCsv(columnas, filas))}
      >
        <DownloadSimple size={14} weight="bold" /> Descargar CSV
      </Button>
    </div>
  );
}

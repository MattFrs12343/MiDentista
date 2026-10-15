import { useCallback, useRef, useState } from "react";
import { obtenerUrlQrCobro, subirQrCobro } from "./qrCobroService.ts";

function mensaje(causa: unknown, porDefecto: string): string {
  return causa instanceof Error ? causa.message : porDefecto;
}

/**
 * QR de cobro de una clínica: lectura y subida.
 *
 * `url` en `null` puede significar dos cosas distintas: "todavía no hay QR"
 * (estado normal, sin error) o "falló la consulta" (sí hay `error`). La UI
 * debe distinguirlas igual que `PaymentHistory` distingue "sin pagos" de
 * "error".
 */
export function useQrCobro(clinicaId: string) {
  const [url, setUrl] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ultimaLectura = useRef(0);
  const ultimaEscritura = useRef(0);

  const cargar = useCallback(async () => {
    if (!clinicaId) return;
    const operacion = ++ultimaLectura.current;
    setCargando(true);
    setError(null);
    try {
      const resultado = await obtenerUrlQrCobro(clinicaId);
      if (operacion === ultimaLectura.current) setUrl(resultado);
    } catch (causa) {
      if (operacion === ultimaLectura.current) {
        setError(mensaje(causa, "No se pudo cargar el QR de cobro."));
      }
    } finally {
      if (operacion === ultimaLectura.current) setCargando(false);
    }
  }, [clinicaId]);

  const subir = useCallback(
    async (archivo: File): Promise<boolean> => {
      if (!clinicaId) return false;
      const operacion = ++ultimaEscritura.current;
      setSubiendo(true);
      setError(null);
      try {
        const nuevaUrl = await subirQrCobro(clinicaId, archivo);
        if (operacion === ultimaEscritura.current) setUrl(nuevaUrl);
        return true;
      } catch (causa) {
        if (operacion === ultimaEscritura.current) {
          setError(mensaje(causa, "No se pudo subir el QR de cobro."));
        }
        return false;
      } finally {
        if (operacion === ultimaEscritura.current) setSubiendo(false);
      }
    },
    [clinicaId],
  );

  return { url, cargando, subiendo, error, cargar, subir };
}

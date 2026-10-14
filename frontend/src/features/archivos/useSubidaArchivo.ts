import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { ErrorSubidaArchivo } from "./archivoService.ts";
import type { Archivo, SubidaDocumento } from "./tipos.ts";
import type { ObservadorSubida } from "./patientFilesSection.ts";

export type EstadoSubidaArchivo = "idle" | "uploading" | "success" | "error";
export type ContextoSubidaArchivo = Pick<SubidaDocumento, "pacienteId" | "clinicaId" | "subidoPor">;

function claveDe(contexto: ContextoSubidaArchivo): string {
  return JSON.stringify([contexto.pacienteId.toLowerCase(), contexto.clinicaId.toLowerCase(), contexto.subidoPor.toLowerCase()]);
}

interface ResultadoContexto {
  contexto: string;
  estado: EstadoSubidaArchivo;
  archivo: Archivo | null;
  error: ErrorSubidaArchivo | null;
}

/** Una escritura por instancia, sin efectos de red automáticos ni colas. */
export function useSubidaArchivo<TDatos extends ContextoSubidaArchivo & Pick<SubidaDocumento, "asociacion">>(
  contexto: ContextoSubidaArchivo,
  subir: (datos: TDatos) => Promise<Archivo>,
  onEstado?: ObservadorSubida,
) {
  const clave = claveDe(contexto);
  const [resultado, setResultado] = useState<ResultadoContexto>(() => ({
    contexto: clave, estado: "idle", archivo: null, error: null,
  }));
  const bloqueo = useRef(false);
  const montado = useRef(false);
  const revision = useRef(0);
  const contextoActual = useRef(clave);
  const observador = useRef(onEstado);
  const revisionPendiente = useRef<string | null>(null);

  // Invalidar respuestas en el commit del cambio/unmount, antes de efectos
  // pasivos: una respuesta tardía no debe disparar éxito en otra ficha.
  useLayoutEffect(() => {
    observador.current = onEstado;
  }, [onEstado]);

  useLayoutEffect(() => {
    montado.current = true;
    contextoActual.current = clave;
    const version = revision.current + 1;
    revision.current = version;
    revisionPendiente.current = null;
    return () => {
      montado.current = false;
      revision.current = version + 1;
    };
  }, [clave, subir]);

  const iniciarSubida = useCallback(async (datos: TDatos): Promise<Archivo | null> => {
    // El ref se cambia antes de cualquier await, incluso antes del próximo render.
    if (bloqueo.current || revisionPendiente.current === clave || !montado.current) return null;
    bloqueo.current = true;
    // Capturar el destino del intento; cambios posteriores del borrador no lo alteran.
    const intento = { ...datos, asociacion: datos.asociacion ? { ...datos.asociacion } : undefined };
    const version = revision.current;
    // Capturar observador del intento: tras desmontaje aún registra flags de la
    // ficha original, sin actualizar React ni cerrar otra ficha.
    const notificar = observador.current;
    const vigente = () => montado.current && version === revision.current && contextoActual.current === clave;
    setResultado({ contexto: clave, estado: "uploading", archivo: null, error: null });
    notificar?.({ estado: "uploading", requiereRevision: false });
    try {
      if (claveDe(intento) !== clave) {
        throw new ErrorSubidaArchivo("El intento no corresponde al contexto actual del paciente.", { etapa: "validacion" });
      }
      const archivo = await subir(intento);
      const actual = vigente();
      notificar?.({ estado: "success", requiereRevision: false, ...(actual ? {} : { archivo }) });
      if (!actual) return null;
      setResultado({ contexto: clave, estado: "success", archivo, error: null });
      return archivo;
    } catch (causa) {
      const error = causa instanceof ErrorSubidaArchivo ? causa : new ErrorSubidaArchivo(
        "No se confirmó la operación de subida. Revisa el intento antes de repetirlo.",
        { etapa: "confirmacion", errorOriginal: causa, requiereRevision: true },
      );
      notificar?.({ estado: "error", requiereRevision: error.requiereRevision });
      if (!vigente()) return null;
      if (error.requiereRevision) revisionPendiente.current = clave;
      setResultado({ contexto: clave, estado: "error", archivo: null, error });
      return null;
    } finally {
      bloqueo.current = false;
      // Si cambió el contexto, descartar la respuesta sin dejar uploading activo.
      // No cancelar ni compensar escrituras ya iniciadas por un cambio de pantalla.
      if (montado.current && !vigente()) {
        setResultado({ contexto: contextoActual.current, estado: "idle", archivo: null, error: null });
      }
    }
  }, [clave, subir]);

  const reiniciar = useCallback(() => {
    // Editar campos no elimina una alerta pendiente ni habilita un reintento incierto.
    if (bloqueo.current || revisionPendiente.current === clave) return;
    setResultado({ contexto: clave, estado: "idle", archivo: null, error: null });
  }, [clave]);

  const mismoContexto = resultado.contexto === clave;
  return {
    estado: mismoContexto ? resultado.estado : resultado.estado === "uploading" ? "uploading" : "idle",
    archivo: mismoContexto ? resultado.archivo : null,
    error: mismoContexto ? resultado.error : null,
    iniciarSubida,
    reiniciar,
  };
}

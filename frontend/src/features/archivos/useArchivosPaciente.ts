import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { cargarArchivos, crearUrlArchivo } from "./archivoService.ts";
import { crearGestorUrls, miniaturaVencida, miniaturasPendientes } from "./archivosGaleria.ts";
import type { Archivo, EstadoMiniatura, UrlsPorId } from "./tipos.ts";

type Resultado = {
  pacienteId: string;
  estado: "loading" | "success" | "error";
  archivos: Archivo[];
  urlsPorId: UrlsPorId;
  error: string | null;
};

const MENSAJE_ERROR = "No pudimos cargar los archivos de este paciente. Intenta nuevamente.";

/** Lectura aislada por ficha y generación; las URLs solo viven en esta instancia. */
export function useArchivosPaciente(pacienteId: string) {
  const clave = pacienteId.toLowerCase();
  const [resultado, setResultado] = useState<Resultado>({
    pacienteId: clave, estado: "loading", archivos: [], urlsPorId: {}, error: null,
  });
  const recargar = useRef<() => Promise<void>>(async () => {});
  const asegurar = useRef<{
    pacienteId: string;
    ejecutar: (id: string, forzar?: boolean) => Promise<EstadoMiniatura | undefined>;
  } | null>(null);

  useLayoutEffect(() => {
    let montado = true;
    let generacion = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let archivos: Archivo[] = [];
    let urls: UrlsPorId = {};
    let gestor: ReturnType<typeof crearGestorUrls> | null = null;

    function cancelarTimer() {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    }

    const vigente = (version: number) => montado && version === generacion;

    function programar(version: number) {
      cancelarTimer();
      if (!vigente(version)) return;
      const vencimientos = Object.values(urls).flatMap((miniatura) =>
        miniatura.estado === "disponible" ? [miniatura.venceEn] : []);
      if (vencimientos.length === 0) return;
      timer = setTimeout(() => { void renovar(version); }, Math.max(1000, Math.min(...vencimientos) - Date.now()));
    }

    async function resolver(lista: Archivo[], version: number) {
      const actual = gestor;
      if (!vigente(version) || !actual) return;
      await Promise.all(lista.map((archivo) => actual.asegurarUrlArchivo(archivo.id)));
    }

    async function renovar(version: number) {
      if (!vigente(version)) return;
      const caducados = archivos.filter((archivo) => miniaturaVencida(urls[archivo.id], Date.now()));
      if (caducados.length === 0) { programar(version); return; }
      await resolver(caducados, version);
      if (!vigente(version)) return;
      programar(version);
    }

    async function cargar() {
      const version = ++generacion;
      cancelarTimer();
      gestor?.invalidar();
      gestor = null;
      urls = miniaturasPendientes(archivos);
      setResultado({ pacienteId: clave, estado: "loading", archivos, urlsPorId: urls, error: null });
      try {
        const recibidos = await cargarArchivos(clave);
        if (!vigente(version)) return;
        archivos = recibidos;
        urls = miniaturasPendientes(archivos);
        setResultado({ pacienteId: clave, estado: "success", archivos, urlsPorId: urls, error: null });
        gestor = crearGestorUrls(archivos, crearUrlArchivo, (actuales) => {
          if (!vigente(version)) return;
          urls = actuales;
          setResultado((anterior) => ({ ...anterior, urlsPorId: actuales }));
          // Programar cada firma sin esperar la más lenta.
          programar(version);
        });
        await resolver(archivos, version);
        if (vigente(version)) programar(version);
      } catch {
        if (!vigente(version)) return;
        archivos = [];
        urls = {};
        setResultado({ pacienteId: clave, estado: "error", archivos: [], urlsPorId: {}, error: MENSAJE_ERROR });
      }
    }

    function alVolver() {
      if (document.visibilityState === "visible") void renovar(generacion);
    }

    recargar.current = cargar;
    asegurar.current = {
      pacienteId: clave,
      ejecutar: (id, forzar) => montado && gestor
        ? gestor.asegurarUrlArchivo(id, forzar) : Promise.resolve(undefined),
    };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", alVolver);
    void cargar();
    return () => {
      montado = false;
      generacion++;
      cancelarTimer();
      gestor?.invalidar();
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", alVolver);
      recargar.current = async () => {};
      asegurar.current = null;
    };
  }, [clave]);

  const reload = useCallback(() => recargar.current(), []);
  const asegurarUrlArchivo = useCallback((id: string, forzar = false) => {
    const actual = asegurar.current;
    return actual?.pacienteId === clave ? actual.ejecutar(id, forzar) : Promise.resolve(undefined);
  }, [clave]);
  const actual = resultado.pacienteId === clave ? resultado : {
    pacienteId: clave, estado: "loading" as const, archivos: [], urlsPorId: {}, error: null,
  };
  return { estado: actual.estado, archivos: actual.archivos, urlsPorId: actual.urlsPorId, error: actual.error, reload, asegurarUrlArchivo };
}

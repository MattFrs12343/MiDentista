import { useCallback, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { actualizarDiagnostico, cambiarEstadoDiagnostico, crearDiagnostico, listarDiagnosticosPaciente, obtenerPerfilDiagnosticos } from "./diagnosticoService.ts";
import { puedeCrearDiagnostico, puedeEditarDiagnostico } from "./diagnosticoPermisos.ts";
import { crearControladorListaDiagnosticos } from "./diagnosticosListaControlador.ts";
import type { ContenidoDiagnostico, DiagnosticoPaciente, EstadoDiagnostico } from "./tipos.ts";

export function useDiagnosticos(pacienteId: string, sesion: { email?: string; rol: string } | null) {
  const email = sesion?.email ?? "";
  const rol = sesion?.rol ?? "";
  const controlador = useMemo(() => crearControladorListaDiagnosticos({ pacienteId, email, rol }, {
    obtenerPerfil: obtenerPerfilDiagnosticos, listar: listarDiagnosticosPaciente,
  }), [pacienteId, email, rol]);
  const resultado = useSyncExternalStore(controlador.suscribir, controlador.obtener, controlador.obtener);
  const [guardando, setGuardando] = useState(false);
  const bloqueo = useRef(false);
  const revision = useRef(0);
  const montado = useRef(false);
  const recarga = useRef<() => Promise<void>>(async () => {});

  useLayoutEffect(() => {
    montado.current = true;
    const version = revision.current + 1;
    revision.current = version;
    async function cargar() {
      if (bloqueo.current) return;
      await controlador.cargar();
    }
    controlador.activar();
    recarga.current = cargar;
    void cargar();
    return () => {
      controlador.desactivar();
      montado.current = false;
      revision.current = version + 1;
      recarga.current = async () => {};
    };
  }, [controlador]);

  const ejecutar = useCallback(async (
    operacion: "crear" | "actualizar" | "estado", datos?: ContenidoDiagnostico, id?: string, estado?: EstadoDiagnostico,
  ): Promise<DiagnosticoPaciente> => {
    if (bloqueo.current) throw new Error("Hay un guardado en curso. Espera a que termine.");
    const actual = controlador.obtener();
    if (!montado.current || controlador.cargando() || actual.estado !== "success") {
      throw new Error("Espera a que se confirme la carga del paciente y tu perfil.");
    }
    const perfil = actual.perfil;
    const existente = actual.diagnosticos.find((d) => d.id === id);
    if (!puedeCrearDiagnostico(perfil) || (operacion !== "crear" && (!existente || !puedeEditarDiagnostico(perfil, existente)))) {
      throw new Error("Solo el odontólogo autor puede modificar este diagnóstico.");
    }
    const destino = { pacienteId, clinicaId: perfil!.clinicaId!, odontologoId: perfil!.id };
    const version = revision.current;
    bloqueo.current = true;
    setGuardando(true);
    try {
      const confirmado = operacion === "crear" ? await crearDiagnostico(destino, datos!)
        : operacion === "actualizar" ? await actualizarDiagnostico(id!, destino, datos!)
        : await cambiarEstadoDiagnostico(id!, destino, estado!);
      if (!montado.current || revision.current !== version) throw new Error("La ficha o sesión cambió durante el guardado. Revisa el paciente original.");
      controlador.confirmar(confirmado);
      return confirmado;
    } finally {
      bloqueo.current = false;
      if (montado.current) {
        setGuardando(false);
        // La carga de una ficha nueva pudo quedar esperando esta escritura.
        if (revision.current !== version) void recarga.current();
      }
    }
  }, [controlador, pacienteId]);

  return { ...resultado, guardando, recargar: () => recarga.current(),
    crear: (datos: ContenidoDiagnostico) => ejecutar("crear", datos),
    actualizar: (id: string, datos: ContenidoDiagnostico) => ejecutar("actualizar", datos, id),
    cambiarEstado: (id: string, estado: EstadoDiagnostico) => ejecutar("estado", undefined, id, estado) };
}

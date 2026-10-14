import { puedeLeerDiagnosticos } from "./diagnosticoPermisos.ts";
import { compararProcedimientos } from "./procedimientoMapper.ts";
import { puedeEditarProcedimiento, puedeEscribirProcedimientos, type PlanProcedimientos } from "./procedimientoPermisos.ts";
import type { ContenidoProcedimiento, DestinoProcedimiento, NuevoProcedimiento, PerfilDiagnosticos, ProcedimientoTratamiento } from "./tipos.ts";
import type { IniciarTotalProcedimiento } from "./planTotal.ts";

export interface ServiciosProcedimientos {
  listar: (planId: string, clinicaId: string | null) => Promise<ProcedimientoTratamiento[]>;
  crear: (destino: DestinoProcedimiento, datos: NuevoProcedimiento) => Promise<ProcedimientoTratamiento>;
  actualizar: (id: string, destino: DestinoProcedimiento, datos: ContenidoProcedimiento) => Promise<ProcedimientoTratamiento>;
  eliminar: (id: string, destino: DestinoProcedimiento) => Promise<ProcedimientoTratamiento>;
}
export interface ResultadoProcedimientos {
  clave: string; estado: "idle" | "loading" | "success" | "error"; procedimientos: ProcedimientoTratamiento[];
  guardando: boolean; error: string | null; confirmacionId: string | null; mensaje: string;
}

export function crearControladorProcedimientos(plan: PlanProcedimientos | null, perfil: PerfilDiagnosticos | null, servicios: ServiciosProcedimientos,
  iniciarTotal?: IniciarTotalProcedimiento) {
  let resultado: ResultadoProcedimientos = { clave: JSON.stringify([plan, perfil]), estado: plan ? "loading" : "idle",
    procedimientos: [], guardando: false, error: null, confirmacionId: null, mensaje: "" };
  let activo = false;
  let revision = 0;
  let lectura: Promise<void> | null = null;
  const observadores = new Set<() => void>();
  function publicar(cambios: Partial<ResultadoProcedimientos>) {
    resultado = { ...resultado, ...cambios };
    for (const observar of observadores) observar();
  }
  function validarFila(p: ProcedimientoTratamiento, id?: string) {
    if (!plan || p.planTratamientoId !== plan.id || p.clinicaId !== plan.clinicaId || (id && p.id !== id)) {
      throw new Error("El procedimiento confirmado no corresponde al plan seleccionado.");
    }
  }
  async function cargar(): Promise<void> {
    if (!activo || !plan || resultado.guardando) return;
    if (lectura) return lectura;
    const version = revision;
    publicar({ estado: "loading", error: null, confirmacionId: null });
    lectura = (async () => {
      try {
        if (!puedeLeerDiagnosticos(perfil) || (perfil!.clinicaId && perfil!.clinicaId !== plan.clinicaId)) {
          throw new Error("El perfil no tiene acceso a los procedimientos de este plan.");
        }
        const lista = await servicios.listar(plan.id, plan.clinicaId);
        for (const p of lista) validarFila(p);
        if (activo && version === revision) publicar({ estado: "success", procedimientos: [...lista].sort(compararProcedimientos) });
      } catch (causa) {
        if (activo && version === revision) publicar({ estado: "error", error: causa instanceof Error ? causa.message : "No se confirmó la lectura." });
      }
    })().finally(() => { lectura = null; if (activo && version !== revision) void cargar(); });
    return lectura;
  }
  function exigirEscritura(id?: string) {
    if (!activo || !plan || resultado.estado !== "success" || lectura) throw new Error("Espera la lectura confirmada del plan seleccionado.");
    if (resultado.guardando) throw new Error("Hay una escritura en curso.");
    if (!puedeEscribirProcedimientos(perfil, plan)) throw new Error("Solo el odontólogo autor del plan puede escribir procedimientos.");
    if (id) {
      const p = resultado.procedimientos.find((p) => p.id === id);
      if (!p || !puedeEditarProcedimiento(perfil, plan, p)) throw new Error("El procedimiento no pertenece al plan seleccionado.");
    }
  }
  async function escribir(operacion: "crear" | "actualizar" | "eliminar", datos?: NuevoProcedimiento | ContenidoProcedimiento, id?: string) {
    exigirEscritura(id);
    if (operacion === "eliminar" && resultado.confirmacionId !== id) throw new Error("Confirma visualmente la eliminación antes de borrar.");
    const version = revision;
    const destino = { planTratamientoId: plan!.id, clinicaId: plan!.clinicaId };
    const total = iniciarTotal?.(plan!.id);
    publicar({ guardando: true, error: null, mensaje: "" });
    try {
      const p = operacion === "crear" ? await servicios.crear(destino, datos as NuevoProcedimiento)
        : operacion === "actualizar" ? await servicios.actualizar(id!, destino, datos as ContenidoProcedimiento)
        : await servicios.eliminar(id!, destino);
      validarFila(p, id);
      if (!activo || version !== revision) throw new Error("El plan o sesión cambió durante el envío. Revisa el plan original.");
      const procedimientos = resultado.procedimientos.filter((anterior) => anterior.id !== p.id);
      if (operacion !== "eliminar") procedimientos.push(p);
      publicar({ procedimientos: procedimientos.sort(compararProcedimientos), confirmacionId: null,
        mensaje: operacion === "eliminar" ? "Procedimiento eliminado y confirmado." : "Procedimiento guardado y confirmado." });
      await total?.confirmado();
      return p;
    } catch (causa) {
      total?.fallido();
      if (activo && version === revision) publicar({ error: causa instanceof Error ? causa.message : "No se confirmó la escritura." });
      throw causa;
    } finally { publicar({ guardando: false }); }
  }
  return {
    obtener: () => resultado,
    suscribir(callback: () => void) { observadores.add(callback); return () => { observadores.delete(callback); }; },
    activar() { activo = true; }, desactivar() { activo = false; revision++; }, cargar,
    solicitarEliminar(id: string) { exigirEscritura(id); publicar({ confirmacionId: id, error: null, mensaje: "" }); },
    cancelarEliminar() { if (!resultado.guardando) publicar({ confirmacionId: null, error: null }); },
    crear: (datos: NuevoProcedimiento) => escribir("crear", datos),
    actualizar: (id: string, datos: ContenidoProcedimiento) => escribir("actualizar", datos, id),
    eliminar: (id: string) => escribir("eliminar", undefined, id),
  };
}

import { puedeLeerDiagnosticos } from "./diagnosticoPermisos.ts";
import { puedeCrearPlan, puedeEditarPlan } from "./planTratamientoPermisos.ts";
import { compararPlanes } from "./planTratamientoMapper.ts";
import { ACCIONES_ESTADO, exigirTransicionPlan, requiereConfirmacionEstado } from "./planEstado.ts";
import type { IniciarTotalProcedimiento, SincronizacionTotalPlan } from "./planTotal.ts";
import type { ContenidoPlanTratamiento, DestinoPlanTratamiento, EstadoPlanTratamiento, PerfilDiagnosticos, PlanTratamientoPaciente } from "./tipos.ts";

export interface ServiciosPlanes {
  perfil: (email: string) => Promise<PerfilDiagnosticos>;
  listar: (pacienteId: string, clinicaId: string | null) => Promise<PlanTratamientoPaciente[]>;
  crear: (destino: DestinoPlanTratamiento, datos: ContenidoPlanTratamiento) => Promise<PlanTratamientoPaciente>;
  notas: (id: string, destino: DestinoPlanTratamiento, notas: string) => Promise<PlanTratamientoPaciente>;
  titulo: (id: string, destino: DestinoPlanTratamiento, titulo: string) => Promise<PlanTratamientoPaciente>;
  cambiarEstado: (id: string, destino: DestinoPlanTratamiento, anterior: EstadoPlanTratamiento, nuevo: EstadoPlanTratamiento) => Promise<PlanTratamientoPaciente>;
  obtener: (id: string, destino: Pick<DestinoPlanTratamiento, "pacienteId" | "clinicaId">) => Promise<PlanTratamientoPaciente>;
}
export interface ResultadoPlanes {
  clave: string; estado: "loading" | "error" | "success"; planes: PlanTratamientoPaciente[];
  seleccionadoId: string | null; perfil: PerfilDiagnosticos | null; error: string | null; guardando: boolean;
  cambiandoEstado: boolean; errorEstado: string | null; exitoEstado: string | null;
  confirmacionEstado: { planId: string; anterior: EstadoPlanTratamiento; nuevo: EstadoPlanTratamiento } | null;
  totales: Record<string, SincronizacionTotalPlan>;
}

export function crearControladorPlanes(contexto: { pacienteId: string; email: string; rol: string }, servicios: ServiciosPlanes) {
  let resultado: ResultadoPlanes = { clave: JSON.stringify(contexto), estado: "loading", planes: [],
    seleccionadoId: null, perfil: null, error: null, guardando: false, cambiandoEstado: false,
    errorEstado: null, exitoEstado: null, confirmacionEstado: null, totales: {} };
  let activo = false;
  let revision = 0;
  let lectura: Promise<void> | null = null;
  let revisionSeleccion = 0;
  let secuenciaTotal = 0;
  const versionesTotal = new Map<string, number>();
  const lecturasTotal = new Map<string, Promise<void>>();
  const observadores = new Set<() => void>();
  const publicar = (cambio: Partial<ResultadoPlanes>) => {
    resultado = { ...resultado, ...cambio };
    for (const observar of observadores) observar();
  };
  const publicarTotal = (id: string, estado: SincronizacionTotalPlan | null) => {
    const totales = { ...resultado.totales };
    if (estado) totales[id] = estado; else delete totales[id];
    publicar({ totales });
  };
  async function cargar() {
    if (!activo || resultado.guardando || Object.values(resultado.totales).some((t) => t.estado !== "error")) return;
    if (lectura) return lectura;
    const version = revision;
    publicar({ estado: "loading", error: null, errorEstado: null, exitoEstado: null, confirmacionEstado: null });
    lectura = (async () => {
      try {
        if (!contexto.email || contexto.rol === "paciente") throw new Error("Sesión sin acceso al flujo clínico.");
        const perfil = await servicios.perfil(contexto.email);
        if (!puedeLeerDiagnosticos(perfil)) throw new Error("Perfil sin permiso de lectura de planes.");
        if (!activo || version !== revision) return;
        const planes = await servicios.listar(contexto.pacienteId, perfil.clinicaId);
        if (!activo || version !== revision) return;
        versionesTotal.clear(); lecturasTotal.clear();
        publicar({ estado: "success", planes: [...planes].sort(compararPlanes), perfil, totales: {}, seleccionadoId: planes.some((p) => p.id === resultado.seleccionadoId)
          ? resultado.seleccionadoId : null });
      } catch (causa) {
        if (activo && version === revision) publicar({ estado: "error", perfil: null,
          error: causa instanceof Error ? causa.message : "No se pudieron cargar los planes." });
      }
    })().finally(() => {
      lectura = null;
      if (activo && version !== revision) void cargar();
    });
    return lectura;
  }
  async function escribir(operacion: "crear" | "titulo" | "notas", contenido: ContenidoPlanTratamiento | string) {
    if (!activo || resultado.estado !== "success" || lectura) throw new Error("Espera a que se confirme la lectura de planes.");
    if (resultado.guardando) throw new Error("Hay un guardado en curso.");
    const perfil = resultado.perfil;
    const plan = resultado.planes.find((p) => p.id === resultado.seleccionadoId);
    if (plan && resultado.totales[plan.id]) throw new Error("Confirma primero la sincronización del total del plan.");
    if (!puedeCrearPlan(perfil) || (operacion !== "crear" && (!plan || !puedeEditarPlan(perfil, plan)))) {
      throw new Error("Solo el odontólogo autor puede editar su plan.");
    }
    const destino = { pacienteId: contexto.pacienteId, clinicaId: perfil!.clinicaId!, odontologoId: perfil!.id };
    const version = revision;
    publicar({ guardando: true, confirmacionEstado: null, exitoEstado: null, errorEstado: null });
    try {
      const confirmado = operacion === "crear" ? await servicios.crear(destino, contenido as ContenidoPlanTratamiento)
        : operacion === "titulo" ? await servicios.titulo(plan!.id, destino, contenido as string)
        : await servicios.notas(plan!.id, destino, contenido as string);
      if (!activo || version !== revision) throw new Error("La ficha o sesión cambió durante el guardado. Revisa el paciente original.");
      // Reconciliar por id sin alterar el orden creado_en DESC / id DESC.
      const planes = resultado.planes.some((p) => p.id === confirmado.id)
        ? resultado.planes.map((p) => p.id === confirmado.id ? confirmado : p) : [confirmado, ...resultado.planes];
      publicar({ planes: planes.sort(compararPlanes), seleccionadoId: confirmado.id });
      return confirmado;
    } finally { publicar({ guardando: false }); }
  }
  function planParaTransicion(nuevo: EstadoPlanTratamiento) {
    if (!activo || resultado.estado !== "success" || lectura) throw new Error("Espera la lectura de planes.");
    if (resultado.guardando) throw new Error("Hay un guardado en curso.");
    const plan = resultado.planes.find((p) => p.id === resultado.seleccionadoId);
    if (plan && resultado.totales[plan.id]) throw new Error("Confirma primero la sincronización del total del plan.");
    if (!plan || !puedeEditarPlan(resultado.perfil, plan)) throw new Error("Solo el odontólogo autor puede cambiar el estado del plan.");
    exigirTransicionPlan(plan.estado, nuevo);
    return plan;
  }
  async function transicionar(plan: PlanTratamientoPaciente, nuevo: EstadoPlanTratamiento) {
    const version = revision;
    publicar({ guardando: true, cambiandoEstado: true, errorEstado: null, exitoEstado: null });
    try {
      const confirmado = await servicios.cambiarEstado(plan.id, { pacienteId: contexto.pacienteId,
        clinicaId: plan.clinicaId, odontologoId: plan.odontologoId }, plan.estado, nuevo);
      if (!activo || version !== revision || resultado.seleccionadoId !== plan.id) throw new Error("El plan, ficha o sesión cambió durante la transición.");
      if (confirmado.id !== plan.id || confirmado.pacienteId !== plan.pacienteId || confirmado.clinicaId !== plan.clinicaId
          || confirmado.odontologoId !== plan.odontologoId || confirmado.estado !== nuevo || !confirmado.actualizadoEn) {
        throw new Error("No se confirmó el plan y estado solicitados.");
      }
      publicar({ planes: resultado.planes.map((p) => p.id === confirmado.id ? confirmado : p),
        confirmacionEstado: null, exitoEstado: `${ACCIONES_ESTADO[nuevo]}: estado ${nuevo} confirmado.` });
    } catch (causa) {
      if (activo && version === revision && resultado.seleccionadoId === plan.id) {
        publicar({ errorEstado: causa instanceof Error ? causa.message : "No se pudo cambiar el estado del plan.", exitoEstado: null });
      }
      throw causa;
    } finally {
      if (activo && version === revision) publicar({ guardando: false, cambiandoEstado: false });
      else {
        resultado = { ...resultado, guardando: false, cambiandoEstado: false };
        if (activo) void cargar();
      }
    }
  }
  async function sincronizarTotalPlan(id: string, desdeMutacion = false): Promise<void> {
    if (!activo || resultado.estado !== "success" || lectura || resultado.guardando) throw new Error("Espera el contexto confirmado del plan.");
    const plan = resultado.planes.find((p) => p.id === id);
    if (!plan || resultado.seleccionadoId !== id) throw new Error("Selecciona el plan que deseas sincronizar.");
    if (!desdeMutacion && resultado.totales[id]?.estado === "mutando") throw new Error("La mutación del procedimiento sigue pendiente.");
    const existente = lecturasTotal.get(id);
    if (existente) return existente;
    const version = revision, seleccion = revisionSeleccion, token = ++secuenciaTotal;
    const mutacionConfirmada = desdeMutacion || resultado.totales[id]?.mutacionConfirmada === true;
    versionesTotal.set(id, token);
    publicarTotal(id, { estado: "loading", error: null, mutacionConfirmada });
    const vigente = () => activo && version === revision && seleccion === revisionSeleccion
      && resultado.seleccionadoId === id && versionesTotal.get(id) === token;
    const solicitud = (async () => {
      try {
        const confirmado = await servicios.obtener(id, { pacienteId: contexto.pacienteId, clinicaId: plan.clinicaId });
        if (!vigente()) return;
        if (confirmado.id !== id || confirmado.pacienteId !== plan.pacienteId || confirmado.clinicaId !== plan.clinicaId
            || confirmado.odontologoId !== plan.odontologoId || !Number.isFinite(confirmado.costoTotal)
            || confirmado.costoTotal < 0 || confirmado.costoTotal > 99999999.99) throw new Error("Fila de plan fuera del contexto solicitado.");
        publicar({ planes: resultado.planes.map((p) => p.id === id ? confirmado : p).sort(compararPlanes) });
        publicarTotal(id, null);
      } catch {
        if (vigente()) publicarTotal(id, { estado: "error", mutacionConfirmada,
          error: mutacionConfirmada ? "El procedimiento se confirmó, pero no se pudo actualizar el total mostrado. Reintenta la sincronización."
            : "No se pudo confirmar el total del plan. Reintenta la sincronización." });
        // La mutación ya se confirmó: no propagar como fallo CRUD ni repetirla.
      }
    })();
    lecturasTotal.set(id, solicitud);
    void solicitud.finally(() => { if (lecturasTotal.get(id) === solicitud) lecturasTotal.delete(id); });
    return solicitud;
  }
  const iniciarTotalProcedimiento: IniciarTotalProcedimiento = (id) => {
    if (!activo || resultado.estado !== "success" || lectura || resultado.guardando) throw new Error("Espera la lectura del plan.");
    const plan = resultado.planes.find((p) => p.id === id);
    if (!plan || resultado.seleccionadoId !== id || !puedeEditarPlan(resultado.perfil, plan)) throw new Error("Solo el autor del plan seleccionado puede modificar procedimientos.");
    if (resultado.totales[id]) throw new Error("Confirma primero el total del plan.");
    const version = revision, token = ++secuenciaTotal;
    versionesTotal.set(id, token);
    publicar({ confirmacionEstado: null, errorEstado: null, exitoEstado: null });
    publicarTotal(id, { estado: "mutando", error: null, mutacionConfirmada: false });
    let terminada = false;
    const vigente = () => activo && revision === version && versionesTotal.get(id) === token;
    return {
      async confirmado() {
        if (terminada) return; terminada = true;
        if (!vigente()) return;
        if (resultado.seleccionadoId !== id) {
          publicarTotal(id, { estado: "error", mutacionConfirmada: true, error: "El procedimiento se confirmó en este plan. Reintenta la sincronización de su total." }); return;
        }
        try { await sincronizarTotalPlan(id, true); }
        catch {
          if (activo && revision === version) publicarTotal(id, { estado: "error", mutacionConfirmada: true,
            error: "El procedimiento se confirmó, pero no se pudo actualizar el total mostrado. Reintenta la sincronización." });
        }
      },
      fallido() {
        if (terminada) return; terminada = true;
        if (vigente()) publicarTotal(id, { estado: "error", mutacionConfirmada: false, error: "La operación del procedimiento no se confirmó. Relee el plan para confirmar su total." });
      },
    };
  };
  return {
    obtener: () => resultado,
    suscribir(callback: () => void) { observadores.add(callback); return () => { observadores.delete(callback); }; },
    activar() { activo = true; },
    desactivar() { activo = false; revision++; resultado = { ...resultado,
      confirmacionEstado: null, errorEstado: null, exitoEstado: null,
      totales: Object.fromEntries(Object.entries(resultado.totales).map(([id, total]) => [id, { ...total, estado: "error" as const, error: "El contexto cambió. Reintenta la lectura del total." }])) };
      versionesTotal.clear(); lecturasTotal.clear(); },
    cargar,
    seleccionar(id: string | null) {
      if (resultado.estado !== "success" || resultado.guardando) throw new Error("Espera a que termine la operación.");
      if (id !== null && !resultado.planes.some((p) => p.id === id)) throw new Error("El plan no está en esta ficha.");
      if (resultado.seleccionadoId !== id) {
        revisionSeleccion++;
        const anterior = resultado.seleccionadoId;
        if (anterior && resultado.totales[anterior]?.estado === "loading") {
          versionesTotal.set(anterior, ++secuenciaTotal); lecturasTotal.delete(anterior);
          publicarTotal(anterior, { ...resultado.totales[anterior], estado: "error", error: "La selección cambió durante la relectura. Reintenta la sincronización de este plan." });
        }
      }
      publicar({ seleccionadoId: id, confirmacionEstado: null, errorEstado: null, exitoEstado: null });
    },
    crear: (datos: ContenidoPlanTratamiento) => escribir("crear", datos),
    guardarTitulo: (titulo: string) => escribir("titulo", titulo),
    guardarNotas: (notas: string) => escribir("notas", notas),
    iniciarTotalProcedimiento,
    sincronizarTotalPlan: (id: string) => sincronizarTotalPlan(id),
    async solicitarCambioEstado(nuevo: EstadoPlanTratamiento) {
      const plan = planParaTransicion(nuevo);
      if (requiereConfirmacionEstado(nuevo)) {
        publicar({ confirmacionEstado: { planId: plan.id, anterior: plan.estado, nuevo }, errorEstado: null, exitoEstado: null });
      } else await transicionar(plan, nuevo);
    },
    async confirmarCambioEstado() {
      const confirmacion = resultado.confirmacionEstado;
      if (!confirmacion) throw new Error("Confirma primero la transición del plan.");
      const plan = planParaTransicion(confirmacion.nuevo);
      if (plan.id !== confirmacion.planId || plan.estado !== confirmacion.anterior) throw new Error("La confirmación pertenece a otro plan o estado.");
      await transicionar(plan, confirmacion.nuevo);
    },
    cancelarConfirmacionEstado() {
      if (resultado.guardando) throw new Error("Hay un guardado en curso.");
      publicar({ confirmacionEstado: null, errorEstado: null });
    },
  };
}

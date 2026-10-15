import { exigirUuid, piezaDesdeTexto } from "./diagnosticoMapper.ts";
import { procedimientoParaGuardar } from "./procedimientoMapper.ts";
import type { ContenidoProcedimiento, EstadoProcedimiento, NuevoProcedimiento, PrioridadProcedimiento, ProcedimientoTratamiento } from "./tipos.ts";

export interface BorradorProcedimiento {
  descripcion: string; pieza: string; costo: string; prioridad: PrioridadProcedimiento; estado: EstadoProcedimiento; servicioId: string;
}
const vacio: BorradorProcedimiento = { descripcion: "", pieza: "", costo: "", prioridad: "normal", estado: "pendiente", servicioId: "" };
export function procedimientoDesdeBorrador(b: BorradorProcedimiento): ContenidoProcedimiento {
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(b.costo.trim())) throw new Error("Ingresa un costo válido con hasta dos decimales, sin valores negativos.");
  const datos = { descripcion: b.descripcion, numeroPieza: piezaDesdeTexto(b.pieza), costo: Number(b.costo.trim().replace(",", ".")),
    prioridad: b.prioridad, estado: b.estado };
  procedimientoParaGuardar(datos);
  return { ...datos, descripcion: datos.descripcion.trim() };
}
export function crearFormularioProcedimiento(p?: ProcedimientoTratamiento) {
  let estado = { ...(p ? { descripcion: p.descripcion, pieza: p.numeroPieza?.toString() ?? "", costo: p.costo.toFixed(2),
    prioridad: p.prioridad, estado: p.estado, servicioId: p.servicioId ?? "" } : vacio), guardando: false, error: "", mensaje: "" };
  let activo = true;
  const observadores = new Set<() => void>();
  const publicar = (cambio: Partial<typeof estado>) => { estado = { ...estado, ...cambio }; for (const observar of observadores) observar(); };
  return {
    obtener: () => estado,
    suscribir(callback: () => void) { observadores.add(callback); return () => { observadores.delete(callback); }; },
    activar() { activo = true; }, desactivar() { activo = false; },
    cambiar<K extends keyof BorradorProcedimiento>(campo: K, valor: BorradorProcedimiento[K]) {
      if (!estado.guardando) publicar({ [campo]: valor, error: "", mensaje: "" });
    },
    async enviar(guardar: (datos: ContenidoProcedimiento & NuevoProcedimiento) => Promise<ProcedimientoTratamiento>) {
      if (estado.guardando) return false;
      publicar({ guardando: true, error: "", mensaje: "" });
      try {
        const contenido = procedimientoDesdeBorrador({ ...estado, estado: p ? estado.estado : "pendiente" });
        const servicioId = estado.servicioId.trim() || null;
        if (!p && servicioId) exigirUuid(servicioId, "servicioId");
        const confirmado = await guardar({ ...contenido, servicioId });
        if (!confirmado || !confirmado.id) throw new Error("No se confirmó el procedimiento guardado.");
        if (!activo) return false;
        if (!p) publicar({ ...vacio, mensaje: "Procedimiento creado y confirmado." });
        else publicar({ descripcion: confirmado.descripcion, pieza: confirmado.numeroPieza?.toString() ?? "", costo: confirmado.costo.toFixed(2),
          prioridad: confirmado.prioridad, estado: confirmado.estado, mensaje: "Procedimiento actualizado y confirmado." });
        return true;
      } catch (causa) {
        if (activo) publicar({ error: causa instanceof Error ? causa.message : "No se confirmó el guardado." });
        return false;
      } finally { if (activo) publicar({ guardando: false }); }
    },
  };
}

import { planParaGuardar } from "./planTratamientoMapper.ts";
import type { ContenidoPlanTratamiento } from "./tipos.ts";

/** Borradores independientes: guardar título no descarta notas sin guardar. */
export function crearFormularioPlan(inicial: ContenidoPlanTratamiento = { titulo: "", notas: "" }) {
  let confirmado = { ...inicial };
  let estado = { ...inicial, guardando: false, error: "", mensaje: "" };
  let vigente = true;
  const observadores = new Set<() => void>();
  const publicar = (cambios: Partial<typeof estado>) => {
    estado = { ...estado, ...cambios };
    for (const observar of observadores) observar();
  };
  return {
    obtener: () => estado,
    suscribir(callback: () => void) { observadores.add(callback); return () => { observadores.delete(callback); }; },
    activar() { vigente = true; },
    desactivar() { vigente = false; },
    cambiar(campo: keyof ContenidoPlanTratamiento, valor: string) {
      if (!estado.guardando) publicar({ [campo]: valor, error: "", mensaje: "" });
    },
    sincronizar(datos: ContenidoPlanTratamiento) {
      const cambios: Partial<typeof estado> = {};
      if (datos.titulo !== confirmado.titulo) cambios.titulo = datos.titulo;
      if (datos.notas !== confirmado.notas) cambios.notas = datos.notas;
      confirmado = { ...datos };
      if (Object.keys(cambios).length) publicar(cambios);
    },
    async enviar(operacion: "crear" | "titulo" | "notas", guardar: (datos: ContenidoPlanTratamiento) => Promise<ContenidoPlanTratamiento>) {
      if (estado.guardando) return false;
      publicar({ guardando: true, error: "", mensaje: "" });
      try {
        const datos = operacion === "crear" ? planParaGuardar(estado) : { titulo: estado.titulo, notas: estado.notas };
        const recibido = await guardar(datos);
        if (!vigente) return false;
        if (operacion === "crear") publicar({ titulo: "", notas: "", mensaje: "Plan creado y confirmado." });
        else {
          confirmado = { ...confirmado, [operacion]: recibido[operacion] };
          publicar({ [operacion]: recibido[operacion], mensaje: operacion === "titulo" ? "Título guardado." : "Notas guardadas." });
        }
        return true;
      } catch (causa) {
        if (vigente) publicar({ error: causa instanceof Error ? causa.message : "No se confirmó el guardado." });
        return false;
      } finally { if (vigente) publicar({ guardando: false }); }
    },
  };
}

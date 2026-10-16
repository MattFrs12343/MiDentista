import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  Coins,
  FileText,
  Files,
  MagnifyingGlass,
  PencilSimple,
  Plus,
} from "@phosphor-icons/react";
import bannerPresupuestos from "@/assets/banners/banner-presupuestos.jpg";
import { HangingBanner } from "@/components/ui/hanging-banner";
import { SectionHeroStrip } from "@/components/ui/section-hero";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionLoader } from "@/components/ui/section-loader";
import { SectionStatStrip, SectionToolbar } from "@/components/ui/section-board";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { usePageHeader } from "@/components/layout/PageHeaderContext";
import { useClinicaData } from "@/data/store";
import { totalPresupuestado } from "./calculoTotal.ts";
import { ETIQUETA_ESTADO, formatearMoneda } from "./presupuestoFormato.ts";
import { PresupuestoForm, type PacienteOpcion } from "./PresupuestoForm.tsx";
import { PresupuestosLista } from "./PresupuestosLista.tsx";
import { cargarServicios, type Servicio } from "./servicioCatalogo.ts";
import { usePresupuestoSupabase } from "./usePresupuestoSupabase.ts";
import { ESTADOS_PRESUPUESTO } from "./tipos.ts";
import type {
  EstadoPresupuesto,
  ItemPresupuestoNuevo,
  Presupuesto,
  PresupuestoCompleto,
  PresupuestoNuevo,
} from "./tipos.ts";

/** Valor del filtro cuando no se quiere acotar ningún estado. */
type FiltroEstado = "todos" | EstadoPresupuesto;

/**
 * Listado transversal de presupuestos de la clínica (`/app/presupuestos`).
 *
 * Es la pantalla de recepción: "cuánto se presupuestó a cada paciente". No es
 * una pestaña de la ficha (ver el mismo criterio en el módulo 09). Desde aquí se
 * crean, editan, avanzan de estado y eliminan los presupuestos en borrador.
 *
 * La ruta la registra Matías al mergear; ver el README del módulo.
 */
export function PresupuestosPage() {
  const { pacientes, miPerfil } = useClinicaData();
  const {
    presupuestos,
    cargando,
    guardando,
    error,
    cargarClinica,
    cargarUno,
    crear,
    actualizar,
    cambiarEstado,
    eliminar,
  } = usePresupuestoSupabase();

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("todos");
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [editando, setEditando] = useState<PresupuestoCompleto | null>(null);
  const [cargandoEdicion, setCargandoEdicion] = useState(false);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [catalogoFallo, setCatalogoFallo] = useState(false);

  usePageHeader({
    title: "Presupuestos",
    subtitle: "Crea, consulta y da seguimiento a los presupuestos de la clínica",
    icon: FileText,
    tone: "yellow",
  });

  const clinicaId = miPerfil?.clinicaId;

  useEffect(() => {
    if (clinicaId) void cargarClinica(clinicaId);
  }, [cargarClinica, clinicaId]);

  useEffect(() => {
    if (!clinicaId) return;
    let cancelado = false;
    cargarServicios(clinicaId)
      .then((lista) => {
        if (!cancelado) {
          setServicios(lista);
          setCatalogoFallo(false);
        }
      })
      .catch(() => {
        // El catálogo es una ayuda: si falla, se siguen pudiendo crear partidas
        // libres. No se pisa la pantalla con el error del catálogo, pero sí se
        // avisa dentro del formulario que no se pudo cargar (y no "está vacío").
        if (!cancelado) {
          setServicios([]);
          setCatalogoFallo(true);
        }
      });
    return () => {
      cancelado = true;
    };
  }, [clinicaId]);

  const opciones: PacienteOpcion[] = useMemo(
    () =>
      pacientes.map((paciente) => ({
        id: paciente.id,
        nombre: `${paciente.nombres} ${paciente.apellidos}`.trim() || "Paciente sin nombre",
      })),
    [pacientes],
  );

  const mapaPacientes = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const opcion of opciones) mapa.set(opcion.id, opcion.nombre);
    return mapa;
  }, [opciones]);

  const nombrePaciente = useCallback(
    (pacienteId: string) => mapaPacientes.get(pacienteId) ?? "Paciente sin nombre",
    [mapaPacientes],
  );

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return presupuestos.filter((presupuesto) => {
      if (filtroEstado !== "todos" && presupuesto.estado !== filtroEstado) return false;
      if (!q) return true;
      const texto = `${presupuesto.titulo} ${nombrePaciente(presupuesto.pacienteId)}`.toLowerCase();
      return texto.includes(q);
    });
  }, [presupuestos, busqueda, filtroEstado, nombrePaciente]);

  const conteoBorradores = presupuestos.filter((p) => p.estado === "borrador").length;
  const conteoAceptados = presupuestos.filter((p) => p.estado === "aceptado").length;

  const abrirNuevo = () => {
    setEditando(null);
    setDialogoAbierto(true);
  };

  const abrirEdicion = (presupuesto: Presupuesto) => {
    void (async () => {
      setEditando(null);
      setCargandoEdicion(true);
      const completo = await cargarUno(presupuesto.id);
      setCargandoEdicion(false);
      if (completo) {
        setEditando(completo);
        setDialogoAbierto(true);
      }
    })();
  };

  const manejarGuardar = (presupuesto: PresupuestoNuevo, items: ItemPresupuestoNuevo[]) => {
    void (async () => {
      if (editando) {
        // `presupuesto` trae los campos del formulario y no el `id`/`estado`;
        // se combinan sobre el presupuesto cargado para conservarlos. El
        // odontólogo que presupuestó se conserva: editar el monto no debe
        // reasignar la autoría a quien edita.
        const actualizado = await actualizar(
          { ...editando, ...presupuesto, odontologoId: editando.odontologoId },
          items,
        );
        if (actualizado) setDialogoAbierto(false);
      } else {
        const creado = await crear(presupuesto, items);
        if (creado) setDialogoAbierto(false);
      }
    })();
  };

  const manejarEliminar = (presupuesto: Presupuesto) => {
    const nombre = presupuesto.titulo || "este presupuesto";
    if (!window.confirm(`¿Eliminar "${nombre}"? Sus partidas también se eliminarán.`)) return;
    void eliminar(presupuesto);
  };

  const hayFiltro = busqueda.trim() !== "" || filtroEstado !== "todos";

  if (!miPerfil) {
    return <SectionLoader label="Cargando tu perfil" className="min-h-64" />;
  }

  return (
    <div className="flex flex-col gap-5">
      <HangingBanner className="max-w-3xl">
        <SectionHeroStrip
          icon={FileText}
          tone="yellow"
          photo={bannerPresupuestos}
          className="hanger-panel fade-in-up"
        />
      </HangingBanner>

      <SectionStatStrip
        metrics={[
          {
            label: "Presupuestos",
            value: presupuestos.length,
            icon: Files,
            tone: "brand",
            hint: "en toda la clínica",
            destacado: true,
          },
          {
            label: "En borrador",
            value: conteoBorradores,
            icon: PencilSimple,
            tone: "orange",
            hint: "listos para editar",
          },
          {
            label: "Aceptados",
            value: conteoAceptados,
            icon: CheckCircle,
            tone: "green",
            hint: "listos para cobro",
          },
          {
            label: "Monto total",
            value: formatearMoneda(totalPresupuestado(presupuestos)),
            icon: Coins,
            tone: "teal",
            hint: "sin contar rechazados",
          },
        ]}
      />

      <SectionToolbar>
        <div className="relative min-w-56 flex-1">
          <MagnifyingGlass
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por título o paciente…"
            className="border-0 bg-transparent pl-9 shadow-none focus-visible:bg-transparent"
            aria-label="Buscar presupuestos"
          />
        </div>

        <div className="w-44">
          <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as FiltroEstado)}>
            <SelectTrigger aria-label="Filtrar por estado">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              {ESTADOS_PRESUPUESTO.map((estado) => (
                <SelectItem key={estado} value={estado}>
                  {ETIQUETA_ESTADO[estado]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="button" onClick={abrirNuevo} disabled={guardando}>
          <Plus size={16} weight="bold" aria-hidden="true" />
          Nuevo presupuesto
        </Button>
      </SectionToolbar>

      {error && !cargando && !dialogoAbierto ? (
        <div
          role="alert"
          className="rounded-panel border border-pastel-red-fg/25 bg-pastel-red-bg px-4 py-3 text-[13px] text-pastel-red-fg"
        >
          {error}
        </div>
      ) : null}

      {cargando && presupuestos.length === 0 ? (
        <SectionLoader label="Cargando presupuestos" className="min-h-64" />
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={hayFiltro ? MagnifyingGlass : FileText}
          iconTone={hayFiltro ? "neutral" : "warning"}
          title={
            hayFiltro
              ? "Sin presupuestos que coincidan"
              : "Todavía no hay presupuestos"
          }
          description={
            hayFiltro
              ? "Probá con otro texto o cambiá el filtro de estado."
              : "Creá el primer presupuesto de la clínica para presentarle un estimado al paciente y poder cobrarlo después."
          }
          actionLabel={hayFiltro ? "Limpiar filtros" : "Nuevo presupuesto"}
          actionVariant={hayFiltro ? "secondary" : "primary"}
          onAction={() => {
            if (hayFiltro) {
              setBusqueda("");
              setFiltroEstado("todos");
            } else {
              abrirNuevo();
            }
          }}
          live
        />
      ) : (
        <PresupuestosLista
          presupuestos={filtrados}
          nombrePaciente={nombrePaciente}
          onEditar={abrirEdicion}
          onCambiarEstado={(presupuesto, hacia) => void cambiarEstado(presupuesto, hacia)}
          onEliminar={manejarEliminar}
          guardando={guardando || cargandoEdicion}
        />
      )}

      <Dialog
        open={dialogoAbierto}
        onOpenChange={(abierto) => {
          setDialogoAbierto(abierto);
          if (!abierto) setEditando(null);
        }}
      >
        <DialogContent
          title={editando ? "Editar presupuesto" : "Nuevo presupuesto"}
          description={
            editando
              ? "Ajustá partidas, precios o descuento. El total se recalcula solo."
              : "Elegí el paciente, agregá los procedimientos y el total se calcula automáticamente."
          }
          className="max-w-3xl"
        >
          <PresupuestoForm
            key={editando?.id ?? "nuevo"}
            clinicaId={miPerfil.clinicaId}
            odontologoId={miPerfil.id}
            pacientes={opciones}
            servicios={servicios}
            catalogoError={catalogoFallo}
            inicial={editando ?? undefined}
            guardando={guardando}
            error={error}
            onGuardar={manejarGuardar}
            onCancelar={() => setDialogoAbierto(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

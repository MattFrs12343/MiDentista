import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Icon } from "@phosphor-icons/react";
import {
  Plus,
  ShieldCheck,
  Envelope,
  CheckCircle,
  WarningCircle,
  SpinnerGap,
  ArrowClockwise,
  XCircle,
  Trash,
  LockKey,
  UsersThree,
  Clock,
  Buildings,
  CaretDown,
  MapPin,
  Database,
  PencilSimple,
  ClockCounterClockwise,
  CaretRight,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionStatStrip, type SectionMetric } from "@/components/ui/section-board";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { usePageHeader } from "@/components/layout/PageHeaderContext";
import { useAuth, ROLE_LABEL } from "@/features/auth/AuthContext";
import {
  ApiError,
  listarClinicas,
  listarPersonalApi,
  crearClinicaApi,
  editarClinicaApi,
  invitarPersonalApi,
  reenviarInvitacionApi,
  cancelarInvitacionApi,
  eliminarPersonalApi,
  restablecerContrasenaPersonalApi,
  obtenerTamanoBdApi,
  type Clinica,
  type PerfilAdmin,
  type TamanoBaseDatos,
} from "@/data/api";
import { listarBitacora, type EntradaBitacora } from "./bitacoraService";
import type { Role } from "@/types";

const ROLES_INVITABLES: Role[] = ["odontologo", "recepcionista", "superadmin"];

/** Acción de la tarjeta móvil: 44px de alto, con su texto y no solo el
 * ícono — mismo patrón que `PatientsTable`. */
function BotonAccionMovil({
  icono: Icono,
  etiqueta,
  sr,
  onClick,
  peligro = false,
  disabled = false,
  girando = false,
}: {
  icono: Icon;
  etiqueta: string;
  sr: string;
  onClick: () => void;
  peligro?: boolean;
  disabled?: boolean;
  girando?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={sr}
      disabled={disabled || girando}
      onClick={onClick}
      className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-ios px-2 text-[13px] font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40 ${
        peligro
          ? "text-pastel-red-fg hover:bg-pastel-red-bg"
          : "text-ink-soft hover:bg-surface-sunken hover:text-ink"
      }`}
    >
      <Icono size={16} weight="bold" aria-hidden className={girando ? "animate-spin" : undefined} />
      {etiqueta}
    </button>
  );
}

export function AdminPage() {
  usePageHeader({
    title: "Administración",
    subtitle: "Clínicas, personal e invitaciones",
    icon: ShieldCheck,
    tone: "violet",
  });

  const { sesion } = useAuth();
  const correo = sesion?.email ?? "";

  const [personal, setPersonal] = useState<PerfilAdmin[]>([]);
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorLista, setErrorLista] = useState<string | null>(null);
  const [invitarAbierto, setInvitarAbierto] = useState(false);
  const [crearClinicaAbierto, setCrearClinicaAbierto] = useState(false);

  // Aparte de `cargar()`: si el RPC de tamaño falla (p. ej. todavía no se
  // corrió la migración en la base), el resto del panel sigue funcionando.
  const [tamanoBd, setTamanoBd] = useState<TamanoBaseDatos | null>(null);
  const [cargandoTamano, setCargandoTamano] = useState(true);

  const cargar = () => {
    setCargando(true);
    setErrorLista(null);
    Promise.all([listarPersonalApi(), listarClinicas()])
      .then(([p, c]) => {
        setPersonal(p);
        setClinicas(c);
      })
      .catch((e) => setErrorLista(e instanceof ApiError ? e.message : "No se pudo cargar el personal"))
      .finally(() => setCargando(false));
  };

  const cargarTamano = () => {
    setCargandoTamano(true);
    obtenerTamanoBdApi()
      .then(setTamanoBd)
      .catch(() => setTamanoBd(null))
      .finally(() => setCargandoTamano(false));
  };

  useEffect(() => {
    if (correo) {
      cargar();
      cargarTamano();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [correo]);

  // El superadmin no pertenece a ninguna clínica: va aparte, no dentro de
  // ninguna `ClinicaCard`. El resto se agrupa por `clinicaSlug` para que cada
  // tarjeta de clínica muestre solo su propio personal.
  const administradores = useMemo(() => personal.filter((p) => p.rol === "superadmin"), [personal]);
  const personalPorClinica = useMemo(() => {
    const mapa = new Map<string, PerfilAdmin[]>();
    for (const p of personal) {
      if (!p.clinicaSlug) continue;
      const lista = mapa.get(p.clinicaSlug) ?? [];
      lista.push(p);
      mapa.set(p.clinicaSlug, lista);
    }
    return mapa;
  }, [personal]);

  /* Lo primero que un superadmin quiere saber al entrar: cuántas clínicas
     hay, cuánto personal en total, cuántas invitaciones siguen sin aceptar
     (algo para seguir), y cuánto espacio ocupa la base (para no quedarse
     con esa lectura solo en el detalle de más abajo). Son 4 a propósito:
     en la grilla de la tira (2 columnas en móvil, 4 en escritorio) 3
     métricas dejan un hueco al final. */
  const metricas: SectionMetric[] = useMemo(() => {
    const pendientes = personal.filter((p) => p.invitacionPendiente).length;
    return [
      {
        label: "Clínicas",
        value: clinicas.length,
        icon: Buildings,
        tone: "violet",
        hint: "Activas",
        destacado: true,
      },
      {
        label: "Personal total",
        value: personal.length,
        icon: UsersThree,
        tone: "blue",
        hint: "Todas las clínicas",
      },
      {
        label: "Invitaciones pendientes",
        value: pendientes,
        icon: Clock,
        tone: pendientes > 0 ? "orange" : "neutral",
        hint: pendientes > 0 ? "Todavía no aceptaron" : "Al día",
      },
      {
        label: "Tamaño de la base",
        value: tamanoBd?.totalLegible ?? (cargandoTamano ? "…" : "—"),
        icon: Database,
        tone: "teal",
        hint: "Postgres, en vivo",
      },
    ];
  }, [personal, clinicas, tamanoBd, cargandoTamano]);

  return (
    <div className="flex flex-col gap-5">
      {!cargando && !errorLista ? <SectionStatStrip metrics={metricas} className="fade-in-up" /> : null}

      <TarjetaBaseDatos datos={tamanoBd} cargando={cargandoTamano} />

      {cargando ? (
        <div className="flex items-center gap-2 py-6 text-sm text-ink-muted">
          <SpinnerGap size={16} className="animate-spin" /> Cargando…
        </div>
      ) : errorLista ? (
        <p className="flex items-start gap-2 rounded-xl border border-pastel-red-fg/25 bg-pastel-red-bg px-3.5 py-3 text-sm text-pastel-red-fg">
          <WarningCircle size={17} weight="fill" className="mt-0.5 shrink-0" />
          <span>{errorLista}</span>
        </p>
      ) : (
        // Pestañas en vez de dos secciones apiladas: clínicas y administradores
        // son dos espacios con su propia acción principal (crear clínica /
        // invitar administrador) y no deberían competir por el mismo lugar en
        // pantalla ni mezclarse en una sola lista.
        <Tabs defaultValue="clinicas" className="flex flex-col gap-4">
          <TabsList>
            <TabsTrigger value="clinicas">
              Clínicas{clinicas.length > 0 ? ` (${clinicas.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="administradores">
              Administradores{administradores.length > 0 ? ` (${administradores.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="bitacora">Bitácora</TabsTrigger>
          </TabsList>

          <TabsContent value="clinicas" className="flex flex-col gap-4">
            <div className="flex items-center justify-end">
              <Button type="button" onClick={() => setCrearClinicaAbierto(true)}>
                <Plus size={16} weight="bold" /> Crear clínica
              </Button>
            </div>

            {clinicas.length === 0 ? (
              <EmptyState
                size="sm"
                icon={Buildings}
                iconTone="brand"
                title="Todavía no hay clínicas"
                description="Creá la primera clínica para poder invitar a su personal."
                actionLabel="Crear clínica"
                onAction={() => setCrearClinicaAbierto(true)}
              />
            ) : (
              <div className="flex flex-col gap-3">
                {clinicas.map((c) => (
                  <ClinicaCard
                    key={c.id}
                    clinica={c}
                    personal={personalPorClinica.get(c.slug) ?? []}
                    correoPropio={correo}
                    onCambio={cargar}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="administradores" className="flex flex-col gap-4">
            <div className="flex items-center justify-end">
              <Button type="button" variant="secondary" onClick={() => setInvitarAbierto(true)}>
                <Envelope size={16} weight="bold" /> Invitar administrador
              </Button>
            </div>

            {administradores.length === 0 ? (
              <EmptyState
                size="sm"
                icon={ShieldCheck}
                iconTone="brand"
                title="Todavía no hay otros administradores"
                description="Invitá a alguien más para que audite el sistema junto con vos."
                actionLabel="Invitar administrador"
                onAction={() => setInvitarAbierto(true)}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Administradores</CardTitle>
                  <CardDescription>Auditan el sistema entero: no pertenecen a ninguna clínica.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {administradores.map((p) => (
                    <TarjetaPersonal key={p.id} perfil={p} esPropio={p.email === correo} onCambio={cargar} />
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="bitacora" className="flex flex-col gap-4">
            <BitacoraSection />
          </TabsContent>
        </Tabs>
      )}

      <InvitarDialog open={invitarAbierto} onOpenChange={setInvitarAbierto} clinicas={clinicas} onInvitado={cargar} />
      <CrearClinicaDialog open={crearClinicaAbierto} onOpenChange={setCrearClinicaAbierto} onCreada={cargar} />
    </div>
  );
}

/**
 * Tamaño actual de Postgres: el total y, debajo, las tablas que más espacio
 * ocupan con una barra relativa al tamaño de la más grande — para ver de un
 * vistazo dónde está creciendo la base, no solo un número suelto. Se
 * actualiza solo (nueva consulta cada vez que se entra al panel), no es un
 * valor fijo.
 */
function TarjetaBaseDatos({ datos, cargando }: { datos: TamanoBaseDatos | null; cargando: boolean }) {
  if (cargando) {
    return (
      <Card className="fade-in-up">
        <CardContent className="flex items-center gap-2 py-4 text-sm text-ink-muted">
          <SpinnerGap size={16} className="animate-spin" /> Calculando el tamaño de la base…
        </CardContent>
      </Card>
    );
  }

  // Si el RPC todavía no existe en la base (falta correr la migración) no
  // rompemos el panel: simplemente no se muestra la tarjeta.
  if (!datos) return null;

  const mayor = datos.tablas[0]?.bytes || 1;

  return (
    <Card className="fade-in-up">
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-tile bg-brand-100 text-brand-700">
            <Database size={20} weight="duotone" />
          </span>
          <div>
            <CardTitle>Base de datos</CardTitle>
            <CardDescription>Espacio ocupado en Postgres, en vivo.</CardDescription>
          </div>
        </div>
        <p className="text-right text-[22px] font-semibold tabular-nums text-ink">{datos.totalLegible}</p>
      </CardHeader>

      {datos.tablas.length > 0 ? (
        <CardContent className="flex flex-col gap-2.5 pt-0">
          {datos.tablas.map((t) => (
            <div key={t.tabla} className="flex items-center gap-3">
              <span className="w-36 shrink-0 truncate text-xs text-ink-soft sm:w-44">{t.tabla}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                <span
                  className="block h-full rounded-full bg-brand-500"
                  style={{ width: `${Math.max(4, Math.round((t.bytes / mayor) * 100))}%` }}
                />
              </span>
              <span className="w-14 shrink-0 text-right text-xs tabular-nums text-ink-muted">{t.legible}</span>
            </div>
          ))}
        </CardContent>
      ) : null}
    </Card>
  );
}

/**
 * Una clínica, expandible: el encabezado siempre visible (nombre, ciudad,
 * cuánto personal tiene) y, al tocarlo, su roster completo + el botón para
 * invitar a alguien puntualmente a esa clínica. Es el reemplazo directo del
 * viejo listado plano de "Personal": ahora cada cuenta vive donde pertenece,
 * no en una tabla única con una columna de clínica.
 */
function ClinicaCard({
  clinica,
  personal,
  correoPropio,
  onCambio,
}: {
  clinica: Clinica;
  personal: PerfilAdmin[];
  correoPropio: string;
  onCambio: () => void;
}) {
  const [abierta, setAbierta] = useState(false);
  const [invitarAbierto, setInvitarAbierto] = useState(false);
  const [editando, setEditando] = useState(false);
  const pendientes = personal.filter((p) => p.invitacionPendiente).length;

  return (
    <Card className="overflow-hidden p-0">
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        aria-expanded={abierta}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-tile bg-brand-100 text-brand-700">
          <Buildings size={20} weight="duotone" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink">{clinica.nombre}</p>
          <p className="truncate text-xs text-ink-muted">
            {clinica.ciudad ?? "Sin ciudad"} · {personal.length} {personal.length === 1 ? "persona" : "personas"}
            {pendientes > 0 ? ` · ${pendientes} pendiente${pendientes === 1 ? "" : "s"}` : ""}
          </p>
        </div>
        <CaretDown
          size={18}
          weight="bold"
          aria-hidden
          className={`shrink-0 text-ink-muted transition-transform duration-150 ${abierta ? "rotate-180" : ""}`}
        />
      </button>

      {abierta ? (
        <div className="flex flex-col gap-4 border-t border-line p-4">
          {editando ? (
            <EditarClinicaForm
              clinica={clinica}
              onCancelar={() => setEditando(false)}
              onGuardada={() => {
                setEditando(false);
                onCambio();
              }}
            />
          ) : (
            <div className="flex items-start justify-between gap-3 rounded-tile bg-surface-sunken/60 px-3.5 py-3 text-xs text-ink-soft">
              {clinica.direccion || clinica.telefono || clinica.email ? (
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {clinica.direccion ? (
                    <span className="flex items-center gap-1">
                      <MapPin size={13} weight="duotone" className="shrink-0 text-ink-muted" /> {clinica.direccion}
                    </span>
                  ) : null}
                  {clinica.telefono ? <span>{clinica.telefono}</span> : null}
                  {clinica.email ? <span>{clinica.email}</span> : null}
                </div>
              ) : (
                <p className="text-ink-muted">Todavía no cargaste la dirección ni el contacto.</p>
              )}
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="flex shrink-0 items-center gap-1 rounded-ios px-1.5 py-0.5 font-medium text-brand-600 transition-colors hover:bg-brand-100"
              >
                <PencilSimple size={13} weight="bold" /> Editar
              </button>
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <p className="label-ios px-0.5 text-[11px] font-medium text-ink-muted">
              Personal · {personal.length}
            </p>
            {personal.length === 0 ? (
              <p className="px-1 py-4 text-center text-sm text-ink-muted">Todavía no hay personal en esta clínica.</p>
            ) : (
              personal.map((p) => (
                <TarjetaPersonal key={p.id} perfil={p} esPropio={p.email === correoPropio} onCambio={onCambio} />
              ))
            )}
          </div>

          <div className="border-t border-line pt-3">
            <Button type="button" variant="secondary" className="w-full" onClick={() => setInvitarAbierto(true)}>
              <Plus size={16} weight="bold" /> Invitar a {clinica.nombre}
            </Button>
          </div>
        </div>
      ) : null}

      <InvitarDialog
        open={invitarAbierto}
        onOpenChange={setInvitarAbierto}
        clinicas={[clinica]}
        clinicaFija={{ id: clinica.id, nombre: clinica.nombre }}
        onInvitado={onCambio}
      />
    </Card>
  );
}

/**
 * Edición in-line de ciudad/dirección/teléfono/email de una clínica ya
 * creada. El nombre y el slug no se tocan acá (ver el comentario de
 * `handleAdminEditarClinica` en la Edge Function). Las coordenadas
 * (latitud/longitud) tampoco se exponen en este form, pero se reenvían tal
 * cual venían para no perderlas: el endpoint actualiza la fila completa.
 */
function EditarClinicaForm({
  clinica,
  onCancelar,
  onGuardada,
}: {
  clinica: Clinica;
  onCancelar: () => void;
  onGuardada: () => void;
}) {
  const [ciudad, setCiudad] = useState(clinica.ciudad ?? "");
  const [direccion, setDireccion] = useState(clinica.direccion ?? "");
  const [telefono, setTelefono] = useState(clinica.telefono ?? "");
  const [email, setEmail] = useState(clinica.email ?? "");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (cargando) return;
    setError(null);
    setCargando(true);
    try {
      await editarClinicaApi({
        clinicaId: clinica.id,
        ciudad: ciudad.trim() || undefined,
        direccion: direccion.trim() || undefined,
        telefono: telefono.trim() || undefined,
        email: email.trim() || undefined,
        pais: clinica.pais ?? undefined,
        latitud: clinica.latitud ?? undefined,
        longitud: clinica.longitud ?? undefined,
      });
      onGuardada();
    } catch (fallo) {
      setCargando(false);
      setError(fallo instanceof ApiError ? fallo.message : "No se pudo guardar los cambios");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-tile bg-surface-sunken/60 p-3.5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Ciudad" htmlFor={`editar-ciudad-${clinica.id}`}>
          <Input id={`editar-ciudad-${clinica.id}`} value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder="La Paz" />
        </Field>
        <Field label="Teléfono" htmlFor={`editar-telefono-${clinica.id}`}>
          <Input
            id={`editar-telefono-${clinica.id}`}
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="+591 2 2345678"
          />
        </Field>
      </div>

      <Field label="Dirección" htmlFor={`editar-direccion-${clinica.id}`}>
        <Input
          id={`editar-direccion-${clinica.id}`}
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          placeholder="Av. 6 de Agosto Nº 2240"
        />
      </Field>

      <Field label="Correo" htmlFor={`editar-email-${clinica.id}`}>
        <Input
          id={`editar-email-${clinica.id}`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="contacto@clinica.com"
        />
      </Field>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-pastel-red-fg/25 bg-pastel-red-bg px-3.5 py-3 text-sm text-pastel-red-fg"
        >
          <WarningCircle size={17} weight="fill" className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancelar} disabled={cargando}>
          Cancelar
        </Button>
        <Button type="submit" disabled={cargando}>
          {cargando ? <SpinnerGap size={16} className="animate-spin" /> : "Guardar"}
        </Button>
      </div>
    </form>
  );
}

function CrearClinicaDialog({
  open,
  onOpenChange,
  onCreada,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreada: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creada, setCreada] = useState<Clinica | null>(null);

  const resetear = () => {
    setNombre("");
    setCiudad("");
    setDireccion("");
    setTelefono("");
    setEmail("");
    setCargando(false);
    setError(null);
    setCreada(null);
  };

  const handleOpenChange = (abierto: boolean) => {
    onOpenChange(abierto);
    if (!abierto) resetear();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (cargando) return;
    setError(null);
    setCargando(true);
    try {
      const nueva = await crearClinicaApi({
        nombre: nombre.trim(),
        ciudad: ciudad.trim() || undefined,
        direccion: direccion.trim() || undefined,
        telefono: telefono.trim() || undefined,
        email: email.trim() || undefined,
      });
      setCreada(nueva);
      setCargando(false);
      onCreada();
    } catch (fallo) {
      setCargando(false);
      setError(fallo instanceof ApiError ? fallo.message : "No se pudo crear la clínica");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        title="Crear clínica"
        description={creada ? undefined : "Después vas a poder invitar a su personal desde su propia tarjeta."}
      >
        {creada ? (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-pastel-green-bg text-pastel-green-fg">
              <CheckCircle size={26} weight="fill" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">{creada.nombre} creada</p>
              <p className="mt-1 text-sm text-ink-muted">
                Ya aparece en la lista de clínicas — abrí su tarjeta para invitar a su primer odontólogo o
                recepcionista.
              </p>
            </div>
            <Button type="button" onClick={() => handleOpenChange(false)} className="w-full">
              Listo
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Nombre de la clínica" htmlFor="clinica-nombre">
              <Input
                id="clinica-nombre"
                required
                autoFocus
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Dental Dos Santos"
              />
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Ciudad (opcional)" htmlFor="clinica-ciudad">
                <Input id="clinica-ciudad" value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder="La Paz" />
              </Field>
              <Field label="Teléfono (opcional)" htmlFor="clinica-telefono">
                <Input id="clinica-telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+591 2 2345678" />
              </Field>
            </div>

            <Field label="Dirección (opcional)" htmlFor="clinica-direccion">
              <Input id="clinica-direccion" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Av. 6 de Agosto Nº 2240" />
            </Field>

            <Field label="Correo (opcional)" htmlFor="clinica-email">
              <Input
                id="clinica-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contacto@clinica.com"
              />
            </Field>

            <p className="-mt-1 text-xs text-ink-muted">
              El identificador de la clínica (slug) se genera solo a partir del nombre. Las coordenadas para que
              aparezca en el buscador del portal del paciente se pueden cargar después, directo en la base.
            </p>

            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-pastel-red-fg/25 bg-pastel-red-bg px-3.5 py-3 text-sm text-pastel-red-fg"
              >
                <WarningCircle size={17} weight="fill" className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}

            <Button type="submit" disabled={cargando} className="w-full">
              {cargando ? (
                <>
                  <SpinnerGap size={16} className="animate-spin" /> Creando…
                </>
              ) : (
                <>
                  <Plus size={16} weight="bold" /> Crear clínica
                </>
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Una cuenta de personal: avatar + nombre + correo, el rol (y la
 * especialidad, si la tiene) como dato secundario — ya no repite la clínica,
 * porque esta tarjeta siempre vive dentro de la `ClinicaCard` a la que
 * pertenece (o dentro de "Administradores", donde la clínica es siempre
 * "ninguna"). Botones de 44px con su texto, no solo el ícono.
 */
function TarjetaPersonal({
  perfil,
  esPropio,
  onCambio,
}: {
  perfil: PerfilAdmin;
  esPropio: boolean;
  onCambio: () => void;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex min-h-11 items-center gap-3 px-3 py-3">
        <Avatar nombre={perfil.nombre} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink">
            {perfil.nombre} {esPropio ? <span className="text-xs text-ink-muted">(vos)</span> : null}
          </p>
          <p className="truncate text-xs text-ink-muted">
            {perfil.email} · {ROLE_LABEL[perfil.rol]}
            {perfil.especialidad ? ` · ${perfil.especialidad}` : ""}
          </p>
        </div>
      </div>

      <div className="border-t border-line px-3 py-2.5">
        <FilaAcciones perfil={perfil} esPropio={esPropio} onCambio={onCambio} />
      </div>
    </Card>
  );
}

/**
 * Estado (badge) + acciones de una cuenta: reenviar/cancelar si la
 * invitación sigue pendiente, restablecer contraseña/eliminar si ya está
 * activa — con su diálogo de confirmación.
 */
function FilaAcciones({
  perfil,
  esPropio,
  onCambio,
}: {
  perfil: PerfilAdmin;
  esPropio: boolean;
  onCambio: () => void;
}) {
  const [accion, setAccion] = useState<"reenviar" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<"cancelar" | "eliminar" | "restablecer" | null>(null);

  const reenviar = async () => {
    setAccion("reenviar");
    setError(null);
    try {
      await reenviarInvitacionApi(perfil.id);
      onCambio();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo reenviar la invitación");
    } finally {
      setAccion(null);
    }
  };

  const badge = perfil.invitacionPendiente ? (
    <Badge tone="yellow">Invitación pendiente</Badge>
  ) : perfil.activo ? (
    <Badge tone="green">Activo</Badge>
  ) : (
    <Badge tone="neutral">Inactivo</Badge>
  );

  return (
    <div className="flex flex-col gap-2">
      {badge}
      {error ? <p className="text-xs text-pastel-red-fg">{error}</p> : null}

      {perfil.invitacionPendiente ? (
        <div className="flex items-center gap-1">
          <BotonAccionMovil
            icono={accion === "reenviar" ? SpinnerGap : ArrowClockwise}
            etiqueta="Reenviar"
            sr="Reenviar invitación"
            onClick={reenviar}
            girando={accion === "reenviar"}
          />
          <BotonAccionMovil
            icono={XCircle}
            etiqueta="Cancelar"
            sr="Cancelar invitación"
            onClick={() => setConfirmando("cancelar")}
            peligro
          />
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <BotonAccionMovil
            icono={LockKey}
            etiqueta="Contraseña"
            sr="Restablecer contraseña"
            onClick={() => setConfirmando("restablecer")}
          />
          <BotonAccionMovil
            icono={Trash}
            etiqueta="Eliminar"
            sr="Eliminar cuenta"
            onClick={() => setConfirmando("eliminar")}
            disabled={esPropio}
            peligro
          />
        </div>
      )}

      <ConfirmarDialog
        tipo={confirmando}
        perfil={perfil}
        onClose={() => setConfirmando(null)}
        onConfirmado={() => {
          setConfirmando(null);
          onCambio();
        }}
      />
    </div>
  );
}

function ConfirmarDialog({
  tipo,
  perfil,
  onClose,
  onConfirmado,
}: {
  tipo: "cancelar" | "eliminar" | "restablecer" | null;
  perfil: PerfilAdmin;
  onClose: () => void;
  onConfirmado: () => void;
}) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  const cerrarYResetear = () => {
    onClose();
    setError(null);
    setExito(false);
  };

  const confirmar = async () => {
    if (!tipo) return;
    setCargando(true);
    setError(null);
    try {
      if (tipo === "cancelar") await cancelarInvitacionApi(perfil.id);
      else if (tipo === "eliminar") await eliminarPersonalApi(perfil.id);
      else await restablecerContrasenaPersonalApi(perfil.id);

      // Restablecer no cambia nada visible en la fila: mostramos un estado
      // de éxito en vez de cerrar de una, para confirmar que el correo salió.
      if (tipo === "restablecer") setExito(true);
      else onConfirmado();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo completar la acción");
    } finally {
      setCargando(false);
    }
  };

  const titulo =
    tipo === "cancelar" ? "Cancelar invitación" : tipo === "eliminar" ? "Eliminar cuenta" : "Restablecer contraseña";

  return (
    <Dialog
      open={tipo !== null}
      onOpenChange={(open) => {
        if (!open) cerrarYResetear();
      }}
    >
      <DialogContent title={titulo} description={exito ? undefined : "Esta acción no se puede deshacer."}>
        {exito ? (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-pastel-green-bg text-pastel-green-fg">
              <CheckCircle size={26} weight="fill" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Correo enviado</p>
              <p className="mt-1 text-sm text-ink-muted">
                <strong>{perfil.email}</strong> va a recibir un link para elegir su contraseña nueva.
              </p>
            </div>
            <Button type="button" onClick={() => { cerrarYResetear(); onConfirmado(); }} className="w-full">
              Listo
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-soft">
              {tipo === "cancelar" ? (
                <>
                  ¿Cancelar la invitación de <strong className="text-ink">{perfil.email}</strong>? No va a
                  poder usar ese link para entrar.
                </>
              ) : tipo === "eliminar" ? (
                <>
                  ¿Eliminar la cuenta de <strong className="text-ink">{perfil.nombre}</strong>? Deja de poder
                  iniciar sesión en el panel.
                </>
              ) : (
                <>
                  ¿Enviar un correo de restablecimiento a <strong className="text-ink">{perfil.email}</strong>?
                  Va a poder elegir su propia contraseña nueva desde ahí; vos no la ves en ningún momento.
                </>
              )}
            </p>

            {error && (
              <p className="flex items-start gap-2 rounded-xl border border-pastel-red-fg/25 bg-pastel-red-bg px-3.5 py-3 text-sm text-pastel-red-fg">
                <WarningCircle size={17} weight="fill" className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={cerrarYResetear} disabled={cargando}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant={tipo === "restablecer" ? "primary" : "danger"}
                onClick={confirmar}
                disabled={cargando}
              >
                {cargando ? (
                  <SpinnerGap size={16} className="animate-spin" />
                ) : tipo === "restablecer" ? (
                  "Enviar correo"
                ) : (
                  "Confirmar"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Siempre controlado desde afuera (`open`/`onOpenChange`): el disparador lo
 * decide quien lo usa — el botón genérico "Invitar" del encabezado, o el
 * botón "Invitar a esta clínica" de una `ClinicaCard` — así el mismo diálogo
 * sirve para los dos casos sin un trigger propio fijo.
 *
 * Con `clinicaFija` (se abrió desde una clínica puntual): el selector de
 * clínica desaparece (ya se sabe cuál es) y "Administrador" sale de los
 * roles invitables, porque un superadmin no pertenece a ninguna clínica.
 */
function InvitarDialog({
  open,
  onOpenChange,
  clinicas,
  clinicaFija,
  onInvitado,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicas: Clinica[];
  clinicaFija?: { id: string; nombre: string };
  onInvitado: () => void;
}) {
  const [email, setEmail] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [rol, setRol] = useState<Role>("odontologo");
  const [clinicaId, setClinicaId] = useState(clinicaFija?.id ?? "");
  const [especialidad, setEspecialidad] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const rolesDisponibles = clinicaFija ? ROLES_INVITABLES.filter((r) => r !== "superadmin") : ROLES_INVITABLES;

  const resetear = () => {
    setEmail("");
    setNombreCompleto("");
    setRol("odontologo");
    setClinicaId(clinicaFija?.id ?? "");
    setEspecialidad("");
    setCargando(false);
    setError(null);
    setEnviado(false);
  };

  const handleOpenChange = (abierto: boolean) => {
    onOpenChange(abierto);
    if (!abierto) resetear();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (cargando) return;
    setError(null);

    const clinicaElegida = clinicaFija?.id ?? clinicaId;
    // El superadmin no pertenece a ninguna clínica: solo audita el sistema.
    if (rol !== "superadmin" && !clinicaElegida) {
      setError("Elegí una clínica");
      return;
    }

    setCargando(true);
    try {
      await invitarPersonalApi({
        email: email.trim(),
        nombreCompleto: nombreCompleto.trim(),
        rol: rol as "odontologo" | "recepcionista" | "superadmin",
        clinicaId: rol === "superadmin" ? undefined : clinicaElegida,
        especialidad: especialidad.trim() || undefined,
      });
      setEnviado(true);
      setCargando(false);
      onInvitado();
    } catch (fallo) {
      setCargando(false);
      setError(fallo instanceof ApiError ? fallo.message : "No se pudo enviar la invitación");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        title={clinicaFija ? `Invitar a ${clinicaFija.nombre}` : "Invitar colaborador"}
        description={enviado ? undefined : "Le mandamos un correo con un link para que elija su contraseña."}
      >
        {enviado ? (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-pastel-green-bg text-pastel-green-fg">
              <CheckCircle size={26} weight="fill" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Invitación enviada</p>
              <p className="mt-1 text-sm text-ink-muted">
                <strong>{email}</strong> va a recibir un correo para unirse.
              </p>
            </div>
            <Button type="button" onClick={() => handleOpenChange(false)} className="w-full">
              Listo
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Correo electrónico" htmlFor="invitar-email">
              <Input
                id="invitar-email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@clinica.com"
              />
            </Field>

            <Field label="Nombre completo" htmlFor="invitar-nombre">
              <Input
                id="invitar-nombre"
                required
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
                placeholder="Dra. Ana Pérez"
              />
            </Field>

            <div
              className={
                clinicaFija || rol === "superadmin" ? "grid grid-cols-1 gap-3" : "grid grid-cols-1 gap-3 sm:grid-cols-2"
              }
            >
              <Field label="Rol">
                <Select value={rol} onValueChange={(v) => setRol(v as Role)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rolesDisponibles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {!clinicaFija && rol !== "superadmin" && (
                <Field label="Clínica">
                  <Select value={clinicaId} onValueChange={setClinicaId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Elegir…" />
                    </SelectTrigger>
                    <SelectContent>
                      {clinicas.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </div>

            {clinicaFija ? (
              <p className="-mt-1 text-xs text-ink-muted">
                Se suma al personal de <strong className="text-ink-soft">{clinicaFija.nombre}</strong>.
              </p>
            ) : rol === "superadmin" ? (
              <p className="-mt-1 text-xs text-ink-muted">
                El administrador no pertenece a ninguna clínica: solo audita el sistema.
              </p>
            ) : null}

            {rol === "odontologo" && (
              <Field label="Especialidad (opcional)" htmlFor="invitar-especialidad">
                <Input
                  id="invitar-especialidad"
                  value={especialidad}
                  onChange={(e) => setEspecialidad(e.target.value)}
                  placeholder="Odontología general"
                />
              </Field>
            )}

            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-pastel-red-fg/25 bg-pastel-red-bg px-3.5 py-3 text-sm text-pastel-red-fg"
              >
                <WarningCircle size={17} weight="fill" className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}

            <Button type="submit" disabled={cargando} className="w-full">
              {cargando ? (
                <>
                  <SpinnerGap size={16} className="animate-spin" /> Enviando…
                </>
              ) : (
                <>
                  <Envelope size={16} weight="bold" /> Enviar invitación
                </>
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

const ETIQUETA_ACCION: Record<EntradaBitacora["accion"], { texto: string; tono: string }> = {
  INSERT: { texto: "Creó", tono: "text-ios-green" },
  UPDATE: { texto: "Editó", tono: "text-ios-blue" },
  DELETE: { texto: "Eliminó", tono: "text-pastel-red-fg" },
};

function formatoFechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Pestaña "Bitácora" (módulo 16): quién hizo qué, cuándo, desde qué IP y con
 * qué detalle. Solo lectura — la tabla rechaza escritura directa del
 * cliente, así que no hay acción de "crear" ni "borrar" entrada acá.
 *
 * Un error al cargar probablemente significa que `docs/modules/16-bitacora/
 * sql.sql` todavía no se corrió en Supabase (la tabla `bitacora` no existe
 * todavía), así que el mensaje lo dice explícito en vez de un error crudo.
 */
function BitacoraSection() {
  const [entradas, setEntradas] = useState<EntradaBitacora[]>([]);
  const [pagina, setPagina] = useState(0);
  const [haySiguiente, setHaySiguiente] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandida, setExpandida] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError(null);
    listarBitacora(pagina)
      .then(({ entradas: nuevas, haySiguiente: siguiente }) => {
        if (cancelado) return;
        setEntradas((previas) => (pagina === 0 ? nuevas : [...previas, ...nuevas]));
        setHaySiguiente(siguiente);
      })
      .catch((causa: unknown) => {
        if (cancelado) return;
        const mensaje = causa instanceof Error ? causa.message : "No se pudo cargar la bitácora.";
        setError(
          /relation .*bitacora.* does not exist/i.test(mensaje)
            ? "La bitácora todavía no está instalada en la base de datos. Corré docs/modules/16-bitacora/sql.sql en Supabase."
            : mensaje,
        );
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [pagina]);

  if (cargando && entradas.length === 0) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-ink-muted">
        <SpinnerGap size={16} className="animate-spin" /> Cargando…
      </div>
    );
  }

  if (error && entradas.length === 0) {
    return (
      <p className="flex items-start gap-2 rounded-xl border border-pastel-red-fg/25 bg-pastel-red-bg px-3.5 py-3 text-sm text-pastel-red-fg">
        <WarningCircle size={17} weight="fill" className="mt-0.5 shrink-0" />
        <span>{error}</span>
      </p>
    );
  }

  if (entradas.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon={ClockCounterClockwise}
        iconTone="brand"
        title="Todavía no hay acciones registradas"
        description="Cada alta, edición o eliminación de pacientes, citas, diagnósticos, planes, presupuestos, pagos y usuarios va a aparecer acá."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bitácora de auditoría</CardTitle>
        <CardDescription>Quién hizo qué, cuándo y desde qué IP. Más reciente primero.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {entradas.map((entrada) => {
          const abierta = expandida === entrada.id;
          const accion = ETIQUETA_ACCION[entrada.accion];
          return (
            <div key={entrada.id} className="rounded-xl border border-line">
              <button
                type="button"
                onClick={() => setExpandida(abierta ? null : entrada.id)}
                className="press flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[13px] font-medium text-ink">
                    <span className={accion.tono}>{accion.texto}</span> en{" "}
                    <span className="font-semibold">{entrada.tablaAfectada}</span>
                    {entrada.clinicaNombre ? ` · ${entrada.clinicaNombre}` : ""}
                  </span>
                  <span className="text-[12px] text-ink-muted">
                    {formatoFechaHora(entrada.creadoEn)}
                    {entrada.rol ? ` · ${ROLE_LABEL[entrada.rol as Role] ?? entrada.rol}` : ""}
                    {entrada.ipAddress ? ` · IP ${entrada.ipAddress}` : ""}
                  </span>
                </div>
                <CaretRight
                  size={14}
                  weight="bold"
                  className={`shrink-0 text-ink-muted transition-transform ${abierta ? "rotate-90" : ""}`}
                />
              </button>
              {abierta ? (
                <pre className="overflow-x-auto border-t border-line bg-surface-sunken px-3.5 py-2.5 text-[11px] leading-snug text-ink-soft">
                  {JSON.stringify(entrada.detalle, null, 2)}
                </pre>
              ) : null}
            </div>
          );
        })}

        {haySiguiente ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="self-center"
            disabled={cargando}
            onClick={() => setPagina((p) => p + 1)}
          >
            {cargando ? <SpinnerGap size={14} className="animate-spin" /> : null}
            Cargar más
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

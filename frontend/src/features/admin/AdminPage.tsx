import { useEffect, useState, type FormEvent } from "react";
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
} from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { usePageHeader } from "@/components/layout/PageHeaderContext";
import { useAuth, ROLE_LABEL } from "@/features/auth/AuthContext";
import {
  ApiError,
  listarClinicas,
  listarPersonalApi,
  invitarPersonalApi,
  reenviarInvitacionApi,
  cancelarInvitacionApi,
  eliminarPersonalApi,
  restablecerContrasenaPersonalApi,
  type Clinica,
  type PerfilAdmin,
} from "@/data/api";
import type { Role } from "@/types";

const ROLES_INVITABLES: Role[] = ["odontologo", "recepcionista", "superadmin"];
const ACCION_BTN =
  "rounded-md p-1.5 text-ink-muted transition-colors duration-150 ease-out hover:bg-surface-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-blue/45 disabled:pointer-events-none disabled:opacity-40";

export function AdminPage() {
  usePageHeader({
    title: "Administración",
    subtitle: "Personal de todas las clínicas e invitaciones",
    icon: ShieldCheck,
    tone: "violet",
  });

  const { sesion } = useAuth();
  const correo = sesion?.email ?? "";

  const [personal, setPersonal] = useState<PerfilAdmin[]>([]);
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorLista, setErrorLista] = useState<string | null>(null);

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

  useEffect(() => {
    if (correo) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [correo]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex min-w-0 justify-end">
        <InvitarDialog clinicas={clinicas} onInvitado={cargar} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal</CardTitle>
          <CardDescription>Odontólogos, recepcionistas y administradores de todas las clínicas</CardDescription>
        </CardHeader>
        <CardContent>
          {cargando ? (
            <div className="flex items-center gap-2 py-6 text-sm text-ink-muted">
              <SpinnerGap size={16} className="animate-spin" /> Cargando…
            </div>
          ) : errorLista ? (
            <p className="flex items-start gap-2 rounded-xl border border-pastel-red-fg/25 bg-pastel-red-bg px-3.5 py-3 text-sm text-pastel-red-fg">
              <WarningCircle size={17} weight="fill" className="mt-0.5 shrink-0" />
              <span>{errorLista}</span>
            </p>
          ) : personal.length === 0 ? (
            <p className="py-6 text-sm text-ink-muted">Todavía no hay personal registrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[48rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-sunken text-xs uppercase tracking-wide text-ink-muted">
                    <th className="px-5 py-3 font-semibold">Nombre</th>
                    <th className="px-5 py-3 font-semibold">Correo</th>
                    <th className="px-5 py-3 font-semibold">Rol</th>
                    <th className="px-5 py-3 font-semibold">Clínica</th>
                    <th className="px-5 py-3 font-semibold">Estado</th>
                    <th className="px-5 py-3 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {personal.map((p) => (
                    <FilaPersonal key={p.id} perfil={p} esPropio={p.email === correo} onCambio={cargar} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FilaPersonal({
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

  return (
    <tr>
      <td className="px-5 py-3 font-medium text-ink">
        {perfil.nombre} {esPropio ? <span className="text-xs text-ink-muted">(vos)</span> : null}
      </td>
      <td className="px-5 py-3 text-ink-soft">{perfil.email}</td>
      <td className="px-5 py-3 text-ink-soft">{ROLE_LABEL[perfil.rol]}</td>
      <td className="px-5 py-3 text-ink-soft">
        {/* El superadmin no pertenece a ninguna clínica: solo audita el sistema. */}
        {perfil.clinica ?? <span className="italic text-ink-muted">Todas (auditor)</span>}
      </td>
      <td className="px-5 py-3">
        {perfil.invitacionPendiente ? (
          <Badge tone="yellow">Invitación pendiente</Badge>
        ) : perfil.activo ? (
          <Badge tone="green">Activo</Badge>
        ) : (
          <Badge tone="neutral">Inactivo</Badge>
        )}
        {error && <p className="mt-1 text-xs text-pastel-red-fg">{error}</p>}
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center justify-end gap-1">
          {perfil.invitacionPendiente ? (
            <>
              <button
                type="button"
                aria-label="Reenviar invitación"
                title="Reenviar invitación"
                className={ACCION_BTN}
                disabled={accion === "reenviar"}
                onClick={reenviar}
              >
                {accion === "reenviar" ? (
                  <SpinnerGap size={16} className="animate-spin" />
                ) : (
                  <ArrowClockwise size={16} weight="bold" />
                )}
              </button>
              <button
                type="button"
                aria-label="Cancelar invitación"
                title="Cancelar invitación"
                className={`${ACCION_BTN} hover:bg-pastel-red-bg hover:text-pastel-red-fg`}
                onClick={() => setConfirmando("cancelar")}
              >
                <XCircle size={16} weight="bold" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                aria-label="Restablecer contraseña"
                title="Restablecer contraseña"
                className={ACCION_BTN}
                onClick={() => setConfirmando("restablecer")}
              >
                <LockKey size={16} weight="bold" />
              </button>
              <button
                type="button"
                aria-label="Eliminar cuenta"
                title="Eliminar cuenta"
                disabled={esPropio}
                className={`${ACCION_BTN} hover:bg-pastel-red-bg hover:text-pastel-red-fg`}
                onClick={() => setConfirmando("eliminar")}
              >
                <Trash size={16} weight="bold" />
              </button>
            </>
          )}
        </div>
      </td>

      <ConfirmarDialog
        tipo={confirmando}
        perfil={perfil}
        onClose={() => setConfirmando(null)}
        onConfirmado={() => {
          setConfirmando(null);
          onCambio();
        }}
      />
    </tr>
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

function InvitarDialog({
  clinicas,
  onInvitado,
}: {
  clinicas: Clinica[];
  onInvitado: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [email, setEmail] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [rol, setRol] = useState<Role>("odontologo");
  const [clinicaId, setClinicaId] = useState("");
  const [especialidad, setEspecialidad] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const resetear = () => {
    setEmail("");
    setNombreCompleto("");
    setRol("odontologo");
    setClinicaId("");
    setEspecialidad("");
    setCargando(false);
    setError(null);
    setEnviado(false);
  };

  const handleOpenChange = (open: boolean) => {
    setAbierto(open);
    if (!open) resetear();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (cargando) return;
    setError(null);

    // El superadmin no pertenece a ninguna clínica: solo audita el sistema.
    if (rol !== "superadmin" && !clinicaId) {
      setError("Elegí una clínica");
      return;
    }

    setCargando(true);
    try {
      await invitarPersonalApi({
        email: email.trim(),
        nombreCompleto: nombreCompleto.trim(),
        rol: rol as "odontologo" | "recepcionista" | "superadmin",
        clinicaId: rol === "superadmin" ? undefined : clinicaId,
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
    <Dialog open={abierto} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button">
          <Plus size={16} weight="bold" /> Invitar
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Invitar colaborador"
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

            <div className={rol === "superadmin" ? "grid grid-cols-1 gap-3" : "grid grid-cols-2 gap-3"}>
              <Field label="Rol">
                <Select value={rol} onValueChange={(v) => setRol(v as Role)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES_INVITABLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {rol !== "superadmin" && (
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

            {rol === "superadmin" && (
              <p className="-mt-1 text-xs text-ink-muted">
                El administrador no pertenece a ninguna clínica: solo audita el sistema.
              </p>
            )}

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

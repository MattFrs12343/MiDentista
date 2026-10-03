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
  cambiarContrasenaPersonalApi,
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
    Promise.all([listarPersonalApi(correo), listarClinicas()])
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
        <InvitarDialog correo={correo} clinicas={clinicas} onInvitado={cargar} />
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
                    <FilaPersonal key={p.id} perfil={p} correo={correo} esPropio={p.email === correo} onCambio={cargar} />
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
  correo,
  esPropio,
  onCambio,
}: {
  perfil: PerfilAdmin;
  correo: string;
  esPropio: boolean;
  onCambio: () => void;
}) {
  const [accion, setAccion] = useState<"reenviar" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<"cancelar" | "eliminar" | null>(null);
  const [cambiandoClave, setCambiandoClave] = useState(false);

  const reenviar = async () => {
    setAccion("reenviar");
    setError(null);
    try {
      await reenviarInvitacionApi(correo, perfil.id);
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
      <td className="px-5 py-3 text-ink-soft">{perfil.clinica}</td>
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
                aria-label="Cambiar contraseña"
                title="Cambiar contraseña"
                className={ACCION_BTN}
                onClick={() => setCambiandoClave(true)}
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
        correo={correo}
        perfil={perfil}
        onClose={() => setConfirmando(null)}
        onConfirmado={() => {
          setConfirmando(null);
          onCambio();
        }}
      />
      <CambiarClaveDialog
        abierto={cambiandoClave}
        correo={correo}
        perfil={perfil}
        onClose={() => setCambiandoClave(false)}
      />
    </tr>
  );
}

function ConfirmarDialog({
  tipo,
  correo,
  perfil,
  onClose,
  onConfirmado,
}: {
  tipo: "cancelar" | "eliminar" | null;
  correo: string;
  perfil: PerfilAdmin;
  onClose: () => void;
  onConfirmado: () => void;
}) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmar = async () => {
    if (!tipo) return;
    setCargando(true);
    setError(null);
    try {
      if (tipo === "cancelar") await cancelarInvitacionApi(correo, perfil.id);
      else await eliminarPersonalApi(correo, perfil.id);
      onConfirmado();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo completar la acción");
    } finally {
      setCargando(false);
    }
  };

  return (
    <Dialog
      open={tipo !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          setError(null);
        }
      }}
    >
      <DialogContent
        title={tipo === "cancelar" ? "Cancelar invitación" : "Eliminar cuenta"}
        description="Esta acción no se puede deshacer."
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">
            {tipo === "cancelar" ? (
              <>
                ¿Cancelar la invitación de <strong className="text-ink">{perfil.email}</strong>? No va a
                poder usar ese link para entrar.
              </>
            ) : (
              <>
                ¿Eliminar la cuenta de <strong className="text-ink">{perfil.nombre}</strong>? Deja de poder
                iniciar sesión en el panel.
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
            <Button type="button" variant="secondary" onClick={onClose} disabled={cargando}>
              Cancelar
            </Button>
            <Button type="button" variant="danger" onClick={confirmar} disabled={cargando}>
              {cargando ? <SpinnerGap size={16} className="animate-spin" /> : "Confirmar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CambiarClaveDialog({
  abierto,
  correo,
  perfil,
  onClose,
}: {
  abierto: boolean;
  correo: string;
  perfil: PerfilAdmin;
  onClose: () => void;
}) {
  const [claveNueva, setClaveNueva] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  const cerrarYResetear = () => {
    onClose();
    setClaveNueva("");
    setCargando(false);
    setError(null);
    setExito(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (cargando) return;
    setError(null);

    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(claveNueva)) {
      setError("La contraseña debe tener al menos 8 caracteres, con letras y números");
      return;
    }

    setCargando(true);
    try {
      await cambiarContrasenaPersonalApi(correo, perfil.id, claveNueva);
      setExito(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo cambiar la contraseña");
    } finally {
      setCargando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && cerrarYResetear()}>
      <DialogContent
        title="Cambiar contraseña"
        description={exito ? undefined : `Nueva contraseña para ${perfil.email}`}
      >
        {exito ? (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-pastel-green-bg text-pastel-green-fg">
              <CheckCircle size={26} weight="fill" />
            </span>
            <p className="text-sm font-semibold text-ink">Contraseña actualizada</p>
            <Button type="button" onClick={cerrarYResetear} className="w-full">
              Listo
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Contraseña nueva" htmlFor="admin-clave-nueva" hint="Mínimo 8 caracteres, con letras y números">
              <Input
                id="admin-clave-nueva"
                type="password"
                required
                autoFocus
                value={claveNueva}
                onChange={(e) => setClaveNueva(e.target.value)}
                placeholder="••••••••"
              />
            </Field>

            {error && (
              <p className="flex items-start gap-2 rounded-xl border border-pastel-red-fg/25 bg-pastel-red-bg px-3.5 py-3 text-sm text-pastel-red-fg">
                <WarningCircle size={17} weight="fill" className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}

            <Button type="submit" disabled={cargando} className="w-full">
              {cargando ? <SpinnerGap size={16} className="animate-spin" /> : "Guardar contraseña"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InvitarDialog({
  correo,
  clinicas,
  onInvitado,
}: {
  correo: string;
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

    if (!clinicaId) {
      setError("Elegí una clínica");
      return;
    }

    setCargando(true);
    try {
      await invitarPersonalApi(correo, {
        email: email.trim(),
        nombreCompleto: nombreCompleto.trim(),
        rol: rol as "odontologo" | "recepcionista" | "superadmin",
        clinicaId,
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
        title="Invitar a la clínica"
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

            <div className="grid grid-cols-2 gap-3">
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
            </div>

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

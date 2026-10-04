// Edge Function unica para las acciones que necesitan la service_role key
// (no se pueden exponer al navegador) o logica de servidor que no entra en
// una politica de RLS: login con bloqueo por intentos, e invitar/gestionar
// personal (superadmin). Todo lo demas (pacientes, historia clinica,
// odontograma, tratamiento, agenda) lo consulta el frontend directo contra
// Postgres via supabase-js, protegido por las politicas de RLS.
//
// Rutas (todas POST, body JSON):
//   /login                       -> { correo, clave }
//   /cambiar-contrasena-propia   -> { claveActual, claveNueva }  (requiere Authorization: Bearer <access_token>)
//   /admin/listar                -> GET, sin body  (Authorization: superadmin)
//   /admin/invitar               -> { email, nombreCompleto, rol, clinicaId, especialidad? }  (Authorization: superadmin)
//   /admin/reenviar-invitacion   -> { perfilId }
//   /admin/cancelar-invitacion   -> { perfilId }
//   /admin/eliminar              -> { perfilId }  (baja logica; no permite auto-eliminarse)
//   /admin/restablecer-contrasena -> { perfilId }  (envia el correo de "recuperar contraseña"; el usuario la elige el mismo)
//   /paciente/registrar          -> { nombreCompleto, telefono? }  (Authorization: cualquier usuario de Auth sin perfil todavia)
//   /paciente/mi-ficha           -> GET, sin body  (Authorization: paciente; lecturas acotadas a su propia fila)
//
// Deploy: supabase functions deploy api

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") ?? "http://localhost:8080";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-zÁÉÍÓÚáéíóúñÑ])(?=.*\d).{8,}$/;
const INTENTOS_MAXIMOS = 3;
const BLOQUEO_MINUTOS = 15;
const ROLES_ACEPTADOS = new Set(["odontologo", "recepcionista", "superadmin"]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function validarPasswordNueva(clave: string): string | null {
  if (!clave) return "La contraseña nueva es obligatoria";
  if (!PASSWORD_REGEX.test(clave)) {
    return "La contraseña nueva debe tener al menos 8 caracteres, con letras y números";
  }
  return null;
}

function minutosRestantes(fecha: string): number {
  return Math.max(1, Math.ceil((new Date(fecha).getTime() - Date.now()) / 60000));
}

/** Verifica el Bearer token del request y devuelve su perfil (o null). */
async function perfilDelToken(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user?.email) return null;

  const { data: perfil } = await admin
    .from("perfiles")
    .select("id, email, rol, activo")
    .ilike("email", data.user.email)
    .eq("activo", true)
    .maybeSingle();

  return perfil ?? null;
}

async function requerirSuperadmin(req: Request) {
  const perfil = await perfilDelToken(req);
  if (!perfil || perfil.rol !== "superadmin") return null;
  return perfil;
}

/** Usuario de Supabase Auth del request (id + email), o null. A diferencia de
 * `perfilDelToken`, no exige que ya exista una fila en `perfiles`: lo usa el
 * alta de paciente, que justamente crea esa fila. */
async function usuarioDelToken(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user?.email) return null;
  return { id: data.user.id, email: data.user.email };
}

async function enviarInvitacion(email: string, nombreCompleto: string) {
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${FRONTEND_URL}/recuperar-contrasena`,
    data: { nombre_completo: nombreCompleto },
  });
  if (error || !data.user) throw new Error(error?.message || "No se pudo enviar la invitación");
  return data.user.id;
}

// ----------------------------------------------------------------------------
// /login
// ----------------------------------------------------------------------------
async function handleLogin(req: Request) {
  const body = await req.json().catch(() => ({}));
  const correo = String(body?.correo ?? "").trim();
  const clave = String(body?.clave ?? "");

  if (!correo) return json({ error: "El correo es obligatorio" }, 400);
  if (!EMAIL_REGEX.test(correo)) return json({ error: "El correo no tiene un formato válido" }, 400);
  if (!clave) return json({ error: "La contraseña es obligatoria" }, 400);

  const CREDENCIALES_INVALIDAS = "Correo o contraseña incorrectos";

  const { data: cuenta } = await admin
    .from("perfiles")
    .select(
      "id, email, nombre_completo, rol, especialidad, auth_user_id, intentos_fallidos, bloqueado_hasta, clinicas(nombre, slug, ciudad, activo)",
    )
    .ilike("email", correo)
    .eq("activo", true)
    .maybeSingle();

  const clinica = Array.isArray(cuenta?.clinicas) ? cuenta?.clinicas[0] : cuenta?.clinicas;
  // El superadmin no pertenece a ninguna clínica (solo audita el sistema),
  // así que para esa cuenta no exigimos una clínica activa.
  const esSuperadmin = cuenta?.rol === "superadmin";

  if (!cuenta || !cuenta.auth_user_id || (!esSuperadmin && !clinica?.activo)) {
    return json({ error: CREDENCIALES_INVALIDAS }, 401);
  }

  if (cuenta.bloqueado_hasta && new Date(cuenta.bloqueado_hasta) > new Date()) {
    return json(
      {
        error: `Cuenta bloqueada por demasiados intentos fallidos. Probá de nuevo en ${minutosRestantes(cuenta.bloqueado_hasta)} minuto(s), o recuperá tu contraseña.`,
      },
      423,
    );
  }

  const { data: signInData, error: signInError } = await admin.auth.signInWithPassword({
    email: correo,
    password: clave,
  });

  if (signInError || !signInData.session) {
    const intentos = (cuenta.intentos_fallidos ?? 0) + 1;
    if (intentos >= INTENTOS_MAXIMOS) {
      const bloqueadoHasta = new Date(Date.now() + BLOQUEO_MINUTOS * 60000).toISOString();
      await admin.from("perfiles").update({ intentos_fallidos: intentos, bloqueado_hasta: bloqueadoHasta }).eq("id", cuenta.id);
      return json(
        {
          error: `Cuenta bloqueada por demasiados intentos fallidos. Probá de nuevo en ${BLOQUEO_MINUTOS} minuto(s), o recuperá tu contraseña.`,
        },
        423,
      );
    }
    await admin.from("perfiles").update({ intentos_fallidos: intentos }).eq("id", cuenta.id);
    return json({ error: `${CREDENCIALES_INVALIDAS} (${INTENTOS_MAXIMOS - intentos} intento(s) restante(s))` }, 401);
  }

  if (!ROLES_ACEPTADOS.has(cuenta.rol)) {
    return json({ error: "Esta cuenta es de paciente y no tiene acceso al panel de la clínica" }, 403);
  }

  if (cuenta.intentos_fallidos > 0 || cuenta.bloqueado_hasta) {
    await admin.from("perfiles").update({ intentos_fallidos: 0, bloqueado_hasta: null }).eq("id", cuenta.id);
  }

  return json({
    email: cuenta.email,
    nombre: cuenta.nombre_completo,
    rol: cuenta.rol,
    especialidad: cuenta.especialidad ?? null,
    clinica: esSuperadmin ? null : clinica.nombre,
    clinicaSlug: esSuperadmin ? null : clinica.slug,
    ciudad: esSuperadmin ? null : clinica.ciudad,
    session: signInData.session,
  });
}

// ----------------------------------------------------------------------------
// /cambiar-contrasena-propia (el usuario ya tiene sesión, conoce la actual)
// ----------------------------------------------------------------------------
async function handleCambiarContrasenaPropia(req: Request) {
  const perfil = await perfilDelToken(req);
  if (!perfil) return json({ error: "No se pudo identificar la cuenta" }, 401);

  const body = await req.json().catch(() => ({}));
  const claveActual = String(body?.claveActual ?? "");
  const claveNueva = String(body?.claveNueva ?? "");

  if (!claveActual) return json({ error: "La contraseña actual es obligatoria" }, 400);
  const errorPolitica = validarPasswordNueva(claveNueva);
  if (errorPolitica) return json({ error: errorPolitica }, 400);
  if (claveNueva === claveActual) return json({ error: "La contraseña nueva debe ser distinta a la actual" }, 400);

  const { error: signInError } = await admin.auth.signInWithPassword({ email: perfil.email, password: claveActual });
  if (signInError) return json({ error: "La contraseña actual no es correcta" }, 401);

  const { data: perfilFull } = await admin.from("perfiles").select("auth_user_id").eq("id", perfil.id).single();
  const { error } = await admin.auth.admin.updateUserById(perfilFull!.auth_user_id, { password: claveNueva });
  if (error) return json({ error: "No se pudo cambiar la contraseña" }, 503);

  await admin.from("perfiles").update({ intentos_fallidos: 0, bloqueado_hasta: null }).eq("id", perfil.id);
  return json({ ok: true });
}

// ----------------------------------------------------------------------------
// /admin/*
// ----------------------------------------------------------------------------

/** Lista el personal de todas las clínicas con su estado de invitación
 * (requiere auth.admin.getUserById por cada fila, de ahí que viva acá y no
 * en una política de RLS consultable directo desde el navegador). */
async function handleAdminListar(req: Request) {
  const admin_ = await requerirSuperadmin(req);
  if (!admin_) return json({ error: "Esta acción requiere una cuenta de administrador" }, 403);

  const { data: perfiles, error } = await admin
    .from("perfiles")
    .select("id, email, nombre_completo, rol, especialidad, activo, auth_user_id, clinicas(nombre, slug)")
    // 'paciente' es un usuario del portal, no personal de la clínica: no
    // pertenece a la tabla de administración de personal.
    .neq("rol", "paciente")
    .order("nombre_completo");
  if (error) return json({ error: "No se pudo cargar el personal" }, 503);

  const resultado = await Promise.all(
    (perfiles ?? []).map(async (p) => {
      let invitacionPendiente = true;
      if (p.auth_user_id) {
        const { data: userData } = await admin.auth.admin.getUserById(p.auth_user_id);
        invitacionPendiente = !userData.user?.email_confirmed_at;
      }
      const clinica = Array.isArray(p.clinicas) ? p.clinicas[0] : p.clinicas;
      return {
        id: p.id,
        email: p.email,
        nombre: p.nombre_completo,
        rol: p.rol,
        especialidad: p.especialidad ?? null,
        activo: p.activo,
        invitacionPendiente,
        // El superadmin no pertenece a ninguna clínica (solo audita el
        // sistema), así que clinica_id queda null para esas filas.
        clinica: clinica?.nombre ?? null,
        clinicaSlug: clinica?.slug ?? null,
      };
    }),
  );

  return json(resultado);
}

async function handleAdminInvitar(req: Request) {
  const admin_ = await requerirSuperadmin(req);
  if (!admin_) return json({ error: "Esta acción requiere una cuenta de administrador" }, 403);

  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim();
  const nombreCompleto = String(body?.nombreCompleto ?? "").trim();
  const rol = String(body?.rol ?? "");
  const clinicaId = String(body?.clinicaId ?? "");
  const especialidad = body?.especialidad ? String(body.especialidad).trim() : null;
  // El superadmin no pertenece a ninguna clínica: solo audita el sistema.
  const esSuperadmin = rol === "superadmin";

  if (!email || !EMAIL_REGEX.test(email)) return json({ error: "El correo no es válido" }, 400);
  if (!nombreCompleto) return json({ error: "El nombre completo es obligatorio" }, 400);
  if (!["odontologo", "recepcionista", "superadmin"].includes(rol)) return json({ error: "Rol inválido" }, 400);
  if (!esSuperadmin && !clinicaId) return json({ error: "La clínica es obligatoria" }, 400);

  const { data: existente } = await admin.from("perfiles").select("id").ilike("email", email).maybeSingle();
  if (existente) return json({ error: "Ya existe una cuenta con ese correo" }, 409);

  const { data: nuevoPerfil, error: errorInsert } = await admin
    .from("perfiles")
    .insert({
      email,
      nombre_completo: nombreCompleto,
      rol,
      clinica_id: esSuperadmin ? null : clinicaId,
      especialidad,
    })
    .select("id")
    .single();
  if (errorInsert || !nuevoPerfil) return json({ error: "No se pudo crear el perfil" }, 503);

  try {
    const authUserId = await enviarInvitacion(email, nombreCompleto);
    await admin.from("perfiles").update({ auth_user_id: authUserId }).eq("id", nuevoPerfil.id);
  } catch {
    await admin.from("perfiles").delete().eq("id", nuevoPerfil.id);
    return json({ error: "No se pudo enviar la invitación por correo" }, 503);
  }

  return json({ ok: true }, 201);
}

async function handleAdminReenviarInvitacion(req: Request) {
  const admin_ = await requerirSuperadmin(req);
  if (!admin_) return json({ error: "Esta acción requiere una cuenta de administrador" }, 403);

  const body = await req.json().catch(() => ({}));
  const perfilId = String(body?.perfilId ?? "");

  const { data: perfil } = await admin.from("perfiles").select("email, nombre_completo, auth_user_id").eq("id", perfilId).maybeSingle();
  if (!perfil) return json({ error: "Cuenta no encontrada" }, 404);

  if (perfil.auth_user_id) {
    const { data: userData } = await admin.auth.admin.getUserById(perfil.auth_user_id);
    if (userData.user?.email_confirmed_at) {
      return json({ error: "Esta cuenta ya aceptó la invitación" }, 400);
    }
    await admin.auth.admin.deleteUser(perfil.auth_user_id).catch(() => {});
  }

  try {
    const authUserId = await enviarInvitacion(perfil.email, perfil.nombre_completo);
    await admin.from("perfiles").update({ auth_user_id: authUserId }).eq("id", perfilId);
  } catch {
    return json({ error: "No se pudo reenviar la invitación" }, 503);
  }

  return json({ ok: true });
}

async function handleAdminCancelarInvitacion(req: Request) {
  const admin_ = await requerirSuperadmin(req);
  if (!admin_) return json({ error: "Esta acción requiere una cuenta de administrador" }, 403);

  const body = await req.json().catch(() => ({}));
  const perfilId = String(body?.perfilId ?? "");

  const { data: perfil } = await admin.from("perfiles").select("auth_user_id").eq("id", perfilId).maybeSingle();
  if (!perfil) return json({ error: "Cuenta no encontrada" }, 404);

  if (perfil.auth_user_id) {
    const { data: userData } = await admin.auth.admin.getUserById(perfil.auth_user_id);
    if (userData.user?.email_confirmed_at) {
      return json({ error: "Esta cuenta ya aceptó la invitación, no se puede cancelar" }, 400);
    }
  }

  await admin.from("perfiles").delete().eq("id", perfilId);
  if (perfil.auth_user_id) await admin.auth.admin.deleteUser(perfil.auth_user_id).catch(() => {});

  return json({ ok: true });
}

// Baja lógica de una cuenta de personal ya activa. No se permite
// auto-eliminarse para que un superadmin no pueda quedarse afuera por error.
async function handleAdminEliminar(req: Request) {
  const admin_ = await requerirSuperadmin(req);
  if (!admin_) return json({ error: "Esta acción requiere una cuenta de administrador" }, 403);

  const body = await req.json().catch(() => ({}));
  const perfilId = String(body?.perfilId ?? "");

  if (perfilId === admin_.id) return json({ error: "No podés eliminar tu propia cuenta" }, 400);

  const { error } = await admin.from("perfiles").update({ activo: false }).eq("id", perfilId);
  if (error) return json({ error: "No se pudo eliminar la cuenta" }, 503);

  return json({ ok: true });
}

// El superadmin nunca escribe la contraseña nueva de otra persona (eso
// pasaba por su cabeza una clave en texto plano, aunque sea brevemente, y es
// una mala práctica de seguridad). En cambio dispara el mismo correo de
// "recuperar contraseña" que ya usa el login: el usuario elige su propia
// contraseña nueva desde ahí.
async function handleAdminRestablecerContrasena(req: Request) {
  const admin_ = await requerirSuperadmin(req);
  if (!admin_) return json({ error: "Esta acción requiere una cuenta de administrador" }, 403);

  const body = await req.json().catch(() => ({}));
  const perfilId = String(body?.perfilId ?? "");

  const { data: perfil } = await admin.from("perfiles").select("email, auth_user_id").eq("id", perfilId).maybeSingle();
  if (!perfil || !perfil.auth_user_id) return json({ error: "Cuenta no encontrada" }, 404);

  const resp = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({
      email: perfil.email,
      options: { redirect_to: `${FRONTEND_URL}/recuperar-contrasena` },
    }),
  });
  if (!resp.ok) return json({ error: "No se pudo enviar el correo de restablecimiento" }, 503);

  await admin.from("perfiles").update({ intentos_fallidos: 0, bloqueado_hasta: null }).eq("id", perfilId);
  return json({ ok: true });
}

// ----------------------------------------------------------------------------
// /paciente/* (portal del paciente)
// ----------------------------------------------------------------------------

/** Alta inicial: crea el perfil con rol 'paciente' ligado a la cuenta de Auth
 * (Google). Es idempotente; si el correo ya es de personal de una clínica,
 * se rechaza. */
async function handlePacienteRegistrar(req: Request) {
  const usuario = await usuarioDelToken(req);
  if (!usuario) return json({ error: "No se pudo identificar tu sesión" }, 401);

  const body = await req.json().catch(() => ({}));
  const nombreCompleto = String(body?.nombreCompleto ?? "").trim();
  const telefono = body?.telefono ? String(body.telefono).trim() : "";
  if (!nombreCompleto) return json({ error: "El nombre completo es obligatorio" }, 400);

  const { data: porAuth } = await admin
    .from("perfiles")
    .select("id, rol")
    .eq("auth_user_id", usuario.id)
    .maybeSingle();
  if (porAuth) {
    if (porAuth.rol === "paciente") return json({ ok: true, perfilId: porAuth.id });
    return json({ error: "Tu correo ya está registrado como personal de una clínica" }, 409);
  }

  const { data: porEmail } = await admin
    .from("perfiles")
    .select("id, rol")
    .ilike("email", usuario.email)
    .maybeSingle();
  if (porEmail) {
    if (porEmail.rol !== "paciente") {
      return json({ error: "Tu correo ya está registrado como personal de una clínica" }, 409);
    }
    // Perfil de paciente preexistente sin la cuenta de Auth enlazada (p. ej.
    // creado antes del alta con Google): se enlaza ahora.
    await admin.from("perfiles").update({ auth_user_id: usuario.id, activo: true }).eq("id", porEmail.id);
    return json({ ok: true, perfilId: porEmail.id });
  }

  const { data: nuevo, error } = await admin
    .from("perfiles")
    .insert({
      email: usuario.email,
      nombre_completo: nombreCompleto,
      telefono: telefono || null,
      rol: "paciente",
      activo: true,
      auth_user_id: usuario.id,
    })
    .select("id")
    .single();
  if (error || !nuevo) return json({ error: "No se pudo crear tu cuenta de paciente" }, 503);

  return json({ ok: true, perfilId: nuevo.id }, 201);
}

/** Lectura del portal: devuelve SOLO los datos del propio paciente. No se usa
 * RLS directo porque las políticas clínicas filtran por clínica y expondrían
 * los datos de todos los pacientes de esa clínica. */
async function handlePacienteMiFicha(req: Request) {
  const usuario = await usuarioDelToken(req);
  if (!usuario) return json({ error: "No se pudo identificar tu sesión" }, 401);

  const { data: perfil } = await admin
    .from("perfiles")
    .select("id, nombre_completo, email, telefono, avatar_url, rol, clinica_id")
    .eq("auth_user_id", usuario.id)
    .eq("activo", true)
    .maybeSingle();
  if (!perfil || perfil.rol !== "paciente") {
    return json({ error: "Esta cuenta no es de paciente" }, 403);
  }

  let clinica: Record<string, unknown> | null = null;
  if (perfil.clinica_id) {
    const { data } = await admin
      .from("clinicas")
      .select("id, nombre, slug, ciudad, direccion, telefono, email")
      .eq("id", perfil.clinica_id)
      .maybeSingle();
    clinica = data ?? null;
  }

  const { data: paciente } = await admin
    .from("pacientes")
    .select(
      "id, ci, nombre_completo, nombres, apellidos, fecha_nacimiento, genero, telefono, email, direccion, contacto_emergencia_nombre, contacto_emergencia_telefono, contacto_emergencia_parentesco",
    )
    .eq("perfil_id", perfil.id)
    .maybeSingle();

  const base = {
    perfil: {
      nombre: perfil.nombre_completo,
      email: perfil.email,
      telefono: perfil.telefono,
      avatarUrl: perfil.avatar_url,
    },
    clinica,
    paciente: paciente ?? null,
  };

  // Todavía no se afilió a ninguna clínica: el portal muestra el onboarding.
  if (!paciente) {
    return json({
      ...base,
      historia: null,
      odontograma: null,
      diagnosticos: [],
      planes: [],
      evoluciones: [],
      citas: [],
      presupuestos: [],
      pagos: [],
      resumen: { totalPagado: 0, saldoPendiente: 0 },
    });
  }

  const pid = paciente.id;

  const [
    { data: historia },
    { data: odontograma },
    { data: diagnosticos },
    { data: planes },
    { data: evoluciones },
    { data: citas },
    { data: presupuestos },
    { data: pagos },
  ] = await Promise.all([
    admin.from("historiales_clinicos").select("*").eq("paciente_id", pid).maybeSingle(),
    admin
      .from("odontogramas")
      .select("id, fecha_examen, piezas, notas, actualizado_en")
      .eq("paciente_id", pid)
      .order("fecha_examen", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("diagnosticos")
      .select("id, descripcion, numero_pieza, estado, fecha_diagnostico")
      .eq("paciente_id", pid)
      .order("fecha_diagnostico", { ascending: false }),
    admin
      .from("planes_tratamiento")
      .select("id, titulo, estado, costo_total, notas, creado_en")
      .eq("paciente_id", pid)
      .order("creado_en", { ascending: false }),
    admin
      .from("evoluciones_clinicas")
      .select(
        "id, fecha_consulta, motivo_consulta, procedimiento_realizado, observaciones, indicaciones, proxima_atencion, numero_pieza",
      )
      .eq("paciente_id", pid)
      .order("fecha_consulta", { ascending: false }),
    admin
      .from("citas")
      .select("id, fecha_cita, hora_inicio, hora_fin, estado, motivo_consulta, notas")
      .eq("paciente_id", pid)
      .order("fecha_cita", { ascending: false }),
    admin
      .from("presupuestos")
      .select("id, titulo, total, descuento, estado, valido_hasta, creado_en")
      .eq("paciente_id", pid)
      .order("creado_en", { ascending: false }),
    admin
      .from("pagos")
      .select("id, monto, metodo_pago, fecha_pago, estado, codigo_referencia, notas")
      .eq("paciente_id", pid)
      .order("fecha_pago", { ascending: false }),
  ]);

  // Los procedimientos cuelgan del plan, no del paciente: se traen solo los de
  // los planes de este paciente.
  const planIds = (planes ?? []).map((p) => p.id);
  let procedimientos: Array<Record<string, unknown>> = [];
  if (planIds.length > 0) {
    const { data } = await admin
      .from("procedimientos_tratamiento")
      .select("id, plan_tratamiento_id, descripcion, numero_pieza, costo, estado, prioridad")
      .in("plan_tratamiento_id", planIds);
    procedimientos = data ?? [];
  }

  const totalPagado = (pagos ?? [])
    .filter((p) => p.estado === "confirmado")
    .reduce((suma, p) => suma + Number(p.monto ?? 0), 0);
  const totalPresupuestado = (presupuestos ?? [])
    .filter((p) => p.estado !== "rechazado" && p.estado !== "borrador")
    .reduce((suma, p) => suma + Number(p.total ?? 0), 0);
  const saldoPendiente = Math.max(0, totalPresupuestado - totalPagado);

  const planesConItems = (planes ?? []).map((plan) => ({
    ...plan,
    items: procedimientos.filter((proc) => proc.plan_tratamiento_id === plan.id),
  }));

  return json({
    ...base,
    historia: historia ?? null,
    odontograma: odontograma ?? null,
    diagnosticos: diagnosticos ?? [],
    planes: planesConItems,
    evoluciones: evoluciones ?? [],
    citas: citas ?? [],
    presupuestos: presupuestos ?? [],
    pagos: pagos ?? [],
    resumen: { totalPagado, saldoPendiente },
  });
}

// ----------------------------------------------------------------------------
// Router
// ----------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  const { pathname } = new URL(req.url);
  // El path real viene como /api/<ruta> (o /<ruta> segun como invoque el cliente).
  const ruta = pathname.replace(/^\/(api\/)?/, "");

  try {
    if (req.method === "POST" && ruta === "login") return await handleLogin(req);
    if (req.method === "POST" && ruta === "cambiar-contrasena-propia") return await handleCambiarContrasenaPropia(req);
    if (req.method === "GET" && ruta === "admin/listar") return await handleAdminListar(req);
    if (req.method === "POST" && ruta === "admin/invitar") return await handleAdminInvitar(req);
    if (req.method === "POST" && ruta === "admin/reenviar-invitacion") return await handleAdminReenviarInvitacion(req);
    if (req.method === "POST" && ruta === "admin/cancelar-invitacion") return await handleAdminCancelarInvitacion(req);
    if (req.method === "POST" && ruta === "admin/eliminar") return await handleAdminEliminar(req);
    if (req.method === "POST" && ruta === "admin/restablecer-contrasena") return await handleAdminRestablecerContrasena(req);
    if (req.method === "POST" && ruta === "paciente/registrar") return await handlePacienteRegistrar(req);
    if (req.method === "GET" && ruta === "paciente/mi-ficha") return await handlePacienteMiFicha(req);
    return json({ error: "Ruta no encontrada" }, 404);
  } catch (error) {
    console.error("Error no manejado:", error);
    return json({ error: "Error interno" }, 500);
  }
});

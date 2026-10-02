import express from "express";
import pg from "pg";

const { Pool } = pg;

// ----------------------------------------------------------------------------
// Supabase Auth: las credenciales (contraseñas, hashing, envío de correos de
// recuperación) viven en Supabase, no en nuestra tabla `perfiles`. Hablamos
// con la API REST de GoTrue directamente (sin el SDK) con tres operaciones:
// login (anon key), "set password" admin (service role) y "enviar email de
// recuperación" (anon key). `perfiles.auth_user_id` linkea cada perfil con su
// fila en auth.users.
// ----------------------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:8080";

async function supabaseSignIn(email, password) {
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return resp.ok;
}

async function supabaseAdminSetPassword(authUserId, claveNueva) {
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${authUserId}`, {
    method: "PUT",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password: claveNueva }),
  });
  if (!resp.ok) {
    throw new Error(`Supabase admin updateUser falló con status ${resp.status}`);
  }
}

async function supabaseEnviarRecuperacion(email) {
  const redirectTo = `${FRONTEND_URL}/recuperar-contrasena`;
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!resp.ok) {
    const cuerpo = await resp.json().catch(() => ({}));
    // No exponemos el detalle crudo de Supabase/SMTP al cliente (podría
    // filtrar info interna), pero sí lo logueamos para poder diagnosticarlo.
    // NOTA: esto está fallando ahora mismo porque Brevo rechaza los
    // remitentes @gmail.com (sin DKIM propio) — hace falta un dominio propio
    // verificado en Brevo para que el envío real funcione.
    console.error("Supabase /auth/v1/recover falló:", resp.status, cuerpo);
    throw new Error(cuerpo.msg || `Supabase recover falló con status ${resp.status}`);
  }
}

const PUERTO = Number(process.env.PORT ?? 4000);

// Preferimos PGHOST/PGUSER/PGPASSWORD/... (campos separados) en vez de armar
// una sola URL: una contraseña con caracteres especiales (p. ej. "#") se
// interpreta mal si queda mal codificada dentro de una connection string.
// DATABASE_URL sigue soportado como alternativa para el caso local simple
// (sin caracteres especiales).
const pool = process.env.PGHOST
  ? new Pool({
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT ?? 5432),
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE ?? "postgres",
      max: 5,
      ssl: process.env.PGSSL === "false" ? false : { rejectUnauthorized: false },
    })
  : new Pool({
      connectionString:
        process.env.DATABASE_URL ?? "postgres://midentista:midentista@localhost:5432/midentista",
      max: 5,
    });

const app = express();
app.use(express.json());

// CORS: en local el frontend llega por el mismo origen (nginx hace de
// proxy), pero en producción el frontend (HostGator) y la API (Render) viven
// en dominios distintos. ALLOWED_ORIGINS es una lista separada por comas;
// sin configurar, se permite cualquier origen (equivalente a no tener CORS,
// el comportamiento de antes).
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

// La BD guarda el rol en su propio dominio. 'paciente' es un usuario del portal,
// no personal de la clínica, así que no puede abrir sesión en el panel.
// 'superadmin' entra al panel igual que el resto, más el panel de administración.
const ROLES_ACEPTADOS = new Set(["odontologo", "recepcionista", "superadmin"]);

// Validación simple de formato; no pretende cubrir el RFC completo, solo
// atajar entradas claramente inválidas antes de tocar la base de datos.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Política de contraseña nueva: mínimo 8 caracteres, al menos una letra y un
// número. Se aplica a "cambiar contraseña" y a "confirmar recuperación", no
// retroactivamente a contraseñas ya existentes.
const PASSWORD_REGEX = /^(?=.*[A-Za-zÁÉÍÓÚáéíóúñÑ])(?=.*\d).{8,}$/;

const INTENTOS_MAXIMOS = 3;
const BLOQUEO_MINUTOS = 15;

function validarPasswordNueva(clave) {
  if (!clave || typeof clave !== "string") return "La contraseña nueva es obligatoria";
  if (!PASSWORD_REGEX.test(clave)) {
    return "La contraseña nueva debe tener al menos 8 caracteres, con letras y números";
  }
  return null;
}

function minutosRestantes(fecha) {
  return Math.max(1, Math.ceil((new Date(fecha).getTime() - Date.now()) / 60000));
}

// ----------------------------------------------------------------------------
// Helpers compartidos
// ----------------------------------------------------------------------------

// No hay un esquema de sesión con token (igual que /api/sesion ya existente):
// cada request identifica al usuario por su correo, y acá resolvemos su
// perfil (id + clínica) para poder filtrar todo por clínica.
async function obtenerPerfil(correo) {
  if (!correo) return null;
  const { rows } = await pool.query(
    `select id, clinica_id, rol
       from public.perfiles
      where lower(email) = lower($1)
        and activo = true
      limit 1`,
    [correo],
  );
  return rows[0] ?? null;
}

function correoDe(req) {
  return String(req.query?.correo ?? req.body?.correo ?? "").trim();
}

/** Resuelve el perfil del request o responde 401 y devuelve null. */
async function requerirPerfil(req, res) {
  const correo = correoDe(req);
  const perfil = await obtenerPerfil(correo);
  if (!perfil) {
    res.status(401).json({ error: "No se pudo identificar la cuenta (correo inválido o inactiva)" });
    return null;
  }
  return perfil;
}

function fecha(valor) {
  if (!valor) return "";
  const iso = valor instanceof Date ? valor.toISOString() : String(valor);
  return iso.slice(0, 10);
}

function jsonLista(texto) {
  if (!texto) return [];
  try {
    const valor = JSON.parse(texto);
    return Array.isArray(valor) ? valor : [];
  } catch {
    return [];
  }
}

const GENERO_A_SEXO = { M: "masculino", F: "femenino", Otro: "otro" };
const SEXO_A_GENERO = { masculino: "M", femenino: "F", otro: "Otro" };

function mapPaciente(r) {
  return {
    id: r.id,
    nombres: r.nombres ?? "",
    apellidos: r.apellidos ?? "",
    ci: r.ci ?? "",
    fechaNacimiento: fecha(r.fecha_nacimiento),
    sexo: GENERO_A_SEXO[r.genero] ?? "otro",
    telefono: r.telefono ?? "",
    email: r.email ?? "",
    direccion: r.direccion ?? "",
    creadoEl: fecha(r.creado_en),
  };
}

function historiaVacia(pacienteId) {
  return {
    pacienteId,
    motivoConsulta: "",
    antecedentesPersonales: "",
    antecedentesFamiliares: "",
    antecedentesOdontologicos: "",
    enfermedadesBase: [],
    medicamentosActuales: [],
    alergias: [],
    habitos: [],
    observacionesGenerales: "",
  };
}

function mapHistoria(r, pacienteId) {
  if (!r) return historiaVacia(pacienteId);
  return {
    pacienteId,
    motivoConsulta: r.motivo_consulta ?? "",
    antecedentesPersonales: r.antecedentes_medicos ?? "",
    antecedentesFamiliares: r.antecedentes_familiares ?? "",
    antecedentesOdontologicos: r.antecedentes_odontologicos ?? "",
    enfermedadesBase: jsonLista(r.enfermedades),
    medicamentosActuales: jsonLista(r.medicamentos),
    alergias: jsonLista(r.alergias),
    habitos: jsonLista(r.habitos),
    observacionesGenerales: r.observaciones ?? "",
    actualizadoEl: r.actualizado_en ? new Date(r.actualizado_en).toISOString() : undefined,
    actualizadoPor: r.actualizado_por ?? undefined,
  };
}

function mapDiagnostico(r) {
  return {
    id: r.id,
    descripcion: r.descripcion,
    pieza: r.numero_pieza ?? undefined,
    registradoEl: fecha(r.fecha_diagnostico),
  };
}

const PRIORIDAD_DB_A_FRONT = { urgente: "alta", alta: "alta", normal: "media", baja: "baja" };
const PRIORIDAD_FRONT_A_DB = { alta: "alta", media: "normal", baja: "baja" };

function mapItemTratamiento(r) {
  return {
    id: r.id,
    procedimiento: r.descripcion,
    pieza: r.numero_pieza ?? undefined,
    costoEstimado: Number(r.costo ?? 0),
    prioridad: PRIORIDAD_DB_A_FRONT[r.prioridad] ?? "media",
  };
}

function mapCita(r) {
  return {
    id: r.id,
    pacienteId: r.paciente_id,
    fechaCita: fecha(r.fecha_cita),
    horaInicio: String(r.hora_inicio).slice(0, 5),
    horaFin: String(r.hora_fin).slice(0, 5),
    estado: r.estado,
    motivoConsulta: r.motivo_consulta ?? "",
    notas: r.notas ?? undefined,
  };
}

function mapHorario(r) {
  return {
    id: r.id,
    diaSemana: r.dia_semana,
    horaInicio: String(r.hora_inicio).slice(0, 5),
    horaFin: String(r.hora_fin).slice(0, 5),
    activo: r.activo,
  };
}

const CONDICIONES_VALIDAS = new Set([
  "sano",
  "caries",
  "obturado",
  "corona",
  "endodoncia",
  "ausente",
  "extraccion_indicada",
  "implante",
]);

/**
 * Datos semilla viejos guardaron `piezas` con otra forma ({numero, condiciones:
 * [...]}) que no coincide con lo que espera el frontend ({pieza, condicion}).
 * Se descartan esas entradas en vez de mostrarlas rotas.
 */
function piezasValidas(piezas) {
  if (!Array.isArray(piezas)) return [];
  return piezas.filter(
    (p) => p && typeof p.pieza === "number" && CONDICIONES_VALIDAS.has(p.condicion),
  );
}

/** Confirma que el paciente existe y pertenece a la clínica del perfil. */
async function pacienteDeClinica(pacienteId, clinicaId) {
  const { rows } = await pool.query(
    `select id from public.pacientes where id = $1 and clinica_id = $2`,
    [pacienteId, clinicaId],
  );
  return rows.length > 0;
}

function manejarError(res, error, mensaje) {
  console.error(mensaje, error);
  res.status(503).json({ error: mensaje });
}

// ----------------------------------------------------------------------------
// Salud / clínicas / sesión (ya existentes)
// ----------------------------------------------------------------------------

app.get("/api/salud", async (_req, res) => {
  try {
    const { rows } = await pool.query("select count(*)::int as n from public.clinicas");
    res.json({ ok: true, clinicas: rows[0].n });
  } catch (error) {
    res.status(503).json({ ok: false, error: "Base de datos no disponible" });
  }
});

app.get("/api/clinicas", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `select id, nombre, slug, ciudad, pais, email, telefono
         from public.clinicas
        where activo = true
        order by nombre`,
    );
    res.json(rows);
  } catch {
    res.status(503).json({ error: "No se pudieron leer las clínicas" });
  }
});

app.post("/api/sesion", async (req, res) => {
  const correo = String(req.body?.correo ?? "").trim();
  const clave = String(req.body?.clave ?? "");

  if (!correo) {
    res.status(400).json({ error: "El correo es obligatorio" });
    return;
  }

  if (!EMAIL_REGEX.test(correo)) {
    res.status(400).json({ error: "El correo no tiene un formato válido" });
    return;
  }

  if (!clave) {
    res.status(400).json({ error: "La contraseña es obligatoria" });
    return;
  }

  // Mensaje genérico para credenciales inválidas: no distinguimos entre
  // "correo no existe" y "contraseña incorrecta" para no filtrar qué
  // correos están registrados.
  const CREDENCIALES_INVALIDAS = "Correo o contraseña incorrectos";

  try {
    const { rows } = await pool.query(
      `select p.id,
              p.email,
              p.nombre_completo,
              p.rol,
              p.especialidad,
              p.auth_user_id,
              p.intentos_fallidos,
              p.bloqueado_hasta,
              c.nombre  as clinica,
              c.slug    as clinica_slug,
              c.ciudad
         from public.perfiles p
         join public.clinicas c on c.id = p.clinica_id
        where lower(p.email) = lower($1)
          and p.activo = true
          and c.activo = true
        limit 1`,
      [correo],
    );

    const cuenta = rows[0];

    if (!cuenta || !cuenta.auth_user_id) {
      res.status(401).json({ error: CREDENCIALES_INVALIDAS });
      return;
    }

    // Cuenta bloqueada: ni siquiera se consulta a Supabase Auth (evita seguir
    // probando contraseñas mientras dura el bloqueo).
    if (cuenta.bloqueado_hasta && new Date(cuenta.bloqueado_hasta) > new Date()) {
      res.status(423).json({
        error: `Cuenta bloqueada por demasiados intentos fallidos. Probá de nuevo en ${minutosRestantes(cuenta.bloqueado_hasta)} minuto(s), o recuperá tu contraseña.`,
      });
      return;
    }

    // La contraseña la verifica Supabase Auth, no nosotros.
    const coincide = await supabaseSignIn(correo, clave);
    if (!coincide) {
      const intentos = (cuenta.intentos_fallidos ?? 0) + 1;
      if (intentos >= INTENTOS_MAXIMOS) {
        const bloqueadoHasta = new Date(Date.now() + BLOQUEO_MINUTOS * 60000);
        await pool.query(
          `update public.perfiles set intentos_fallidos = $1, bloqueado_hasta = $2 where id = $3`,
          [intentos, bloqueadoHasta, cuenta.id],
        );
        res.status(423).json({
          error: `Cuenta bloqueada por demasiados intentos fallidos. Probá de nuevo en ${BLOQUEO_MINUTOS} minuto(s), o recuperá tu contraseña.`,
        });
        return;
      }
      await pool.query(`update public.perfiles set intentos_fallidos = $1 where id = $2`, [
        intentos,
        cuenta.id,
      ]);
      res.status(401).json({
        error: `${CREDENCIALES_INVALIDAS} (${INTENTOS_MAXIMOS - intentos} intento(s) restante(s))`,
      });
      return;
    }

    if (!ROLES_ACEPTADOS.has(cuenta.rol)) {
      res.status(403).json({
        error: "Esta cuenta es de paciente y no tiene acceso al panel de la clínica",
      });
      return;
    }

    if (cuenta.intentos_fallidos > 0 || cuenta.bloqueado_hasta) {
      await pool.query(
        `update public.perfiles set intentos_fallidos = 0, bloqueado_hasta = null where id = $1`,
        [cuenta.id],
      );
    }

    res.json({
      email: cuenta.email,
      nombre: cuenta.nombre_completo,
      rol: cuenta.rol,
      especialidad: cuenta.especialidad ?? null,
      clinica: cuenta.clinica,
      clinicaSlug: cuenta.clinica_slug,
      ciudad: cuenta.ciudad,
    });
  } catch {
    res.status(503).json({ error: "No se pudo resolver la cuenta" });
  }
});

/** Busca el perfil+clínica asociados a un correo y arma la misma forma de
 * respuesta que usa el login por contraseña. No valida contraseña: quien
 * llama ya probó la identidad del usuario por otro medio (p. ej. Google). */
async function resolverCuentaDeCorreo(correo) {
  const { rows } = await pool.query(
    `select p.email, p.nombre_completo, p.rol, p.especialidad,
            c.nombre as clinica, c.slug as clinica_slug, c.ciudad
       from public.perfiles p
       join public.clinicas c on c.id = p.clinica_id
      where lower(p.email) = lower($1)
        and p.activo = true
        and c.activo = true
      limit 1`,
    [correo],
  );
  return rows[0] ?? null;
}

// Login con Google: el frontend ya hizo el OAuth contra Supabase (botón
// "Continuar con Google") y nos manda el access_token de esa sesión. Acá lo
// verificamos contra Supabase (no confiamos en un correo suelto que mande el
// cliente) y, si el correo verificado corresponde a personal activo de
// alguna clínica, devolvemos la cuenta igual que /api/sesion.
app.post("/api/sesion-google", async (req, res) => {
  const accessToken = String(req.body?.accessToken ?? "");
  if (!accessToken) {
    res.status(400).json({ error: "Falta el token de la sesión de Google" });
    return;
  }

  try {
    const verificacion = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` },
    });
    if (!verificacion.ok) {
      res.status(401).json({ error: "No se pudo verificar la sesión de Google" });
      return;
    }
    const usuarioGoogle = await verificacion.json();
    const correo = usuarioGoogle?.email;
    if (!correo) {
      res.status(401).json({ error: "La cuenta de Google no tiene un correo verificado" });
      return;
    }

    const cuenta = await resolverCuentaDeCorreo(correo);
    if (!cuenta) {
      res.status(404).json({
        error: `No existe una cuenta de clínica para ${correo}. Pedile a tu administrador que te registre primero.`,
      });
      return;
    }
    if (!ROLES_ACEPTADOS.has(cuenta.rol)) {
      res.status(403).json({
        error: "Esta cuenta es de paciente y no tiene acceso al panel de la clínica",
      });
      return;
    }

    res.json({
      email: cuenta.email,
      nombre: cuenta.nombre_completo,
      rol: cuenta.rol,
      especialidad: cuenta.especialidad ?? null,
      clinica: cuenta.clinica,
      clinicaSlug: cuenta.clinica_slug,
      ciudad: cuenta.ciudad,
    });
  } catch (error) {
    manejarError(res, error, "No se pudo resolver la cuenta de Google");
  }
});

// ----------------------------------------------------------------------------
// Cambiar contraseña (usuario ya logueado, conoce la actual)
// ----------------------------------------------------------------------------

app.post("/api/cambiar-contrasena", async (req, res) => {
  const correo = String(req.body?.correo ?? "").trim();
  const claveActual = String(req.body?.claveActual ?? "");
  const claveNueva = String(req.body?.claveNueva ?? "");

  if (!correo || !EMAIL_REGEX.test(correo)) {
    res.status(400).json({ error: "El correo no es válido" });
    return;
  }
  if (!claveActual) {
    res.status(400).json({ error: "La contraseña actual es obligatoria" });
    return;
  }
  const errorPolitica = validarPasswordNueva(claveNueva);
  if (errorPolitica) {
    res.status(400).json({ error: errorPolitica });
    return;
  }
  if (claveNueva === claveActual) {
    res.status(400).json({ error: "La contraseña nueva debe ser distinta a la actual" });
    return;
  }

  try {
    const { rows } = await pool.query(
      `select id, auth_user_id from public.perfiles
        where lower(email) = lower($1) and activo = true
        limit 1`,
      [correo],
    );
    const cuenta = rows[0];
    if (!cuenta || !cuenta.auth_user_id) {
      res.status(401).json({ error: "No se pudo verificar la cuenta" });
      return;
    }

    const coincide = await supabaseSignIn(correo, claveActual);
    if (!coincide) {
      res.status(401).json({ error: "La contraseña actual no es correcta" });
      return;
    }

    await supabaseAdminSetPassword(cuenta.auth_user_id, claveNueva);
    await pool.query(
      `update public.perfiles set intentos_fallidos = 0, bloqueado_hasta = null where id = $1`,
      [cuenta.id],
    );
    res.json({ ok: true });
  } catch (error) {
    manejarError(res, error, "No se pudo cambiar la contraseña");
  }
});

// ----------------------------------------------------------------------------
// Recuperar contraseña: delega en Supabase Auth, que manda un correo real
// (por SMTP de Brevo) con un link para fijar una contraseña nueva. El
// frontend captura ese link en /recuperar-contrasena y llama a
// supabase.auth.updateUser directamente — no hay un endpoint "confirmar"
// propio, Supabase maneja el token de recuperación.
//
// Pendiente: el envío real falla hoy porque los remitentes configurados en
// Brevo son @gmail.com sin DKIM propio (Google/Yahoo/Microsoft lo exigen).
// Se resuelve agregando un dominio propio verificado en Brevo — no requiere
// cambios de código acá.
// ----------------------------------------------------------------------------

app.post("/api/recuperacion/solicitar", async (req, res) => {
  const correo = String(req.body?.correo ?? "").trim();
  if (!correo || !EMAIL_REGEX.test(correo)) {
    res.status(400).json({ error: "El correo no es válido" });
    return;
  }

  try {
    // Supabase ya responde genérico internamente (no filtra si el correo
    // existe), así que alcanza con reenviar el pedido siempre.
    await supabaseEnviarRecuperacion(correo);
    res.json({
      ok: true,
      mensaje: "Si el correo está registrado, vas a recibir un correo con instrucciones para restablecer tu contraseña.",
    });
  } catch {
    res.status(503).json({ error: "No se pudo enviar el correo de recuperación" });
  }
});

// ----------------------------------------------------------------------------
// Administración (solo rol 'superadmin'): invitar personal nuevo por correo
// y ver el personal ya registrado, sin importar la clínica.
// ----------------------------------------------------------------------------

async function requerirSuperadmin(req, res) {
  const correo = correoDe(req);
  const perfil = await obtenerPerfil(correo);
  if (!perfil || perfil.rol !== "superadmin") {
    res.status(403).json({ error: "Esta acción requiere una cuenta de administrador" });
    return null;
  }
  return perfil;
}

app.get("/api/admin/perfiles", async (req, res) => {
  const admin = await requerirSuperadmin(req, res);
  if (!admin) return;
  try {
    // auth.users vive en el mismo Postgres: se puede joinear directo para
    // saber si la invitación ya fue confirmada (email_confirmed_at) sin
    // pedirle nada aparte a la API de Supabase.
    const { rows } = await pool.query(
      `select p.id, p.email, p.nombre_completo, p.rol, p.especialidad, p.activo,
              p.auth_user_id, au.email_confirmed_at,
              c.nombre as clinica, c.slug as clinica_slug
         from public.perfiles p
         join public.clinicas c on c.id = p.clinica_id
         left join auth.users au on au.id = p.auth_user_id
        where p.rol != 'paciente'
        order by p.nombre_completo`,
    );
    res.json(
      rows.map((r) => ({
        id: r.id,
        email: r.email,
        nombre: r.nombre_completo,
        rol: r.rol,
        especialidad: r.especialidad ?? null,
        activo: r.activo,
        invitacionPendiente: Boolean(r.auth_user_id) && !r.email_confirmed_at,
        clinica: r.clinica,
        clinicaSlug: r.clinica_slug,
      })),
    );
  } catch (error) {
    manejarError(res, error, "No se pudo leer el personal");
  }
});

/** Crea (o re-crea) el usuario de Supabase Auth para `email` y le manda el
 * correo de invitación. Devuelve el id de auth.users creado. */
async function enviarInvitacionSupabase(email, nombreCompleto) {
  const resp = await fetch(
    `${SUPABASE_URL}/auth/v1/invite?redirect_to=${encodeURIComponent(`${FRONTEND_URL}/recuperar-contrasena`)}`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, data: { nombre_completo: nombreCompleto } }),
    },
  );
  const cuerpo = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    console.error("Supabase /auth/v1/invite falló:", resp.status, cuerpo);
    throw new Error(cuerpo.msg || "No se pudo enviar la invitación por correo");
  }
  return cuerpo.id;
}

async function supabaseAdminEliminarUsuario(authUserId) {
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${authUserId}`, {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  // 404 es aceptable acá (puede que ya no exista del lado de Supabase).
  if (!resp.ok && resp.status !== 404) {
    throw new Error(`Supabase admin deleteUser falló con status ${resp.status}`);
  }
}

app.post("/api/admin/invitar", async (req, res) => {
  const admin = await requerirSuperadmin(req, res);
  if (!admin) return;

  const email = String(req.body?.email ?? "").trim();
  const nombreCompleto = String(req.body?.nombreCompleto ?? "").trim();
  const rol = String(req.body?.rol ?? "");
  const clinicaId = String(req.body?.clinicaId ?? "");
  const especialidad = req.body?.especialidad ? String(req.body.especialidad).trim() : null;

  if (!email || !EMAIL_REGEX.test(email)) {
    res.status(400).json({ error: "El correo no es válido" });
    return;
  }
  if (!nombreCompleto) {
    res.status(400).json({ error: "El nombre completo es obligatorio" });
    return;
  }
  if (!["odontologo", "recepcionista", "superadmin"].includes(rol)) {
    res.status(400).json({ error: "Rol inválido" });
    return;
  }
  if (!clinicaId) {
    res.status(400).json({ error: "La clínica es obligatoria" });
    return;
  }

  try {
    const existente = await pool.query(
      `select id from public.perfiles where lower(email) = lower($1) limit 1`,
      [email],
    );
    if (existente.rows.length > 0) {
      res.status(409).json({ error: "Ya existe una cuenta con ese correo" });
      return;
    }

    const { rows } = await pool.query(
      `insert into public.perfiles (email, nombre_completo, rol, clinica_id, especialidad)
       values ($1, $2, $3, $4, $5)
       returning id`,
      [email, nombreCompleto, rol, clinicaId, especialidad],
    );
    const perfilId = rows[0].id;

    let authUserId;
    try {
      authUserId = await enviarInvitacionSupabase(email, nombreCompleto);
    } catch (fallo) {
      // La invitación por correo falló: no dejamos un perfil huérfano sin
      // forma de loguearse, así que se revierte el insert.
      await pool.query(`delete from public.perfiles where id = $1`, [perfilId]);
      res.status(503).json({ error: "No se pudo enviar la invitación por correo" });
      return;
    }

    await pool.query(`update public.perfiles set auth_user_id = $1 where id = $2`, [
      authUserId,
      perfilId,
    ]);

    res.status(201).json({ ok: true });
  } catch (error) {
    manejarError(res, error, "No se pudo invitar a la cuenta");
  }
});

// Reenviar invitación: el usuario de Supabase ya existe pero sin confirmar.
// Se borra y se crea de nuevo para garantizar que el correo salga fresco
// (reinvocar /invite sobre un usuario ya existente sin confirmar no siempre
// reenvía el correo en todas las versiones de GoTrue).
app.post("/api/admin/perfiles/:id/reenviar-invitacion", async (req, res) => {
  const admin = await requerirSuperadmin(req, res);
  if (!admin) return;
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      `select p.email, p.nombre_completo, p.auth_user_id, au.email_confirmed_at
         from public.perfiles p
         left join auth.users au on au.id = p.auth_user_id
        where p.id = $1`,
      [id],
    );
    const perfil = rows[0];
    if (!perfil) {
      res.status(404).json({ error: "Cuenta no encontrada" });
      return;
    }
    if (perfil.email_confirmed_at) {
      res.status(400).json({ error: "Esta cuenta ya aceptó la invitación" });
      return;
    }

    if (perfil.auth_user_id) {
      await supabaseAdminEliminarUsuario(perfil.auth_user_id);
    }
    const nuevoAuthUserId = await enviarInvitacionSupabase(perfil.email, perfil.nombre_completo);
    await pool.query(`update public.perfiles set auth_user_id = $1 where id = $2`, [
      nuevoAuthUserId,
      id,
    ]);

    res.json({ ok: true });
  } catch (error) {
    manejarError(res, error, "No se pudo reenviar la invitación");
  }
});

// Cancelar invitación: solo tiene sentido mientras está pendiente — borra el
// perfil y el usuario de Supabase por completo (nunca llegó a existir "de
// verdad" para el resto de la app).
app.delete("/api/admin/perfiles/:id/invitacion", async (req, res) => {
  const admin = await requerirSuperadmin(req, res);
  if (!admin) return;
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      `select p.auth_user_id, au.email_confirmed_at
         from public.perfiles p
         left join auth.users au on au.id = p.auth_user_id
        where p.id = $1`,
      [id],
    );
    const perfil = rows[0];
    if (!perfil) {
      res.status(404).json({ error: "Cuenta no encontrada" });
      return;
    }
    if (perfil.email_confirmed_at) {
      res.status(400).json({ error: "Esta cuenta ya aceptó la invitación, no se puede cancelar" });
      return;
    }

    await pool.query(`delete from public.perfiles where id = $1`, [id]);
    if (perfil.auth_user_id) {
      await supabaseAdminEliminarUsuario(perfil.auth_user_id);
    }

    res.json({ ok: true });
  } catch (error) {
    manejarError(res, error, "No se pudo cancelar la invitación");
  }
});

// Eliminar (baja lógica) una cuenta de personal ya activa. No se permite
// auto-eliminarse para que un superadmin no pueda quedarse afuera por error.
app.delete("/api/admin/perfiles/:id", async (req, res) => {
  const admin = await requerirSuperadmin(req, res);
  if (!admin) return;
  const { id } = req.params;

  if (id === admin.id) {
    res.status(400).json({ error: "No podés eliminar tu propia cuenta" });
    return;
  }

  try {
    const { rowCount } = await pool.query(
      `update public.perfiles set activo = false where id = $1`,
      [id],
    );
    if (rowCount === 0) {
      res.status(404).json({ error: "Cuenta no encontrada" });
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    manejarError(res, error, "No se pudo eliminar la cuenta");
  }
});

// Cambiar la contraseña de otra cuenta (el superadmin no necesita conocer la
// actual, a diferencia de /api/cambiar-contrasena).
app.post("/api/admin/perfiles/:id/contrasena", async (req, res) => {
  const admin = await requerirSuperadmin(req, res);
  if (!admin) return;
  const { id } = req.params;
  const claveNueva = String(req.body?.claveNueva ?? "");

  const errorPolitica = validarPasswordNueva(claveNueva);
  if (errorPolitica) {
    res.status(400).json({ error: errorPolitica });
    return;
  }

  try {
    const { rows } = await pool.query(
      `select auth_user_id from public.perfiles where id = $1`,
      [id],
    );
    const perfil = rows[0];
    if (!perfil || !perfil.auth_user_id) {
      res.status(404).json({ error: "Cuenta no encontrada" });
      return;
    }

    await supabaseAdminSetPassword(perfil.auth_user_id, claveNueva);
    await pool.query(
      `update public.perfiles set intentos_fallidos = 0, bloqueado_hasta = null where id = $1`,
      [id],
    );
    res.json({ ok: true });
  } catch (error) {
    manejarError(res, error, "No se pudo cambiar la contraseña");
  }
});

// ----------------------------------------------------------------------------
// Pacientes
// ----------------------------------------------------------------------------

app.get("/api/pacientes", async (req, res) => {
  const perfil = await requerirPerfil(req, res);
  if (!perfil) return;
  try {
    const { rows } = await pool.query(
      `select * from public.pacientes
        where clinica_id = $1 and activo = true
        order by creado_en desc`,
      [perfil.clinica_id],
    );
    res.json(rows.map(mapPaciente));
  } catch (error) {
    manejarError(res, error, "No se pudieron leer los pacientes");
  }
});

app.post("/api/pacientes", async (req, res) => {
  const perfil = await requerirPerfil(req, res);
  if (!perfil) return;
  const d = req.body?.paciente ?? {};
  try {
    const { rows } = await pool.query(
      `insert into public.pacientes
         (clinica_id, nombres, apellidos, nombre_completo, ci, fecha_nacimiento, genero, telefono, email, direccion)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       returning *`,
      [
        perfil.clinica_id,
        d.nombres ?? "",
        d.apellidos ?? "",
        `${d.nombres ?? ""} ${d.apellidos ?? ""}`.trim(),
        d.ci ?? "",
        d.fechaNacimiento || null,
        SEXO_A_GENERO[d.sexo] ?? "Otro",
        d.telefono ?? "",
        d.email ?? "",
        d.direccion ?? "",
      ],
    );
    res.status(201).json(mapPaciente(rows[0]));
  } catch (error) {
    manejarError(res, error, "No se pudo registrar el paciente");
  }
});

app.put("/api/pacientes/:id", async (req, res) => {
  const perfil = await requerirPerfil(req, res);
  if (!perfil) return;
  const { id } = req.params;
  const d = req.body?.cambios ?? {};
  try {
    const actual = await pool.query(
      `select * from public.pacientes where id = $1 and clinica_id = $2`,
      [id, perfil.clinica_id],
    );
    if (actual.rows.length === 0) {
      res.status(404).json({ error: "Paciente no encontrado" });
      return;
    }
    const base = actual.rows[0];
    const nombres = d.nombres ?? base.nombres ?? "";
    const apellidos = d.apellidos ?? base.apellidos ?? "";
    const { rows } = await pool.query(
      `update public.pacientes
          set nombres = $1,
              apellidos = $2,
              nombre_completo = $3,
              ci = $4,
              fecha_nacimiento = $5,
              genero = $6,
              telefono = $7,
              email = $8,
              direccion = $9
        where id = $10
        returning *`,
      [
        nombres,
        apellidos,
        `${nombres} ${apellidos}`.trim(),
        d.ci ?? base.ci,
        d.fechaNacimiento || base.fecha_nacimiento,
        d.sexo ? (SEXO_A_GENERO[d.sexo] ?? base.genero) : base.genero,
        d.telefono ?? base.telefono,
        d.email ?? base.email,
        d.direccion ?? base.direccion,
        id,
      ],
    );
    res.json(mapPaciente(rows[0]));
  } catch (error) {
    manejarError(res, error, "No se pudo actualizar el paciente");
  }
});

// Baja lógica: marca activo=false en vez de borrar la fila, así se preserva
// el historial clínico asociado (historiales, odontogramas, citas, etc.)
// por si hace falta auditarlo más adelante.
app.delete("/api/pacientes/:id", async (req, res) => {
  const perfil = await requerirPerfil(req, res);
  if (!perfil) return;
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query(
      `update public.pacientes set activo = false where id = $1 and clinica_id = $2`,
      [id, perfil.clinica_id],
    );
    if (rowCount === 0) {
      res.status(404).json({ error: "Paciente no encontrado" });
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    manejarError(res, error, "No se pudo eliminar el paciente");
  }
});

// ----------------------------------------------------------------------------
// Historia clínica
// ----------------------------------------------------------------------------

async function obtenerHistoriaRow(pacienteId, clinicaId) {
  const { rows } = await pool.query(
    `select * from public.historiales_clinicos where paciente_id = $1 and clinica_id = $2 limit 1`,
    [pacienteId, clinicaId],
  );
  return rows[0] ?? null;
}

app.get("/api/pacientes/:id/historia", async (req, res) => {
  const perfil = await requerirPerfil(req, res);
  if (!perfil) return;
  const { id } = req.params;
  try {
    const row = await obtenerHistoriaRow(id, perfil.clinica_id);
    res.json(mapHistoria(row, id));
  } catch (error) {
    manejarError(res, error, "No se pudo leer la historia clínica");
  }
});

/** Inserta o actualiza la fila de historia clínica aplicando `cambios` (en formato frontend) sobre lo ya guardado. */
async function upsertHistoria(pacienteId, clinicaId, cambiosFrontend, responsable) {
  const actual = await obtenerHistoriaRow(pacienteId, clinicaId);
  const base = mapHistoria(actual, pacienteId);
  const combinado = { ...base, ...cambiosFrontend };

  if (actual) {
    const { rows } = await pool.query(
      `update public.historiales_clinicos
          set motivo_consulta = $1,
              antecedentes_medicos = $2,
              antecedentes_familiares = $3,
              antecedentes_odontologicos = $4,
              enfermedades = $5,
              medicamentos = $6,
              alergias = $7,
              habitos = $8,
              observaciones = $9,
              actualizado_por = $10
        where id = $11
        returning *`,
      [
        combinado.motivoConsulta,
        combinado.antecedentesPersonales,
        combinado.antecedentesFamiliares,
        combinado.antecedentesOdontologicos,
        JSON.stringify(combinado.enfermedadesBase),
        JSON.stringify(combinado.medicamentosActuales),
        JSON.stringify(combinado.alergias),
        JSON.stringify(combinado.habitos),
        combinado.observacionesGenerales,
        responsable ?? null,
        actual.id,
      ],
    );
    return rows[0];
  }

  const { rows } = await pool.query(
    `insert into public.historiales_clinicos
       (clinica_id, paciente_id, motivo_consulta, antecedentes_medicos, antecedentes_familiares,
        antecedentes_odontologicos, enfermedades, medicamentos, alergias, habitos, observaciones, actualizado_por)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     returning *`,
    [
      clinicaId,
      pacienteId,
      combinado.motivoConsulta,
      combinado.antecedentesPersonales,
      combinado.antecedentesFamiliares,
      combinado.antecedentesOdontologicos,
      JSON.stringify(combinado.enfermedadesBase),
      JSON.stringify(combinado.medicamentosActuales),
      JSON.stringify(combinado.alergias),
      JSON.stringify(combinado.habitos),
      combinado.observacionesGenerales,
      responsable ?? null,
    ],
  );
  return rows[0];
}

app.put("/api/pacientes/:id/historia", async (req, res) => {
  const perfil = await requerirPerfil(req, res);
  if (!perfil) return;
  const { id } = req.params;
  try {
    if (!(await pacienteDeClinica(id, perfil.clinica_id))) {
      res.status(404).json({ error: "Paciente no encontrado" });
      return;
    }
    const row = await upsertHistoria(id, perfil.clinica_id, req.body?.cambios ?? {}, req.body?.responsable);
    res.json(mapHistoria(row, id));
  } catch (error) {
    manejarError(res, error, "No se pudo guardar la historia clínica");
  }
});

app.post("/api/pacientes/:id/alergias", async (req, res) => {
  const perfil = await requerirPerfil(req, res);
  if (!perfil) return;
  const { id } = req.params;
  const alergia = req.body?.alergia ?? {};
  try {
    const actual = await obtenerHistoriaRow(id, perfil.clinica_id);
    const historiaActual = mapHistoria(actual, id);
    const nueva = { ...alergia, id: `a_${Math.random().toString(36).slice(2, 9)}` };
    const row = await upsertHistoria(
      id,
      perfil.clinica_id,
      { alergias: [...historiaActual.alergias, nueva] },
      req.body?.responsable,
    );
    res.json(mapHistoria(row, id));
  } catch (error) {
    manejarError(res, error, "No se pudo agregar la alergia");
  }
});

app.delete("/api/pacientes/:id/alergias/:alergiaId", async (req, res) => {
  const perfil = await requerirPerfil(req, res);
  if (!perfil) return;
  const { id, alergiaId } = req.params;
  try {
    const actual = await obtenerHistoriaRow(id, perfil.clinica_id);
    const historiaActual = mapHistoria(actual, id);
    const row = await upsertHistoria(
      id,
      perfil.clinica_id,
      { alergias: historiaActual.alergias.filter((a) => a.id !== alergiaId) },
      correoDe(req),
    );
    res.json(mapHistoria(row, id));
  } catch (error) {
    manejarError(res, error, "No se pudo quitar la alergia");
  }
});

// ----------------------------------------------------------------------------
// Odontograma (una fila de piezas JSONB por paciente)
// ----------------------------------------------------------------------------

app.get("/api/pacientes/:id/odontograma", async (req, res) => {
  const perfil = await requerirPerfil(req, res);
  if (!perfil) return;
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `select piezas from public.odontogramas where paciente_id = $1 and clinica_id = $2 limit 1`,
      [id, perfil.clinica_id],
    );
    res.json(piezasValidas(rows[0]?.piezas));
  } catch (error) {
    manejarError(res, error, "No se pudo leer el odontograma");
  }
});

app.put("/api/pacientes/:id/odontograma", async (req, res) => {
  const perfil = await requerirPerfil(req, res);
  if (!perfil) return;
  const { id } = req.params;
  const condicion = req.body?.condicion;
  if (!condicion || typeof condicion.pieza !== "number") {
    res.status(400).json({ error: "Condición de pieza inválida" });
    return;
  }
  try {
    if (!(await pacienteDeClinica(id, perfil.clinica_id))) {
      res.status(404).json({ error: "Paciente no encontrado" });
      return;
    }
    const existente = await pool.query(
      `select id, piezas from public.odontogramas where paciente_id = $1 and clinica_id = $2 limit 1`,
      [id, perfil.clinica_id],
    );
    const piezasActuales = piezasValidas(existente.rows[0]?.piezas);
    const piezasNuevas = [
      ...piezasActuales.filter((c) => c.pieza !== condicion.pieza),
      condicion,
    ];

    if (existente.rows.length > 0) {
      await pool.query(`update public.odontogramas set piezas = $1 where id = $2`, [
        JSON.stringify(piezasNuevas),
        existente.rows[0].id,
      ]);
    } else {
      await pool.query(
        `insert into public.odontogramas (clinica_id, paciente_id, odontologo_id, piezas)
         values ($1, $2, $3, $4)`,
        [perfil.clinica_id, id, perfil.id, JSON.stringify(piezasNuevas)],
      );
    }
    res.json(piezasNuevas);
  } catch (error) {
    manejarError(res, error, "No se pudo guardar la condición de la pieza");
  }
});

// ----------------------------------------------------------------------------
// Diagnósticos
// ----------------------------------------------------------------------------

app.get("/api/pacientes/:id/diagnosticos", async (req, res) => {
  const perfil = await requerirPerfil(req, res);
  if (!perfil) return;
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `select * from public.diagnosticos
        where paciente_id = $1 and clinica_id = $2
        order by creado_en desc`,
      [id, perfil.clinica_id],
    );
    res.json(rows.map(mapDiagnostico));
  } catch (error) {
    manejarError(res, error, "No se pudieron leer los diagnósticos");
  }
});

app.post("/api/pacientes/:id/diagnosticos", async (req, res) => {
  const perfil = await requerirPerfil(req, res);
  if (!perfil) return;
  const { id } = req.params;
  const { descripcion, pieza } = req.body ?? {};
  if (!descripcion || !String(descripcion).trim()) {
    res.status(400).json({ error: "La descripción es obligatoria" });
    return;
  }
  try {
    if (!(await pacienteDeClinica(id, perfil.clinica_id))) {
      res.status(404).json({ error: "Paciente no encontrado" });
      return;
    }
    const { rows } = await pool.query(
      `insert into public.diagnosticos (clinica_id, paciente_id, odontologo_id, numero_pieza, descripcion)
       values ($1, $2, $3, $4, $5)
       returning *`,
      [perfil.clinica_id, id, perfil.id, pieza ?? null, String(descripcion).trim()],
    );
    res.status(201).json(mapDiagnostico(rows[0]));
  } catch (error) {
    manejarError(res, error, "No se pudo registrar el diagnóstico");
  }
});

// ----------------------------------------------------------------------------
// Plan de tratamiento (un plan "vivo" por paciente + sus procedimientos/items)
// ----------------------------------------------------------------------------

async function obtenerOCrearPlan(pacienteId, clinicaId, odontologoId) {
  const existente = await pool.query(
    `select * from public.planes_tratamiento
      where paciente_id = $1 and clinica_id = $2
      order by creado_en desc
      limit 1`,
    [pacienteId, clinicaId],
  );
  if (existente.rows.length > 0) return existente.rows[0];

  const { rows } = await pool.query(
    `insert into public.planes_tratamiento (clinica_id, paciente_id, odontologo_id)
     values ($1, $2, $3)
     returning *`,
    [clinicaId, pacienteId, odontologoId],
  );
  return rows[0];
}

async function construirPlan(pacienteId, clinicaId, odontologoId) {
  const plan = await obtenerOCrearPlan(pacienteId, clinicaId, odontologoId);
  const { rows: items } = await pool.query(
    `select * from public.procedimientos_tratamiento
      where plan_tratamiento_id = $1
      order by creado_en asc`,
    [plan.id],
  );
  return {
    pacienteId,
    items: items.map(mapItemTratamiento),
    observaciones: plan.notas ?? "",
  };
}

app.get("/api/pacientes/:id/plan", async (req, res) => {
  const perfil = await requerirPerfil(req, res);
  if (!perfil) return;
  const { id } = req.params;
  try {
    if (!(await pacienteDeClinica(id, perfil.clinica_id))) {
      res.status(404).json({ error: "Paciente no encontrado" });
      return;
    }
    res.json(await construirPlan(id, perfil.clinica_id, perfil.id));
  } catch (error) {
    manejarError(res, error, "No se pudo leer el plan de tratamiento");
  }
});

app.post("/api/pacientes/:id/plan/items", async (req, res) => {
  const perfil = await requerirPerfil(req, res);
  if (!perfil) return;
  const { id } = req.params;
  const item = req.body?.item ?? {};
  try {
    if (!(await pacienteDeClinica(id, perfil.clinica_id))) {
      res.status(404).json({ error: "Paciente no encontrado" });
      return;
    }
    const plan = await obtenerOCrearPlan(id, perfil.clinica_id, perfil.id);
    await pool.query(
      `insert into public.procedimientos_tratamiento
         (clinica_id, plan_tratamiento_id, numero_pieza, descripcion, prioridad, costo)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        perfil.clinica_id,
        plan.id,
        item.pieza ?? null,
        item.procedimiento ?? "",
        PRIORIDAD_FRONT_A_DB[item.prioridad] ?? "normal",
        item.costoEstimado ?? 0,
      ],
    );
    res.status(201).json(await construirPlan(id, perfil.clinica_id, perfil.id));
  } catch (error) {
    manejarError(res, error, "No se pudo agregar el procedimiento");
  }
});

app.delete("/api/pacientes/:id/plan/items/:itemId", async (req, res) => {
  const perfil = await requerirPerfil(req, res);
  if (!perfil) return;
  const { id, itemId } = req.params;
  try {
    await pool.query(
      `delete from public.procedimientos_tratamiento
        where id = $1 and clinica_id = $2`,
      [itemId, perfil.clinica_id],
    );
    res.json(await construirPlan(id, perfil.clinica_id, perfil.id));
  } catch (error) {
    manejarError(res, error, "No se pudo quitar el procedimiento");
  }
});

app.put("/api/pacientes/:id/plan/observaciones", async (req, res) => {
  const perfil = await requerirPerfil(req, res);
  if (!perfil) return;
  const { id } = req.params;
  const { observaciones } = req.body ?? {};
  try {
    const plan = await obtenerOCrearPlan(id, perfil.clinica_id, perfil.id);
    await pool.query(`update public.planes_tratamiento set notas = $1 where id = $2`, [
      observaciones ?? "",
      plan.id,
    ]);
    res.json(await construirPlan(id, perfil.clinica_id, perfil.id));
  } catch (error) {
    manejarError(res, error, "No se pudieron guardar las observaciones del plan");
  }
});

// ----------------------------------------------------------------------------
// Agenda: horarios y citas
// ----------------------------------------------------------------------------

app.get("/api/horarios", async (req, res) => {
  const perfil = await requerirPerfil(req, res);
  if (!perfil) return;
  try {
    const { rows } = await pool.query(
      `select * from public.horarios
        where clinica_id = $1 and odontologo_id = $2
        order by dia_semana, hora_inicio`,
      [perfil.clinica_id, perfil.id],
    );
    res.json(rows.map(mapHorario));
  } catch (error) {
    manejarError(res, error, "No se pudieron leer los horarios");
  }
});

app.get("/api/citas", async (req, res) => {
  const perfil = await requerirPerfil(req, res);
  if (!perfil) return;
  try {
    const { rows } = await pool.query(
      `select * from public.citas
        where clinica_id = $1 and odontologo_id = $2
        order by fecha_cita, hora_inicio`,
      [perfil.clinica_id, perfil.id],
    );
    res.json(rows.map(mapCita));
  } catch (error) {
    manejarError(res, error, "No se pudieron leer las citas");
  }
});

app.post("/api/citas", async (req, res) => {
  const perfil = await requerirPerfil(req, res);
  if (!perfil) return;
  const d = req.body?.cita ?? {};
  try {
    const { rows } = await pool.query(
      `insert into public.citas
         (clinica_id, paciente_id, odontologo_id, fecha_cita, hora_inicio, hora_fin, estado, motivo_consulta, notas)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       returning *`,
      [
        perfil.clinica_id,
        d.pacienteId,
        perfil.id,
        d.fechaCita,
        d.horaInicio,
        d.horaFin,
        d.estado ?? "reservada",
        d.motivoConsulta ?? "",
        d.notas ?? null,
      ],
    );
    res.status(201).json(mapCita(rows[0]));
  } catch (error) {
    manejarError(res, error, "No se pudo registrar la cita");
  }
});

// La validación de qué transiciones de estado son válidas ya se hace en el
// frontend (features/agenda/agenda.ts) antes de llamar a este endpoint; acá
// solo persistimos el estado que llegó.
app.put("/api/citas/:id/estado", async (req, res) => {
  const perfil = await requerirPerfil(req, res);
  if (!perfil) return;
  const { id } = req.params;
  const { estado } = req.body ?? {};
  try {
    const { rows } = await pool.query(
      `update public.citas set estado = $1
        where id = $2 and clinica_id = $3
        returning *`,
      [estado, id, perfil.clinica_id],
    );
    if (rows.length === 0) {
      res.status(404).json({ error: "Cita no encontrada" });
      return;
    }
    res.json(mapCita(rows[0]));
  } catch (error) {
    manejarError(res, error, "No se pudo actualizar el estado de la cita");
  }
});

app.use((_req, res) => res.status(404).json({ error: "Ruta no encontrada" }));

app.listen(PUERTO, () => {
  console.log(`MiDentista API escuchando en :${PUERTO}`);
});

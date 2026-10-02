import express from "express";
import pg from "pg";

const { Pool } = pg;

const PUERTO = Number(process.env.PORT ?? 4000);
const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://midentista:midentista@localhost:5432/midentista";

const pool = new Pool({ connectionString: DATABASE_URL, max: 5 });

const app = express();
app.use(express.json());

// La BD guarda el rol en su propio dominio. 'paciente' es un usuario del portal,
// no personal de la clínica, así que no puede abrir sesión en el panel.
const ROLES_ACEPTADOS = new Set(["odontologo", "recepcionista"]);

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

  if (!correo) {
    res.status(400).json({ error: "El correo es obligatorio" });
    return;
  }

  try {
    const { rows } = await pool.query(
      `select p.email,
              p.nombre_completo,
              p.rol,
              p.especialidad,
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

    if (!cuenta) {
      res.status(404).json({ error: "Ese correo no está registrado en ninguna clínica" });
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
  } catch {
    res.status(503).json({ error: "No se pudo resolver la cuenta" });
  }
});

app.use((_req, res) => res.status(404).json({ error: "Ruta no encontrada" }));

app.listen(PUERTO, () => {
  console.log(`MiDentista API escuchando en :${PUERTO}`);
});

// Asigna una contraseña DEMO conocida a todo el personal de clínica
// (odontólogo/recepcionista) de los datos semilla de bd_5clinicas_midentista.sql.
//
// SOLO para el entorno de demo/desarrollo. Nunca usar esta contraseña como
// credencial real en producción: ahí cada clínica debe definir sus propias
// contraseñas (el admin de la clínica las fija directamente en la BD).
//
// Uso (una sola vez, después de `docker compose up`):
//   DATABASE_URL=postgres://midentista:midentista@localhost:5432/midentista \
//     node api/scripts/set-demo-passwords.js
//
// Si no se pasa DATABASE_URL, usa el mismo valor por defecto que server.js
// (apunta a localhost:5432, útil si se corre el script desde el host con el
// puerto de Postgres publicado por docker-compose).

import pg from "pg";
import bcrypt from "bcryptjs";

const { Pool } = pg;

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://midentista:midentista@localhost:5432/midentista";

const CONTRASENA_DEMO = "midentista123";
const COSTO_BCRYPT = 12;

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL, max: 1 });

  try {
    const hash = await bcrypt.hash(CONTRASENA_DEMO, COSTO_BCRYPT);

    const { rowCount } = await pool.query(
      `update public.perfiles
          set password_hash = $1
        where rol in ('odontologo', 'recepcionista')`,
      [hash],
    );

    console.log(
      `Listo: ${rowCount} perfil(es) de personal actualizados con la contraseña demo "${CONTRASENA_DEMO}".`,
    );
    console.log(
      "Recordatorio: esto es solo para demo/desarrollo, no es una credencial de producción.",
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("No se pudo actualizar las contraseñas demo:", error);
  process.exitCode = 1;
});

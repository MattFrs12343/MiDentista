// PostgreSQL WASM aislado y efímero. Nunca conecta a Supabase ni usa credenciales.
// Uso: node docs/modules/10-archivos/pruebas-sql-ciclo-4.mjs <URL del módulo PGlite>
// La dependencia es opcional y externa; no modifica package.json del proyecto.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

if (!process.argv[2]) throw new Error("Indica la URL local del módulo @electric-sql/pglite instalado fuera del repositorio.");
const { PGlite } = await import(process.argv[2]);
const db = new PGlite();
const leer = (ruta) => readFile(new URL(`../../../${ruta}`, import.meta.url), "utf8");
const C = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab";
const P = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const UA = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const US = "dddddddd-dddd-4ddd-8ddd-dddddddddddd".replace(/d$/, "e");
const UR = "dddddddd-dddd-4ddd-8ddd-ddddddddddd0";
const E = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const datos = { nombre: "prueba.jpg", mime: "image/jpeg", tipo_archivo: "fotografia", descripcion: "",
  evolucion_clinica_id: null, plan_tratamiento_id: null };
const como = async (rol, actor = UA) => {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false), set_config('request.jwt.claim.role',$2,false)", [actor, rol]);
  await db.exec(`set role ${rol}`);
};
const reservar = (id, bytes = 4, payload = datos, actor = UA) => db.query(
  "select public.archivos_c4_reservar($1,$2,$3,$4,$5,$6) r", [actor, P, id, bytes, "a".repeat(64), payload]);

// Fixtures mínimos de dependencias, NO sustituyen el esquema productivo.
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create schema storage;
grant usage on schema public, auth, storage to anon, authenticated, service_role;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.role() returns text language sql stable as $$
  select current_setting('request.jwt.claim.role',true) $$;
create table public.clinicas(id uuid primary key);
create table public.perfiles(id uuid primary key, auth_user_id uuid, clinica_id uuid, rol text, activo boolean);
create table public.pacientes(id uuid primary key, clinica_id uuid, perfil_id uuid);
create table public.evoluciones_clinicas(id uuid primary key, paciente_id uuid, clinica_id uuid);
create table public.planes_tratamiento(id uuid primary key, paciente_id uuid, clinica_id uuid);
alter table public.evoluciones_clinicas enable row level security;
alter table public.planes_tratamiento enable row level security;
create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text,
  owner_id text, metadata jsonb, archived_at timestamptz, created_at timestamptz default now(), unique(bucket_id,name));
alter table storage.objects enable row level security;
create function public.current_perfil() returns table(perfil_id uuid, clinica_id uuid, rol text)
  language sql stable security definer set search_path=pg_catalog as $$
  select id,clinica_id,rol from public.perfiles where auth_user_id=auth.uid() and activo limit 1 $$;
create function public.mi_perfil_id() returns uuid language sql stable security definer as $$ select perfil_id from public.current_perfil() $$;
create function public.mi_clinica_id() returns uuid language sql stable security definer as $$ select clinica_id from public.current_perfil() $$;
create function public.es_superadmin() returns boolean language sql stable security definer as $$
  select exists(select 1 from public.current_perfil() where rol='superadmin') $$;
insert into public.clinicas values('${C}'),('${B}');
insert into public.perfiles values('${PA}','${UA}','${C}','odontologo',true),
  (gen_random_uuid(),'${US}',null,'superadmin',true),(gen_random_uuid(),'${UR}','${C}','recepcionista',true);
insert into public.pacientes values('${P}','${C}',null);
insert into public.evoluciones_clinicas values('${E}','${P}','${C}');
grant select,insert on storage.objects to authenticated, service_role;
`);
await db.exec(await leer("docs/modules/10-archivos/sql.sql"));
await db.exec(await leer("docs/modules/10-archivos/migracion-t-10-9.sql"));
// Solo los helpers de archivos de la integración real; otros módulos no forman
// parte de estos fixtures. Se leen del SQL versionado, no se reescriben a mano.
const integracion17 = await leer("docs/modules/17-odontologo-admin/sql.sql");
await db.exec(integracion17.slice(integracion17.indexOf("create or replace function public.archivos_asociacion_autorizada"),
  integracion17.indexOf("-- 3) QR de cobro")));
await db.exec("grant select,insert on public.archivos to service_role");
await db.query("insert into storage.objects(bucket_id,name,metadata,created_at) values('archivos-clinica',$1,'{\"size\":7}',now()-interval '2 days'),('archivos-clinica',$2,'{\"size\":11}',now()-interval '2 days'),('qr-cobros',$3,'{\"size\":99}',now()-interval '2 days')", [`${C}/${P}/anterior.jpg`,`${B}/${P}/anterior.jpg`,`${C}/qr`]);
await db.query("insert into storage.objects(bucket_id,name,archived_at) values('archivos-clinica',$1,now())",[`${C}/${P}/archivada.jpg`]);

test("migración incremental real y verificador se ejecutan sobre PostgreSQL aislado", async () => {
  await db.exec(await leer("docs/modules/10-archivos/migracion-ciclo-4.sql"));
  await db.exec(await leer("docs/modules/10-archivos/verificacion-ciclo-4.sql"));
  const { rows } = await db.query("select limite_bytes,bytes_ocupados from public.archivos_cuotas where clinica_id=$1", [C]);
  assert.equal(Number(rows[0].limite_bytes), 5_000_000_000);
  assert.equal(Number(rows[0].bytes_ocupados),7); // Objeto anterior sin fila; no QR ni archivados.
});

test("RPC SQL acepta exactamente 5 GB y rechaza un byte más, sin archivos gigantes", async () => {
  await db.query("update public.archivos_cuotas set bytes_ocupados=4999999996 where clinica_id=$1", [C]);
  await como("service_role");
  const id = crypto.randomUUID(); await reservar(id);
  await assert.rejects(reservar(crypto.randomUUID(),1), /CUOTA_EXCEDIDA/);
  await db.query("select public.archivos_c4_cancelar($1,$2)", [UA,id]);
  await como("postgres");
  await db.query("update public.archivos_cuotas set bytes_ocupados=0, limite_bytes=6 where clinica_id=$1", [C]);
});

test("dos reservas SQL para misma clínica solo permiten una con espacio de 6 y archivos de 4", async () => {
  await como("service_role");
  const ids = [crypto.randomUUID(),crypto.randomUUID()];
  // PGlite serializa la conexión. Comprueba SQL real, NO dos sesiones/locks reales.
  const r = await Promise.allSettled(ids.map((id) => reservar(id)));
  assert.equal(r.filter((v) => v.status === "fulfilled").length, 1);
  await db.query("select public.archivos_c4_cancelar($1,$2)", [UA,ids[r[0].status === "fulfilled" ? 0 : 1]]);
});

test("cancelación idempotente, confirmación atómica y ruta durable acreditan objeto real", async () => {
  const id = crypto.randomUUID(); const { rows } = await reservar(id); const op = rows[0].r;
  await reservar(id); // No reserva dos veces.
  await db.query("select public.archivos_c4_iniciar($1,$2)", [UA,id]);
  await assert.rejects(db.query("select public.archivos_c4_confirmar($1,$2)", [UA,id]), /OBJETO_NO_CONFIRMADO/);
  const cancelada = await db.query("select public.archivos_c4_cancelar($1,$2) r", [UA,id]);
  assert.equal(cancelada.rows[0].r,false);
  await db.query("insert into storage.objects(bucket_id,name,metadata) values('archivos-clinica',$1,'{\"size\":4}')", [op.ruta]);
  const a = await db.query("select public.archivos_c4_confirmar($1,$2) r", [UA,id]);
  const b = await db.query("select public.archivos_c4_confirmar($1,$2) r", [UA,id]);
  assert.equal(a.rows[0].r.id,b.rows[0].r.id);
  const q = await db.query("select bytes_ocupados,bytes_reservados from public.archivos_cuotas where clinica_id=$1",[C]);
  assert.equal(Number(q.rows[0].bytes_ocupados),4); assert.equal(Number(q.rows[0].bytes_reservados),0);
});

test("SQL rechaza idempotencia incompatible, recepción con evolución y clínica cruzada", async () => {
  await como("postgres"); await db.query("update public.archivos_cuotas set limite_bytes=100 where clinica_id=$1",[C]);
  await como("service_role"); const id=crypto.randomUUID(); await reservar(id);
  await assert.rejects(reservar(id,5), /IDEMPOTENCIA_INCOMPATIBLE/);
  await assert.rejects(reservar(crypto.randomUUID(),4,{...datos,evolucion_clinica_id:E},UR), /ASOCIACION_DENEGADA/);
  await como("postgres"); await db.query("update public.perfiles set clinica_id=$1 where auth_user_id=$2", [B,UR]);
  await como("service_role"); await assert.rejects(reservar(crypto.randomUUID(),4,datos,UR), /ACCESO_DENEGADO/);
  await db.query("select public.archivos_c4_cancelar($1,$2)",[UA,id]);
});

test("authenticated no administra cuota ajena ni llama funciones privilegiadas", async () => {
  await como("authenticated");
  await assert.rejects(db.query("select public.archivos_c4_cuota($1)",[B]), /CUOTA_NO_VISIBLE/);
  await assert.rejects(reservar(crypto.randomUUID()), /permission denied/);
  await assert.rejects(db.query("update public.archivos_cuotas set limite_bytes=999"), /permission denied/);
  await assert.rejects(db.query("select public.archivos_c4_auditar(null)"), /AUDITORIA_DENEGADA/);
  const {rows}=await db.query("select public.archivos_c4_cuota($1) r",[C]); assert.equal(rows[0].r.clinicaId,C);
});

test("solo superadmin audita SQL A/B, pendientes e históricos, sin borrar", async () => {
  await como("postgres");
  await db.query("insert into storage.objects(bucket_id,name,metadata,created_at) values('archivos-clinica',$1,'{\"size\":1}',now()-interval '2 days')",[`${C}/${P}/huerfano.jpg`]);
  await db.query("insert into public.archivos(clinica_id,paciente_id,nombre,ruta,mime,tamano,categoria,tipo_archivo,subido_por) values($1,$2,'f.jpg',$3,'image/jpeg',1,'clinico','fotografia',$4)",[C,P,`${C}/${P}/faltante.jpg`,PA]);
  await como("authenticated",US);
  const {rows}=await db.query("select public.archivos_c4_auditar(null) r");
  assert.equal(rows[0].r.estado,"completo");
  assert.equal(rows[0].r.candidatos.filter((c)=>c.tipo==='A').length,3);
  assert.equal(rows[0].r.candidatos.filter((c)=>c.tipo==='B').length,1);
  await como("postgres");
  assert.equal(Number((await db.query("select count(*) n from storage.objects")).rows[0].n),6);
  assert.equal(rows[0].r.candidatos.some((c)=>c.ruta.endsWith('archivada.jpg') || c.ruta.endsWith('/qr')), false);
});

test("cierre de bypass Storage es RESTRICTIVE y segunda migración no sobrescribe", async () => {
  await como("authenticated");
  await assert.rejects(db.query("insert into storage.objects(bucket_id,name,owner_id) values('archivos-clinica',$1,$2)", [`${C}/${P}/directo.jpg`,UA]), /row-level security/);
  await como("postgres");
  await assert.rejects(db.exec(await leer("docs/modules/10-archivos/migracion-ciclo-4.sql")), /ya presente/);
  await db.exec("rollback");
  await db.close();
});

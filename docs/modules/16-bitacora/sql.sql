-- ============================================================================
-- Módulo 16 — Bitácora de auditoría
-- ============================================================================
-- Contexto: el docente pide que el administrador de usuarios (módulo 11,
-- `/app/admin`) pueda ver qué acciones se hicieron en el sistema: quién,
-- cuándo, desde qué IP y con qué detalle de la transacción. Eso no existía en
-- ninguna tabla ni trigger: no había bitácora de auditoría, solo lecturas
-- marcadas como "audita el sistema" (permiso de ver datos de cualquier
-- clínica), que es un concepto distinto.
--
-- QUÉ HACE
--   Una tabla `bitacora` que registra automáticamente cada INSERT/UPDATE/
--   DELETE sobre las tablas de negocio listadas abajo: quién lo hizo (perfil y
--   rol), cuándo (timestamp del servidor), desde qué IP (la del navegador,
--   capturada por PostgREST en cada request), y el detalle de la transacción
--   (fila completa antes/después, como JSON). Se llena sola vía trigger
--   `security definer`: ningún cliente puede insertar, editar ni borrar filas
--   de la bitácora directamente, así que no se puede "limpiar el historial".
--
-- QUÉ NO HACE
--   No audita `clinicas` (su propia fila no tiene `clinica_id` a quién
--   atribuirse), `horarios` (configuración, no transacción) ni
--   `perfiles_recuperacion` (tokens de un solo uso; registrar su contenido
--   sería un riesgo de seguridad en sí mismo, no una auditoría útil).
--
-- IP DEL CLIENTE
--   `inet_client_addr()` no sirve acá: Supabase conecta a Postgres a través de
--   un pooler (pgbouncer/Supavisor), así que esa función devuelve la IP del
--   pooler, no la del navegador. PostgREST sí expone los headers del request
--   original como un GUC de sesión (`request.headers`) durante esa misma
--   transacción, así que `ip_actual()` lee `x-forwarded-for` de ahí. Esto
--   funciona para cualquier escritura hecha con el cliente de Supabase
--   (`supabase-js`), que es como escribe toda la app — no solo lo que pasa
--   por el Edge Function.
--
-- PERMISOS
--   Lee la bitácora: superadmin (cualquier clínica) y `odontologo_admin` de su
--   propia clínica — mismo criterio ya usado en `docs/modules/06-evolucion-
--   clinica/sql.sql`. Igual que ahí, `odontologo_admin` todavía NO existe en
--   el constraint de `perfiles.rol` (bd_5clinicas_midentista.sql), así que esa
--   mitad de la condición es hoy inofensiva: en la práctica, hasta que se
--   agregue el rol, solo superadmin lee la bitácora. Nadie la escribe directo
--   (`revoke insert/update/delete` de authenticated/anon): solo el trigger,
--   que corre `security definer`.
--
-- EJECUCIÓN: idempotente (create if not exists / drop trigger if exists).
-- Requiere los helpers del módulo 01 (`current_perfil`, `es_superadmin`,
-- `mi_clinica_id`).
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 1) Tabla
-- -----------------------------------------------------------------------------
create table if not exists public.bitacora (
    id             uuid primary key default gen_random_uuid(),
    clinica_id     uuid references public.clinicas(id) on delete set null,
    perfil_id      uuid references public.perfiles(id) on delete set null,
    rol            text,
    accion         text not null check (accion in ('INSERT', 'UPDATE', 'DELETE')),
    tabla_afectada text not null,
    registro_id    uuid,
    detalle        jsonb not null,
    ip_address     inet,
    creado_en      timestamptz not null default now()
);

create index if not exists bitacora_clinica_fecha_idx
  on public.bitacora (clinica_id, creado_en desc);
create index if not exists bitacora_perfil_idx on public.bitacora (perfil_id);
create index if not exists bitacora_tabla_idx on public.bitacora (tabla_afectada, creado_en desc);

alter table public.bitacora enable row level security;

drop policy if exists bitacora_select on public.bitacora;
create policy bitacora_select on public.bitacora
for select to authenticated
using (
  public.es_superadmin()
  or (
    clinica_id = public.mi_clinica_id()
    and exists (select 1 from public.current_perfil() where rol = 'odontologo_admin')
  )
);

-- Solo el trigger (security definer) escribe. Ni superadmin inserta a mano.
revoke insert, update, delete on public.bitacora from authenticated, anon;

-- -----------------------------------------------------------------------------
-- 2) IP del request actual (ver nota "IP DEL CLIENTE" arriba)
-- -----------------------------------------------------------------------------
create or replace function public.ip_actual()
returns inet
language plpgsql stable
as $$
declare
  v_headers text;
  v_ip text;
begin
  begin
    v_headers := current_setting('request.headers', true);
  exception when others then
    return null;
  end;
  if v_headers is null then
    return null;
  end if;
  v_ip := trim(split_part(v_headers::json ->> 'x-forwarded-for', ',', 1));
  if v_ip is null or v_ip = '' then
    return null;
  end if;
  begin
    return v_ip::inet;
  exception when others then
    return null;
  end;
end;
$$;
revoke all on function public.ip_actual() from public, anon;
grant execute on function public.ip_actual() to authenticated;

-- -----------------------------------------------------------------------------
-- 3) Trigger genérico de auditoría
-- -----------------------------------------------------------------------------
create or replace function public.registrar_bitacora()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil_id  uuid;
  v_clinica_id uuid;
  v_rol        text;
  v_fila       jsonb;
  v_clinica_fila uuid;
begin
  select perfil_id, clinica_id, rol
    into v_perfil_id, v_clinica_id, v_rol
    from public.current_perfil();

  v_fila := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  -- La clínica de la fila manda sobre la del perfil: así una acción del
  -- superadmin (sin clínica propia) queda igual ligada a la clínica afectada.
  v_clinica_fila := nullif(v_fila ->> 'clinica_id', '')::uuid;

  insert into public.bitacora (
    clinica_id, perfil_id, rol, accion, tabla_afectada, registro_id, detalle, ip_address
  ) values (
    coalesce(v_clinica_fila, v_clinica_id),
    v_perfil_id,
    v_rol,
    tg_op,
    tg_table_name,
    (v_fila ->> 'id')::uuid,
    jsonb_build_object(
      'antes', case when tg_op = 'INSERT' then null else to_jsonb(old) end,
      'despues', case when tg_op = 'DELETE' then null else to_jsonb(new) end
    ),
    public.ip_actual()
  );

  return coalesce(new, old);
end;
$$;
revoke all on function public.registrar_bitacora() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4) Triggers sobre las tablas de negocio (ver "QUÉ NO HACE" para las que
--    quedan afuera a propósito)
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'pacientes', 'citas', 'diagnosticos', 'planes_tratamiento',
    'procedimientos_tratamiento', 'presupuestos', 'items_presupuesto', 'pagos',
    'odontogramas', 'evoluciones_clinicas', 'historiales_clinicos', 'perfiles'
  ]
  loop
    execute format('drop trigger if exists trg_bitacora on public.%I;', t);
    execute format(
      'create trigger trg_bitacora after insert or update or delete on public.%I ' ||
      'for each row execute function public.registrar_bitacora();', t
    );
  end loop;
end;
$$;

-- ============================================================================
-- Verificación
-- ============================================================================
-- 1. select count(*) from pg_trigger where tgname = 'trg_bitacora'; -- debe dar 12
-- 2. Como odontólogo o recepción, registrar un pago o crear un paciente, y
--    luego, como superadmin:
--    select accion, tabla_afectada, rol, ip_address, creado_en
--      from public.bitacora order by creado_en desc limit 5;
--    -- debe aparecer la fila, con ip_address NULL si se probó desde el SQL
--    -- editor de Supabase (no hay request.headers fuera de PostgREST) y con
--    -- una IP real si se probó desde la app en el navegador.
-- 3. Como odontólogo_admin de otra clínica, la misma consulta no debe
--    devolver filas de clínicas ajenas (RLS `bitacora_select`).
-- 4. insert into public.bitacora (...) desde un rol authenticated común debe
--    fallar por falta de permiso (solo el trigger, security definer, escribe).

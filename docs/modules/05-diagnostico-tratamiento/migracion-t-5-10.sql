-- T-5.10: PROPUESTA NO EJECUTADA. Revisión/aplicación exclusivamente por Matías.
-- Requiere T-5.1 y T-5.7 aplicadas/validadas. Primero aplicar en copia de pruebas.
-- Decisión explícita: SUM(costo) de TODOS los procedimientos, incluidos cancelados.
-- Confirmar interpretación funcional antes de aplicar. No cambia estados del plan.
-- Corrige SOLO costo_total derivado y actualizado_en existente; no elimina datos.
-- Instalación única, transaccional; colisión/incompatibilidad aborta sin sobrescribir.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '120s';
set local search_path = pg_catalog;

do $$
begin
  if to_regclass('public.planes_tratamiento') is null
      or to_regclass('public.procedimientos_tratamiento') is null
      or to_regprocedure('public.t51_contexto_inmutable()') is null
      or to_regprocedure('public.t57_validar_estado_plan()') is null
      or to_regprocedure('public.actualizar_fecha_modificacion()') is null then
    raise exception 'Faltan dependencias de T-5.1/T-5.7';
  end if;
  -- SECURITY DEFINER debe ver todas las filas y actualizar la columna derivada.
  -- No instalar como authenticated/service_role ni como un dueño sujeto a RLS.
  if current_user in ('authenticated', 'anon', 'service_role') or not exists (
      select 1 from pg_roles where rolname = current_user and (rolsuper or rolbypassrls)) then
    raise exception 'Instalar con rol administrativo confiable con bypass RLS';
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated')
      or not exists (select 1 from pg_roles where rolname = 'anon')
      or not exists (select 1 from pg_roles where rolname = 'service_role') then
    raise exception 'Se requiere el entorno de roles Supabase';
  end if;
  if to_regprocedure('public.t510_aplicar_total()') is not null
      or to_regprocedure('public.t510_total_solo_servidor()') is not null
      or exists (select 1 from pg_trigger where tgrelid in
        ('public.planes_tratamiento'::regclass, 'public.procedimientos_tratamiento'::regclass)
        and tgname like 't510\_%' escape '\') then
    raise exception 'Nombres T-5.10 ocupados o instalación previa; no sobrescribir';
  end if;
end;
$$;

-- Bloquear primero procedimientos: sus escrituras actualizarán planes.
-- ALTER de planes también puede competir con FK: lock_timeout aborta si hay uso.
lock table public.procedimientos_tratamiento, public.planes_tratamiento in access exclusive mode;

do $$
declare r record; tabla regclass; esperados integer; n bigint;
begin
  foreach tabla in array array['public.planes_tratamiento'::regclass, 'public.procedimientos_tratamiento'::regclass] loop
    if not exists (select 1 from pg_class where oid = tabla and relrowsecurity) then
      raise exception 'RLS no habilitada en %', tabla;
    end if;
    esperados := case when tabla = 'public.planes_tratamiento'::regclass then 3 else 4 end;
    if (select count(*) from pg_policy where polrelid = tabla) <> esperados then
      raise exception 'Policies adicionales/faltantes en %; revisar T-5.1', tabla;
    end if;
  end loop;
  for r in select * from (values
    ('planes_tratamiento', 't51_contexto_inmutable', 'public.t51_contexto_inmutable()', 19),
    ('planes_tratamiento', 't57_validar_estado_plan', 'public.t57_validar_estado_plan()', 23),
    ('planes_tratamiento', 'trigger_planes_tratamiento_actualizar', 'public.actualizar_fecha_modificacion()', 19),
    ('procedimientos_tratamiento', 't51_contexto_inmutable', 'public.t51_contexto_inmutable()', 19),
    ('procedimientos_tratamiento', 'trigger_procedimientos_actualizar', 'public.actualizar_fecha_modificacion()', 19)
  ) x(tabla, nombre, funcion, tipo) loop
    if not exists (select 1 from pg_trigger where tgrelid = to_regclass('public.' || r.tabla)
        and tgname = r.nombre and not tgisinternal and tgenabled = 'O'
        and tgfoid = to_regprocedure(r.funcion) and tgtype = r.tipo) then
      raise exception 'Trigger base incompatible: %.%', r.tabla, r.nombre;
    end if;
  end loop;
  if (select count(*) from pg_trigger where tgrelid = 'public.planes_tratamiento'::regclass and not tgisinternal) <> 3
      or (select count(*) from pg_trigger where tgrelid = 'public.procedimientos_tratamiento'::regclass and not tgisinternal) <> 2 then
    raise exception 'Triggers adicionales: revisar interacción antes de aplicar';
  end if;
  for r in select * from (values ('planes_tratamiento', 'costo_total'), ('procedimientos_tratamiento', 'costo')) x(tabla, columna) loop
    if not exists (select 1 from pg_attribute where attrelid = to_regclass('public.' || r.tabla)
        and attname = r.columna and not attisdropped and attnotnull
        and format_type(atttypid, atttypmod) = 'numeric(10,2)') then
      raise exception 'Se requiere NUMERIC(10,2) NOT NULL en %.%', r.tabla, r.columna;
    end if;
  end loop;
  if not exists (select 1 from pg_constraint where conrelid = 'public.planes_tratamiento'::regclass
      and conname = 't51_planes_costo_check' and contype = 'c' and convalidated)
      or not exists (select 1 from pg_constraint where conrelid = 'public.procedimientos_tratamiento'::regclass
      and conname = 't51_procedimientos_costo_check' and contype = 'c' and convalidated) then
    raise exception 'Faltan CHECK de costos validados de T-5.1';
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.procedimientos_tratamiento'::regclass
      and conname = 't51_procedimientos_plan_fk' and contype = 'f' and convalidated
      and confrelid = 'public.planes_tratamiento'::regclass)
      or exists (select 1 from public.procedimientos_tratamiento pr left join public.planes_tratamiento pl
        on pl.id = pr.plan_tratamiento_id and pl.clinica_id = pr.clinica_id
        where pl.id is null or pr.costo is null or not (pr.costo between 0 and 99999999.99)) then
    raise exception 'Relaciones/costos incompatibles con T-5.1; no corregir procedimientos automáticamente';
  end if;
  select count(*) into n from (select plan_tratamiento_id from public.procedimientos_tratamiento
    group by plan_tratamiento_id having sum(costo) > 99999999.99) s;
  if n <> 0 then raise exception '% planes exceden NUMERIC(10,2); revisar costos antes de aplicar', n; end if;
  select count(*) into n from public.planes_tratamiento pl where pl.costo_total is distinct from
    coalesce((select sum(pr.costo) from public.procedimientos_tratamiento pr
      where pr.plan_tratamiento_id = pl.id and pr.clinica_id = pl.clinica_id), 0::numeric);
  raise notice 'T-5.10: % planes con total desactualizado; se corregirá únicamente el derivado', n;
end;
$$;

-- Canonizar datos existentes BAJO BLOQUEO. Sin procedimientos => 0.00.
-- No se obtiene SUM mediante RLS de un cliente, que podría ocultar filas.
with totales as (
  select pl.id, coalesce(sum(pr.costo), 0::numeric)::numeric(10,2) as total
  from public.planes_tratamiento pl left join public.procedimientos_tratamiento pr
    on pr.plan_tratamiento_id = pl.id and pr.clinica_id = pl.clinica_id group by pl.id
)
update public.planes_tratamiento pl set costo_total = t.total from totales t
  where pl.id = t.id and pl.costo_total is distinct from t.total;
alter table public.planes_tratamiento alter column costo_total set default 0.00;

-- AFTER STATEMENT con transition tables: sumar cambios reales del statement por
-- plan, no un SUM con snapshot obsoleto tras esperar otra transacción. Agrega
-- deltas OLD/NEW antes de actualizar, evitando desbordamientos transitorios en
-- un UPDATE masivo cuyos aumentos/disminuciones se compensan dentro del statement.
create function public.t510_aplicar_total() returns trigger
language plpgsql security definer set search_path = pg_catalog as $$
declare r record; n integer;
begin
  if tg_relid <> 'public.procedimientos_tratamiento'::regclass or tg_level <> 'STATEMENT' or tg_when <> 'AFTER' then
    raise exception 'T-5.10: contexto de trigger no permitido';
  end if;
  -- IF separado: INSERT/DELETE no deben ni planificar referencias a transition
  -- tables que solo existen en UPDATE.
  if tg_op = 'UPDATE' then
    if exists (
      select 1 from t510_anteriores a join t510_nuevos b on b.id = a.id
      where row(a.plan_tratamiento_id, a.clinica_id) is distinct from row(b.plan_tratamiento_id, b.clinica_id)) then
      raise exception 'T-5.10: el procedimiento no puede cambiar de plan/clínica' using errcode = '23514';
    end if;
  end if;
  -- Ramas por TG_OP: no referenciar OLD en INSERT ni NEW en DELETE.
  if tg_op = 'INSERT' then
    for r in select plan_tratamiento_id as plan_id, clinica_id, sum(costo) as delta
      from t510_nuevos group by plan_tratamiento_id, clinica_id order by plan_tratamiento_id, clinica_id loop
      update public.planes_tratamiento set costo_total = (costo_total + r.delta)::numeric(10,2)
        where id = r.plan_id and clinica_id = r.clinica_id and r.delta <> 0;
      get diagnostics n = row_count;
      if r.delta <> 0 and n <> 1 then raise exception 'T-5.10: plan insertado no confirmado'; end if;
    end loop;
  elsif tg_op = 'UPDATE' then
    for r in select plan_id, clinica_id, sum(delta) as delta from (
      select plan_tratamiento_id as plan_id, clinica_id, costo as delta from t510_nuevos
      union all select plan_tratamiento_id, clinica_id, -costo from t510_anteriores
    ) cambios group by plan_id, clinica_id having sum(delta) <> 0 order by plan_id, clinica_id loop
      update public.planes_tratamiento set costo_total = (costo_total + r.delta)::numeric(10,2)
        where id = r.plan_id and clinica_id = r.clinica_id;
      get diagnostics n = row_count;
      if n <> 1 then raise exception 'T-5.10: plan actualizado no confirmado'; end if;
    end loop;
  elsif tg_op = 'DELETE' then
    for r in select plan_tratamiento_id as plan_id, clinica_id, -sum(costo) as delta
      from t510_anteriores group by plan_tratamiento_id, clinica_id order by plan_tratamiento_id, clinica_id loop
      update public.planes_tratamiento set costo_total = (costo_total + r.delta)::numeric(10,2)
        where id = r.plan_id and clinica_id = r.clinica_id and r.delta <> 0;
      get diagnostics n = row_count;
      -- ON DELETE CASCADE del plan/paciente: el padre ya no existe y no hay total
      -- que conservar. Nunca reinsertar el plan ni impedir ese cascade privilegiado.
      if r.delta <> 0 and n <> 1 and exists (select 1 from public.planes_tratamiento where id = r.plan_id) then
        raise exception 'T-5.10: plan eliminado no confirmado';
      end if;
    end loop;
  else raise exception 'T-5.10: operación no permitida';
  end if;
  return null;
end;
$$;
revoke all on function public.t510_aplicar_total() from public, anon, authenticated, service_role;

-- ACL de columnas + guard: los clientes no eligen el total. Un UPDATE al mismo
-- valor no cambia el derivado; tampoco permite falsificarlo.
create function public.t510_total_solo_servidor() returns trigger
language plpgsql security invoker set search_path = pg_catalog as $$
begin
  if tg_op = 'INSERT' then
    if new.costo_total is distinct from 0::numeric then
      raise exception 'T-5.10: el plan sin procedimientos inicia con total cero' using errcode = '23514';
    end if;
  elsif new.costo_total is distinct from old.costo_total then
    if pg_trigger_depth() < 2 or current_user <> (
        select pg_get_userbyid(proowner) from pg_proc where oid = 'public.t510_aplicar_total()'::regprocedure) then
      raise exception 'T-5.10: costo_total solo se mantiene mediante procedimientos' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.t510_total_solo_servidor() from public, anon, authenticated, service_role;
create trigger t510_total_solo_servidor before insert or update on public.planes_tratamiento
  for each row execute function public.t510_total_solo_servidor();
create trigger t510_total_insert after insert on public.procedimientos_tratamiento
  referencing new table as t510_nuevos for each statement execute function public.t510_aplicar_total();
-- Sin lista UPDATE OF: PostgreSQL no permite transition tables con lista de columnas.
create trigger t510_total_update after update on public.procedimientos_tratamiento
  referencing old table as t510_anteriores new table as t510_nuevos for each statement execute function public.t510_aplicar_total();
create trigger t510_total_delete after delete on public.procedimientos_tratamiento
  referencing old table as t510_anteriores for each statement execute function public.t510_aplicar_total();

-- Revocar grant de TABLA: un REVOKE de columna no lo anula. Conservar todos los
-- demás campos previamente permitidos; T-5.1 sigue prohibiendo cambiar contexto.
revoke insert, update on public.planes_tratamiento from authenticated;
revoke insert (costo_total), update (costo_total) on public.planes_tratamiento from public, anon, authenticated;
do $$
declare columnas text;
begin
  select string_agg(quote_ident(attname), ', ' order by attnum) into columnas from pg_attribute
    where attrelid = 'public.planes_tratamiento'::regclass and attnum > 0 and not attisdropped and attname <> 'costo_total';
  execute format('grant insert (%s), update (%s) on public.planes_tratamiento to authenticated', columnas, columnas);
  if has_column_privilege('authenticated', 'public.planes_tratamiento', 'costo_total', 'INSERT')
      or has_column_privilege('authenticated', 'public.planes_tratamiento', 'costo_total', 'UPDATE') then
    raise exception 'ACL heredada permite escribir costo_total; revisar roles antes de aplicar';
  end if;
  if exists (select 1 from public.planes_tratamiento pl where pl.costo_total is distinct from
    coalesce((select sum(pr.costo) from public.procedimientos_tratamiento pr where pr.plan_tratamiento_id = pl.id and pr.clinica_id = pl.clinica_id), 0::numeric)) then
    raise exception 'Backfill de totales no confirmado';
  end if;
end;
$$;
commit;

-- Concurrencia: UPDATE atómico del padre, NO KEY UPDATE compatible con KEY SHARE
-- de la FK. Statements del mismo plan se serializan sobre la fila del plan.
-- En READ COMMITTED se usa el valor actual al obtener el bloqueo; en aislamientos
-- más estrictos una transacción puede abortar por serialización. Reintentar la
-- transacción completa solo tras revisión del resultado, nunca ajustar en cliente.
-- Varios planes se recorren ordenados por UUID. Transacciones con varios statements
-- aún pueden producir deadlock: PostgreSQL aborta una, sin dejar totales parciales.
-- Overflow o cualquier fallo revierte TODO el statement/tx, incluido el derivado.
-- No TRUNCATE cliente (T-5.1); admins no deben desactivar triggers/TRUNCATE/importar
-- saltándose el contrato. No se modifica RLS/ACL de procedimientos ni grants de
-- tablas de service_role; las funciones internas nuevas no se exponen como RPC.

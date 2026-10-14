-- T-5.10: PROPUESTA NO EJECUTADA. Matías, tras aplicar en una copia de pruebas.
-- Catálogo/datos reales SOLO SELECT. Escrituras SOLO fixtures TEMP; ROLLBACK final.
-- Requiere rol administrativo con bypass RLS y capacidad de SET ROLE.
-- La prueba de concurrencia REAL de dos sesiones está al final (no la simula TEMP).
begin;
set local lock_timeout = '5s';
set local statement_timeout = '120s';
set local search_path = pg_catalog;

do $$
declare r record; f oid;
begin
  if not exists (select 1 from pg_roles where rolname = current_user and (rolsuper or rolbypassrls)) then
    raise exception 'Verificar como administrador con visibilidad completa, no como cliente con RLS';
  end if;
  if to_regprocedure('public.t510_aplicar_total()') is null or to_regprocedure('public.t510_total_solo_servidor()') is null then
    raise exception 'Falta migración T-5.10';
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role' and rolbypassrls) then
    raise exception 'La fixture service_role requiere el rol privilegiado Supabase existente';
  end if;
  if not exists (select 1 from pg_proc p join pg_roles owner_role on owner_role.oid = p.proowner
      where p.oid = 'public.t510_aplicar_total()'::regprocedure and p.prosecdef
        and p.proconfig = array['search_path=pg_catalog'] and (owner_role.rolsuper or owner_role.rolbypassrls)
        and owner_role.rolname not in ('authenticated', 'anon', 'service_role'))
      or not exists (select 1 from pg_proc where oid = 'public.t510_total_solo_servidor()'::regprocedure
        and not prosecdef and proconfig = array['search_path=pg_catalog']) then
    raise exception 'Owner/SECURITY/search_path de funciones incompatible';
  end if;
  foreach f in array array['public.t510_aplicar_total()'::regprocedure::oid, 'public.t510_total_solo_servidor()'::regprocedure::oid] loop
    if has_function_privilege('authenticated', f, 'EXECUTE') or has_function_privilege('anon', f, 'EXECUTE')
        or has_function_privilege('service_role', f, 'EXECUTE') then
      raise exception 'Función interna expuesta directamente a un rol cliente';
    end if;
  end loop;
  for r in select * from (values
    ('planes_tratamiento', 't510_total_solo_servidor', 'public.t510_total_solo_servidor()', 23, null::text, null::text),
    ('procedimientos_tratamiento', 't510_total_insert', 'public.t510_aplicar_total()', 4, null, 't510_nuevos'),
    ('procedimientos_tratamiento', 't510_total_update', 'public.t510_aplicar_total()', 16, 't510_anteriores', 't510_nuevos'),
    ('procedimientos_tratamiento', 't510_total_delete', 'public.t510_aplicar_total()', 8, 't510_anteriores', null)
  ) x(tabla, nombre, funcion, tipo, anterior, nuevo) loop
    if not exists (select 1 from pg_trigger where tgrelid = to_regclass('public.' || r.tabla) and tgname = r.nombre
        and not tgisinternal and tgenabled = 'O' and tgtype = r.tipo and tgfoid = to_regprocedure(r.funcion)
        and tgattr = ''::int2vector and tgqual is null
        and tgoldtable::text is not distinct from r.anterior and tgnewtable::text is not distinct from r.nuevo) then
      raise exception 'Trigger/transition tables incompatible: %', r.nombre;
    end if;
  end loop;
  if not has_table_privilege('authenticated', 'public.planes_tratamiento', 'SELECT')
      or has_column_privilege('authenticated', 'public.planes_tratamiento', 'costo_total', 'UPDATE')
      or has_column_privilege('authenticated', 'public.planes_tratamiento', 'costo_total', 'INSERT') then
    raise exception 'ACL de costo_total/lectura incompatible';
  end if;
  for r in select attname from pg_attribute where attrelid = 'public.planes_tratamiento'::regclass
      and attnum > 0 and not attisdropped and attname <> 'costo_total' loop
    if not has_column_privilege('authenticated', 'public.planes_tratamiento', r.attname, 'INSERT')
        or not has_column_privilege('authenticated', 'public.planes_tratamiento', r.attname, 'UPDATE') then
      raise exception 'Permiso previo perdido para columna %', r.attname;
    end if;
  end loop;
  if exists (select 1 from public.planes_tratamiento pl where pl.costo_total is distinct from
      coalesce((select sum(pr.costo) from public.procedimientos_tratamiento pr
        where pr.plan_tratamiento_id = pl.id and pr.clinica_id = pl.clinica_id), 0::numeric)) then
    raise exception 'Planes reales con total diferente de SUM(costo)';
  end if;
  if exists (select 1 from pg_attribute where attrelid in
      ('public.planes_tratamiento'::regclass, 'public.procedimientos_tratamiento'::regclass)
      and attname in ('costo_total', 'costo') and (not attnotnull or format_type(atttypid, atttypmod) <> 'numeric(10,2)')) then
    raise exception 'Precisión/NOT NULL incompatibles';
  end if;
end;
$$;

-- LIKE no copia triggers/FKs/RLS. Nunca conectar triggers de total a TEMP sin
-- sustituir su destino: la función instalada escribe public.planes_tratamiento.
create temporary table planes_tratamiento (like public.planes_tratamiento including defaults including constraints);
create temporary table procedimientos_tratamiento (like public.procedimientos_tratamiento including defaults including constraints);
alter table pg_temp.planes_tratamiento add primary key(id), add unique(id, clinica_id);
alter table pg_temp.procedimientos_tratamiento add primary key(id), add foreign key(plan_tratamiento_id, clinica_id)
  references pg_temp.planes_tratamiento(id, clinica_id) on delete cascade;

-- Fixture histórica incorrecta ANTES de instalar triggers TEMP.
insert into pg_temp.planes_tratamiento(id, clinica_id, paciente_id, odontologo_id, titulo, costo_total, actualizado_en) values
 ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000021', 'Plan autor', 999.99, '2000-01-01'),
 ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000022', 'Plan colega', 7.25, '2000-01-01'),
 ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000023', 'Plan C2', 8.25, '2000-01-01'),
 ('00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000021', 'Plan vacío', 42.00, '2000-01-01');
insert into pg_temp.procedimientos_tratamiento(id, clinica_id, plan_tratamiento_id, descripcion, costo, estado) values
 ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'Uno', 10.10, 'pendiente'),
 ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'Cancelado también suma', 20.35, 'cancelado'),
 ('00000000-0000-4000-8000-000000000206', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000102', 'Ajeno', 7.25, 'pendiente'),
 ('00000000-0000-4000-8000-000000000207', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000103', 'Otra clínica', 8.25, 'pendiente');
do $$
declare n integer;
begin
  select count(*) into n from pg_temp.planes_tratamiento pl where costo_total is distinct from
    coalesce((select sum(pr.costo) from pg_temp.procedimientos_tratamiento pr where pr.plan_tratamiento_id = pl.id), 0::numeric);
  if n <> 2 then raise exception 'Fixture histórica no detecta dos discrepancias'; end if;
end;
$$;
with totales as (
  select pl.id, coalesce(sum(pr.costo), 0::numeric)::numeric(10,2) as total
  from pg_temp.planes_tratamiento pl left join pg_temp.procedimientos_tratamiento pr
    on pr.plan_tratamiento_id = pl.id and pr.clinica_id = pl.clinica_id group by pl.id
)
update pg_temp.planes_tratamiento pl set costo_total = t.total from totales t
  where pl.id = t.id and pl.costo_total is distinct from t.total;

-- Clonar CUERPOS instalados, cambiando exclusivamente tablas/función a TEMP.
-- Es la lógica desplegada; no otra implementación de sumas/deltas bajo prueba.
do $$
declare nombre text; cuerpo text; seguridad text;
begin
  foreach nombre in array array['t510_aplicar_total', 't510_total_solo_servidor'] loop
    select prosrc into cuerpo from pg_proc where oid = to_regprocedure('public.' || nombre || '()');
    cuerpo := replace(replace(replace(cuerpo, 'public.procedimientos_tratamiento', 'pg_temp.procedimientos_tratamiento'),
      'public.planes_tratamiento', 'pg_temp.planes_tratamiento'), 'public.t510_aplicar_total()', 'pg_temp.t510_aplicar_total()');
    if cuerpo like '%public.%' then raise exception 'Referencia pública inesperada en fixture: %', nombre; end if;
    seguridad := case nombre when 't510_aplicar_total' then 'definer' else 'invoker' end;
    execute format('create function pg_temp.%I() returns trigger language plpgsql security %s set search_path = pg_catalog as %L', nombre, seguridad, cuerpo);
    execute format('revoke all on function pg_temp.%I() from public, authenticated, anon, service_role', nombre);
  end loop;
end;
$$;
create trigger t510_total_solo_servidor before insert or update on pg_temp.planes_tratamiento
  for each row execute function pg_temp.t510_total_solo_servidor();
create trigger t510_total_insert after insert on pg_temp.procedimientos_tratamiento
  referencing new table as t510_nuevos for each statement execute function pg_temp.t510_aplicar_total();
create trigger t510_total_update after update on pg_temp.procedimientos_tratamiento
  referencing old table as t510_anteriores new table as t510_nuevos for each statement execute function pg_temp.t510_aplicar_total();
create trigger t510_total_delete after delete on pg_temp.procedimientos_tratamiento
  referencing old table as t510_anteriores for each statement execute function pg_temp.t510_aplicar_total();
create trigger t51_contexto_inmutable before update on pg_temp.planes_tratamiento for each row execute function public.t51_contexto_inmutable();
create trigger t51_contexto_inmutable before update on pg_temp.procedimientos_tratamiento for each row execute function public.t51_contexto_inmutable();
create trigger t57_validar_estado_plan before insert or update on pg_temp.planes_tratamiento for each row execute function public.t57_validar_estado_plan();
create trigger trigger_planes_tratamiento_actualizar before update on pg_temp.planes_tratamiento for each row execute function public.actualizar_fecha_modificacion();
create trigger trigger_procedimientos_actualizar before update on pg_temp.procedimientos_tratamiento for each row execute function public.actualizar_fecha_modificacion();

create function pg_temp.t510_assert_total() returns void language plpgsql security definer set search_path = pg_catalog as $$
begin
  if exists (select 1 from pg_temp.planes_tratamiento pl where pl.costo_total is distinct from
      coalesce((select sum(pr.costo) from pg_temp.procedimientos_tratamiento pr
        where pr.plan_tratamiento_id = pl.id and pr.clinica_id = pl.clinica_id), 0::numeric)) then
    raise exception 'Fixture: costo_total diferente de SUM(costo)';
  end if;
end;
$$;
revoke all on function pg_temp.t510_assert_total() from public;
grant execute on function pg_temp.t510_assert_total() to authenticated;
select pg_temp.t510_assert_total();

create function pg_temp.t510_perfil_actual() returns table(perfil_id uuid, clinica_id uuid, rol text)
language sql stable as $$
  select current_setting('t510.perfil')::uuid, nullif(current_setting('t510.clinica'), '')::uuid, current_setting('t510.rol')
$$;
revoke all on function pg_temp.t510_perfil_actual() from public;
grant execute on function pg_temp.t510_perfil_actual() to authenticated;
grant select on pg_temp.planes_tratamiento to authenticated;
grant select, insert, update, delete on pg_temp.procedimientos_tratamiento to authenticated;
-- service_role solo tiene GRANT en fixtures para comprobar el guard aun con ACL.
grant select, insert, update, delete on pg_temp.planes_tratamiento, pg_temp.procedimientos_tratamiento to service_role;
do $$
declare p record; tabla text; expresion text; comprobacion text; comando text; columnas text;
begin
  select string_agg(quote_ident(attname), ', ' order by attnum) into columnas from pg_attribute
    where attrelid = 'pg_temp.planes_tratamiento'::regclass and attnum > 0 and not attisdropped and attname <> 'costo_total';
  execute format('grant insert (%s), update (%s) on pg_temp.planes_tratamiento to authenticated', columnas, columnas);
  for p in select * from pg_policy where polrelid in ('public.planes_tratamiento'::regclass, 'public.procedimientos_tratamiento'::regclass) loop
    if not p.polpermissive or p.polroles <> array[(select oid from pg_roles where rolname = 'authenticated')]
        or p.polname not in ('planes_select','planes_insert','planes_update','procedimientos_select','procedimientos_insert','procedimientos_update','procedimientos_delete') then
      raise exception 'Policy inesperada: %', p.polname;
    end if;
    select relname into tabla from pg_class where oid = p.polrelid;
    expresion := replace(replace(pg_get_expr(p.polqual, p.polrelid), 'public.current_perfil()', 'pg_temp.t510_perfil_actual()'), 'public.planes_tratamiento', 'pg_temp.planes_tratamiento');
    comprobacion := replace(replace(pg_get_expr(p.polwithcheck, p.polrelid), 'public.current_perfil()', 'pg_temp.t510_perfil_actual()'), 'public.planes_tratamiento', 'pg_temp.planes_tratamiento');
    if coalesce(expresion, '') like '%public.%' or coalesce(comprobacion, '') like '%public.%' then raise exception 'Policy referencia datos reales'; end if;
    comando := case p.polcmd when 'r' then 'select' when 'a' then 'insert' when 'w' then 'update' when 'd' then 'delete' end;
    if comando is null then raise exception 'Comando RLS incompatible'; end if;
    execute format('create policy %I on pg_temp.%I for %s to authenticated %s %s', p.polname, tabla, comando,
      case when expresion is null then '' else 'using (' || expresion || ')' end,
      case when comprobacion is null then '' else 'with check (' || comprobacion || ')' end);
  end loop;
end;
$$;
alter table pg_temp.planes_tratamiento enable row level security;
alter table pg_temp.procedimientos_tratamiento enable row level security;

set local role authenticated;
do $$
declare total numeric; n integer; rol_prueba text;
begin
  perform set_config('t510.perfil', '00000000-0000-4000-8000-000000000021', true);
  perform set_config('t510.clinica', '00000000-0000-4000-8000-000000000001', true);
  perform set_config('t510.rol', 'odontologo', true);
  select costo_total into total from pg_temp.planes_tratamiento where id = '00000000-0000-4000-8000-000000000101';
  if total <> 30.45 then raise exception 'Backfill/decimales/cancelado incorrectos'; end if;
  if (select costo_total from pg_temp.planes_tratamiento where id = '00000000-0000-4000-8000-000000000104') <> 0.00 then raise exception 'Plan vacío distinto de cero'; end if;
  if (select costo_total from pg_temp.planes_tratamiento where id = '00000000-0000-4000-8000-000000000102') <> 7.25 then raise exception 'Plan con un procedimiento incorrecto'; end if;
  begin
    update pg_temp.planes_tratamiento set costo_total = 1 where id = '00000000-0000-4000-8000-000000000101';
    raise exception 'Cliente pudo editar total';
  exception when insufficient_privilege then null; end;
  begin
    insert into pg_temp.planes_tratamiento(clinica_id,paciente_id,odontologo_id,costo_total)
      values('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000021',1);
    raise exception 'Cliente pudo insertar total';
  exception when insufficient_privilege then null; end;

  -- CRUD + múltiples filas + cancelado: subtransacción revertida intencionalmente.
  begin
    insert into pg_temp.procedimientos_tratamiento(id,clinica_id,plan_tratamiento_id,descripcion,costo) values
      ('00000000-0000-4000-8000-000000000203','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101','Decimal',0.10);
    if (select costo_total from pg_temp.planes_tratamiento where id = '00000000-0000-4000-8000-000000000101') <> 30.55 then raise exception 'INSERT decimal incorrecto'; end if;
    if not exists (select 1 from pg_temp.planes_tratamiento where id = '00000000-0000-4000-8000-000000000101'
        and estado = 'propuesto' and actualizado_en = now()) then raise exception 'Timestamp no confirmado o estado del plan alterado'; end if;
    insert into pg_temp.procedimientos_tratamiento(id,clinica_id,plan_tratamiento_id,descripcion,costo) values
      ('00000000-0000-4000-8000-000000000204','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101','Lote uno',1.20),
      ('00000000-0000-4000-8000-000000000205','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101','Lote dos',2.30);
    if (select costo_total from pg_temp.planes_tratamiento where id = '00000000-0000-4000-8000-000000000101') <> 34.05 then raise exception 'INSERT múltiple incorrecto'; end if;
    update pg_temp.procedimientos_tratamiento set costo = 2.20 where id = '00000000-0000-4000-8000-000000000203';
    if (select costo_total from pg_temp.planes_tratamiento where id = '00000000-0000-4000-8000-000000000101') <> 36.15 then raise exception 'UPDATE costo incorrecto'; end if;
    update pg_temp.procedimientos_tratamiento set estado = 'cancelado' where id = '00000000-0000-4000-8000-000000000203';
    if (select costo_total from pg_temp.planes_tratamiento where id = '00000000-0000-4000-8000-000000000101') <> 36.15 then raise exception 'Cancelar cambió suma sin decisión documental'; end if;
    delete from pg_temp.procedimientos_tratamiento where id in ('00000000-0000-4000-8000-000000000203','00000000-0000-4000-8000-000000000204','00000000-0000-4000-8000-000000000205');
    if (select costo_total from pg_temp.planes_tratamiento where id = '00000000-0000-4000-8000-000000000101') <> 30.45 then raise exception 'DELETE múltiple incorrecto'; end if;
    delete from pg_temp.procedimientos_tratamiento where plan_tratamiento_id = '00000000-0000-4000-8000-000000000101';
    if (select costo_total from pg_temp.planes_tratamiento where id = '00000000-0000-4000-8000-000000000101') <> 0.00 then raise exception 'DELETE último no dejó cero'; end if;
    perform pg_temp.t510_assert_total();
    raise exception 'Rollback intencional de CRUD' using errcode = 'Z5100';
  exception when sqlstate 'Z5100' then null; end;
  if (select costo_total from pg_temp.planes_tratamiento where id = '00000000-0000-4000-8000-000000000101') <> 30.45
      or (select count(*) from pg_temp.procedimientos_tratamiento where plan_tratamiento_id = '00000000-0000-4000-8000-000000000101') <> 2 then
    raise exception 'Rollback no restauró procedimientos y total';
  end if;
  begin
    update pg_temp.procedimientos_tratamiento set plan_tratamiento_id = '00000000-0000-4000-8000-000000000104' where id = '00000000-0000-4000-8000-000000000201';
    raise exception 'Se permitió mover procedimiento';
  exception when check_violation then null; end;
  update pg_temp.planes_tratamiento set notas = 'Notas permitidas', estado = 'aceptado' where id = '00000000-0000-4000-8000-000000000101';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'T-5.5/T-5.7 dejaron de funcionar'; end if;
  perform pg_temp.t510_assert_total();

  -- Límite, una fila, costo cero, UPDATE masivo compensado y overflow atómico.
  insert into pg_temp.planes_tratamiento(id,clinica_id,paciente_id,odontologo_id,titulo) values
    ('00000000-0000-4000-8000-000000000108','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000021','Límite');
  insert into pg_temp.procedimientos_tratamiento(id,clinica_id,plan_tratamiento_id,descripcion,costo) values
    ('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000108','Máximo',99999999.99),
    ('00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000108','Cero',0.00);
  update pg_temp.procedimientos_tratamiento set costo = case when id = '00000000-0000-4000-8000-000000000301' then 0.00 else 99999999.99 end
    where plan_tratamiento_id = '00000000-0000-4000-8000-000000000108';
  perform pg_temp.t510_assert_total();
  begin
    insert into pg_temp.procedimientos_tratamiento(clinica_id,plan_tratamiento_id,descripcion,costo) values
      ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000108','Excede',0.01);
    raise exception 'Se aceptó total fuera de NUMERIC(10,2)';
  exception when numeric_value_out_of_range then null; end;
  if (select count(*) from pg_temp.procedimientos_tratamiento where plan_tratamiento_id = '00000000-0000-4000-8000-000000000108') <> 2 then raise exception 'Overflow no revirtió INSERT'; end if;
  perform pg_temp.t510_assert_total();
  delete from pg_temp.procedimientos_tratamiento where plan_tratamiento_id = '00000000-0000-4000-8000-000000000108';
  perform pg_temp.t510_assert_total();

  -- RLS ajena/clínica y roles de lectura siguen sin escritura.
  foreach rol_prueba in array array['odontologo','recepcionista','superadmin'] loop
    perform set_config('t510.rol', rol_prueba, true);
    perform set_config('t510.perfil','00000000-0000-4000-8000-000000000022',true);
    update pg_temp.procedimientos_tratamiento set costo = 1 where id = '00000000-0000-4000-8000-000000000201';
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'Rol/colega pudo editar procedimiento ajeno: %', rol_prueba; end if;
    if not exists (select 1 from pg_temp.planes_tratamiento where id = '00000000-0000-4000-8000-000000000101') then raise exception 'Rol de lectura no ve plan'; end if;
  end loop;
  perform set_config('t510.rol','odontologo',true);
  perform set_config('t510.perfil','00000000-0000-4000-8000-000000000021',true);
  update pg_temp.procedimientos_tratamiento set costo = 1 where id = '00000000-0000-4000-8000-000000000207';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Se permitió escritura de otra clínica'; end if;
  if exists (select 1 from pg_temp.planes_tratamiento where id = '00000000-0000-4000-8000-000000000103') then raise exception 'Se mezclaron clínicas'; end if;
  perform pg_temp.t510_assert_total();
end;
$$;
reset role;

-- Guardia aun con ACL de tabla amplia: cliente privilegiado no elige total.
set local role service_role;
do $$
begin
  begin
    update pg_temp.planes_tratamiento set costo_total = 123 where id = '00000000-0000-4000-8000-000000000101';
    raise exception 'Guard permitió UPDATE directo de total';
  exception when check_violation then null; end;
  begin
    insert into pg_temp.planes_tratamiento(clinica_id,paciente_id,odontologo_id,costo_total) values
      ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000021',123);
    raise exception 'Guard permitió INSERT directo de total';
  exception when check_violation then null; end;
end;
$$;
reset role;

-- Cascade SOLO TEMP, privilegiado: borrar un padre no debe recrearlo ni fallar.
delete from pg_temp.planes_tratamiento where id = '00000000-0000-4000-8000-000000000103';
select pg_temp.t510_assert_total();
do $$ begin raise notice 'T-5.10: fixtures verificadas; descartar con ROLLBACK'; end; $$;
rollback;

-- VALIDACIÓN MANUAL REAL OBLIGATORIA (copia de pruebas, nunca datos clínicos):
-- 1. JWT autor/colega/recepción/superadmin/C2: CRUD y totales derivados, permisos
--    de columnas, UPDATE de título/notas/estado, creación sin enviar costo_total.
-- 2. Dos sesiones sobre UN plan de prueba inicialmente vacío/total 0.00 y
--    procedimientos distintos (usar UUID de plan/clínica reales de la copia):
--    A: BEGIN; INSERT costo=10.10; no confirmar aún.
--    B: BEGIN; INSERT costo=20.20; debe esperar el bloqueo del padre.
--    COMMIT A; COMMIT B; SELECT costo_total y SUM(costo) deben ser 30.30.
--    Repetir con ROLLBACK A: solo persiste lo de B (20.20).
-- 3. Dos UPDATE de costos de procedimientos distintos y dos DELETE simultáneos:
--    ganador/espera y total final igual a SUM; último DELETE deja 0.00.
-- 4. UPDATE/DELETE simultáneos del MISMO procedimiento: solo filas realmente
--    afectadas aportan delta. Serialización/deadlock abortan, no corrompen total.
-- 5. Dos statements de varios planes con UUID inversos y varios statements por tx:
--    comprobar orden/bloqueo y rollback de cualquier víctima de deadlock.
-- 6. REPEATABLE READ/SERIALIZABLE: aceptar abortos de serialización; verificar
--    igualdad tras rollback. No reintentar ajustes parciales ni en frontend.
-- 7. Overflow concurrente cercano al límite: statement perdedor no persiste ni
--    procedimiento ni total; guardar nuevo costo tras revisar el resultado real.
-- 8. Tras reanudar frontend: CRUD -> releer plan por id/paciente/clínica/autor,
--    comprobar dos decimales, impresión y respuesta del portal (mismo persistido).
--    Error de relectura significa procedimiento ya confirmado + total pendiente
--    de confirmar; no repetir CRUD ni mostrar costo viejo como actualizado.
-- 9. Esta fixture secuencial NO demuestra concurrencia/JWT/navegador reales.
-- 10. La assertion ACL TABLA de verificacion-t-5-1.sql quedó histórica: T-5.10
--     restringe INSERT/UPDATE a columnas excepto costo_total deliberadamente.
--     Usar assertions efectivas de columnas anteriores para ese nuevo contrato.

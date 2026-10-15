-- T-5.7: PROPUESTA NO EJECUTADA. Solo Matías, después de aplicar la migración
-- en una copia de pruebas. No escribe planes reales: fixtures TEMP + ROLLBACK.
-- Ejecutar también verificacion-t-5-1.sql para ACL/FKs/contexto y JWT reales.
-- Requiere rol administrativo que pueda crear TEMP y hacer SET ROLE.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '120s';
-- Mantener public fuera del path para que pg_get_expr califique el helper real
-- y podamos sustituirlo explícitamente por el simulador TEMP.
set local search_path = pg_catalog;

do $$
begin
  if to_regprocedure('public.t57_validar_estado_plan()') is null then
    raise exception 'Aplicar y revisar primero la migración T-5.7';
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.planes_tratamiento'::regclass
      and tgname = 't57_validar_estado_plan' and not tgisinternal and tgenabled = 'O'
      and tgtype = 23 and tgattr = ''::int2vector and tgqual is null
      and tgfoid = 'public.t57_validar_estado_plan()'::regprocedure)
      or not exists (select 1 from pg_proc where oid = 'public.t57_validar_estado_plan()'::regprocedure
        and not prosecdef and proconfig = array['search_path=pg_catalog']) then
    raise exception 'Trigger/función T-5.7 incompatible o deshabilitado';
  end if;
  if not exists (select 1 from pg_class where oid = 'public.planes_tratamiento'::regclass and relrowsecurity)
      or (select count(*) from pg_policy where polrelid = 'public.planes_tratamiento'::regclass) <> 3 then
    raise exception 'RLS/policies de planes incompatibles';
  end if;
end;
$$;

-- LIKE no copia FKs ni triggers: se prueba la función instalada, no una réplica.
create temporary table planes_tratamiento (like public.planes_tratamiento including defaults including constraints);
create trigger t57_validar_estado_plan before insert or update on pg_temp.planes_tratamiento
  for each row execute function public.t57_validar_estado_plan();
create trigger trigger_planes_tratamiento_actualizar before update on pg_temp.planes_tratamiento
  for each row execute function public.actualizar_fecha_modificacion();

-- Todas las 25 parejas: 5 válidas, 15 inválidas, 5 sin cambio de estado.
-- Los estados iniciales de fixtures se cargan como admin con el trigger apagado
-- SOLO en la tabla temporal (simulan registros históricos, no nuevos planes).
alter table pg_temp.planes_tratamiento disable trigger t57_validar_estado_plan;
insert into pg_temp.planes_tratamiento(id, clinica_id, paciente_id, odontologo_id, titulo, notas, estado, actualizado_en)
select ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000102',
  '00000000-0000-4000-8000-000000000103', 'Título conservado', 'Notas conservadas', e, '2000-01-01'
from unnest(array['propuesto','aceptado','en_proceso','completado','cancelado']) with ordinality x(e,n);
alter table pg_temp.planes_tratamiento enable trigger t57_validar_estado_plan;

do $$
declare origen text; destino text; fila record; n integer; valido boolean;
begin
  foreach origen in array array['propuesto','aceptado','en_proceso','completado','cancelado'] loop
    foreach destino in array array['propuesto','aceptado','en_proceso','completado','cancelado'] loop
      valido := origen = destino or (origen = 'propuesto' and destino in ('aceptado','cancelado'))
        or (origen = 'aceptado' and destino = 'en_proceso')
        or (origen = 'en_proceso' and destino in ('completado','cancelado'));
      -- Subtransacción revertida para que cada pareja pruebe el mismo OLD real.
      begin
        update pg_temp.planes_tratamiento set estado = destino where estado = origen returning * into fila;
        get diagnostics n = row_count;
        if not valido then raise exception 'Se permitió % -> %', origen, destino; end if;
        if n <> 1 or fila.estado <> destino or fila.titulo <> 'Título conservado'
            or fila.notas <> 'Notas conservadas' or fila.costo_total <> 0
            or fila.actualizado_en is distinct from now() then
          raise exception 'Fila/contenido/timestamp no confirmado para % -> %', origen, destino;
        end if;
        raise exception 'Revertir pareja válida' using errcode = 'Z5701';
      exception
        when sqlstate 'Z5701' then null;
        when check_violation then
          if valido then raise exception 'Se rechazó % -> %', origen, destino; end if;
      end;
    end loop;
  end loop;
  begin
    update pg_temp.planes_tratamiento set estado = null where estado = 'propuesto';
    raise exception 'Se permitió estado NULL';
  exception when check_violation or not_null_violation then null; end;
  begin
    update pg_temp.planes_tratamiento set estado = 'inventado' where estado = 'propuesto';
    raise exception 'Se permitió estado desconocido';
  exception when check_violation then null; end;
  foreach destino in array array['aceptado','en_proceso','completado','cancelado'] loop
    begin
      insert into pg_temp.planes_tratamiento(clinica_id,paciente_id,odontologo_id,estado)
        values ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000102',
          '00000000-0000-4000-8000-000000000103',destino);
      raise exception 'INSERT saltó propuesto: %', destino;
    exception when check_violation then null; end;
  end loop;
end;
$$;

-- Simular perfiles sin consultar Auth ni crear usuarios/pacientes reales.
create function pg_temp.t57_perfil_actual() returns table(perfil_id uuid, clinica_id uuid, rol text)
language sql stable as $$
  select current_setting('t57.perfil')::uuid, current_setting('t57.clinica')::uuid, current_setting('t57.rol')
$$;
revoke all on function pg_temp.t57_perfil_actual() from public;
grant execute on function pg_temp.t57_perfil_actual() to authenticated;
grant select, insert, update on pg_temp.planes_tratamiento to authenticated;
do $$
declare p record; expresion text; comprobacion text; comando text;
begin
  for p in select * from pg_policy where polrelid = 'public.planes_tratamiento'::regclass loop
    if not p.polpermissive or p.polroles <> array[(select oid from pg_roles where rolname = 'authenticated')]
        or p.polname not in ('planes_select','planes_insert','planes_update') then
      raise exception 'Policy no prevista: %', p.polname;
    end if;
    expresion := replace(pg_get_expr(p.polqual,p.polrelid), 'public.current_perfil()', 'pg_temp.t57_perfil_actual()');
    comprobacion := replace(pg_get_expr(p.polwithcheck,p.polrelid), 'public.current_perfil()', 'pg_temp.t57_perfil_actual()');
    if coalesce(expresion,'') like '%public.%' or coalesce(comprobacion,'') like '%public.%' then
      raise exception 'Policy inesperada: no acceder a tablas reales desde fixtures';
    end if;
    comando := case p.polcmd when 'r' then 'select' when 'a' then 'insert' when 'w' then 'update' end;
    if comando is null then raise exception 'Comando de policy inesperado'; end if;
    execute format('create policy %I on pg_temp.planes_tratamiento for %s to authenticated %s %s', p.polname, comando,
      case when expresion is null then '' else 'using (' || expresion || ')' end,
      case when comprobacion is null then '' else 'with check (' || comprobacion || ')' end);
  end loop;
end;
$$;
alter table pg_temp.planes_tratamiento enable row level security;

set local role authenticated;
do $$
declare rol_prueba text; n integer; fila record;
begin
  perform set_config('t57.clinica','00000000-0000-4000-8000-000000000101',true);
  perform set_config('t57.perfil','00000000-0000-4000-8000-000000000104',true);
  foreach rol_prueba in array array['odontologo','recepcionista','superadmin'] loop
    perform set_config('t57.rol',rol_prueba,true);
    select count(*) into n from pg_temp.planes_tratamiento;
    if n <> 5 then raise exception 'Lectura denegada a %', rol_prueba; end if;
    update pg_temp.planes_tratamiento set estado = 'aceptado' where estado = 'propuesto';
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'Escritura ajena permitida a %', rol_prueba; end if;
  end loop;
  perform set_config('t57.rol','odontologo',true);
  perform set_config('t57.perfil','00000000-0000-4000-8000-000000000103',true);
  perform set_config('t57.clinica','00000000-0000-4000-8000-000000000105',true);
  select count(*) into n from pg_temp.planes_tratamiento;
  if n <> 0 then raise exception 'Lectura cruzada entre clínicas'; end if;
  update pg_temp.planes_tratamiento set estado = 'aceptado' where estado = 'propuesto';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Escritura cruzada entre clínicas'; end if;
  perform set_config('t57.clinica','00000000-0000-4000-8000-000000000101',true);
  -- Primera pestaña: CAS + RETURNING con todos los filtros obligatorios.
  update pg_temp.planes_tratamiento set estado = 'aceptado'
    where id = '00000000-0000-4000-8000-000000000001'
      and paciente_id = '00000000-0000-4000-8000-000000000102'
      and clinica_id = '00000000-0000-4000-8000-000000000101'
      and odontologo_id = '00000000-0000-4000-8000-000000000103'
      and estado = 'propuesto' returning * into fila;
  get diagnostics n = row_count;
  if n <> 1 or fila.estado <> 'aceptado' or fila.actualizado_en is distinct from now() then
    raise exception 'Autor no pudo confirmar una fila aceptada';
  end if;
  -- Segunda pestaña con lectura obsoleta: ninguna fila; no se reintenta con otro OLD.
  update pg_temp.planes_tratamiento set estado = 'cancelado'
    where id = '00000000-0000-4000-8000-000000000001'
      and paciente_id = '00000000-0000-4000-8000-000000000102'
      and clinica_id = '00000000-0000-4000-8000-000000000101'
      and odontologo_id = '00000000-0000-4000-8000-000000000103' and estado = 'propuesto';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Se permitió CAS con estado anterior cambiado'; end if;
  -- Request manipulado que omite CAS: el trigger rechaza aceptado -> cancelado.
  begin
    update pg_temp.planes_tratamiento set estado = 'cancelado'
      where id = '00000000-0000-4000-8000-000000000001';
    raise exception 'Cliente directo eludió el trigger';
  exception when check_violation then null; end;
  if not exists (select 1 from pg_temp.planes_tratamiento
      where id = '00000000-0000-4000-8000-000000000001' and estado = 'aceptado') then
    raise exception 'No se conservó el estado confirmado después de los fallos';
  end if;
end;
$$;
reset role;
do $$ begin raise notice 'Verificación T-5.7 terminada; descartar fixtures con ROLLBACK'; end; $$;
rollback;

-- MANUAL REAL, únicamente en entorno de pruebas autorizado:
-- 1. JWT de autor, colega C1, recepción, superadmin y autor C2: SELECT/UPDATE.
-- 2. Requests directos: las cinco transiciones válidas y todas las inválidas.
-- 3. Dos sesiones READ COMMITTED, mismo plan propuesto y mismos filtros CAS:
--    A: BEGIN; UPDATE ... aceptado WHERE ... estado='propuesto' RETURNING *;
--    B: BEGIN; UPDATE ... cancelado WHERE ... estado='propuesto' RETURNING *;
--    B espera. COMMIT A: B debe devolver 0 filas. ROLLBACK B.
--    Repetir con ROLLBACK A: B puede confirmar cancelado, luego ROLLBACK B.
--    Usar exclusivamente un plan de prueba (COMMIT A persiste su cambio).
-- 4. La simulación secuencial anterior NO demuestra bloqueo simultáneo real.
-- 5. Revisión de triggers adicionales, ACL/herencias y helper Auth según T-5.1.
-- 6. UI/servicio están bloqueados hasta aplicación/validación: no declararlos listos.

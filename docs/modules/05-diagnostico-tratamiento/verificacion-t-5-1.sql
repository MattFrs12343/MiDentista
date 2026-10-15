-- Ejecutar MANUALMENTE por Matías DESPUÉS de migracion-t-5-1.sql, en pruebas.
-- Requiere rol administrativo capaz de SET ROLE authenticated/anon y crear TEMP.
-- Solo lee catálogos/datos reales; todas las escrituras son fixtures TEMPORALES.
-- Copia CHECK/FK/policies instalados: no es una segunda implementación de RLS.
-- El helper de sesión TEMP simula roles/perfil activo; el JWT y los helpers
-- reales necesitan además la validación de integración descrita al final.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '120s';
set local search_path = pg_catalog, pg_temp;

do $$
declare t text; r record; c record; origen smallint[]; destino smallint[]; n integer;
begin
  foreach t in array array['diagnosticos', 'planes_tratamiento', 'procedimientos_tratamiento'] loop
    if not exists (select 1 from pg_class where oid = to_regclass('public.' || t) and relrowsecurity) then
      raise exception 'Falta RLS en %', t;
    end if;
    if not exists (select 1 from pg_constraint k join pg_attribute a
        on a.attrelid = k.conrelid and a.attname = 'id' and a.atttypid = 'uuid'::regtype
        where k.conrelid = to_regclass('public.' || t) and k.contype = 'p'
          and k.conkey = array[a.attnum]::smallint[] and a.attnotnull) then
      raise exception 'PK UUID incompatible en %', t;
    end if;
    if not exists (select 1 from pg_trigger where tgrelid = to_regclass('public.' || t)
        and tgname = 't51_contexto_inmutable' and tgenabled = 'O' and tgtype = 19 and not tgisinternal
        and tgfoid = 'public.t51_contexto_inmutable()'::regprocedure) then
      raise exception 'Falta trigger de contexto en %', t;
    end if;
  end loop;
  if (select prosecdef from pg_proc where oid = 'public.t51_contexto_inmutable()'::regprocedure) then
    raise exception 'El trigger de contexto no debe ser SECURITY DEFINER';
  end if;
  for r in select * from (values
    ('diagnosticos', 'trigger_diagnosticos_actualizar'),
    ('planes_tratamiento', 'trigger_planes_tratamiento_actualizar'),
    ('procedimientos_tratamiento', 'trigger_procedimientos_actualizar')
  ) x(tabla, nombre) loop
    select count(*) into n from pg_trigger where tgrelid = to_regclass('public.' || r.tabla)
      and tgfoid = 'public.actualizar_fecha_modificacion()'::regprocedure and not tgisinternal;
    if n <> 1 or not exists (select 1 from pg_trigger where tgrelid = to_regclass('public.' || r.tabla)
        and tgname = r.nombre and tgenabled = 'O' and tgtype = 19) then
      raise exception 'Trigger actualizado_en duplicado/ausente/incompatible: %', r.tabla;
    end if;
  end loop;
  for r in select * from (values
    ('diagnosticos', 'estado'), ('planes_tratamiento', 'estado'), ('planes_tratamiento', 'costo_total'),
    ('procedimientos_tratamiento', 'estado'), ('procedimientos_tratamiento', 'prioridad'),
    ('procedimientos_tratamiento', 'costo')
  ) x(tabla, columna) loop
    if not exists (select 1 from pg_attribute where attrelid = to_regclass('public.' || r.tabla)
        and attname = r.columna and attnotnull and not attisdropped) then
      raise exception 'Falta NOT NULL %.%', r.tabla, r.columna;
    end if;
  end loop;
  if exists (select 1 from pg_attribute where attrelid = 'public.planes_tratamiento'::regclass
      and attname = 'titulo' and attnotnull) then raise exception 'T-5.1 mantiene título nullable'; end if;
  for r in select * from (values
    ('diagnosticos', 't51_diagnosticos_descripcion_check'), ('diagnosticos', 't51_diagnosticos_pieza_check'),
    ('diagnosticos', 'diagnosticos_estado_check'), ('planes_tratamiento', 'planes_tratamiento_estado_check'),
    ('planes_tratamiento', 't51_planes_costo_check'), ('planes_tratamiento', 't51_planes_titulo_check'),
    ('procedimientos_tratamiento', 't51_procedimientos_descripcion_check'),
    ('procedimientos_tratamiento', 't51_procedimientos_costo_check'),
    ('procedimientos_tratamiento', 't51_procedimientos_pieza_check'),
    ('procedimientos_tratamiento', 'procedimientos_tratamiento_estado_check'),
    ('procedimientos_tratamiento', 'procedimientos_tratamiento_prioridad_check')
  ) x(tabla, nombre) loop
    if not exists (select 1 from pg_constraint where conrelid = to_regclass('public.' || r.tabla)
        and conname = r.nombre and contype = 'c' and convalidated) then
      raise exception 'Falta CHECK validado %.%', r.tabla, r.nombre;
    end if;
  end loop;
  for r in select * from (values
    ('diagnosticos', 't51_diagnosticos_paciente_fk', 'paciente_id', 'pacientes', 'c'),
    ('diagnosticos', 't51_diagnosticos_odontologo_fk', 'odontologo_id', 'perfiles', 'r'),
    ('planes_tratamiento', 't51_planes_paciente_fk', 'paciente_id', 'pacientes', 'c'),
    ('planes_tratamiento', 't51_planes_odontologo_fk', 'odontologo_id', 'perfiles', 'r'),
    ('procedimientos_tratamiento', 't51_procedimientos_plan_fk', 'plan_tratamiento_id', 'planes_tratamiento', 'c'),
    ('procedimientos_tratamiento', 't51_procedimientos_servicio_fk', 'servicio_id', 'servicios', 'r')
  ) x(tabla, nombre, columna, padre, borrado) loop
    select * into c from pg_constraint where conrelid = to_regclass('public.' || r.tabla) and conname = r.nombre;
    select array[(select attnum from pg_attribute where attrelid = to_regclass('public.' || r.tabla) and attname = r.columna),
      (select attnum from pg_attribute where attrelid = to_regclass('public.' || r.tabla) and attname = 'clinica_id')]::smallint[] into origen;
    select array[(select attnum from pg_attribute where attrelid = to_regclass('public.' || r.padre) and attname = 'id'),
      (select attnum from pg_attribute where attrelid = to_regclass('public.' || r.padre) and attname = 'clinica_id')]::smallint[] into destino;
    if c.oid is null or c.contype <> 'f' or not c.convalidated or c.condeferrable
        or c.confrelid <> to_regclass('public.' || r.padre) or c.confupdtype <> 'r'
        or c.confdeltype::text <> r.borrado or c.confmatchtype <> 's'
        or c.conkey is distinct from origen or c.confkey is distinct from destino then
      raise exception 'FK compuesta incompatible: %', r.nombre;
    end if;
  end loop;
  for r in select * from (values
    ('diagnosticos', 'idx_diagnosticos_paciente', 'paciente_id'),
    ('planes_tratamiento', 'idx_planes_paciente', 'paciente_id'),
    ('planes_tratamiento', 'idx_planes_estado', 'estado'),
    ('procedimientos_tratamiento', 'idx_procedimientos_plan', 'plan_tratamiento_id')
  ) x(tabla, nombre, columna) loop
    if not exists (select 1 from pg_index i join pg_class ci on ci.oid = i.indexrelid
        join pg_am am on am.oid = ci.relam where i.indexrelid = to_regclass('public.' || r.nombre)
          and i.indrelid = to_regclass('public.' || r.tabla) and i.indisvalid and i.indisready
          and i.indnkeyatts = 1 and i.indnatts = 1 and i.indpred is null and i.indexprs is null
          and am.amname = 'btree' and i.indkey[0] = (select attnum from pg_attribute
            where attrelid = i.indrelid and attname = r.columna and not attisdropped)) then
      raise exception 'Índice incompatible: %', r.nombre;
    end if;
  end loop;
  for r in select * from (values
    ('diagnosticos', 'diagnosticos_select', 'r'), ('diagnosticos', 'diagnosticos_insert', 'a'),
    ('diagnosticos', 'diagnosticos_update', 'w'), ('planes_tratamiento', 'planes_select', 'r'),
    ('planes_tratamiento', 'planes_insert', 'a'), ('planes_tratamiento', 'planes_update', 'w'),
    ('procedimientos_tratamiento', 'procedimientos_select', 'r'),
    ('procedimientos_tratamiento', 'procedimientos_insert', 'a'),
    ('procedimientos_tratamiento', 'procedimientos_update', 'w'),
    ('procedimientos_tratamiento', 'procedimientos_delete', 'd')
  ) x(tabla, nombre, comando) loop
    if not exists (select 1 from pg_policy where polrelid = to_regclass('public.' || r.tabla)
        and polname = r.nombre and polcmd::text = r.comando and polpermissive
        and polroles = array[(select oid from pg_roles where rolname = 'authenticated')]
        and (r.comando not in ('r', 'w', 'd') or polqual is not null)
        and (r.comando not in ('a', 'w') or polwithcheck is not null)) then
      raise exception 'Policy ausente/incompatible: %', r.nombre;
    end if;
  end loop;
  select count(*) into n from pg_policy where polrelid in ('public.diagnosticos'::regclass,
    'public.planes_tratamiento'::regclass, 'public.procedimientos_tratamiento'::regclass);
  if n <> 10 then raise exception 'Policies adicionales/ausentes: se esperaban 10, hay %', n; end if;
  foreach t in array array['diagnosticos', 'planes_tratamiento', 'procedimientos_tratamiento'] loop
    if not has_table_privilege('authenticated', 'public.' || t, 'SELECT')
        or not has_table_privilege('authenticated', 'public.' || t, 'INSERT')
        or not has_table_privilege('authenticated', 'public.' || t, 'UPDATE')
        or has_table_privilege('authenticated', 'public.' || t, 'TRUNCATE')
        or has_table_privilege('anon', 'public.' || t, 'SELECT')
        or has_table_privilege('anon', 'public.' || t, 'INSERT')
        or has_table_privilege('anon', 'public.' || t, 'UPDATE')
        or has_table_privilege('anon', 'public.' || t, 'DELETE')
        or has_table_privilege('anon', 'public.' || t, 'TRUNCATE') then
      raise exception 'ACL inesperada en %', t;
    end if;
    if has_table_privilege('authenticated', 'public.' || t, 'DELETE') <> (t = 'procedimientos_tratamiento') then
      raise exception 'ACL DELETE inesperada en %', t;
    end if;
  end loop;
  -- Las FKs validadas garantizan las relaciones existentes; estas lecturas
  -- adicionales comprueban que no queden valores NULL/no finitos/blancos.
  if exists (select 1 from public.diagnosticos where estado is null or descripcion !~ '[^[:space:]]')
      or exists (select 1 from public.planes_tratamiento where estado is null or costo_total is null
        or not (costo_total between 0 and 99999999.99))
      or exists (select 1 from public.procedimientos_tratamiento where estado is null or prioridad is null
        or costo is null or not (costo between 0 and 99999999.99)) then
    raise exception 'Datos existentes incompatibles';
  end if;
end;
$$;

-- Fixtures aisladas. LIKE copia CHECK/NOT NULL/defaults, pero NO FKs ni RLS.
create temporary table t51_pacientes (id uuid primary key, clinica_id uuid not null, unique(id, clinica_id));
create temporary table t51_perfiles (id uuid primary key, clinica_id uuid, rol text, activo boolean, unique(id, clinica_id));
create temporary table t51_servicios (id uuid primary key, clinica_id uuid not null, unique(id, clinica_id));
create temporary table diagnosticos (like public.diagnosticos including defaults including constraints);
create temporary table planes_tratamiento (like public.planes_tratamiento including defaults including constraints);
alter table pg_temp.planes_tratamiento add unique(id, clinica_id);
create temporary table procedimientos_tratamiento (like public.procedimientos_tratamiento including defaults including constraints);

do $$
declare c record; definicion text;
begin
  for c in select conname, conrelid::regclass as tabla, pg_get_constraintdef(oid) as ddl from pg_constraint
    where conname in ('t51_diagnosticos_paciente_fk', 't51_diagnosticos_odontologo_fk',
      't51_planes_paciente_fk', 't51_planes_odontologo_fk', 't51_procedimientos_plan_fk', 't51_procedimientos_servicio_fk')
      and conrelid in ('public.diagnosticos'::regclass, 'public.planes_tratamiento'::regclass,
        'public.procedimientos_tratamiento'::regclass) loop
    definicion := replace(c.ddl, 'public.pacientes', 'pg_temp.t51_pacientes');
    definicion := replace(definicion, 'public.perfiles', 'pg_temp.t51_perfiles');
    definicion := replace(definicion, 'public.servicios', 'pg_temp.t51_servicios');
    definicion := replace(definicion, 'public.planes_tratamiento', 'pg_temp.planes_tratamiento');
    execute format('alter table pg_temp.%I add constraint %I %s',
      (select relname from pg_class where oid = c.tabla), c.conname, definicion);
  end loop;
end;
$$;

insert into pg_temp.t51_pacientes values
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000002');
insert into pg_temp.t51_perfiles values
  ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000001', 'odontologo', true),
  ('00000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000001', 'odontologo', true),
  ('00000000-0000-4000-8000-000000000023', '00000000-0000-4000-8000-000000000002', 'odontologo', true),
  ('00000000-0000-4000-8000-000000000024', '00000000-0000-4000-8000-000000000001', 'recepcionista', true),
  ('00000000-0000-4000-8000-000000000025', '00000000-0000-4000-8000-000000000001', 'paciente', true),
  ('00000000-0000-4000-8000-000000000026', '00000000-0000-4000-8000-000000000001', 'odontologo', false),
  ('00000000-0000-4000-8000-000000000027', null, 'superadmin', true);
insert into pg_temp.t51_servicios values
  ('00000000-0000-4000-8000-000000000031', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000032', '00000000-0000-4000-8000-000000000002');
insert into pg_temp.diagnosticos(id, clinica_id, paciente_id, odontologo_id, descripcion, actualizado_en) values
  ('00000000-0000-4000-8000-000000000041', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000021', 'Fixture propia', '2000-01-01'),
  ('00000000-0000-4000-8000-000000000042', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000022', 'Fixture otro autor', '2000-01-01'),
  ('00000000-0000-4000-8000-000000000043', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000023', 'Fixture otra clínica', '2000-01-01');
insert into pg_temp.planes_tratamiento(id, clinica_id, paciente_id, odontologo_id, titulo, actualizado_en) values
  ('00000000-0000-4000-8000-000000000051', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000021', null, '2000-01-01'),
  ('00000000-0000-4000-8000-000000000052', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000022', 'Otro autor', '2000-01-01'),
  ('00000000-0000-4000-8000-000000000053', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000023', 'Otra clínica', '2000-01-01');
insert into pg_temp.procedimientos_tratamiento(id, clinica_id, plan_tratamiento_id, descripcion, actualizado_en) values
  ('00000000-0000-4000-8000-000000000061', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000051', 'Propio', '2000-01-01'),
  ('00000000-0000-4000-8000-000000000062', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000052', 'Otro autor', '2000-01-01'),
  ('00000000-0000-4000-8000-000000000063', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000053', 'Otra clínica', '2000-01-01');

-- Integridad sin RLS: fallos deben proceder de la FK/CHECK, no del filtro.
do $$
declare t text; campo text; valor text; prueba record;
begin
  for prueba in select * from (values
    ('diagnosticos', 'paciente_id', '00000000-0000-4000-8000-000000000012'),
    ('diagnosticos', 'odontologo_id', '00000000-0000-4000-8000-000000000023'),
    ('planes_tratamiento', 'paciente_id', '00000000-0000-4000-8000-000000000012'),
    ('planes_tratamiento', 'odontologo_id', '00000000-0000-4000-8000-000000000023'),
    ('procedimientos_tratamiento', 'plan_tratamiento_id', '00000000-0000-4000-8000-000000000053'),
    ('procedimientos_tratamiento', 'servicio_id', '00000000-0000-4000-8000-000000000032')
  ) x(tabla, columna, otro) loop
    begin
      execute format('update pg_temp.%I set %I = %L::uuid where clinica_id = %L::uuid',
        prueba.tabla, prueba.columna, prueba.otro, '00000000-0000-4000-8000-000000000001');
      raise exception 'FK permitió relación de otra clínica %.%', prueba.tabla, prueba.columna;
    exception when foreign_key_violation then null; end;
    begin
      execute format('update pg_temp.%I set %I = %L::uuid', prueba.tabla, prueba.columna,
        '00000000-0000-4000-8000-000000000099');
      raise exception 'FK permitió referencia inexistente %.%', prueba.tabla, prueba.columna;
    exception when foreign_key_violation then null; end;
  end loop;
  foreach t in array array['diagnosticos', 'procedimientos_tratamiento'] loop
    foreach valor in array array['0', '19', '29', '49', '56', '86', '-1'] loop
      begin
        execute format('update pg_temp.%I set numero_pieza = %s', t, valor);
        raise exception 'Pieza inválida aceptada % en %', valor, t;
      exception when check_violation then null; end;
    end loop;
    foreach valor in array array['11', '18', '21', '28', '31', '38', '41', '48', '51', '55', '61', '65', '71', '75', '81', '85'] loop
      execute format('update pg_temp.%I set numero_pieza = %s', t, valor);
    end loop;
    execute format('update pg_temp.%I set numero_pieza = null', t);
    begin
      execute format('update pg_temp.%I set descripcion = E'' \t\n''', t);
      raise exception 'Descripción blanca aceptada en %', t;
    exception when check_violation then null; end;
  end loop;
  foreach t in array array['planes_tratamiento', 'procedimientos_tratamiento'] loop
    campo := case when t = 'planes_tratamiento' then 'costo_total' else 'costo' end;
    foreach valor in array array['-0.01', 'NaN'] loop
      begin
        execute format('update pg_temp.%I set %I = %L::numeric', t, campo, valor);
        raise exception 'Costo inválido aceptado en %', t;
      exception when check_violation then null; end;
    end loop;
    begin
      execute format('update pg_temp.%I set %I = null', t, campo);
      raise exception 'Costo NULL aceptado en %', t;
    exception when not_null_violation then null; end;
    execute format('update pg_temp.%I set %I = 12.50', t, campo);
  end loop;
  foreach t in array array['diagnosticos', 'planes_tratamiento', 'procedimientos_tratamiento'] loop
    begin
      execute format('update pg_temp.%I set estado = null', t);
      raise exception 'Estado NULL aceptado en %', t;
    exception when not_null_violation then null; end;
    begin
      execute format('update pg_temp.%I set estado = ''inventado''', t);
      raise exception 'Estado desconocido aceptado en %', t;
    exception when check_violation then null; end;
  end loop;
  begin
    update pg_temp.procedimientos_tratamiento set prioridad = null;
    raise exception 'Prioridad NULL aceptada';
  exception when not_null_violation then null; end;
  begin
    update pg_temp.procedimientos_tratamiento set prioridad = 'media';
    raise exception 'Prioridad desconocida aceptada';
  exception when check_violation then null; end;
  begin
    update pg_temp.planes_tratamiento set titulo = '   ';
    raise exception 'Título blanco aceptado';
  exception when check_violation then null; end;
  update pg_temp.procedimientos_tratamiento set servicio_id = '00000000-0000-4000-8000-000000000031'
    where clinica_id = '00000000-0000-4000-8000-000000000001';
  -- También protege cambios en destinos y borrado de profesional/servicio.
  foreach t in array array['t51_pacientes', 't51_perfiles', 't51_servicios', 'planes_tratamiento'] loop
    begin
      execute format('update pg_temp.%I set clinica_id = %L::uuid where clinica_id = %L::uuid', t,
        '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001');
      raise exception 'FK permitió trasladar destino de clínica: %', t;
    exception when foreign_key_violation then null; end;
  end loop;
  begin
    delete from pg_temp.t51_perfiles where id = '00000000-0000-4000-8000-000000000021';
    raise exception 'FK permitió borrar profesional referenciado';
  exception when foreign_key_violation then null; end;
  begin
    delete from pg_temp.t51_servicios where id = '00000000-0000-4000-8000-000000000031';
    raise exception 'FK permitió borrar servicio referenciado';
  exception when foreign_key_violation then null; end;
  -- Cascadas únicamente sobre un paciente/plan/procedimiento nuevos TEMP.
  insert into pg_temp.t51_pacientes values
    ('00000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000001');
  insert into pg_temp.diagnosticos(id, clinica_id, paciente_id, odontologo_id, descripcion)
    values('00000000-0000-4000-8000-000000000044', '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000021', 'Cascada TEMP');
  insert into pg_temp.planes_tratamiento(id, clinica_id, paciente_id, odontologo_id)
    values('00000000-0000-4000-8000-000000000054', '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000021');
  insert into pg_temp.procedimientos_tratamiento(id, clinica_id, plan_tratamiento_id, descripcion)
    values('00000000-0000-4000-8000-000000000064', '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000054', 'Cascada TEMP');
  delete from pg_temp.t51_pacientes where id = '00000000-0000-4000-8000-000000000013';
  if exists (select 1 from pg_temp.diagnosticos where id = '00000000-0000-4000-8000-000000000044')
      or exists (select 1 from pg_temp.planes_tratamiento where id = '00000000-0000-4000-8000-000000000054')
      or exists (select 1 from pg_temp.procedimientos_tratamiento where id = '00000000-0000-4000-8000-000000000064') then
    raise exception 'Cascada paciente/plan incompatible';
  end if;
end;
$$;

-- Disparadores REALES sobre tablas TEMP con los mismos nombres de entidad.
do $$
declare t text;
begin
  foreach t in array array['diagnosticos', 'planes_tratamiento', 'procedimientos_tratamiento'] loop
    execute format('create trigger t51_contexto_inmutable before update on pg_temp.%I
      for each row execute function public.t51_contexto_inmutable()', t);
    execute format('create trigger t51_actualizado before update on pg_temp.%I
      for each row execute function public.actualizar_fecha_modificacion()', t);
  end loop;
end;
$$;
do $$
declare t text; campo text; n integer;
begin
  foreach t in array array['diagnosticos', 'planes_tratamiento', 'procedimientos_tratamiento'] loop
    foreach campo in array array['id', 'clinica_id'] loop
      begin
        execute format('update pg_temp.%I set %I = %L::uuid', t, campo, '00000000-0000-4000-8000-000000000099');
        raise exception 'Identidad mutable %.%', t, campo;
      exception when check_violation then null; end;
    end loop;
    campo := case when t = 'procedimientos_tratamiento' then 'plan_tratamiento_id' else 'odontologo_id' end;
    begin
      execute format('update pg_temp.%I set %I = %L::uuid', t, campo, '00000000-0000-4000-8000-000000000022');
      raise exception 'Contexto mutable %.%', t, campo;
    exception when check_violation then null; end;
    begin
      execute format('update pg_temp.%I set creado_en = ''1999-01-01''', t);
      raise exception 'Fecha de creación mutable en %', t;
    exception when check_violation then null; end;
    if t <> 'procedimientos_tratamiento' then
      begin
        execute format('update pg_temp.%I set paciente_id = %L::uuid', t, '00000000-0000-4000-8000-000000000012');
        raise exception 'Paciente mutable en %', t;
      exception when check_violation then null; end;
    end if;
    execute format('update pg_temp.%I set actualizado_en = ''2000-01-01''', t);
    execute format('select count(*) from pg_temp.%I where actualizado_en is distinct from now()', t) into n;
    if n <> 0 then
      raise exception 'actualizado_en no se mantiene en %', t;
    end if;
  end loop;
end;
$$;

-- Simulación aislada de current_perfil (sin crear perfiles/auth.users reales).
create function pg_temp.t51_perfil_actual() returns table(perfil_id uuid, clinica_id uuid, rol text)
language sql stable security definer set search_path = pg_catalog as $$
  select id, clinica_id, rol from pg_temp.t51_perfiles
    where id::text = current_setting('t51.perfil', true) and activo = true
$$;
revoke all on function pg_temp.t51_perfil_actual() from public;
grant execute on function pg_temp.t51_perfil_actual() to authenticated;
grant select, insert, update, delete on pg_temp.diagnosticos, pg_temp.planes_tratamiento,
  pg_temp.procedimientos_tratamiento to authenticated, anon;
-- ACL TEMP deliberadamente amplia: así las pruebas demuestran RLS, no GRANT.
do $$
declare p record; tabla text; expresion text; comprobacion text; comando text;
begin
  for p in select polname, polcmd, polqual, polwithcheck, polrelid from pg_policy
    where polrelid in ('public.diagnosticos'::regclass, 'public.planes_tratamiento'::regclass,
      'public.procedimientos_tratamiento'::regclass) loop
    select relname into tabla from pg_class where oid = p.polrelid;
    expresion := pg_get_expr(p.polqual, p.polrelid);
    comprobacion := pg_get_expr(p.polwithcheck, p.polrelid);
    expresion := replace(replace(expresion, 'public.current_perfil()', 'pg_temp.t51_perfil_actual()'),
      'public.planes_tratamiento', 'pg_temp.planes_tratamiento');
    comprobacion := replace(replace(comprobacion, 'public.current_perfil()', 'pg_temp.t51_perfil_actual()'),
      'public.planes_tratamiento', 'pg_temp.planes_tratamiento');
    if coalesce(expresion, '') like '%public.%' or coalesce(comprobacion, '') like '%public.%' then
      raise exception 'Predicate inesperado: no consultar tablas reales en fixtures';
    end if;
    comando := case p.polcmd when 'r' then 'select' when 'a' then 'insert' when 'w' then 'update' when 'd' then 'delete' end;
    execute format('create policy %I on pg_temp.%I for %s to authenticated %s %s', p.polname, tabla, comando,
      case when expresion is null then '' else 'using (' || expresion || ')' end,
      case when comprobacion is null then '' else 'with check (' || comprobacion || ')' end);
  end loop;
  alter table pg_temp.diagnosticos enable row level security;
  alter table pg_temp.planes_tratamiento enable row level security;
  alter table pg_temp.procedimientos_tratamiento enable row level security;
end;
$$;

set local role authenticated;
do $$
declare n integer; perfil text; esperado integer; t text;
begin
  -- Misma clínica: dos autores visibles. Otra clínica: solo sus propias filas.
  -- Recepcionista lectura; paciente/inactivo/sin perfil nada; superadmin auditoría.
  foreach perfil in array array['21', '23', '24', '25', '26', '27', '99'] loop
    perform set_config('t51.perfil', '00000000-0000-4000-8000-0000000000' || perfil, true);
    esperado := case perfil when '21' then 2 when '23' then 1 when '24' then 2 when '27' then 3 else 0 end;
    foreach t in array array['diagnosticos', 'planes_tratamiento', 'procedimientos_tratamiento'] loop
      execute format('select count(*) from pg_temp.%I', t) into n;
      if n <> esperado then raise exception 'SELECT RLS incorrecto para perfil % en %: %', perfil, t, n; end if;
    end loop;
    if perfil <> '21' and perfil <> '23' then
      foreach t in array array['diagnosticos', 'planes_tratamiento', 'procedimientos_tratamiento'] loop
        execute format('update pg_temp.%I set actualizado_en = now()', t);
        get diagnostics n = row_count;
        if n <> 0 then raise exception 'Escritura permitida a perfil % en %', perfil, t; end if;
        execute format('delete from pg_temp.%I', t);
        get diagnostics n = row_count;
        if n <> 0 then raise exception 'DELETE permitido a perfil % en %', perfil, t; end if;
      end loop;
      begin
        insert into pg_temp.diagnosticos(clinica_id, paciente_id, odontologo_id, descripcion)
          values('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011',
            '00000000-0000-4000-8000-000000000021', 'No autorizado');
        raise exception 'INSERT diagnóstico permitido al perfil %', perfil;
      exception when insufficient_privilege then null; end;
      begin
        insert into pg_temp.planes_tratamiento(clinica_id, paciente_id, odontologo_id)
          values('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011',
            '00000000-0000-4000-8000-000000000021');
        raise exception 'INSERT plan permitido al perfil %', perfil;
      exception when insufficient_privilege then null; end;
      begin
        insert into pg_temp.procedimientos_tratamiento(clinica_id, plan_tratamiento_id, descripcion)
          values('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000051', 'No autorizado');
        raise exception 'INSERT procedimiento permitido al perfil %', perfil;
      exception when insufficient_privilege then null; end;
    end if;
  end loop;
  perform set_config('t51.perfil', '00000000-0000-4000-8000-000000000021', true);
  foreach t in array array['diagnosticos', 'planes_tratamiento', 'procedimientos_tratamiento'] loop
    execute format('update pg_temp.%I set actualizado_en = now()', t);
    get diagnostics n = row_count;
    if n <> 1 then raise exception 'UPDATE debe afectar solo una fila propia en %, afectó %', t, n; end if;
  end loop;
  begin
    insert into pg_temp.diagnosticos(clinica_id, paciente_id, odontologo_id, descripcion)
      values('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011',
        '00000000-0000-4000-8000-000000000022', 'Autor falsificado');
    raise exception 'INSERT permitió falsificar autor';
  exception when insufficient_privilege then null; end;
  begin
    insert into pg_temp.procedimientos_tratamiento(clinica_id, plan_tratamiento_id, descripcion)
      values('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000052', 'Otro autor');
    raise exception 'INSERT en plan ajeno permitido';
  exception when insufficient_privilege then null; end;
  begin
    insert into pg_temp.procedimientos_tratamiento(clinica_id, plan_tratamiento_id, descripcion)
      values('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000053', 'Otra clínica');
    raise exception 'INSERT en otra clínica permitido';
  exception when insufficient_privilege then null; end;
  insert into pg_temp.diagnosticos(clinica_id, paciente_id, odontologo_id, descripcion, numero_pieza)
    values('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011',
      '00000000-0000-4000-8000-000000000021', 'Alta válida', 54);
  insert into pg_temp.planes_tratamiento(clinica_id, paciente_id, odontologo_id, titulo)
    values('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011',
      '00000000-0000-4000-8000-000000000021', 'Alta válida');
  insert into pg_temp.procedimientos_tratamiento(clinica_id, plan_tratamiento_id, descripcion, costo)
    values('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000051', 'Alta válida', 12.50);
  delete from pg_temp.diagnosticos;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'DELETE diagnóstico permitido'; end if;
  delete from pg_temp.planes_tratamiento;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'DELETE plan permitido'; end if;
  delete from pg_temp.procedimientos_tratamiento;
  get diagnostics n = row_count;
  if n <> 2 then raise exception 'DELETE debe borrar solo dos procedimientos propios, borró %', n; end if;
end;
$$;
reset role;
set local role anon;
do $$
begin
  if exists (select 1 from pg_temp.diagnosticos) or exists (select 1 from pg_temp.planes_tratamiento)
      or exists (select 1 from pg_temp.procedimientos_tratamiento) then
    raise exception 'Anon puede leer fixtures clínicas';
  end if;
end;
$$;
reset role;
do $$ begin raise notice 'Verificación T-5.1 finalizada; fixtures se descartan con ROLLBACK'; end; $$;
rollback;

-- INTEGRACIÓN REAL pendiente (no demostrada por el helper TEMP ni por un admin):
-- 1. En entorno de pruebas usar JWT reales: odontólogos A/B de C1, odontólogo C2,
--    recepcionista, paciente afiliado, perfil inactivo, superadmin y anon.
-- 2. Confirmar current_perfil() refleja auth.uid()/activo y que authenticated
--    puede ejecutarlo. Revisar ACL/herencias/roles y definición del helper real.
-- 3. Confirmar SELECT/INSERT/UPDATE/DELETE según README con fixtures de pruebas.
--    Probar paciente/autor/plan/servicio ajenos y autoría manipulada vía REST.
-- 4. Verificar filas afectadas: UPDATE/DELETE ajeno puede devolver cero sin error.
-- 5. Confirmar timestamp actualizado y contexto inmutable con operaciones reales.
-- 6. Portal sigue usando paciente/mi-ficha, sin SELECT directo del módulo.
-- 7. Probar coexistencia con T-10.9 y FKs de Evolución/Agenda: un procedimiento
--    referenciado puede no poder borrarse, incluso por su autor.
-- Si un bloque falla: detener, hacer ROLLBACK y revisar; no omitir assertions.

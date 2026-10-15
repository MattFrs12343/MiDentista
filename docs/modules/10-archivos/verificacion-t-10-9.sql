-- Verificación MANUAL por Matías después de migracion-t-10-9.sql, en pruebas.
-- No ejecutada por el agente. Solo inspección + tablas temporales; ROLLBACK final.
-- No modifica registros clínicos ni objetos de Storage.
begin;
do $$
declare n text; c record;
begin
  foreach n in array array['archivos_evolucion_contexto_fk', 'archivos_plan_contexto_fk'] loop
    select * into c from pg_constraint where conrelid = 'public.archivos'::regclass and conname = n;
    if not found or c.contype <> 'f' or not c.convalidated or c.confdeltype <> 'r'
        or c.confupdtype <> 'r' or cardinality(c.conkey) <> 3 then
      raise exception 'FK compuesta/RESTRICT inválida: %', n;
    end if;
  end loop;
  if not exists (select 1 from pg_constraint where conrelid = 'public.archivos'::regclass
      and conname = 'archivos_asociacion_exclusiva_check' and convalidated) then
    raise exception 'Falta CHECK validado';
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'public.archivos'::regclass
      and polname = 'archivos_asociacion_insert_guard' and not polpermissive and polcmd = 'a') then
    raise exception 'Falta guard INSERT RESTRICTIVE';
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.archivos'::regclass
      and tgname = 'archivos_asociacion_inmutable' and tgenabled = 'O') then
    raise exception 'Falta trigger inmutable';
  end if;
  if exists (select 1 from pg_proc where oid = 'public.archivos_asociacion_autorizada(uuid,uuid,uuid,uuid,text)'::regprocedure
      and prosecdef) then raise exception 'La autorización no debe saltarse RLS'; end if;
  if to_regclass('public.idx_archivos_evolucion') is null or to_regclass('public.idx_archivos_plan') is null then
    raise exception 'Faltan índices de asociación';
  end if;
end;
$$;

-- Reproducir restricciones reales en fixtures TEMPORALES, sin datos personales.
create temporary table t109_evoluciones (id uuid, paciente_id uuid, clinica_id uuid, unique(id,paciente_id,clinica_id));
create temporary table t109_planes (like t109_evoluciones including indexes);
create temporary table t109_archivos (like public.archivos including defaults including constraints);
do $$
declare definicion text; n text;
begin
  foreach n in array array['archivos_evolucion_contexto_fk', 'archivos_plan_contexto_fk'] loop
    select pg_get_constraintdef(oid) into definicion from pg_constraint
      where conrelid = 'public.archivos'::regclass and conname = n;
    definicion := regexp_replace(definicion, '(public\.)?evoluciones_clinicas', 'pg_temp.t109_evoluciones', 'g');
    definicion := regexp_replace(definicion, '(public\.)?planes_tratamiento', 'pg_temp.t109_planes', 'g');
    execute 'alter table pg_temp.t109_archivos add constraint ' || quote_ident(n) || ' ' || definicion;
  end loop;
end;
$$;
do $$
declare paciente uuid := gen_random_uuid(); clinica uuid := gen_random_uuid(); autor uuid := gen_random_uuid();
  evo uuid := gen_random_uuid(); plan uuid := gen_random_uuid(); archivo uuid := gen_random_uuid();
  otro_paciente uuid := gen_random_uuid(); otra_clinica uuid := gen_random_uuid();
begin
  insert into t109_evoluciones values(evo,paciente,clinica);
  insert into t109_planes values(plan,paciente,clinica);
  insert into t109_archivos(id,clinica_id,paciente_id,nombre,ruta,mime,tamano,categoria,tipo_archivo,subido_por)
    values(archivo,clinica,paciente,'fixture.pdf',clinica::text || '/' || paciente::text || '/fixture.pdf',
      'application/pdf',1,'clinico','documento',autor);
  update t109_archivos set evolucion_clinica_id = evo where id = archivo;
  update t109_archivos set evolucion_clinica_id = null, plan_tratamiento_id = plan where id = archivo;
  begin
    update t109_archivos set evolucion_clinica_id = evo where id = archivo;
    raise exception 'Ambas referencias fueron aceptadas';
  exception when check_violation then null; end;
  begin
    update t109_archivos set plan_tratamiento_id = gen_random_uuid() where id = archivo;
    raise exception 'Referencia inexistente aceptada';
  exception when foreign_key_violation then null; end;
  insert into t109_planes values(otro_paciente,gen_random_uuid(),clinica);
  insert into t109_planes values(otra_clinica,paciente,gen_random_uuid());
  begin
    update t109_archivos set plan_tratamiento_id = otro_paciente where id = archivo;
    raise exception 'Plan de otro paciente aceptado';
  exception when foreign_key_violation then null; end;
  begin
    update t109_archivos set plan_tratamiento_id = otra_clinica where id = archivo;
    raise exception 'Plan de otra clínica aceptado';
  exception when foreign_key_violation then null; end;
  begin
    update t109_planes set paciente_id = gen_random_uuid() where id = plan;
    raise exception 'Cambio de paciente aceptado';
  exception when foreign_key_violation then null; end;
  begin
    update t109_planes set clinica_id = gen_random_uuid() where id = plan;
    raise exception 'Cambio de clínica aceptado';
  exception when foreign_key_violation then null; end;
  begin
    delete from t109_planes where id = plan;
    raise exception 'Borrado de plan asociado aceptado';
  exception when foreign_key_violation then null; end;
  update t109_archivos set plan_tratamiento_id = null, evolucion_clinica_id = evo where id = archivo;
  begin
    update t109_archivos set evolucion_clinica_id = gen_random_uuid() where id = archivo;
    raise exception 'Evolución inexistente aceptada';
  exception when foreign_key_violation then null; end;
  begin
    delete from t109_evoluciones where id = evo;
    raise exception 'Borrado de evolución asociada aceptado';
  exception when foreign_key_violation then null; end;
  raise notice 'CHECK y FKs verificadas con fixtures temporales';
end;
$$;
rollback;

-- RLS REAL (no demostrado por fixtures ni rol administrativo): validar con JWT
-- de odontólogo/recepcionista/superadmin/paciente/anónimo y registros de prueba.
-- 1) General válido según policies previas; paciente no puede asociar.
-- 2) Equipo: RPC true solo si SELECT del destino es visible y contexto coincide.
-- 3) Otro paciente/clínica/id inexistente/invisible: RPC false o denegación.
-- 4) INSERT manipulado (fuera de frontend) nunca salta FK/guard.
-- 5) UPDATE de referencias debe fallar por GRANT/trigger, incluso con permisos
--    administrativos que permitan UPDATE: NO probar sobre producción.
-- 6) Archivo visible + destino oculto: conservar archivo, resumen neutro.
-- Los ensayos de INSERT reales requieren objetos de prueba propios en Storage;
-- usar la subida normal del módulo y no eliminar datos clínicos para probar.

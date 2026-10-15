-- T-5.1: propuesta incremental autorizada; aplicación exclusivamente por Matías.
-- Revisar primero en una copia de pruebas. NO ejecutar el script general/seed.
-- Instalación única, transaccional: ante incompatibilidad, ROLLBACK de la sesión.
-- No corrige datos automáticamente, no implementa T-5.7 ni T-5.10.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '120s';
set local search_path = pg_catalog, public;

-- Preflight estructural antes de cualquier cambio persistente.
do $$
declare t text; r record;
begin
  foreach t in array array['clinicas', 'pacientes', 'perfiles', 'servicios',
      'diagnosticos', 'planes_tratamiento', 'procedimientos_tratamiento'] loop
    if to_regclass('public.' || t) is null then raise exception 'Falta public.%', t; end if;
  end loop;
  if to_regprocedure('public.current_perfil()') is null
      or to_regprocedure('public.actualizar_fecha_modificacion()') is null
      or to_regprocedure('auth.uid()') is null then
    raise exception 'Faltan helpers existentes de autenticación/timestamps';
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated')
      or not exists (select 1 from pg_roles where rolname = 'anon') then
    raise exception 'Se requiere el entorno de roles Supabase';
  end if;
  if not has_function_privilege('authenticated', 'public.current_perfil()', 'EXECUTE') then
    raise exception 'authenticated no puede ejecutar current_perfil(); revisar permisos de Módulo 01';
  end if;
  if exists (select 1 from pg_roles where rolname in ('authenticated', 'anon') and (rolsuper or rolbypassrls))
      or exists (select 1 from pg_class where oid in ('public.diagnosticos'::regclass,
        'public.planes_tratamiento'::regclass, 'public.procedimientos_tratamiento'::regclass)
        and (pg_has_role('authenticated', relowner, 'USAGE') or pg_has_role('anon', relowner, 'USAGE'))) then
    raise exception 'Roles cliente con bypass/propiedad de tablas: revisar antes de aplicar';
  end if;
  if to_regprocedure('public.t51_contexto_inmutable()') is not null then
    raise exception 'T-5.1 ya instalada o nombre ocupado: revisar, no sobrescribir';
  end if;
  if exists (select 1 from pg_constraint where conname like 't51\_%' escape '\'
      and connamespace = 'public'::regnamespace) then
    raise exception 'Hay constraints T-5.1: revisar aplicación previa';
  end if;
  for r in select * from (values
    ('diagnosticos', 'trigger_diagnosticos_actualizar', 'diagnosticos_estado_check'),
    ('planes_tratamiento', 'trigger_planes_tratamiento_actualizar', 'planes_tratamiento_estado_check'),
    ('procedimientos_tratamiento', 'trigger_procedimientos_actualizar', 'procedimientos_tratamiento_estado_check'),
    ('procedimientos_tratamiento', 'trigger_procedimientos_actualizar', 'procedimientos_tratamiento_prioridad_check')
  ) as x(tabla, disparador, restriccion) loop
    if not exists (select 1 from pg_trigger where tgrelid = to_regclass('public.' || r.tabla)
        and tgname = r.disparador and not tgisinternal and tgenabled = 'O' and tgtype = 19
        and tgfoid = 'public.actualizar_fecha_modificacion()'::regprocedure) then
      raise exception 'Trigger de actualizado_en ausente/incompatible: %', r.disparador;
    end if;
    if (select count(*) from pg_trigger where tgrelid = to_regclass('public.' || r.tabla)
        and tgfoid = 'public.actualizar_fecha_modificacion()'::regprocedure and not tgisinternal) <> 1 then
      raise exception 'Triggers de actualizado_en duplicados en %', r.tabla;
    end if;
    if not exists (select 1 from pg_constraint where conrelid = to_regclass('public.' || r.tabla)
        and conname = r.restriccion and contype = 'c' and convalidated) then
      raise exception 'CHECK base ausente/no validado: %', r.restriccion;
    end if;
  end loop;
  -- Las policies permisivas se combinan con OR. No dejar una desconocida abierta.
  for r in select polname, polrelid::regclass as tabla from pg_policy
      where polrelid in ('public.diagnosticos'::regclass, 'public.planes_tratamiento'::regclass,
        'public.procedimientos_tratamiento'::regclass) and not (
        (polrelid = 'public.diagnosticos'::regclass and polname in ('diagnosticos_select', 'diagnosticos_insert'))
        or (polrelid = 'public.planes_tratamiento'::regclass and polname in ('planes_select', 'planes_insert', 'planes_update'))
        or (polrelid = 'public.procedimientos_tratamiento'::regclass
          and polname in ('procedimientos_select', 'procedimientos_insert', 'procedimientos_delete'))
      ) loop
    raise exception 'Policy no prevista %.%: requiere revisión de Matías', r.tabla, r.polname;
  end loop;
end;
$$;

-- Congelar escrituras/contextos durante el preflight y la validación de FKs.
-- Si no se obtiene el bloqueo rápidamente, aborta; no esperar indefinidamente.
lock table public.clinicas, public.pacientes, public.perfiles, public.servicios
  in share row exclusive mode;
lock table public.diagnosticos, public.planes_tratamiento, public.procedimientos_tratamiento
  in access exclusive mode;

do $$
declare n bigint;
begin
  -- current_perfil usa LIMIT 1: una sesión no puede tener dos perfiles activos.
  select count(*) into n from (select auth_user_id from public.perfiles
    where activo = true and auth_user_id is not null group by auth_user_id having count(*) > 1) x;
  if n > 0 then raise exception '% sesiones con varios perfiles activos; resolver antes', n; end if;

  select count(*) into n from public.diagnosticos d
    left join public.pacientes p on p.id = d.paciente_id and p.clinica_id = d.clinica_id
    left join public.perfiles o on o.id = d.odontologo_id and o.clinica_id = d.clinica_id
    where p.id is null or o.id is null or d.estado is null
      or d.estado not in ('activo', 'inactivo', 'resuelto')
      or d.descripcion is null or d.descripcion !~ '[^[:space:]]'
      or (d.numero_pieza is not null and not (d.numero_pieza between 11 and 18
        or d.numero_pieza between 21 and 28 or d.numero_pieza between 31 and 38
        or d.numero_pieza between 41 and 48 or d.numero_pieza between 51 and 55
        or d.numero_pieza between 61 and 65 or d.numero_pieza between 71 and 75
        or d.numero_pieza between 81 and 85));
  if n > 0 then raise exception '% diagnósticos incompatibles; no se modificarán automáticamente', n; end if;

  select count(*) into n from public.planes_tratamiento pl
    left join public.pacientes p on p.id = pl.paciente_id and p.clinica_id = pl.clinica_id
    left join public.perfiles o on o.id = pl.odontologo_id and o.clinica_id = pl.clinica_id
    where p.id is null or o.id is null or pl.estado is null
      or pl.estado not in ('propuesto', 'aceptado', 'en_proceso', 'completado', 'cancelado')
      or pl.costo_total is null or not (pl.costo_total between 0 and 99999999.99)
      or (pl.titulo is not null and pl.titulo !~ '[^[:space:]]');
  if n > 0 then raise exception '% planes incompatibles; revisar costos/contexto/títulos blancos', n; end if;

  select count(*) into n from public.procedimientos_tratamiento pr
    left join public.planes_tratamiento pl on pl.id = pr.plan_tratamiento_id and pl.clinica_id = pr.clinica_id
    left join public.servicios s on s.id = pr.servicio_id and s.clinica_id = pr.clinica_id
    where pl.id is null or (pr.servicio_id is not null and s.id is null)
      or pr.descripcion is null or pr.descripcion !~ '[^[:space:]]'
      or pr.costo is null or not (pr.costo between 0 and 99999999.99)
      or pr.prioridad is null or pr.prioridad not in ('urgente', 'alta', 'normal', 'baja')
      or pr.estado is null or pr.estado not in ('pendiente', 'en_proceso', 'completado', 'cancelado')
      or (pr.numero_pieza is not null and not (pr.numero_pieza between 11 and 18
        or pr.numero_pieza between 21 and 28 or pr.numero_pieza between 31 and 38
        or pr.numero_pieza between 41 and 48 or pr.numero_pieza between 51 and 55
        or pr.numero_pieza between 61 and 65 or pr.numero_pieza between 71 and 75
        or pr.numero_pieza between 81 and 85));
  if n > 0 then raise exception '% procedimientos incompatibles; revisar antes de aplicar', n; end if;
end;
$$;

-- Una FK compuesta necesita una clave UNIQUE exacta en el destino.
-- Reutilizar claves compatibles; no sustituir las creadas por otros módulos.
do $$
declare t text; columnas smallint[];
begin
  foreach t in array array['pacientes', 'perfiles', 'planes_tratamiento', 'servicios'] loop
    select array[
      (select attnum from pg_attribute where attrelid = to_regclass('public.' || t) and attname = 'id' and not attisdropped),
      (select attnum from pg_attribute where attrelid = to_regclass('public.' || t) and attname = 'clinica_id' and not attisdropped)
    ]::smallint[] into columnas;
    if array_position(columnas, null) is not null then raise exception 'Columnas incompatibles en %', t; end if;
    if not exists (select 1 from pg_constraint where conrelid = to_regclass('public.' || t)
        and contype in ('u', 'p') and conkey = columnas and not condeferrable) then
      execute format('alter table public.%I add constraint %I unique (id, clinica_id)', t, 't51_' || t || '_contexto_key');
    end if;
  end loop;
end;
$$;

-- Conservar las FKs simples existentes y sus acciones; añadir aislamiento.
alter table public.diagnosticos
  alter column estado set not null,
  add constraint t51_diagnosticos_descripcion_check check (descripcion ~ '[^[:space:]]'),
  add constraint t51_diagnosticos_pieza_check check (numero_pieza is null
    or numero_pieza between 11 and 18 or numero_pieza between 21 and 28
    or numero_pieza between 31 and 38 or numero_pieza between 41 and 48
    or numero_pieza between 51 and 55 or numero_pieza between 61 and 65
    or numero_pieza between 71 and 75 or numero_pieza between 81 and 85),
  add constraint t51_diagnosticos_paciente_fk foreign key (paciente_id, clinica_id)
    references public.pacientes(id, clinica_id) on update restrict on delete cascade,
  add constraint t51_diagnosticos_odontologo_fk foreign key (odontologo_id, clinica_id)
    references public.perfiles(id, clinica_id) on update restrict on delete restrict;

alter table public.planes_tratamiento
  alter column estado set not null,
  alter column costo_total set not null,
  add constraint t51_planes_costo_check check (costo_total between 0 and 99999999.99),
  -- Los planes creados automáticamente por el frontend pueden tener NULL.
  -- Exigir título al crear un plan explícito corresponde a T-5.5.
  add constraint t51_planes_titulo_check check (titulo is null or titulo ~ '[^[:space:]]'),
  add constraint t51_planes_paciente_fk foreign key (paciente_id, clinica_id)
    references public.pacientes(id, clinica_id) on update restrict on delete cascade,
  add constraint t51_planes_odontologo_fk foreign key (odontologo_id, clinica_id)
    references public.perfiles(id, clinica_id) on update restrict on delete restrict;

alter table public.procedimientos_tratamiento
  alter column costo set not null,
  alter column prioridad set not null,
  alter column estado set not null,
  add constraint t51_procedimientos_descripcion_check check (descripcion ~ '[^[:space:]]'),
  add constraint t51_procedimientos_costo_check check (costo between 0 and 99999999.99),
  add constraint t51_procedimientos_pieza_check check (numero_pieza is null
    or numero_pieza between 11 and 18 or numero_pieza between 21 and 28
    or numero_pieza between 31 and 38 or numero_pieza between 41 and 48
    or numero_pieza between 51 and 55 or numero_pieza between 61 and 65
    or numero_pieza between 71 and 75 or numero_pieza between 81 and 85),
  add constraint t51_procedimientos_plan_fk foreign key (plan_tratamiento_id, clinica_id)
    references public.planes_tratamiento(id, clinica_id) on update restrict on delete cascade,
  -- MATCH SIMPLE permite servicio_id NULL; RESTRICT conserva la FK simple.
  add constraint t51_procedimientos_servicio_fk foreign key (servicio_id, clinica_id)
    references public.servicios(id, clinica_id) on update restrict on delete restrict;

-- Conservar los índices base, creándolos solo si faltan. Verificación posterior
-- comprueba definición/validez (IF NOT EXISTS no valida una colisión de nombre).
create index if not exists idx_diagnosticos_paciente on public.diagnosticos(paciente_id);
create index if not exists idx_planes_paciente on public.planes_tratamiento(paciente_id);
create index if not exists idx_planes_estado on public.planes_tratamiento(estado);
create index if not exists idx_procedimientos_plan on public.procedimientos_tratamiento(plan_tratamiento_id);
do $$
declare r record;
begin
  for r in select * from (values
    ('diagnosticos', 'idx_diagnosticos_paciente', 'paciente_id'),
    ('planes_tratamiento', 'idx_planes_paciente', 'paciente_id'),
    ('planes_tratamiento', 'idx_planes_estado', 'estado'),
    ('procedimientos_tratamiento', 'idx_procedimientos_plan', 'plan_tratamiento_id')
  ) x(tabla, indice, columna) loop
    if not exists (select 1 from pg_index i join pg_class c on c.oid = i.indexrelid
        join pg_am a on a.oid = c.relam
        where i.indexrelid = to_regclass('public.' || r.indice)
          and i.indrelid = to_regclass('public.' || r.tabla) and i.indisvalid and i.indisready
          and i.indnkeyatts = 1 and i.indnatts = 1 and i.indpred is null and i.indexprs is null
          and a.amname = 'btree' and i.indkey[0] = (select attnum from pg_attribute
            where attrelid = i.indrelid and attname = r.columna and not attisdropped)) then
      raise exception 'Índice base incompatible: %', r.indice;
    end if;
  end loop;
end;
$$;

-- Impedir reasignar una fila clínica o falsificar su autor después del alta.
-- No altera estados, importes ni actualizado_en. SECURITY INVOKER, sin consultas.
create function public.t51_contexto_inmutable() returns trigger
language plpgsql security invoker set search_path = pg_catalog as $$
begin
  if row(new.id, new.clinica_id, new.creado_en) is distinct from row(old.id, old.clinica_id, old.creado_en) then
    raise exception 'T-5.1: identidad, clínica y fecha de creación inmutables' using errcode = '23514';
  end if;
  if tg_table_name in ('diagnosticos', 'planes_tratamiento') then
    if row(new.paciente_id, new.odontologo_id) is distinct from row(old.paciente_id, old.odontologo_id) then
      raise exception 'T-5.1: paciente y autor inmutables' using errcode = '23514';
    end if;
  elsif new.plan_tratamiento_id is distinct from old.plan_tratamiento_id then
    raise exception 'T-5.1: el procedimiento no puede cambiar de plan' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.t51_contexto_inmutable() from public, anon, authenticated;
create trigger t51_contexto_inmutable before update on public.diagnosticos
  for each row execute function public.t51_contexto_inmutable();
create trigger t51_contexto_inmutable before update on public.planes_tratamiento
  for each row execute function public.t51_contexto_inmutable();
create trigger t51_contexto_inmutable before update on public.procedimientos_tratamiento
  for each row execute function public.t51_contexto_inmutable();

alter table public.diagnosticos enable row level security;
alter table public.planes_tratamiento enable row level security;
alter table public.procedimientos_tratamiento enable row level security;

-- Helpers existentes: current_perfil ya exige auth.uid() y perfil activo.
-- Lectura: equipo de la clínica; superadmin solo auditoría. Portal vía API.
-- Escritura mínima: odontólogo autor; no recepcionista/paciente/superadmin.
drop policy if exists diagnosticos_select on public.diagnosticos;
drop policy if exists diagnosticos_insert on public.diagnosticos;
create policy diagnosticos_select on public.diagnosticos for select to authenticated using (
  exists (select 1 from public.current_perfil() u where u.rol = 'superadmin'
    or (u.rol in ('odontologo', 'recepcionista') and u.clinica_id = diagnosticos.clinica_id))
);
create policy diagnosticos_insert on public.diagnosticos for insert to authenticated with check (
  exists (select 1 from public.current_perfil() u where u.rol = 'odontologo'
    and u.clinica_id = diagnosticos.clinica_id and u.perfil_id = diagnosticos.odontologo_id)
);
create policy diagnosticos_update on public.diagnosticos for update to authenticated using (
  exists (select 1 from public.current_perfil() u where u.rol = 'odontologo'
    and u.clinica_id = diagnosticos.clinica_id and u.perfil_id = diagnosticos.odontologo_id)
) with check (
  exists (select 1 from public.current_perfil() u where u.rol = 'odontologo'
    and u.clinica_id = diagnosticos.clinica_id and u.perfil_id = diagnosticos.odontologo_id)
);
-- Sin DELETE: US-5.1 a US-5.3 no exigen borrar diagnósticos.

drop policy if exists planes_select on public.planes_tratamiento;
drop policy if exists planes_insert on public.planes_tratamiento;
drop policy if exists planes_update on public.planes_tratamiento;
create policy planes_select on public.planes_tratamiento for select to authenticated using (
  exists (select 1 from public.current_perfil() u where u.rol = 'superadmin'
    or (u.rol in ('odontologo', 'recepcionista') and u.clinica_id = planes_tratamiento.clinica_id))
);
create policy planes_insert on public.planes_tratamiento for insert to authenticated with check (
  exists (select 1 from public.current_perfil() u where u.rol = 'odontologo'
    and u.clinica_id = planes_tratamiento.clinica_id and u.perfil_id = planes_tratamiento.odontologo_id)
);
create policy planes_update on public.planes_tratamiento for update to authenticated using (
  exists (select 1 from public.current_perfil() u where u.rol = 'odontologo'
    and u.clinica_id = planes_tratamiento.clinica_id and u.perfil_id = planes_tratamiento.odontologo_id)
) with check (
  exists (select 1 from public.current_perfil() u where u.rol = 'odontologo'
    and u.clinica_id = planes_tratamiento.clinica_id and u.perfil_id = planes_tratamiento.odontologo_id)
);

drop policy if exists procedimientos_select on public.procedimientos_tratamiento;
drop policy if exists procedimientos_insert on public.procedimientos_tratamiento;
drop policy if exists procedimientos_delete on public.procedimientos_tratamiento;
create policy procedimientos_select on public.procedimientos_tratamiento for select to authenticated using (
  exists (select 1 from public.planes_tratamiento pl
    where pl.id = procedimientos_tratamiento.plan_tratamiento_id
      and pl.clinica_id = procedimientos_tratamiento.clinica_id)
);
create policy procedimientos_insert on public.procedimientos_tratamiento for insert to authenticated with check (
  exists (select 1 from public.planes_tratamiento pl join public.current_perfil() u
    on u.perfil_id = pl.odontologo_id and u.clinica_id = pl.clinica_id
    where u.rol = 'odontologo' and pl.id = procedimientos_tratamiento.plan_tratamiento_id
      and pl.clinica_id = procedimientos_tratamiento.clinica_id)
);
create policy procedimientos_update on public.procedimientos_tratamiento for update to authenticated using (
  exists (select 1 from public.planes_tratamiento pl join public.current_perfil() u
    on u.perfil_id = pl.odontologo_id and u.clinica_id = pl.clinica_id
    where u.rol = 'odontologo' and pl.id = procedimientos_tratamiento.plan_tratamiento_id
      and pl.clinica_id = procedimientos_tratamiento.clinica_id)
) with check (
  exists (select 1 from public.planes_tratamiento pl join public.current_perfil() u
    on u.perfil_id = pl.odontologo_id and u.clinica_id = pl.clinica_id
    where u.rol = 'odontologo' and pl.id = procedimientos_tratamiento.plan_tratamiento_id
      and pl.clinica_id = procedimientos_tratamiento.clinica_id)
);
create policy procedimientos_delete on public.procedimientos_tratamiento for delete to authenticated using (
  exists (select 1 from public.planes_tratamiento pl join public.current_perfil() u
    on u.perfil_id = pl.odontologo_id and u.clinica_id = pl.clinica_id
    where u.rol = 'odontologo' and pl.id = procedimientos_tratamiento.plan_tratamiento_id
      and pl.clinica_id = procedimientos_tratamiento.clinica_id)
);

-- ACL explícita y mínima para clientes normales. RLS sigue limitando las filas.
-- No tocar service_role ni los helpers/ACL de otros módulos.
revoke all privileges on public.diagnosticos, public.planes_tratamiento,
  public.procedimientos_tratamiento from public, anon;
revoke delete, truncate, references, trigger on public.diagnosticos, public.planes_tratamiento from authenticated;
revoke truncate, references, trigger on public.procedimientos_tratamiento from authenticated;
grant select, insert, update on public.diagnosticos, public.planes_tratamiento to authenticated;
grant select, insert, update, delete on public.procedimientos_tratamiento to authenticated;

-- Detectar ACL heredadas incompatibles antes del COMMIT, sin revocar permisos
-- de roles ajenos/globales. Si aparecen, Matías debe revisar la configuración.
do $$
declare t text;
begin
  if (select count(*) from pg_policy where polrelid in ('public.diagnosticos'::regclass,
      'public.planes_tratamiento'::regclass, 'public.procedimientos_tratamiento'::regclass)) <> 10 then
    raise exception 'Policies inesperadas tras el bloqueo; revisar antes de confirmar';
  end if;
  foreach t in array array['diagnosticos', 'planes_tratamiento', 'procedimientos_tratamiento'] loop
    if has_table_privilege('anon', 'public.' || t, 'SELECT')
        or has_table_privilege('anon', 'public.' || t, 'INSERT')
        or has_table_privilege('anon', 'public.' || t, 'UPDATE')
        or has_table_privilege('anon', 'public.' || t, 'DELETE')
        or has_table_privilege('anon', 'public.' || t, 'TRUNCATE')
        or has_table_privilege('authenticated', 'public.' || t, 'TRUNCATE')
        or (t <> 'procedimientos_tratamiento' and has_table_privilege('authenticated', 'public.' || t, 'DELETE')) then
      raise exception 'ACL heredada incompatible en %: revisar configuración de roles', t;
    end if;
  end loop;
end;
$$;

commit;

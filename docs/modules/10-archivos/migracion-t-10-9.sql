-- T-10.9 aprobada por Matías. Migración incremental; NO ejecutar sql.sql original.
-- Aplicación manual por Matías, primero en entorno de prueba. No modifica Storage.
-- Instalación de una sola vez: si las columnas ya existen, aborta sin sobrescribir.
begin;

do $$
declare t text;
begin
  foreach t in array array['archivos', 'evoluciones_clinicas', 'planes_tratamiento'] loop
    if to_regclass('public.' || t) is null then
      raise exception 'Falta public.%', t;
    end if;
    if not (select relrowsecurity from pg_class where oid = to_regclass('public.' || t)) then
      raise exception 'public.% debe tener RLS instalado y revisado por su responsable antes de T-10.9', t;
    end if;
  end loop;
  if exists (select 1 from pg_attribute where attrelid = 'public.archivos'::regclass
      and attname in ('evolucion_clinica_id', 'plan_tratamiento_id') and not attisdropped) then
    raise exception 'Referencias T-10.9 ya presentes: revisar migración aplicada, no sobrescribir';
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'public.archivos'::regclass
      and polname = 'archivos_insert' and polcmd = 'a') then
    raise exception 'Falta la policy INSERT base de archivos; revisar T-10.1';
  end if;
end;
$$;

-- Reutilizar una UNIQUE no diferible existente con exactamente estas columnas.
-- Si el nombre de esta migración colisiona con otra definición, abortar.
do $$
declare t text; columnas smallint[]; nombre text;
begin
  foreach t in array array['evoluciones_clinicas', 'planes_tratamiento'] loop
    select array[
      (select attnum from pg_attribute where attrelid = to_regclass('public.' || t) and attname = 'id' and not attisdropped),
      (select attnum from pg_attribute where attrelid = to_regclass('public.' || t) and attname = 'paciente_id' and not attisdropped),
      (select attnum from pg_attribute where attrelid = to_regclass('public.' || t) and attname = 'clinica_id' and not attisdropped)
    ]::smallint[] into columnas;
    if array_position(columnas, null) is not null then raise exception 'Columnas incompatibles en %', t; end if;
    nombre := 'archivos_' || t || '_contexto_key';
    if exists (select 1 from pg_constraint where conrelid = to_regclass('public.' || t)
        and conname = nombre and (contype <> 'u' or conkey is distinct from columnas or condeferrable)) then
      raise exception 'Constraint % incompatible', nombre;
    end if;
    if not exists (select 1 from pg_constraint where conrelid = to_regclass('public.' || t)
        and contype in ('u', 'p') and conkey = columnas and not condeferrable) then
      execute format('alter table public.%I add constraint %I unique (id, paciente_id, clinica_id)', t, nombre);
    end if;
  end loop;
end;
$$;

alter table public.archivos
  add column evolucion_clinica_id uuid null,
  add column plan_tratamiento_id uuid null,
  add constraint archivos_asociacion_exclusiva_check
    check (num_nonnulls(evolucion_clinica_id, plan_tratamiento_id) <= 1),
  add constraint archivos_evolucion_contexto_fk
    foreign key (evolucion_clinica_id, paciente_id, clinica_id)
    references public.evoluciones_clinicas(id, paciente_id, clinica_id)
    on update restrict on delete restrict,
  add constraint archivos_plan_contexto_fk
    foreign key (plan_tratamiento_id, paciente_id, clinica_id)
    references public.planes_tratamiento(id, paciente_id, clinica_id)
    on update restrict on delete restrict;

create index idx_archivos_evolucion on public.archivos(evolucion_clinica_id)
  where evolucion_clinica_id is not null;
create index idx_archivos_plan on public.archivos(plan_tratamiento_id)
  where plan_tratamiento_id is not null;

-- SECURITY INVOKER: SELECT de destinos respeta RLS/GRANT del usuario real.
-- General no consulta destinos. No concede permisos de tablas clínicas.
create function public.archivos_asociacion_autorizada(
  p_evolucion uuid, p_plan uuid, p_paciente uuid, p_clinica uuid, p_categoria text
) returns boolean language plpgsql stable security invoker
set search_path = pg_catalog as $$
begin
  if auth.uid() is null then return false; end if;
  if p_evolucion is null and p_plan is null then return true; end if;
  if p_evolucion is not null and p_plan is not null then return false; end if;
  if p_categoria = 'portal' or not (
    public.es_superadmin() or exists (select 1 from public.current_perfil() where rol in ('odontologo', 'recepcionista'))
  ) then return false; end if;
  if p_evolucion is not null then
    return exists (select 1 from public.evoluciones_clinicas
      where id = p_evolucion and paciente_id = p_paciente and clinica_id = p_clinica);
  end if;
  return exists (select 1 from public.planes_tratamiento
    where id = p_plan and paciente_id = p_paciente and clinica_id = p_clinica);
end;
$$;
revoke all on function public.archivos_asociacion_autorizada(uuid, uuid, uuid, uuid, text) from public, anon;
grant execute on function public.archivos_asociacion_autorizada(uuid, uuid, uuid, uuid, text) to authenticated;

-- AND con las policies existentes, incluso si hubiera otra permisiva ajena.
create policy archivos_asociacion_insert_guard on public.archivos as restrictive
for insert to authenticated with check (
  public.archivos_asociacion_autorizada(evolucion_clinica_id, plan_tratamiento_id, paciente_id, clinica_id, categoria)
);

-- Trigger adicional: no reemplazar el trigger de identidad/autoria de T-10.1.
create function public.archivos_asociacion_inmutable()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  if row(new.evolucion_clinica_id, new.plan_tratamiento_id)
      is distinct from row(old.evolucion_clinica_id, old.plan_tratamiento_id) then
    raise exception 'La asociación clínica solo puede seleccionarse al subir el archivo';
  end if;
  return new;
end;
$$;
create trigger archivos_asociacion_inmutable before update on public.archivos
for each row execute function public.archivos_asociacion_inmutable();
revoke all on function public.archivos_asociacion_inmutable() from public, anon, authenticated;
-- No GRANT UPDATE adicional, ni cambios de permisos en entidades/Storage.
comment on column public.archivos.evolucion_clinica_id is 'Consulta registrada; mismo paciente/clínica; inmutable tras alta.';
comment on column public.archivos.plan_tratamiento_id is 'Plan completo; excluyente con evolución; inmutable tras alta.';
commit;

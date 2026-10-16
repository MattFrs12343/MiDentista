-- ============================================================================
-- Módulo 17 — Reactivación del rol odontologo_admin
-- ============================================================================
-- Contexto: `odontologo_admin` existía en el tipo `Role` (frontend) y en
-- varias RLS "a futuro" (evoluciones_clinicas, bitácora), pero el equipo lo
-- había descartado del alcance (ver comentario histórico en
-- `frontend/src/features/dashboard/DashboardPage.tsx`): nunca se agregó al
-- constraint `perfiles.rol`, así que nadie podía tenerlo de verdad. A pedido
-- de Matías se reactiva completo: superadmin puede asignarlo al crear o
-- editar una clínica, y el odontólogo-administrador tiene como mínimo todo lo
-- que tiene un odontólogo normal en las tablas clínicas, más pagos.
--
-- ALCANCE
--   1) Habilita 'odontologo_admin' en perfiles.rol.
--   2) Agrega 'odontologo_admin' a cada política/función que hoy sólo
--      reconoce 'odontologo' en las tablas operativas: diagnosticos,
--      planes_tratamiento, procedimientos_tratamiento, pagos, y los helpers
--      de archivos (archivos_puede_acceder/gestionar, asociación) y del QR de
--      cobro (qr_cobro_storage_autorizado).
--   3) NO toca políticas de propiedad por `perfil_id` (ej. `citas` por
--      `odontologo_id`, `horarios`): esas ya funcionan por identidad, no por
--      rol, así que un odontologo_admin que sea dueño de su propia fila ya
--      puede operarla sin cambios.
--   4) NO amplía a "ve todo lo de cualquier odontólogo de la clínica": las
--      políticas de UPDATE/DELETE por autoría (diagnósticos, planes,
--      procedimientos) siguen exigiendo que la fila sea del propio
--      `odontologo_admin` — mismo criterio que ya aplica a un `odontologo`
--      normal. Solo deja de estar excluido del chequeo de rol.
--
-- Nota: `odontogramas`, `historiales_clinicos`, `pacientes`, `citas` y
-- `archivos`/`objects` no mencionan 'odontologo' como literal en su RLS (usan
-- helpers que ya aceptan cualquier personal de la clínica o son por
-- propiedad), así que no necesitan cambios para que odontologo_admin opere
-- ahí. Verificado contra la base real antes de escribir este archivo.
--
-- EJECUCIÓN: idempotente (drop policy/constraint if exists + create,
-- create or replace function).
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 1) Constraint de perfiles.rol
-- -----------------------------------------------------------------------------
alter table public.perfiles drop constraint if exists perfiles_rol_check;
alter table public.perfiles add constraint perfiles_rol_check
  check (rol = any (array['odontologo'::text, 'odontologo_admin'::text, 'recepcionista'::text, 'paciente'::text, 'superadmin'::text]));

-- -----------------------------------------------------------------------------
-- 2) Helpers de archivos (módulo 10)
-- -----------------------------------------------------------------------------
create or replace function public.archivos_asociacion_autorizada(
  p_evolucion uuid, p_plan uuid, p_paciente uuid, p_clinica uuid, p_categoria text
)
returns boolean language plpgsql stable
set search_path = pg_catalog
as $$
begin
  if auth.uid() is null then return false; end if;
  if p_evolucion is null and p_plan is null then return true; end if;
  if p_evolucion is not null and p_plan is not null then return false; end if;
  if p_categoria = 'portal' or not (
    public.es_superadmin() or exists (select 1 from public.current_perfil() where rol in ('odontologo', 'odontologo_admin', 'recepcionista'))
  ) then return false; end if;
  if p_evolucion is not null then
    return exists (select 1 from public.evoluciones_clinicas
      where id = p_evolucion and paciente_id = p_paciente and clinica_id = p_clinica);
  end if;
  return exists (select 1 from public.planes_tratamiento
    where id = p_plan and paciente_id = p_paciente and clinica_id = p_clinica);
end;
$$;

create or replace function public.archivos_puede_acceder(p_clinica uuid, p_paciente uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog
as $$
  select auth.uid() is not null and exists (
    select 1 from public.pacientes p
     where p.id = p_paciente and p.clinica_id = p_clinica
       and (
         public.es_superadmin()
         or (p_clinica = public.mi_clinica_id() and exists (
           select 1 from public.current_perfil() cp
            where cp.rol in ('odontologo', 'odontologo_admin', 'recepcionista')
               or (cp.rol = 'paciente' and p.perfil_id = public.mi_perfil_id())
         ))
       )
  );
$$;

create or replace function public.archivos_puede_gestionar(p_clinica uuid, p_paciente uuid, p_categoria text, p_autor uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog
as $$
  select public.archivos_puede_acceder(p_clinica, p_paciente) and (
    public.es_superadmin()
    or exists (select 1 from public.current_perfil()
                where rol in ('odontologo', 'odontologo_admin', 'recepcionista'))
    or (p_categoria = 'portal' and p_autor = public.mi_perfil_id())
  );
$$;

-- -----------------------------------------------------------------------------
-- 3) QR de cobro (módulo 09)
-- -----------------------------------------------------------------------------
create or replace function public.qr_cobro_storage_autorizado(p_ruta text)
returns boolean language plpgsql stable security definer
set search_path = pg_catalog
as $$
declare
  partes text[];
  v_clinica uuid;
begin
  if auth.uid() is null or p_ruta is null then return false; end if;
  partes := string_to_array(p_ruta, '/');
  if cardinality(partes) <> 2 or partes[2] <> 'qr' then return false; end if;
  if partes[1] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  v_clinica := partes[1]::uuid;
  return public.es_superadmin()
    or (
      v_clinica = public.mi_clinica_id()
      and exists (
        select 1 from public.current_perfil()
         where rol in ('odontologo', 'odontologo_admin', 'recepcionista')
      )
    );
end;
$$;

-- -----------------------------------------------------------------------------
-- 4) Diagnósticos (módulo 05)
-- -----------------------------------------------------------------------------
drop policy if exists diagnosticos_select on public.diagnosticos;
create policy diagnosticos_select on public.diagnosticos
  for select using (
    exists (
      select 1 from public.current_perfil() u(perfil_id, clinica_id, rol)
       where u.rol = 'superadmin'
          or (u.rol in ('odontologo', 'odontologo_admin', 'recepcionista') and u.clinica_id = diagnosticos.clinica_id)
    )
  );

drop policy if exists diagnosticos_insert on public.diagnosticos;
create policy diagnosticos_insert on public.diagnosticos
  for insert with check (
    exists (
      select 1 from public.current_perfil() u(perfil_id, clinica_id, rol)
       where u.rol in ('odontologo', 'odontologo_admin')
         and u.clinica_id = diagnosticos.clinica_id
         and u.perfil_id = diagnosticos.odontologo_id
    )
  );

drop policy if exists diagnosticos_update on public.diagnosticos;
create policy diagnosticos_update on public.diagnosticos
  for update using (
    exists (
      select 1 from public.current_perfil() u(perfil_id, clinica_id, rol)
       where u.rol in ('odontologo', 'odontologo_admin')
         and u.clinica_id = diagnosticos.clinica_id
         and u.perfil_id = diagnosticos.odontologo_id
    )
  )
  with check (
    exists (
      select 1 from public.current_perfil() u(perfil_id, clinica_id, rol)
       where u.rol in ('odontologo', 'odontologo_admin')
         and u.clinica_id = diagnosticos.clinica_id
         and u.perfil_id = diagnosticos.odontologo_id
    )
  );

-- -----------------------------------------------------------------------------
-- 5) Planes de tratamiento (módulo 05)
-- -----------------------------------------------------------------------------
drop policy if exists planes_select on public.planes_tratamiento;
create policy planes_select on public.planes_tratamiento
  for select using (
    exists (
      select 1 from public.current_perfil() u(perfil_id, clinica_id, rol)
       where u.rol = 'superadmin'
          or (u.rol in ('odontologo', 'odontologo_admin', 'recepcionista') and u.clinica_id = planes_tratamiento.clinica_id)
    )
  );

drop policy if exists planes_insert on public.planes_tratamiento;
create policy planes_insert on public.planes_tratamiento
  for insert with check (
    exists (
      select 1 from public.current_perfil() u(perfil_id, clinica_id, rol)
       where u.rol in ('odontologo', 'odontologo_admin')
         and u.clinica_id = planes_tratamiento.clinica_id
         and u.perfil_id = planes_tratamiento.odontologo_id
    )
  );

drop policy if exists planes_update on public.planes_tratamiento;
create policy planes_update on public.planes_tratamiento
  for update using (
    exists (
      select 1 from public.current_perfil() u(perfil_id, clinica_id, rol)
       where u.rol in ('odontologo', 'odontologo_admin')
         and u.clinica_id = planes_tratamiento.clinica_id
         and u.perfil_id = planes_tratamiento.odontologo_id
    )
  )
  with check (
    exists (
      select 1 from public.current_perfil() u(perfil_id, clinica_id, rol)
       where u.rol in ('odontologo', 'odontologo_admin')
         and u.clinica_id = planes_tratamiento.clinica_id
         and u.perfil_id = planes_tratamiento.odontologo_id
    )
  );

-- -----------------------------------------------------------------------------
-- 6) Procedimientos del plan (módulo 05)
-- -----------------------------------------------------------------------------
drop policy if exists procedimientos_insert on public.procedimientos_tratamiento;
create policy procedimientos_insert on public.procedimientos_tratamiento
  for insert with check (
    exists (
      select 1 from public.planes_tratamiento pl
        join public.current_perfil() u(perfil_id, clinica_id, rol)
          on u.perfil_id = pl.odontologo_id and u.clinica_id = pl.clinica_id
       where u.rol in ('odontologo', 'odontologo_admin')
         and pl.id = procedimientos_tratamiento.plan_tratamiento_id
         and pl.clinica_id = procedimientos_tratamiento.clinica_id
    )
  );

drop policy if exists procedimientos_update on public.procedimientos_tratamiento;
create policy procedimientos_update on public.procedimientos_tratamiento
  for update using (
    exists (
      select 1 from public.planes_tratamiento pl
        join public.current_perfil() u(perfil_id, clinica_id, rol)
          on u.perfil_id = pl.odontologo_id and u.clinica_id = pl.clinica_id
       where u.rol in ('odontologo', 'odontologo_admin')
         and pl.id = procedimientos_tratamiento.plan_tratamiento_id
         and pl.clinica_id = procedimientos_tratamiento.clinica_id
    )
  )
  with check (
    exists (
      select 1 from public.planes_tratamiento pl
        join public.current_perfil() u(perfil_id, clinica_id, rol)
          on u.perfil_id = pl.odontologo_id and u.clinica_id = pl.clinica_id
       where u.rol in ('odontologo', 'odontologo_admin')
         and pl.id = procedimientos_tratamiento.plan_tratamiento_id
         and pl.clinica_id = procedimientos_tratamiento.clinica_id
    )
  );

drop policy if exists procedimientos_delete on public.procedimientos_tratamiento;
create policy procedimientos_delete on public.procedimientos_tratamiento
  for delete using (
    exists (
      select 1 from public.planes_tratamiento pl
        join public.current_perfil() u(perfil_id, clinica_id, rol)
          on u.perfil_id = pl.odontologo_id and u.clinica_id = pl.clinica_id
       where u.rol in ('odontologo', 'odontologo_admin')
         and pl.id = procedimientos_tratamiento.plan_tratamiento_id
         and pl.clinica_id = procedimientos_tratamiento.clinica_id
    )
  );

-- -----------------------------------------------------------------------------
-- 7) Pagos (módulo 09)
-- -----------------------------------------------------------------------------
drop policy if exists pagos_select_staff on public.pagos;
create policy pagos_select_staff on public.pagos
  for select using (
    clinica_id = public.mi_clinica_id()
    and (select rol from public.current_perfil()) in ('recepcionista', 'odontologo', 'odontologo_admin')
  );

drop policy if exists pagos_insert_staff on public.pagos;
create policy pagos_insert_staff on public.pagos
  for insert with check (
    clinica_id = public.mi_clinica_id()
    and (select rol from public.current_perfil()) in ('recepcionista', 'odontologo', 'odontologo_admin')
    and registrado_por = public.mi_perfil_id()
  );

drop policy if exists pagos_update_staff on public.pagos;
create policy pagos_update_staff on public.pagos
  for update using (
    clinica_id = public.mi_clinica_id()
    and (select rol from public.current_perfil()) in ('recepcionista', 'odontologo', 'odontologo_admin')
  )
  with check (
    clinica_id = public.mi_clinica_id()
    and (select rol from public.current_perfil()) in ('recepcionista', 'odontologo', 'odontologo_admin')
  );

-- ============================================================================
-- Verificación
-- ============================================================================
-- select conname, pg_get_constraintdef(oid) from pg_constraint
--  where conrelid = 'public.perfiles'::regclass and contype = 'c';
-- -- debe incluir 'odontologo_admin'
--
-- select tablename, policyname from pg_policies
--  where (coalesce(qual,'') || coalesce(with_check,'')) ~ 'odontologo'
--    and not ((coalesce(qual,'') || coalesce(with_check,'')) ~ 'odontologo_admin');
-- -- debe devolver 0 filas

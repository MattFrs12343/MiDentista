-- ============================================================================
-- Módulo 01 — Autenticación / Onboarding del paciente
-- Propuesta de SQL. La integra Matías en bd_5clinicas_midentista.sql (regla 7).
-- ============================================================================
--
-- Contexto:
--   El portal del paciente usa el login de Google (Supabase Auth). Al primer
--   ingreso NO existe fila en `perfiles`, así que la Edge Function
--   (supabase/functions/api/index.ts, con la service_role key) crea el perfil
--   con rol 'paciente' en `paciente/registrar`. Por eso aquí NO hace falta una
--   política de INSERT sobre `perfiles`.
--
--   Para afiliarse a una clínica el paciente debe actualizar SU PROPIA fila de
--   `perfiles` (columna clinica_id) y crear su fila de `pacientes`. Una política
--   de RLS de UPDATE no sirve para esto: RLS no puede limitar columnas, así que
--   un paciente podría también reescribir su `rol` a 'superadmin'. Por eso la
--   afiliación se hace con una función SECURITY DEFINER acotada, que solo toca
--   lo estrictamente necesario y verifica `auth.uid()`.
--
--   Las LECTURAS del portal (historia, odontograma, evoluciones, pagos, citas)
--   NO se hacen por RLS directo: todas las políticas clínicas filtran por
--   `clinica_id = mi_clinica_id()`, de modo que un paciente afiliado vería los
--   datos de TODOS los pacientes de la clínica. Por seguridad, esas lecturas
--   pasan por la Edge Function `paciente/mi-ficha`, que usa service_role y solo
--   devuelve las filas del propio paciente.
-- ============================================================================

create or replace function public.afiliar_paciente(
    p_clinica_id uuid,
    p_datos      jsonb default '{}'::jsonb
)
returns table (paciente_id uuid, clinica_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_perfil      public.perfiles%rowtype;
    v_paciente_id uuid;
begin
    -- Perfil del usuario autenticado que está llamando (vía auth.uid()).
    select *
      into v_perfil
      from public.perfiles
     where auth_user_id = auth.uid()
       and activo = true
     limit 1;

    if not found then
        raise exception 'No hay una cuenta activa para este usuario';
    end if;

    if v_perfil.rol <> 'paciente' then
        raise exception 'Solo las cuentas de paciente pueden afiliarse a una clínica';
    end if;

    if v_perfil.clinica_id is not null and v_perfil.clinica_id <> p_clinica_id then
        raise exception 'Esta cuenta ya está afiliada a otra clínica';
    end if;

    if not exists (
        select 1 from public.clinicas
         where id = p_clinica_id and activo = true
    ) then
        raise exception 'La clínica no existe o no está activa';
    end if;

    -- Afiliación: la clínica pasa a ser la del perfil. El teléfono se actualiza
    -- solo si el formulario trae uno nuevo.
    update public.perfiles
       set clinica_id     = p_clinica_id,
           telefono       = coalesce(nullif(trim(p_datos->>'telefono'), ''), telefono),
           actualizado_en = now()
     where id = v_perfil.id;

    -- La fila de `pacientes` es 1:1 con el perfil (puede venir de un intento
    -- anterior): se reutiliza si ya existe.
    select id
      into v_paciente_id
      from public.pacientes
     where perfil_id = v_perfil.id
     limit 1;

    if v_paciente_id is null then
        insert into public.pacientes (
            clinica_id, perfil_id, ci, nombre_completo, nombres, apellidos,
            fecha_nacimiento, genero, telefono, email, direccion,
            contacto_emergencia_nombre, contacto_emergencia_telefono,
            contacto_emergencia_parentesco, activo
        ) values (
            p_clinica_id,
            v_perfil.id,
            nullif(trim(p_datos->>'ci'), ''),
            coalesce(nullif(trim(p_datos->>'nombreCompleto'), ''), v_perfil.nombre_completo),
            nullif(trim(p_datos->>'nombres'), ''),
            nullif(trim(p_datos->>'apellidos'), ''),
            nullif(trim(p_datos->>'fechaNacimiento'), '')::date,
            nullif(trim(p_datos->>'genero'), ''),
            coalesce(nullif(trim(p_datos->>'telefono'), ''), v_perfil.telefono),
            v_perfil.email,
            nullif(trim(p_datos->>'direccion'), ''),
            nullif(trim(p_datos->>'contactoEmergenciaNombre'), ''),
            nullif(trim(p_datos->>'contactoEmergenciaTelefono'), ''),
            nullif(trim(p_datos->>'contactoEmergenciaParentesco'), ''),
            true
        )
        returning id into v_paciente_id;
    else
        update public.pacientes
           set clinica_id     = p_clinica_id,
               actualizado_en = now()
         where id = v_paciente_id;
    end if;

    return query select v_paciente_id, p_clinica_id;
end;
$$;

-- Solo un usuario autenticado puede afiliarse; nunca anon.
revoke all on function public.afiliar_paciente(uuid, jsonb) from public;
grant execute on function public.afiliar_paciente(uuid, jsonb) to authenticated;

-- T-5.7: PROPUESTA NO EJECUTADA. Revisar/aplicar exclusivamente por Matías.
-- Requiere T-5.1 aplicada y validada. Primero usar una copia de pruebas.
-- No modifica policies, ACL, procedimientos, costos ni datos históricos.
-- Instalación única: una colisión aborta, no se reemplazan funciones existentes.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '120s';
set local search_path = pg_catalog, public;

do $$
begin
  if to_regclass('public.planes_tratamiento') is null
      or to_regprocedure('public.t51_contexto_inmutable()') is null
      or to_regprocedure('public.actualizar_fecha_modificacion()') is null
      or to_regprocedure('public.current_perfil()') is null then
    raise exception 'Faltan dependencias de T-5.1';
  end if;
end;
$$;
lock table public.planes_tratamiento in access exclusive mode;

do $$
begin
  if to_regprocedure('public.t57_validar_estado_plan()') is not null
      or exists (select 1 from pg_trigger where tgrelid = 'public.planes_tratamiento'::regclass
        and tgname = 't57_validar_estado_plan') then
    raise exception 'T-5.7 ya instalada o nombre ocupado; revisar sin sobrescribir';
  end if;
  if not exists (select 1 from pg_class where oid = 'public.planes_tratamiento'::regclass and relrowsecurity)
      or (select count(*) from pg_policy where polrelid = 'public.planes_tratamiento'::regclass) <> 3
      or not exists (select 1 from pg_policy where polrelid = 'public.planes_tratamiento'::regclass
        and polname = 'planes_select' and polcmd = 'r')
      or not exists (select 1 from pg_policy where polrelid = 'public.planes_tratamiento'::regclass
        and polname = 'planes_insert' and polcmd = 'a')
      or not exists (select 1 from pg_policy where polrelid = 'public.planes_tratamiento'::regclass
        and polname = 'planes_update' and polcmd = 'w' and polqual is not null and polwithcheck is not null) then
    raise exception 'RLS/policies incompatibles: revisar T-5.1 antes de continuar';
  end if;
  -- Las definiciones de policies/ACL deben seguir siendo las validadas en T-5.1.
  -- No se sustituyen aquí: comprobarlas con verificacion-t-5-1.sql y JWT reales.
  if not exists (select 1 from pg_trigger where tgrelid = 'public.planes_tratamiento'::regclass
        and tgname = 't51_contexto_inmutable' and not tgisinternal and tgenabled = 'O'
        and tgtype = 19 and tgfoid = 'public.t51_contexto_inmutable()'::regprocedure)
      or not exists (select 1 from pg_trigger where tgrelid = 'public.planes_tratamiento'::regclass
        and tgname = 'trigger_planes_tratamiento_actualizar' and not tgisinternal and tgenabled = 'O'
        and tgtype = 19 and tgfoid = 'public.actualizar_fecha_modificacion()'::regprocedure)
      or (select count(*) from pg_trigger where tgrelid = 'public.planes_tratamiento'::regclass
        and not tgisinternal) <> 2 then
    raise exception 'Triggers base ausentes o adicionales; revisar interacción antes de aplicar';
  end if;
  if not exists (select 1 from pg_attribute where attrelid = 'public.planes_tratamiento'::regclass
        and attname = 'estado' and attnotnull and not attisdropped)
      or not exists (select 1 from pg_constraint where conrelid = 'public.planes_tratamiento'::regclass
        and conname = 'planes_tratamiento_estado_check' and contype = 'c' and convalidated)
      or exists (select 1 from public.planes_tratamiento where estado is null
        or estado not in ('propuesto', 'aceptado', 'en_proceso', 'completado', 'cancelado')) then
    raise exception 'Estados/CHECK incompatibles; no se corregirán datos automáticamente';
  end if;
end;
$$;

-- OLD/NEW pertenecen a la fila bloqueada por PostgreSQL, nunca al estado de React.
-- RLS T-5.1 sigue limitando UPDATE al odontólogo activo autor de la misma clínica.
create function public.t57_validar_estado_plan() returns trigger
language plpgsql security invoker set search_path = pg_catalog as $$
begin
  -- Evitar crear directamente un terminal/saltar el estado inicial vía otro cliente.
  if tg_op = 'INSERT' then
    if new.estado is distinct from 'propuesto' then
      raise exception 'T-5.7: el plan debe iniciar en propuesto' using errcode = '23514';
    end if;
    return new;
  end if;
  -- Guardar título/notas/costo sin cambiar estado sigue permitido por T-5.1.
  -- Un UPDATE al mismo valor no es una transición (tampoco reabre un terminal).
  if new.estado is not distinct from old.estado then return new; end if;
  if new.estado is null or old.estado is null or not (
      (old.estado = 'propuesto' and new.estado in ('aceptado', 'cancelado'))
      or (old.estado = 'aceptado' and new.estado = 'en_proceso')
      or (old.estado = 'en_proceso' and new.estado in ('completado', 'cancelado'))
  ) then
    raise exception 'T-5.7: transición no permitida de % a %', old.estado, new.estado
      using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.t57_validar_estado_plan() from public, anon, authenticated;
-- Se dispara en TODO UPDATE, incluso si otro trigger asignase NEW.estado.
create trigger t57_validar_estado_plan before insert or update on public.planes_tratamiento
  for each row execute function public.t57_validar_estado_plan();

commit;

-- CONTRATO OBLIGATORIO del futuro cambiarEstadoPlan (frontend bloqueado):
-- UPDATE public.planes_tratamiento SET estado = :nuevo
-- WHERE id = :id AND paciente_id = :paciente AND clinica_id = :clinica
--   AND odontologo_id = :autor AND estado = :estado_esperado
-- RETURNING id, clinica_id, paciente_id, odontologo_id, titulo, estado,
--   costo_total, notas, creado_en, actualizado_en;
-- UUID reales + transición validada antes de red; solo enviar estado.
-- Exigir exactamente una fila y comprobar contexto/estado/timestamp devueltos.
-- Cero filas = conflicto, RLS o inexistencia; nunca éxito ni reintento automático.
-- READ COMMITTED reevalúa el WHERE tras esperar el bloqueo de una fila actualizada.
-- En aislamiento más estricto puede haber error de serialización: también fallo.
-- El trigger impide transiciones inválidas de cualquier cliente normal; no puede
-- conocer qué estado leyó una pestaña. El WHERE esperado garantiza ese contrato.
-- No usar service_role para comprobar permisos. Un administrador capaz de alterar
-- triggers/RLS sigue siendo privilegiado; esta migración no revoca esos privilegios.

-- Ciclo 4, Módulo 10. PROPUESTA LOCAL: revisión/aplicación exclusiva de Matías.
-- Una sola ejecución, transacción completa y ventana SIN subidas en vuelo.
-- No borra datos/objetos, no altera policies de otros módulos ni sus helpers.
-- Requiere T-10.1/2/9 y la integración odontologo_admin ya instaladas.
begin;

do $$
begin
  if to_regclass('public.archivos_cuotas') is not null
     or to_regclass('public.archivos_operaciones_subida') is not null then
    raise exception 'Ciclo 4 ya presente o parcial: revisar, no sobrescribir';
  end if;
  if to_regprocedure('public.archivos_asociacion_autorizada(uuid,uuid,uuid,uuid,text)') is null
     or not exists (select 1 from pg_attribute where attrelid = 'storage.objects'::regclass
       and attname = 'archived_at' and not attisdropped)
     or not exists (select 1 from pg_attribute where attrelid = 'public.archivos'::regclass
       and attname = 'plan_tratamiento_id' and not attisdropped) then
    raise exception 'Faltan dependencias o Storage versionado compatible';
  end if;
  if not exists (select 1 from pg_roles where rolname = current_user and (rolsuper or rolbypassrls)) then
    raise exception 'Instalar con administrador BYPASSRLS para inventariar objetos sin filtros';
  end if;
  if pg_get_functiondef('public.archivos_puede_acceder(uuid,uuid)'::regprocedure) !~ 'odontologo_admin'
     or pg_get_functiondef('public.archivos_asociacion_autorizada(uuid,uuid,uuid,uuid,text)'::regprocedure) !~ 'odontologo_admin' then
    raise exception 'Revisar integración odontologo_admin del módulo 17 antes del Ciclo 4';
  end if;
end;
$$;

-- Evita inicializar contadores mientras una escritura SQL anterior se confirma.
-- La ventana de mantenimiento también debe detener peticiones HTTP antiguas.
lock table public.archivos, storage.objects in share row exclusive mode;

-- No adivinar tamaños desconocidos ni asumir cero. Compatible con la metadata
-- del Storage instalado SOLO si contiene size numérico y cabe en un entero seguro.
do $$
begin
  if exists (select 1 from storage.objects o where bucket_id = 'archivos-clinica'
      and archived_at is null and (
        coalesce(to_jsonb(o) #>> '{metadata,size}', '') !~ '^[0-9]{1,15}$'
      )) then
    raise exception 'Inventario sin metadata.size fiable: revisar versión/objetos antes de activar cuota';
  end if;
end;
$$;

create table public.archivos_cuotas (
  -- Identificador durable, sin FK/cascada: borrar una clínica por otro módulo
  -- no debe borrar su contabilidad ni impedir su operación histórica existente.
  clinica_id uuid primary key,
  limite_bytes bigint not null default 5000000000 check (limite_bytes between 1 and 9007199254740991),
  bytes_ocupados bigint not null default 0 check (bytes_ocupados between 0 and 9007199254740991),
  bytes_reservados bigint not null default 0 check (bytes_reservados between 0 and 9007199254740991),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.archivos_operaciones_subida (
  id uuid primary key,
  clinica_id uuid not null references public.archivos_cuotas(clinica_id) on delete restrict,
  -- Referencias históricas validadas por RPC; sobreviven a bajas externas.
  paciente_id uuid not null,
  actor_auth_id uuid not null,
  perfil_id uuid not null,
  ruta text not null unique,
  bytes_verificados bigint not null check (bytes_verificados between 1 and 10485760),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  -- id es además la clave durable de idempotencia. Payload inmutable capturado.
  datos jsonb not null check (jsonb_typeof(datos) = 'object'),
  estado text not null default 'reservada'
    check (estado in ('reservada', 'subiendo', 'incierta', 'confirmada', 'cancelada')),
  archivo_id uuid,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index archivos_operaciones_clinica_estado on public.archivos_operaciones_subida(clinica_id, estado);

-- Cuenta objetos vigentes, incluso sin fila. NO SUM(tamano) declarado por clientes.
insert into public.archivos_cuotas(clinica_id, bytes_ocupados)
select c.id, coalesce((select sum((to_jsonb(o) #>> '{metadata,size}')::bigint)
  from storage.objects o where o.bucket_id = 'archivos-clinica' and o.archived_at is null
    and split_part(o.name, '/', 1) = c.id::text), 0)
from public.clinicas c;

alter table public.archivos_cuotas enable row level security;
alter table public.archivos_operaciones_subida enable row level security;
revoke all on public.archivos_cuotas, public.archivos_operaciones_subida from public, anon, authenticated;
grant all on public.archivos_cuotas, public.archivos_operaciones_subida to service_role;
grant select, insert on public.archivos to service_role;

-- Helper privado: actor SIEMPRE obtenido del JWT verificado por la Edge Function.
-- La SQL revalida pertenencia/roles al reservar y al confirmar. No usa auth.uid()
-- de service_role como si fuese el paciente. Rechaza perfiles ambiguos.
create function public.archivos_c4_contexto(p_actor uuid, p_paciente uuid, p_datos jsonb)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog as $$
declare p public.perfiles; pac public.pacientes; categoria text;
  evo uuid := (p_datos->>'evolucion_clinica_id')::uuid;
  plan uuid := (p_datos->>'plan_tratamiento_id')::uuid;
begin
  if auth.role() is distinct from 'service_role' or p_actor is null or p_paciente is null then
    raise exception using errcode = '42501', message = 'ACCESO_DENEGADO';
  end if;
  if (select count(*) from public.perfiles where auth_user_id = p_actor and activo) <> 1 then
    raise exception using errcode = '42501', message = 'PERFIL_NO_VALIDO';
  end if;
  select * into strict p from public.perfiles where auth_user_id = p_actor and activo;
  select * into strict pac from public.pacientes where id = p_paciente;
  if p.rol not in ('superadmin', 'odontologo', 'odontologo_admin', 'recepcionista', 'paciente')
     or (p.rol <> 'superadmin' and p.clinica_id is distinct from pac.clinica_id)
     or (p.rol = 'paciente' and (pac.perfil_id is distinct from p.id
       or p_datos->>'mime' = 'application/pdf' or evo is not null or plan is not null)) then
    raise exception using errcode = '42501', message = 'ACCESO_DENEGADO';
  end if;
  if evo is not null and (plan is not null or p.rol not in ('superadmin', 'odontologo', 'odontologo_admin')
      or not exists (select 1 from public.evoluciones_clinicas
        where id = evo and paciente_id = pac.id and clinica_id = pac.clinica_id)) then
    raise exception using errcode = '42501', message = 'ASOCIACION_DENEGADA';
  end if;
  if plan is not null and (p.rol = 'paciente' or not exists (select 1 from public.planes_tratamiento
      where id = plan and paciente_id = pac.id and clinica_id = pac.clinica_id)) then
    raise exception using errcode = '42501', message = 'ASOCIACION_DENEGADA';
  end if;
  categoria := case when p.rol = 'paciente' then 'portal'
    when p_datos->>'mime' = 'application/pdf' and p.rol = 'recepcionista' then 'administrativo'
    else 'clinico' end;
  return jsonb_build_object('clinica_id', pac.clinica_id, 'perfil_id', p.id, 'categoria', categoria);
end;
$$;

create function public.archivos_c4_reservar(p_actor uuid, p_paciente uuid, p_operacion uuid,
  p_bytes bigint, p_sha256 text, p_datos jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog as $$
declare ctx jsonb; cid uuid; q public.archivos_cuotas; op public.archivos_operaciones_subida; ext text;
begin
  ctx := public.archivos_c4_contexto(p_actor, p_paciente, p_datos);
  cid := (ctx->>'clinica_id')::uuid;
  if p_operacion is null or p_bytes is null or p_bytes not between 1 and 10485760
     or p_sha256 is null or p_sha256 !~ '^[0-9a-f]{64}$'
     or p_datos is null or jsonb_typeof(p_datos) <> 'object'
     or coalesce(btrim(p_datos->>'nombre'), '') = ''
     or coalesce(p_datos->>'mime', '') not in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')
     or coalesce(p_datos->>'tipo_archivo', '') not in ('fotografia', 'radiografia', 'documento')
     or (p_datos->>'mime' = 'application/pdf' and p_datos->>'tipo_archivo' <> 'documento') then
    raise exception using errcode = '22023', message = 'DATOS_INVALIDOS';
  end if;
  insert into public.archivos_cuotas(clinica_id) values(cid) on conflict do nothing;
  -- Orden de locks único: cuota, después operación. Serializa la misma clínica.
  select * into strict q from public.archivos_cuotas where clinica_id = cid for update;
  select * into op from public.archivos_operaciones_subida where id = p_operacion for update;
  if found then
    if op.actor_auth_id <> p_actor or op.paciente_id <> p_paciente or op.clinica_id <> cid
       or op.bytes_verificados <> p_bytes or op.sha256 <> p_sha256 or op.datos <> p_datos then
      raise exception using errcode = '22023', message = 'IDEMPOTENCIA_INCOMPATIBLE';
    end if;
    return to_jsonb(op);
  end if;
  if q.bytes_ocupados + q.bytes_reservados + p_bytes > q.limite_bytes then
    raise exception using errcode = 'P0001', message = 'CUOTA_EXCEDIDA';
  end if;
  ext := case p_datos->>'mime' when 'image/jpeg' then 'jpg' when 'image/png' then 'png'
    when 'image/webp' then 'webp' else 'pdf' end;
  insert into public.archivos_operaciones_subida(id, clinica_id, paciente_id, actor_auth_id,
    perfil_id, ruta, bytes_verificados, sha256, datos)
  values(p_operacion, cid, p_paciente, p_actor, (ctx->>'perfil_id')::uuid,
    cid::text || '/' || p_paciente::text || '/' || p_operacion::text || '.' || ext,
    p_bytes, p_sha256, p_datos) returning * into op;
  update public.archivos_cuotas set bytes_reservados = bytes_reservados + p_bytes,
    actualizado_en = now() where clinica_id = cid;
  return to_jsonb(op);
end;
$$;

-- Solo el ganador puede emitir UN upload. Repetir la petición no reusa la ruta.
create function public.archivos_c4_iniciar(p_actor uuid, p_operacion uuid)
returns boolean language plpgsql security definer set search_path = pg_catalog as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception using errcode = '42501'; end if;
  update public.archivos_operaciones_subida set estado = 'subiendo', actualizado_en = now()
    where id = p_operacion and actor_auth_id = p_actor and estado = 'reservada';
  return found;
end;
$$;

create function public.archivos_c4_estado(p_operacion uuid)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog as $$
declare op public.archivos_operaciones_subida;
begin
  select * into op from public.archivos_operaciones_subida where id = p_operacion;
  if not found then raise exception using errcode = '42501', message = 'OPERACION_NO_VISIBLE'; end if;
  if not exists (select 1 from public.perfiles where auth_user_id = auth.uid() and activo
      and (auth_user_id = op.actor_auth_id or rol = 'superadmin')) then
    raise exception using errcode = '42501', message = 'OPERACION_NO_VISIBLE';
  end if;
  -- Sin hash, payload ni rutas para otras operaciones/pacientes.
  return jsonb_build_object('id', op.id, 'estado', op.estado, 'archivo_id', op.archivo_id,
    'paciente_id', op.paciente_id, 'actualizado_en', op.actualizado_en);
end;
$$;

create function public.archivos_c4_confirmar(p_actor uuid, p_operacion uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog as $$
declare op public.archivos_operaciones_subida; ctx jsonb; fila public.archivos; cid uuid;
begin
  if auth.role() is distinct from 'service_role' then raise exception using errcode = '42501'; end if;
  select clinica_id into strict cid from public.archivos_operaciones_subida where id = p_operacion and actor_auth_id = p_actor;
  perform 1 from public.archivos_cuotas where clinica_id = cid for update;
  select * into strict op from public.archivos_operaciones_subida where id = p_operacion for update;
  ctx := public.archivos_c4_contexto(p_actor, op.paciente_id, op.datos);
  if (ctx->>'clinica_id')::uuid <> op.clinica_id or (ctx->>'perfil_id')::uuid <> op.perfil_id then
    raise exception using errcode = '42501', message = 'CONTEXTO_CAMBIO';
  end if;
  if op.estado = 'confirmada' then
    select * into strict fila from public.archivos where id = op.archivo_id;
    return to_jsonb(fila);
  end if;
  if op.estado not in ('subiendo', 'incierta') then raise exception 'ESTADO_INVALIDO'; end if;
  -- Prueba de objeto vigente y bytes reales de Storage, no owner_id NULL genérico.
  if not exists (select 1 from storage.objects o where o.bucket_id = 'archivos-clinica'
      and o.name = op.ruta and o.archived_at is null
      and to_jsonb(o) #>> '{metadata,size}' = op.bytes_verificados::text) then
    raise exception 'OBJETO_NO_CONFIRMADO';
  end if;
  insert into public.archivos(clinica_id, paciente_id, nombre, ruta, mime, tamano,
    categoria, tipo_archivo, descripcion, subido_por, evolucion_clinica_id, plan_tratamiento_id)
  values(op.clinica_id, op.paciente_id, op.datos->>'nombre', op.ruta, op.datos->>'mime',
    op.bytes_verificados, ctx->>'categoria', op.datos->>'tipo_archivo',
    nullif(btrim(op.datos->>'descripcion'), ''), op.perfil_id,
    (op.datos->>'evolucion_clinica_id')::uuid, (op.datos->>'plan_tratamiento_id')::uuid)
  returning * into fila;
  update public.archivos_cuotas set bytes_reservados = bytes_reservados - op.bytes_verificados,
    bytes_ocupados = bytes_ocupados + op.bytes_verificados, actualizado_en = now() where clinica_id = cid;
  update public.archivos_operaciones_subida set estado = 'confirmada', archivo_id = fila.id,
    actualizado_en = now() where id = op.id;
  return to_jsonb(fila);
end;
$$;

-- Cancelación SOLO si aún no se autorizó ningún upload. Tras iniciar, ni timeout,
-- ni 404, ni caducidad acreditan ausencia definitiva: se conserva la reserva.
create function public.archivos_c4_cancelar(p_actor uuid, p_operacion uuid)
returns boolean language plpgsql security definer set search_path = pg_catalog as $$
declare op public.archivos_operaciones_subida; cid uuid;
begin
  if auth.role() is distinct from 'service_role' then raise exception using errcode = '42501'; end if;
  select clinica_id into strict cid from public.archivos_operaciones_subida where id = p_operacion and actor_auth_id = p_actor;
  perform 1 from public.archivos_cuotas where clinica_id = cid for update;
  select * into strict op from public.archivos_operaciones_subida where id = p_operacion for update;
  if op.estado = 'cancelada' then return true; end if;
  if op.estado <> 'reservada' or exists (select 1 from storage.objects where bucket_id = 'archivos-clinica'
      and name = op.ruta and archived_at is null) then return false; end if;
  update public.archivos_cuotas set bytes_reservados = bytes_reservados - op.bytes_verificados,
    actualizado_en = now() where clinica_id = cid;
  update public.archivos_operaciones_subida set estado = 'cancelada', actualizado_en = now() where id = op.id;
  return true;
end;
$$;

-- Un rechazo HTTP definitivo del ÚNICO upload, recibido por su ejecutor, puede
-- resolver subiendo sin objeto. Nunca se llama por timeout, 409, 5xx ni retry.
create function public.archivos_c4_rechazo_storage(p_actor uuid, p_operacion uuid, p_status integer)
returns boolean language plpgsql security definer set search_path = pg_catalog as $$
declare op public.archivos_operaciones_subida; cid uuid;
begin
  if auth.role() is distinct from 'service_role' or p_status is null or p_status not in (400,401,403,404,413,415,422) then
    raise exception using errcode = '42501';
  end if;
  select clinica_id into strict cid from public.archivos_operaciones_subida where id = p_operacion and actor_auth_id = p_actor;
  perform 1 from public.archivos_cuotas where clinica_id = cid for update;
  select * into strict op from public.archivos_operaciones_subida where id = p_operacion for update;
  if op.estado = 'cancelada' then return true; end if;
  if op.estado <> 'subiendo' or exists (select 1 from storage.objects where bucket_id = 'archivos-clinica'
      and name = op.ruta and archived_at is null) then return false; end if;
  update public.archivos_cuotas set bytes_reservados = bytes_reservados - op.bytes_verificados,
    actualizado_en = now() where clinica_id = cid;
  update public.archivos_operaciones_subida set estado = 'cancelada', actualizado_en = now() where id = op.id;
  return true;
end;
$$;

create function public.archivos_c4_marcar_incierta(p_actor uuid, p_operacion uuid)
returns void language plpgsql security definer set search_path = pg_catalog as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception using errcode = '42501'; end if;
  update public.archivos_operaciones_subida set estado = 'incierta', actualizado_en = now()
    where id = p_operacion and actor_auth_id = p_actor and estado = 'subiendo';
end;
$$;

create function public.archivos_c4_cuota(p_clinica uuid)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog as $$
declare q public.archivos_cuotas;
begin
  if not exists (select 1 from public.perfiles where auth_user_id = auth.uid() and activo
      and (rol = 'superadmin' or (clinica_id = p_clinica and rol in ('odontologo','odontologo_admin','recepcionista')))) then
    raise exception using errcode = '42501', message = 'CUOTA_NO_VISIBLE';
  end if;
  select * into q from public.archivos_cuotas where clinica_id = p_clinica;
  if not found then raise exception 'CUOTA_NO_INICIALIZADA'; end if;
  return jsonb_build_object('clinicaId', q.clinica_id, 'limiteBytes', q.limite_bytes,
    'bytesOcupados', q.bytes_ocupados, 'bytesReservados', q.bytes_reservados,
    'actualizadoEn', q.actualizado_en);
end;
$$;

-- Foto MVCC única del catálogo. JSON encapsulado evita truncamiento silencioso
-- de filas por PostgREST. Si excede 5000 candidatos NO se publica como completo.
create function public.archivos_c4_auditar(p_clinica uuid default null)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog as $$
declare reporte jsonb;
begin
  if not public.es_superadmin() or auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUDITORIA_DENEGADA';
  end if;
  with objetos as (
    select o.name as ruta, split_part(o.name,'/',1) as clinica,
      to_jsonb(o)->>'created_at' as fecha,
      exists (select 1 from public.archivos_operaciones_subida s where s.ruta = o.name
        and s.estado in ('reservada','subiendo','incierta')) as pendiente
    from storage.objects o where o.bucket_id = 'archivos-clinica' and o.archived_at is null
  ), candidatos as (
    select o.ruta, o.clinica, o.fecha, 'A'::text as tipo,
      case when o.pendiente then 'operacion_pendiente'
        when o.fecha is null then 'fecha_desconocida'
        when o.fecha::timestamptz > now() - interval '24 hours' then 'periodo_gracia'
        else null end as motivo
    from objetos o where not exists (select 1 from public.archivos a where a.ruta = o.ruta)
    union all
    select a.ruta, a.clinica_id::text, a.creado_en::text, 'B', null
    from public.archivos a where not exists (select 1 from objetos o where o.ruta = a.ruta)
  ), alcance as (
    select * from candidatos where p_clinica is null or clinica = p_clinica::text
  ), pagina as (select * from alcance order by clinica, ruta, tipo limit 5000)
  select jsonb_build_object('estado', case when (select count(*) from alcance) > 5000
      then 'indeterminado' else 'completo' end, 'fecha', now(), 'fuente', 'catalogo_storage',
    'totalCandidatos', (select count(*) from alcance),
    'candidatos', coalesce(jsonb_agg(jsonb_build_object('ruta', ruta, 'clinicaId', clinica,
      'fecha', fecha, 'tipo', case when motivo is null then tipo else 'indeterminado' end,
      'motivo', motivo)), '[]'::jsonb)) into reporte from pagina;
  return reporte;
end;
$$;

-- Cerrar bypass SIN ampliar ninguna policy clínica ni cambiar los helpers previos.
revoke insert on public.archivos from authenticated;
create policy archivos_c4_insert_backend on public.archivos as restrictive
  for insert to authenticated with check (false);
create policy archivos_c4_storage_solo_backend on storage.objects as restrictive
  for insert to public with check (bucket_id <> 'archivos-clinica');

-- No EXECUTE público implícito. Funciones de escritura SOLO backend.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as firma from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname ~ '^archivos_c4_' loop
    execute format('revoke all on function %s from public, anon, authenticated', f.firma);
    execute format('grant execute on function %s to service_role', f.firma);
  end loop;
end;
$$;
grant execute on function public.archivos_c4_cuota(uuid), public.archivos_c4_estado(uuid),
  public.archivos_c4_auditar(uuid) to authenticated;

comment on table public.archivos_cuotas is
  'Módulo 10: 5 GB decimales configurables, solo objetos vigentes de archivos-clinica. Contabilidad conservadora: no liberar por borrar metadata ni por timeout.';
comment on table public.archivos_operaciones_subida is
  'Reservas durables sin borrado automático. Estados inciertos conservan bytes hasta revisión/confirmación; no expiran por reloj.';
commit;

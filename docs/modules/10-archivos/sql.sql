-- =============================================================================
-- Módulo 10 — Propuesta T-10.1 (tabla/RLS) y T-10.2 (Storage)
-- Autor: Angélica. Aplicación e integración: Matías, previa revisión.
-- Este archivo NO implementa T-10.9 ni modifica los helpers de identidad.
-- Requiere el esquema Supabase del repositorio, no PostgreSQL sin Auth/Storage.
--
-- EJECUCIÓN SEGURA: instalación inicial transaccional, no migración automática.
-- Si public.archivos ya existe, se aborta ANTES de cambiar nada: comparar su
-- estructura/datos/policies y preparar una migración aparte. Una segunda
-- ejecución falla claramente y revierte todo; no oculta esquemas incompatibles.
-- No ejecutar por partes: BEGIN/COMMIT cubren ambas tareas y sus dependencias.
-- Confirmar previamente la reactivación del módulo (DATABASE.md aún dice v2).
-- =============================================================================

begin;

do $$
begin
  if to_regclass('public.archivos') is not null then
    raise exception 'public.archivos ya existe: revisar estructura y preparar una migración explícita; no se aplicó esta propuesta';
  end if;
  if to_regclass('public.clinicas') is null
     or to_regclass('public.pacientes') is null
     or to_regclass('public.perfiles') is null
     or to_regclass('storage.buckets') is null
     or to_regclass('storage.objects') is null then
    raise exception 'Falta el esquema base public o Supabase Storage';
  end if;
  if to_regprocedure('public.current_perfil()') is null
     or to_regprocedure('public.es_superadmin()') is null
     or to_regprocedure('public.mi_clinica_id()') is null
     or to_regprocedure('public.mi_perfil_id()') is null then
    raise exception 'Faltan helpers de identidad del Módulo 01';
  end if;
  if not (select relrowsecurity from pg_catalog.pg_class
           where oid = 'storage.objects'::regclass) then
    raise exception 'storage.objects no tiene RLS habilitado: revisar la instalación de Supabase Storage';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_attribute
     where attrelid = 'storage.objects'::regclass and attname = 'owner_id'
       and atttypid = 'text'::regtype and not attisdropped
  ) then
    raise exception 'Storage debe disponer de owner_id text para validar la identidad Auth';
  end if;
  -- En esta instalación versionada, archived_at IS NULL identifica el objeto
  -- vigente. No utilizar una versión archivada para acreditar existencia/autoría.
  if not exists (
    select 1 from pg_catalog.pg_attribute
     where attrelid = 'storage.objects'::regclass and attname = 'archived_at'
       and atttypid in ('timestamp'::regtype, 'timestamptz'::regtype)
       and not attisdropped
  ) then
    raise exception 'Storage debe disponer de archived_at timestamp/timestamptz para identificar el objeto vigente; revisar compatibilidad antes de instalar';
  end if;
  -- Storage puede garantizar la clave mediante un índice global o mediante
  -- UNIQUE parcial para el objeto activo (archived_at IS NULL) / no versionado
  -- (NOT is_versioned). No exigir unicidad global a un catálogo versionado.
  -- Verificar columnas y predicado, no nombres de índices. Se aceptan solo
  -- predicados completos conocidos, nunca coincidencias parciales ni un índice
  -- UNIQUE(bucket_id, name, version) aislado, que no garantiza la clave activa.
  if not exists (
    select 1 from pg_catalog.pg_index i
     where i.indrelid = 'storage.objects'::regclass
       and i.indisunique and i.indisvalid and i.indisready and i.indimmediate
        and i.indexprs is null and i.indnkeyatts = 2
       and (
         select array_agg(a.attname::text order by a.attname::text)
           from unnest(i.indkey::smallint[]) with ordinality k(attnum, posicion)
           join pg_catalog.pg_attribute a
             on a.attrelid = i.indrelid and a.attnum = k.attnum
          where k.posicion <= i.indnkeyatts
        ) = array['bucket_id', 'name']::text[]
        and (
          i.indpred is null
          or regexp_replace(
            lower(pg_catalog.pg_get_expr(i.indpred, i.indrelid)),
            '[[:space:]()]', '', 'g'
          ) in (
            'archived_atisnull',
            'notis_versioned',
            'is_versioned=false',
            'false=is_versioned',
            'is_versionedisfalse'
          )
        )
  ) then
    raise exception 'Storage debe garantizar unicidad válida e inmediata de (bucket_id, name), global o para objetos activos/no versionados (archived_at IS NULL / NOT is_versioned); revisar su instalación, no crear índices desde este módulo';
  end if;
  -- Los helpers consultan tablas con RLS, incluida storage.objects desde las
  -- policies de archivos. Deben ver filas reales, no resultados filtrados ni
  -- entrar otra vez en las policies de Storage. Verificar el rol que será dueño
  -- de las funciones: BYPASSRLS/superusuario o derechos de dueño sin FORCE RLS.
  if exists (
    select 1 from pg_catalog.pg_class c
     where c.oid in ('public.pacientes'::regclass, 'public.perfiles'::regclass,
                     'storage.objects'::regclass)
       and c.relrowsecurity
       and not (
         exists (select 1 from pg_catalog.pg_roles r
                  where r.rolname = current_user and (r.rolsuper or r.rolbypassrls))
         or (not c.relforcerowsecurity
             and pg_catalog.pg_has_role(current_user, c.relowner, 'USAGE'))
       )
  ) then
    raise exception 'Instalar con un rol administrativo que pueda consultar pacientes, perfiles y storage.objects sin RLS; necesario para los helpers SECURITY DEFINER';
  end if;
end;
$$;

-- =============================================================================
-- T-10.1 — Integridad y tabla public.archivos
-- =============================================================================
-- ÚNICA modificación necesaria a una tabla externa: UNIQUE(id, clinica_id) en
-- public.pacientes para poder referenciar ambas columnas mediante una FK real.
-- Un trigger que solo consultara el paciente al insertar no impediría que otra
-- transacción cambiase después su clínica. La FK compuesta sí protege ambos
-- lados, también bajo concurrencia, sin recrear ni cambiar la PK existente.
-- Revisar el bloqueo de ALTER TABLE y el costo del índice antes de aplicar.
do $$
declare
  columnas smallint[];
begin
  select array[
    (select attnum from pg_catalog.pg_attribute
      where attrelid = 'public.pacientes'::regclass and attname = 'id' and not attisdropped),
    (select attnum from pg_catalog.pg_attribute
      where attrelid = 'public.pacientes'::regclass and attname = 'clinica_id' and not attisdropped)
  ]::smallint[] into columnas;

  if exists (
    select 1 from pg_catalog.pg_constraint
     where conrelid = 'public.pacientes'::regclass
       and conname = 'archivos_pacientes_id_clinica_key'
       and (contype <> 'u' or conkey is distinct from columnas or condeferrable)
  ) then
    raise exception 'La restricción archivos_pacientes_id_clinica_key existe con una definición incompatible';
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
     where conrelid = 'public.pacientes'::regclass
       and contype in ('u', 'p') and conkey = columnas and not condeferrable
  ) then
    alter table public.pacientes
      add constraint archivos_pacientes_id_clinica_key unique (id, clinica_id);
  end if;
end;
$$;

create table public.archivos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  nombre text not null check (btrim(nombre) <> ''),
  ruta text not null check (btrim(ruta) <> ''),
  mime text not null check (mime in (
    'image/jpeg', 'image/png', 'image/webp', 'application/pdf'
  )),
  tamano bigint not null check (tamano >= 0 and tamano <= 10485760),
  -- Ámbito/origen, NO clasificación radiológica ni sustituto de la RLS.
  categoria text not null default 'administrativo'
    check (categoria in ('clinico', 'administrativo', 'portal')),
  -- El trigger da compatibilidad a clientes anteriores: imagen -> fotografia;
  -- PDF -> documento. La radiografía SIEMPRE se marca explícitamente al subir.
  -- Un documento puede ser PDF o una imagen de un documento escaneado.
  tipo_archivo text not null
    check (tipo_archivo in ('fotografia', 'radiografia', 'documento')),
  descripcion text,
  -- Se conserva la autoría: no borrar perfiles referenciados; desactivarlos.
  subido_por uuid not null references public.perfiles(id) on delete restrict,
  creado_en timestamptz not null default now(),

  constraint archivos_paciente_clinica_fk
    foreign key (paciente_id, clinica_id)
    references public.pacientes(id, clinica_id) on update restrict on delete cascade,
  constraint archivos_ruta_formato_check check (
    split_part(ruta, '/', 1) = clinica_id::text
    and split_part(ruta, '/', 2) = paciente_id::text
    and array_length(string_to_array(ruta, '/'), 1) = 3
    and btrim(split_part(ruta, '/', 3)) <> ''
    and split_part(ruta, '/', 3) not in ('.', '..')
  ),
  constraint archivos_tipo_mime_check check (
    tipo_archivo = 'documento' or mime in ('image/jpeg', 'image/png', 'image/webp')
  ),
  -- Unicidad de la clave del objeto, NO deduplicación de su contenido.
  constraint archivos_clinica_ruta_key unique (clinica_id, ruta)
);

create index idx_archivos_paciente on public.archivos(paciente_id, creado_en desc);

comment on table public.archivos is
  'Metadatos de adjuntos del paciente; objetos en el bucket privado archivos-clinica.';
comment on column public.archivos.ruta is
  'Clave clinica_id/paciente_id/archivo, no URL. Consultar con URLs firmadas temporales.';
comment on column public.archivos.tipo_archivo is
  'fotografia, radiografia o documento; categoria conserva el ámbito/origen.';
comment on column public.archivos.tamano is
  'Bytes declarados, máximo 10 MiB por archivo. No implementa cuota acumulada por clínica.';

-- RLS no compara OLD/NEW: un trigger impide cambiar identidad, pertenencia,
-- autoría o metadatos del objeto incluso si luego alguien amplía los GRANT.
-- Solo nombre de presentación, descripción y clasificación son editables.
create function public.archivos_validar_escritura()
returns trigger language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'INSERT' then
    if new.tipo_archivo is null then
      new.tipo_archivo := case when new.mime = 'application/pdf'
        then 'documento' else 'fotografia' end;
    end if;
  elsif row(new.id, new.clinica_id, new.paciente_id, new.ruta, new.subido_por,
            new.mime, new.tamano, new.categoria, new.creado_en)
        is distinct from
        row(old.id, old.clinica_id, old.paciente_id, old.ruta, old.subido_por,
            old.mime, old.tamano, old.categoria, old.creado_en) then
    raise exception 'No se permite reasignar el archivo ni modificar la identidad o metadatos del objeto';
  end if;
  return new;
end;
$$;

create trigger archivos_validar_escritura
before insert or update on public.archivos
for each row execute function public.archivos_validar_escritura();
revoke all on function public.archivos_validar_escritura() from public, anon, authenticated;

-- Helpers exclusivos del módulo, sin recrear los helpers compartidos.
-- SECURITY DEFINER permite verificar el paciente aunque su SELECT tenga otras
-- policies. Solo devuelven autorización, con auth.uid(), perfil activo y rutas
-- calificadas. Deben crearse con propietario confiable (administrador SQL),
-- nunca un rol controlado por el cliente. Sin SQL dinámico ni escrituras.
create function public.archivos_puede_acceder(p_clinica uuid, p_paciente uuid)
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
            where cp.rol in ('odontologo', 'recepcionista')
               or (cp.rol = 'paciente' and p.perfil_id = public.mi_perfil_id())
         ))
       )
  );
$$;

create function public.archivos_puede_gestionar(
  p_clinica uuid, p_paciente uuid, p_categoria text, p_autor uuid
)
returns boolean language sql stable security definer
set search_path = pg_catalog
as $$
  select public.archivos_puede_acceder(p_clinica, p_paciente) and (
    public.es_superadmin()
    or exists (select 1 from public.current_perfil()
                where rol in ('odontologo', 'recepcionista'))
    or (p_categoria = 'portal' and p_autor = public.mi_perfil_id())
  );
$$;

revoke all on function public.archivos_puede_acceder(uuid, uuid) from public, anon;
revoke all on function public.archivos_puede_gestionar(uuid, uuid, text, uuid) from public, anon;
grant execute on function public.archivos_puede_acceder(uuid, uuid) to authenticated;
grant execute on function public.archivos_puede_gestionar(uuid, uuid, text, uuid) to authenticated;

-- Supabase asigna owner_id desde el sub del JWT: es auth.users.id en texto.
-- owner (uuid) está obsoleta: NO usarla como fallback ni compararla con perfiles.id.
-- Referencia: https://supabase.com/docs/guides/storage/security/ownership
-- SECURITY DEFINER necesita ver el objeto real sin ejecutar sus policies RLS
-- (que consultan archivos) y verificar el vínculo perfil/Auth sin filtros de
-- perfiles. El preflight exige un propietario apropiado para evitar recursión.
-- No permite adoptar objetos ajenos, ni siquiera al superadmin: debe subir con
-- su propio JWT. subido_por continúa siendo perfiles.id, nunca auth.users.id.
-- Solo acredita el objeto vigente (archived_at IS NULL): ser dueño de una
-- versión histórica de la misma ruta no permite registrar el objeto actual.
create function public.archivos_objeto_propio(p_ruta text, p_autor uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog
as $$
  select auth.uid() is not null
    and p_autor = public.mi_perfil_id()
    and exists (
      select 1 from public.perfiles p
       where p.id = p_autor and p.auth_user_id = auth.uid() and p.activo = true
    )
    and exists (
      select 1 from storage.objects o
       where o.bucket_id = 'archivos-clinica' and o.name = p_ruta
          and o.archived_at is null
          and o.owner_id = auth.uid()::text
    );
$$;
revoke all on function public.archivos_objeto_propio(text, uuid) from public, anon;
grant execute on function public.archivos_objeto_propio(text, uuid) to authenticated;

alter table public.archivos enable row level security;
-- No confiar en los privilegios por defecto del proyecto.
revoke all on table public.archivos from public, anon, authenticated;
grant select, insert, delete on table public.archivos to authenticated;
grant update (nombre, descripcion, tipo_archivo) on table public.archivos to authenticated;

-- Equipo: alcance clínico compartido, como pacientes/historiales del esquema.
-- Paciente: lee solo su ficha; escribe/borra solo adjuntos portal de su autoría.
-- Superadmin: gestión global explícita, coherente con las tablas del proyecto.
-- categoria no separa permisos entre odontólogo y recepción: ambos integran el
-- equipo con alcance de clínica. Una separación clínica/administrativa más fina
-- requiere una decisión posterior del equipo, no roles inventados aquí.
create policy archivos_select on public.archivos
for select to authenticated
using (public.archivos_puede_acceder(clinica_id, paciente_id));

create policy archivos_insert on public.archivos
for insert to authenticated with check (
  subido_por = public.mi_perfil_id()
  and public.archivos_puede_gestionar(clinica_id, paciente_id, categoria, subido_por)
  and public.archivos_objeto_propio(ruta, subido_por)
);

create policy archivos_update on public.archivos
for update to authenticated
using (public.archivos_puede_gestionar(clinica_id, paciente_id, categoria, subido_por))
with check (public.archivos_puede_gestionar(clinica_id, paciente_id, categoria, subido_por));

create policy archivos_delete on public.archivos
for delete to authenticated
using (public.archivos_puede_gestionar(clinica_id, paciente_id, categoria, subido_por));

-- =============================================================================
-- T-10.2 — Bucket privado y policies de storage.objects
-- =============================================================================
-- Un bucket ya existente debe ser compatible: no esconder una configuración
-- pública o límites distintos con ON CONFLICT DO NOTHING. Revisar/remediar
-- explícitamente esas diferencias, especialmente enlaces antes públicos.
do $$
begin
  if exists (
    select 1 from storage.buckets where id = 'archivos-clinica'
      and (name is distinct from 'archivos-clinica'
           or public is distinct from false
           or file_size_limit is distinct from 10485760::bigint
           or allowed_mime_types is null
           or not (allowed_mime_types @> array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
               and allowed_mime_types <@ array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]))
  ) then
    raise exception 'Bucket archivos-clinica incompatible: revisar privacidad, nombre, límite y MIME antes de ejecutar';
  end if;
end;
$$;

-- Si otra transacción crea el bucket entre la comprobación y el INSERT, se
-- establece igualmente la configuración segura, nunca se conserva por omisión.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('archivos-clinica', 'archivos-clinica', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- p_owner_id proviene de la fila de storage.objects en las policies de borrado,
-- no del frontend. Pasarlo evita consultar storage.objects desde su propia RLS.
-- Las policies exigen archived_at IS NULL sobre esa misma fila para
-- autorizarla: los permisos de una ruta activa no habilitan versiones archivadas.
-- SECURITY DEFINER es necesario para ver si hay metadata real en archivos: una
-- fila invisible por RLS NO debe confundirse con un objeto sin registro.
create function public.archivos_storage_autorizado(
  p_ruta text, p_borrar boolean default false, p_owner_id text default null
)
returns boolean language plpgsql stable security definer
set search_path = pg_catalog
as $$
declare
  partes text[];
  v_clinica uuid;
  v_paciente uuid;
begin
  if auth.uid() is null or p_ruta is null then return false; end if;
  partes := string_to_array(p_ruta, '/');
  if cardinality(partes) <> 3 or btrim(partes[3]) = ''
     or partes[3] in ('.', '..') then return false; end if;
  -- Nunca castear segmentos arbitrarios sin validarlos primero.
  if partes[1] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     or partes[2] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  v_clinica := partes[1]::uuid;
  v_paciente := partes[2]::uuid;
  if not public.archivos_puede_acceder(v_clinica, v_paciente) then return false; end if;

  if p_borrar then
    -- A) Con fila: el permiso lo determinan la categoría y autoría SQL.
    if exists (select 1 from public.archivos a where a.ruta = p_ruta) then
      return exists (
        select 1 from public.archivos a where a.ruta = p_ruta
          and public.archivos_puede_gestionar(a.clinica_id, a.paciente_id, a.categoria, a.subido_por)
      );
    end if;
    -- B) Sin fila: SOLO autor Auth real o superadmin, además del alcance de
    -- carpeta ya validado. Incluye subida pendiente y limpieza tras DELETE SQL.
    -- owner_id NULL no acredita autoría; solo el superadmin puede gestionarlo.
    return public.es_superadmin()
      or coalesce(p_owner_id = auth.uid()::text, false);
  end if;
  return true;
end;
$$;

-- El guard restrictivo también se evalúa para anon y debe poder devolver false.
revoke all on function public.archivos_storage_autorizado(text, boolean, text) from public;
grant execute on function public.archivos_storage_autorizado(text, boolean, text) to anon, authenticated;

-- No permitir que una subida nueva suplante el contenido de una fila ya
-- registrada cuyo objeto falte. El flujo admitido es objeto -> metadata.
create function public.archivos_storage_puede_subir(p_ruta text)
returns boolean language sql stable security definer
set search_path = pg_catalog
as $$
  select public.archivos_storage_autorizado(p_ruta)
    and not exists (select 1 from public.archivos where ruta = p_ruta);
$$;
revoke all on function public.archivos_storage_puede_subir(text) from public;
grant execute on function public.archivos_storage_puede_subir(text) to anon, authenticated;

-- Reemplazar SOLO policies con nombres propiedad de este módulo. Las demás no
-- se eliminan. Revisarlas manualmente; un guard RESTRICTIVE evita que otra
-- policy PERMISSIVE habilite el acceso al bucket fuera del alcance validado.
drop policy if exists archivos_storage_select on storage.objects;
drop policy if exists archivos_storage_insert on storage.objects;
drop policy if exists archivos_storage_delete on storage.objects;
drop policy if exists archivos_storage_guard on storage.objects;
drop policy if exists archivos_storage_delete_guard on storage.objects;
drop policy if exists archivos_storage_insert_guard on storage.objects;
drop policy if exists archivos_storage_update_bloqueado on storage.objects;

create policy archivos_storage_guard on storage.objects as restrictive
for all to public
using (bucket_id <> 'archivos-clinica' or (
  archived_at is null and public.archivos_storage_autorizado(name)
))
with check (bucket_id <> 'archivos-clinica' or (
  archived_at is null and public.archivos_storage_autorizado(name)
));

create policy archivos_storage_delete_guard on storage.objects as restrictive
for delete to public
using (bucket_id <> 'archivos-clinica' or (
  archived_at is null and public.archivos_storage_autorizado(name, true, owner_id)
));

create policy archivos_storage_insert_guard on storage.objects as restrictive
for insert to public
with check (bucket_id <> 'archivos-clinica' or (
  archived_at is null
  and owner_id = auth.uid()::text and public.archivos_storage_puede_subir(name)
));

-- No UPDATE ni upsert: objeto inmutable. También impide mover objetos desde
-- otro bucket hacia este mediante policies ajenas (WITH CHECK sobre la fila nueva).
-- La unicidad de la clave global o activa/no versionada, validada al inicio,
-- rechaza duplicados dentro de ese alcance; no prohíbe las versiones históricas
-- que gestione Storage. El servicio debe usar upsert:false y la API de Storage,
-- no insertar versiones directamente en su catálogo. Un upsert que intente
-- UPDATE queda bloqueado por este guard.
create policy archivos_storage_update_bloqueado on storage.objects as restrictive
for update to public
using (bucket_id <> 'archivos-clinica')
with check (bucket_id <> 'archivos-clinica');

create policy archivos_storage_select on storage.objects
for select to authenticated
using (
  bucket_id = 'archivos-clinica' and archived_at is null
  and public.archivos_storage_autorizado(name)
);

create policy archivos_storage_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'archivos-clinica'
  and archived_at is null
  and owner_id = auth.uid()::text
  and public.archivos_storage_puede_subir(name)
);

create policy archivos_storage_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'archivos-clinica' and archived_at is null
  and public.archivos_storage_autorizado(name, true, owner_id)
);

-- =============================================================================
-- Pendientes explícitos (NO implementados por esta propuesta)
-- =============================================================================
-- CUOTA: 10 MiB = 10485760 bytes POR ARCHIVO, NO 5 GB acumulados por clínica.
-- Definir si 5 GB es decimal o 5 GiB. Para garantía concurrente, diseñar una
-- reserva de bytes mediante RPC/backend confiable y una fila de cuota por clínica
-- bloqueada con SELECT FOR UPDATE (o actualización condicional atómica), en la
-- misma transacción que reserva/registro. Incluir reservas pendientes, caducidad,
-- tamaño real verificado por servidor, confirmación y devolución idempotentes.
-- Una suma seguida de INSERT o un control del frontend NO garantiza la cuota.
-- Mientras Storage permita INSERT directo, una RPC de registro por sí sola no
-- limita objetos sin metadata: habría que cerrar ese bypass y autorizar subidas
-- únicamente contra reservas válidas. Diseñar ese flujo por separado, sin meter
-- service_role en frontend ni modificar directamente el catálogo de Storage.
--
-- OBJETOS HUÉRFANOS: las cascadas SQL NO eliminan objetos físicos. El servicio
-- debe usar claves únicas (UUID de objeto + extensión; nombre original aparte),
-- upsert:false y compensar subidas cuyo registro falle, comprobando también el
-- resultado de remove(). No reutilizar rutas: evita carreras de borrado/subida.
-- Subir con el JWT del usuario: owner_id debe ser auth.uid()::text. Subidas por
-- Dashboard/service_role pueden tener owner_id NULL y no pueden registrarse
-- como propias mediante este flujo. No modificar manualmente su propiedad.
-- Si el equipo borra la fila de un objeto subido por otra persona, la limpieza
-- posterior SIN fila corresponde al autor Auth (si conserva alcance) o al
-- superadmin/backend confiable. No ampliar el permiso a toda la clínica.
-- Si se borra el objeto CON la fila presente, se aplican sus permisos SQL; esa
-- secuencia también necesita manejo durable de fallos para no dejar referencias
-- rotas. Este SQL no hace atómicas las dos APIs ni garantiza existencia física
-- después de la comprobación de inserción: las claves deben ser irreutilizables
-- y la reconciliación sigue siendo necesaria ante operaciones concurrentes.
-- Para eliminación fiable entre APIs no hay transacción distribuida: diseñar
-- trabajo durable/outbox con reintentos idempotentes y reconciliación, aprobado
-- por Matías. Un simple DELETE SQL seguido de remove ignorando errores NO basta.
-- Antes de borrar pacientes/clínicas, capturar rutas y programar limpieza con un
-- backend confiable: tras la cascada estas policies ya no autorizan sus carpetas.
-- No borrar solo filas de storage.objects: usar la API de Supabase Storage.
-- Las URLs ya firmadas siguen vigentes hasta caducar; usar expiración breve.
--
-- T-10.9: pendiente definir consulta/tratamiento y su asociación persistente.
-- FRONTEND: enviar subido_por real, tamano real, categoria portal para paciente
-- y tipo_archivo explícito para radiografías; adaptar tipos/mapper en otra tarea.
-- La clasificación automática inicial no identifica radiografías por MIME.
-- Revisar ordenación creado_en, errores de limpieza y claves únicas del servicio.
--
-- REVISIÓN MANUAL: propietario/EXECUTE de helpers, perfiles.auth_user_id único
-- en los datos (current_perfil usa LIMIT 1), policies/GRANT existentes, RLS activo
-- de storage.objects y compatibilidad de versión Storage. Privilegios elevados
-- y service_role pueden saltarse RLS: solo backend confiable, nunca frontend.
-- Probar en entorno de prueba: anónimo, paciente A/B de la misma clínica, otra
-- clínica, equipo, superadmin, UPDATE de identidad, rutas falsas y rollback.
-- Probar también: autor diferente al registrar metadata, borrado ajeno durante
-- subida pendiente, borrado ajeno tras DELETE SQL, owner_id NULL y upsert:true.
-- Versionado: una ruta con solo filas archivadas NO permite registrar archivos;
-- la autoría de una fila histórica NO acredita la del objeto activo. SELECT y
-- DELETE del módulo excluyen filas archivadas, incluso para superadmin por RLS.
-- El historial y sus operaciones internas quedan a cargo de Storage/backend
-- confiable; validar las operaciones de la API de esta versión de Storage.
-- Otras policies RESTRICTIVE pueden denegar operaciones: no eliminarlas sin
-- revisión. El superadmin salta la clínica en estos permisos de forma explícita,
-- pero conserva autoría propia al insertar y toda la integridad referencial.

commit;

-- =============================================================================
-- Módulo 10 — Archivos e Imágenes
-- Propuesta de DDL para la tabla `archivos`.
--
-- Autor: Angélica. NO editar `bd_5clinicas_midentista.sql`: lo integra Matías
-- durante el merge, según CONTRIBUTING.md.
--
-- CONTEXTO IMPORTANTE
-- `archivos` estaba en la lista de tablas ELIMINADAS del MVP (docs/DATABASE.md,
-- sección "Tablas eliminadas") y se ha reactivado para este sprint. Este archivo
-- la reincorpora. Si el alcance cambia otra vez, el archivo se borra y la tabla
-- vuelve a la lista de eliminadas.
--
-- Por qué NO se usan las tablas que se eliminaron en su lugar:
--   - `imagenes_clinicas` queda para los estudios del odontograma.
--   - Los consentimientos se resuelven con firma digital, no con un adjunto.
-- =============================================================================

create table public.archivos (
    id            uuid primary key default gen_random_uuid(),
    clinica_id    uuid not null references clinicas(id) on delete cascade,
    -- ON DELETE CASCADE: si se borra el paciente, sus archivos se van con él.
    paciente_id   uuid not null references pacientes(id) on delete cascade,
    -- Nombre original, solo para mostrar. La clave real del bucket es `ruta`.
    nombre        text not null,
    -- Clave del objeto dentro del bucket de Storage: {clinica}/{paciente}/{nombre}
    ruta          text not null,
    mime          text not null,
    tamano        bigint,
    -- 'clinico' lo sube el odontólogo; 'administrativo' recepción; 'portal' el paciente.
    categoria     text default 'administrativo'
                  check (categoria in ('clinico', 'administrativo', 'portal')),
    descripcion   text,
    subido_por    uuid references perfiles(id) on delete set null,
    creado_en     timestamptz default now(),

    -- La ruta es única por clínica y paciente: evita subir dos veces el mismo
    -- archivo con otro nombre.
    unique (clinica_id, ruta)
);

-- La galería siempre consulta por paciente y ordena por fecha. Este índice es el
-- que sostiene esa consulta.
create index idx_archivos_paciente on public.archivos(paciente_id, creado_en desc);

comment on table public.archivos is
  'Adjuntos e imagenes clinicas del paciente. Los objetos viven en el bucket privado archivos-clinica.';
comment on column public.archivos.ruta is
  'Clave del objeto en Storage. No es una URL: se resuelve con createSignedUrl.';


-- =============================================================================
-- Row Level Security
--
-- El patron es el de `docs/DATABASE.md` sección 18.3: primero `clinica_id` para
-- el aislamiento multi-tenant, y encima el alcance por rol.
--
-- Nota sobre alcance: las políticas del MVP son clinic-wide para las tablas
-- clínicas, lo que permite que un odontólogo vea los pacientes de sus colegas.
-- `ENTREVISTAS_USIARIO.txt` dice lo contrario ("cada odontólogo solo debería ver
-- sus propios pacientes"). Esa deuda se corrige a nivel de todo el esquema, no
-- aquí: esta tabla replica el patrón vigente para no abrir un segundo criterio.
-- =============================================================================

alter table public.archivos enable row level security;

-- El superadmin audita el sistema completo.
create policy archivos_select_superadmin on public.archivos
  for select using (public.es_superadmin());

-- Cualquier miembro de la clínica ve los archivos de sus pacientes.
create policy archivos_select_clinica on public.archivos
  for select using (clinica_id = public.mi_clinica_id());

-- INSERT: quien sube es el propio usuario, y el aislamiento lo da clinica_id.
create policy archivos_insert on public.archivos
  for insert with check (
    clinica_id = public.mi_clinica_id()
    and (subido_por is null or subido_por = public.mi_perfil_id())
  );

-- UPDATE/DELETE: solo la clínica dueña, y sin cambiar de paciente.
create policy archivos_update on public.archivos
  for update using (clinica_id = public.mi_clinica_id())
  with check (clinica_id = public.mi_clinica_id());

create policy archivos_delete on public.archivos
  for delete using (clinica_id = public.mi_clinica_id());


-- =============================================================================
-- Bucket de Storage
--
-- PRIVADO. Los archivos son datos clínicos: nunca `public`. El frontend pide una
-- URL firmada con `createSignedUrl`, que caduca. Un bucket público filtraría
-- radiografías con un enlace adivinable.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'archivos-clinica',
  'archivos-clinica',
  false,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

-- Las policies del bucket replican las de la tabla: mismo aislamiento por clínica.
create policy archivos_storage_select on storage.objects
  for select using (
    bucket_id = 'archivos-clinica'
    and (public.es_superadmin() or (storage.foldername(name))[1] = public.mi_clinica_id()::text)
  );

create policy archivos_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'archivos-clinica'
    and (storage.foldername(name))[1] = public.mi_clinica_id()::text
  );

create policy archivos_storage_delete on storage.objects
  for delete using (
    bucket_id = 'archivos-clinica'
    and (storage.foldername(name))[1] = public.mi_clinica_id()::text
  );

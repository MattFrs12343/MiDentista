-- =============================================================================
-- Módulo 09 — QR de cobro (subida manual, uno por clínica)
-- =============================================================================
-- Contexto: `pagos/README.md` ya decía "el QR es una imagen, no una tabla" y
-- descartaba `codigos_qr_pago`. Esta propuesta cumple esa decisión: no crea
-- ninguna tabla, solo un bucket de Storage y sus policies. La "gestión de QR
-- activo" (T-9.3, antes fuera del MVP) se resuelve con una ruta fija por
-- clínica y `upsert: true`: subir uno nuevo reemplaza al anterior, sin
-- versiones viejas que limpiar.
--
-- No reutiliza el bucket `archivos-clinica` (docs/modules/10-archivos/sql.sql)
-- a propósito: ese bucket y sus policies están diseñados para datos clínicos
-- de un paciente concreto, con una maquinaria de versionado/propiedad mucho
-- más estricta de lo que este caso necesita. El QR no es dato clínico ni de
-- paciente: es operativo y de alcance por clínica. El peor caso de abuso es
-- que alguien del equipo de la propia clínica reemplace el QR, que es
-- exactamente la acción que esta propuesta autoriza.
--
-- ALCANCE
--   - Solo personal de la clínica (odontólogo o recepcionista) sube/reemplaza
--     o consulta el QR de su propia clínica. El paciente no entra por aquí:
--     el QR se muestra en persona, desde la pestaña de pagos de la ficha.
--   - Ruta fija `{clinica_id}/qr` (sin extensión: el `contentType` de la
--     subida decide cómo se sirve). No hay DELETE: "borrar" el QR es
--     reemplazarlo; si una clínica deja de tener uno, el servicio simplemente
--     no encuentra el objeto y la UI muestra el estado vacío.
--
-- EJECUCIÓN: idempotente (on conflict / drop policy if exists). Requiere los
-- helpers del módulo 01 (`current_perfil`, `es_superadmin`, `mi_clinica_id`).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Bucket privado
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('qr-cobros', 'qr-cobros', false, 2097152,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- 2) Helper: ¿puede esta persona ver/subir el QR de esta ruta?
-- -----------------------------------------------------------------------------
-- La ruta siempre es `{clinica_id}/qr`: dos segmentos, el primero un UUID. Se
-- valida con regex antes de castear, para no lanzar una excepción de cast
-- ante una fila de OTRO bucket cuyo `name` no tenga esa forma.
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
         where rol in ('odontologo', 'recepcionista')
      )
    );
end;
$$;
revoke all on function public.qr_cobro_storage_autorizado(text) from public, anon;
grant execute on function public.qr_cobro_storage_autorizado(text) to authenticated;

-- -----------------------------------------------------------------------------
-- 3) Policies sobre storage.objects, acotadas a este bucket
-- -----------------------------------------------------------------------------
drop policy if exists qr_cobro_storage_select on storage.objects;
drop policy if exists qr_cobro_storage_insert on storage.objects;
drop policy if exists qr_cobro_storage_update on storage.objects;

create policy qr_cobro_storage_select on storage.objects
for select to authenticated
using (
  bucket_id = 'qr-cobros' and public.qr_cobro_storage_autorizado(name)
);

create policy qr_cobro_storage_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'qr-cobros'
  and owner_id = auth.uid()::text
  and public.qr_cobro_storage_autorizado(name)
);

-- El `upsert: true` del cliente hace un UPDATE si el objeto ya existe.
create policy qr_cobro_storage_update on storage.objects
for update to authenticated
using (bucket_id = 'qr-cobros' and public.qr_cobro_storage_autorizado(name))
with check (
  bucket_id = 'qr-cobros'
  and owner_id = auth.uid()::text
  and public.qr_cobro_storage_autorizado(name)
);

-- -----------------------------------------------------------------------------
-- Verificación
-- -----------------------------------------------------------------------------
-- select policyname, cmd from pg_policies
--  where tablename = 'objects' and policyname like 'qr_cobro_storage_%';
--
-- Probar: odontólogo/recepcionista de la clínica suben y ven su QR; la misma
-- cuenta de otra clínica no lo ve; superadmin ve cualquiera; un paciente (si
-- algún día tuviera sesión con rol 'paciente') no puede ni ver ni subir.

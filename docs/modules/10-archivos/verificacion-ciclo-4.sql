-- SOLO lectura de catálogos/datos + fixtures TEMPORALES con ROLLBACK.
-- Matías: revisar primero en proyecto de pruebas; no ejecutar desde el agente.
begin;

do $$
declare nombre text;
begin
  foreach nombre in array array['archivos_cuotas','archivos_operaciones_subida'] loop
    if not (select relrowsecurity from pg_class where oid = to_regclass('public.' || nombre)) then
      raise exception 'Falta RLS en %', nombre;
    end if;
    if has_table_privilege('authenticated', 'public.' || nombre, 'INSERT')
       or has_table_privilege('authenticated', 'public.' || nombre, 'UPDATE')
       or has_table_privilege('authenticated', 'public.' || nombre, 'DELETE') then
      raise exception 'Escritura directa inesperada en %', nombre;
    end if;
  end loop;
  if has_function_privilege('authenticated',
      'public.archivos_c4_reservar(uuid,uuid,uuid,bigint,text,jsonb)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.archivos_c4_confirmar(uuid,uuid)', 'EXECUTE') then
    raise exception 'RPC privilegiada expuesta';
  end if;
  if has_table_privilege('authenticated', 'public.archivos', 'INSERT') then
    raise exception 'Continúa abierto INSERT directo de metadata';
  end if;
  if not exists (select 1 from pg_policy where polrelid='storage.objects'::regclass
      and polname='archivos_c4_storage_solo_backend' and not polpermissive) then
    raise exception 'Falta cierre restrictivo de uploads directos';
  end if;
  if not exists (select 1 from pg_policy where polrelid='public.archivos'::regclass
      and polname='archivos_asociacion_insert_guard' and not polpermissive)
     or not exists (select 1 from pg_trigger where tgrelid='public.archivos'::regclass
      and tgname='archivos_asociacion_inmutable' and tgenabled='O') then
    raise exception 'Se perdieron protecciones T-10.9';
  end if;
end;
$$;

-- Inspección administrativa: no confundir ambos totales. Una reserva cuyo objeto
-- ya existe continúa reservada hasta confirmar; no sumar de nuevo su tamaño.
select q.clinica_id, q.limite_bytes, q.bytes_ocupados, q.bytes_reservados,
  greatest(0, q.limite_bytes-q.bytes_ocupados-q.bytes_reservados) as disponibles,
  (select coalesce(sum(a.tamano),0) from public.archivos a where a.clinica_id=q.clinica_id) as bytes_declarados_metadata
from public.archivos_cuotas q order by clinica_id;

select id, clinica_id, estado, bytes_verificados, creado_en, actualizado_en
from public.archivos_operaciones_subida where estado in ('reservada','subiendo','incierta')
order by creado_en;

-- Misma condición matemática, sin objetos gigantes ni modificación persistente.
create temporary table c4_limites (
  ocupados bigint, reservados bigint, nuevos bigint, limite bigint, esperado boolean
);
insert into c4_limites values
  (4999999000,0,500,5000000000,true),
  (4999999000,0,1000,5000000000,true),
  (4999999000,0,1001,5000000000,false),
  (80,10,10,100,true), (80,10,11,100,false);
do $$
begin
  if exists (select 1 from c4_limites where (ocupados+reservados+nuevos<=limite) <> esperado) then
    raise exception 'Falló condición de cuota';
  end if;
end;
$$;

-- Inventario SQL A/B con fixtures, incluyendo otro bucket y versión archivada.
create temporary table c4_objetos(bucket_id text, name text, archived_at timestamptz);
create temporary table c4_filas(ruta text);
insert into c4_objetos values
  ('archivos-clinica','valido',null), ('archivos-clinica','sin_fila',null),
  ('qr-cobros','otro_bucket',null), ('archivos-clinica','solo_archivado',now());
insert into c4_filas values('valido'),('sin_objeto'),('solo_archivado');
do $$
begin
  if (select count(*) from c4_objetos o where o.bucket_id='archivos-clinica' and o.archived_at is null
      and not exists(select 1 from c4_filas a where a.ruta=o.name)) <> 1 then
    raise exception 'Falló detección A';
  end if;
  if (select count(*) from c4_filas a where not exists(select 1 from c4_objetos o
      where o.bucket_id='archivos-clinica' and o.archived_at is null and o.name=a.ruta)) <> 2 then
    raise exception 'Falló detección B';
  end if;
end;
$$;
rollback;

-- ENSAYOS REALES PENDIENTES, SOLO CLÍNICA/PROYECTO DE PRUEBA CON AUTORIZACIÓN:
-- 1. Con JWT de clínica A, archivos_c4_cuota(B) falla; nunca devuelve uso cero.
-- 2. anon/equipo/paciente no ejecutan archivos_c4_auditar; superadmin sí.
-- 3. authenticated no ejecuta reservar/confirmar/cancelar ni INSERT Storage directo.
-- 4. Recepción no obtiene evolución mediante RPC existente ni por backend nuevo.
-- 5. Dos sesiones/requests independientes, cuota 6 MiB y dos archivos de 4 MiB:
--    solo uno debe llegar a Storage. Comprobar FOR UPDATE sobre la misma cuota.
-- 6. Repetir mismo operacionId+hash/payload: una fila/objeto/cargo. Cambiar hash: rechazo.
-- 7. Cortar respuesta después de Storage: reserva retenida; consulta estado/repetición
--    con la misma operación confirma sin upload nuevo. Nunca cancelar por reloj.
-- 8. Cuota de defensa: Matías puede configurar exclusivamente la clínica descartable:
--    UPDATE public.archivos_cuotas SET limite_bytes=2097152, actualizado_en=now()
--      WHERE clinica_id='<UUID_CLINICA_EXCLUSIVA_DE_PRUEBAS>'::uuid;
--    No ejecutar tal cual ni sobre clínicas reales. Restaurar limite_bytes=5000000000.
-- 9. Fixtures A/B únicamente en proyecto desechable; este verificador NO crea
--    huérfanos reales, NO borra filas, NO llama Storage.remove y NO altera cuotas reales.

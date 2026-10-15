-- ============================================================================
-- RLS de public.evoluciones_clinicas — Módulo 06 Evolución Clínica
-- ============================================================================
-- Autor : Lucas (Dev 6), dueño del módulo 06
-- Fecha : 2026-10-04
-- Dónde : aplicado a mano en el editor web de Supabase, proyecto
--         aoarcxvqlidcvytkxbmq. NO está en bd_5clinicas_midentista.sql.
--
-- QUÉ ES ESTE ARCHIVO
-- Registro de lo que ya está aplicado en la base, para que el Product Owner
-- lo integre en bd_5clinicas_midentista.sql (bloque de policies, después de la
-- línea 856) y lo documente en docs/DATABASE.md sección 11. Ver AGENTS.md §7 y
-- CONTRIBUTING.md. Este archivo no se aplica: se lee, se copia, se integra.
--
-- POR QUÉ FALTA
-- La tabla existe desde el esquema base (bd_5clinicas_midentista.sql:242) pero
-- nunca se le activó RLS. Como el frontend consulta con la anon key
-- (frontend/src/lib/supabase.ts), el RLS era la única barrera: cualquier
-- usuario autenticado —incluido un recepcionista— podía leer y escribir
-- evoluciones de las cinco clínicas. Con información clínica de pacientes, eso
-- no podía quedar abierto.
--
-- UNA ADVERTENCIA QUE COSTARÍA TIEMPO
-- Activar RLS sin que exista ninguna policy deja la tabla en *deny-all*: no es
-- un estado permisivo sino de bloqueo total, y Postgres no avisa. Entre el
-- `alter table` y el `create policy` el módulo 06 dejó de cargar evoluciones.
-- Aplicar el `alter table` solo cuando las policies ya estén escritas.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Activar RLS
-- ----------------------------------------------------------------------------
alter table public.evoluciones_clinicas enable row level security;

-- ----------------------------------------------------------------------------
-- 2) SELECT — odontólogo y owner de la clínica leen; recepcionista no; el
--    paciente solo lee las suyas.
-- ----------------------------------------------------------------------------
drop policy if exists evoluciones_select on public.evoluciones_clinicas;
create policy evoluciones_select on public.evoluciones_clinicas for select
  using (
    public.es_superadmin()
    or (
      public.mi_clinica_id() = clinica_id
      and exists (
        select 1 from public.current_perfil()
         where rol in ('odontologo', 'odontologo_admin')
      )
    )
    or exists (
      select 1
        from public.pacientes p
        join public.current_perfil() cp on cp.perfil_id = p.perfil_id
       where p.id = evoluciones_clinicas.paciente_id
         and cp.rol = 'paciente'
    )
  );

-- ----------------------------------------------------------------------------
-- 3) INSERT — solo odontólogo o owner, y dentro de su propia clínica
-- ----------------------------------------------------------------------------
drop policy if exists evoluciones_insert on public.evoluciones_clinicas;
create policy evoluciones_insert on public.evoluciones_clinicas for insert
  with check (
    public.es_superadmin()
    or (
      public.mi_clinica_id() = clinica_id
      and exists (
        select 1 from public.current_perfil()
         where rol in ('odontologo', 'odontologo_admin')
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 4) UPDATE — misma condición que el SELECT, para que recepción no edite
-- ----------------------------------------------------------------------------
drop policy if exists evoluciones_update on public.evoluciones_clinicas;
create policy evoluciones_update on public.evoluciones_clinicas for update
  using (
    public.es_superadmin()
    or (
      public.mi_clinica_id() = clinica_id
      and exists (
        select 1 from public.current_perfil()
         where rol in ('odontologo', 'odontologo_admin')
      )
    )
  );

-- No hay policy de DELETE: el módulo 06 no borra evoluciones. Con RLS activo y
-- sin policy de DELETE, el borrado queda denegado para todos salvo superadmin.
--
-- ----------------------------------------------------------------------------
-- Verificación
-- ----------------------------------------------------------------------------
-- Debe devolver 3 filas:
--   select policyname, cmd from pg_policies
--    where tablename = 'evoluciones_clinicas' order by cmd;
--
-- Comprobado el 2026-10-04 con el usuario ayrthon.rojas@dentalcristorey.com:
--   odontólogo de la clínica, su paciente  -> ve sus evoluciones
--   odontólogo de otra clínica             -> 0 evoluciones
--   recepcionista                          -> 0 evoluciones
--   crear una evolución                   -> persiste
--   editar una evolución                   -> funciona
--
-- ============================================================================
-- DECISIONES QUE QUEDAN PARA EL PRODUCT OWNER
-- ============================================================================
--
-- 1) INTEGRAR EN EL ESQUEMA. Lo de arriba vive solo en la base. Mientras no
--    entre en bd_5clinicas_midentista.sql, el proyecto describe mal su propia
--    base: quien la reconstruya desde el archivo se queda sin RLS y no hay
--    forma de que se entere.
--
-- 2) TRES CAMINOS EVITAN EL RLS. Ninguno es un error de este SQL, pero conviene
--    saber que existen antes de confiar ciegamente en las policies:
--
--    a) El dueño de la tabla. Con `relforcerowsecurity = false` —que es el
--       estado actual— el dueño lee y escribe sin verse afectado. api/server.js
--       se conecta con PGHOST/PGUSER/PGPASSWORD: si PGUSER es `postgres`, entra
--       como dueño. Hoy ese servidor solo hace login y recuperación de
--       contraseña, no lee evoluciones, así que el riesgo es latente.
--
--    b) service_role. supabase/functions/api/index.ts usa el cliente `admin`,
--       que tiene bypassrls y saltar por las policies. Hoy solo toca perfiles y
--       auth. Si algún día se le suma una lectura de evoluciones, el RLS no la
--       va a frenar.
--
--    c) superadmin. Es la primera condición de las cuatro policies, por diseño:
--       el superadmin audita el sistema completo.
--
--    `force row level security` cerraría (a), pero no (b), y afecta a todas las
--    consultas de la tabla: una policy mal escrita deja la app sin datos y el
--    síntoma se confunde con un bug de negocio. No se aplicó. Decisión del PO.
--
-- 3) odontologo_admin. Aparece en las policies a propósito. Todavía NO existe
--    en el constraint de perfiles.rol (bd_5clinicas_midentista.sql:104 solo
--    admite odontologo, recepcionista, paciente, superadmin), así que hoy la
--    comparación nunca hace match y es inofensiva. Empezará a ser operativa
--    cuando se agregue el rol al constraint.
--
-- 4) NO SE CREÓ public.mi_paciente_id(). La política del paciente resuelve el
--    vínculo con un exists inline sobre pacientes.perfil_id. Agregar una función
--    es cambio de arquitectura y le corresponde al PO. Si más adelante se crea,
--    esta policy se puede simplificar.
--
-- 5) NO HAY CARPETA supabase/migrations/. AGENTS.md la menciona, pero en el
--    repo solo existen supabase/.temp/ y supabase/functions/. No hay lugar
--    versionado donde una migration viva, y por eso este cambio quedó solo en la
--    base. Crear esa carpeta evitaría que el próximo cambio manual se pierda.
--
-- 6) DATO DE PRUEBA PENDIENTE DE BORRAR. Al verificar el INSERT se creó una
--    evolución de prueba (el count de la tabla pasó de 5 a 6). No se puede borrar
--    desde la app porque no hay policy de DELETE; hay que hacerlo desde el
--    editor de Supabase, que corre como dueño de la tabla. Le corresponde al PO
--    confirmar ese borrado: es un cambio en una base compartida con datos
--    clínicos.
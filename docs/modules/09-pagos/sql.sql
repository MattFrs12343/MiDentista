-- =============================================================================
-- Módulo 09 — Pagos y Cuentas
-- Propuesta de Row Level Security para la tabla `pagos`.
--
-- Autor: Carlos. NO editar `bd_5clinicas_midentista.sql`: lo integra Matías
-- durante el merge, según CONTRIBUTING.md (regla 7). Este archivo es solo la
-- propuesta; queda pendiente de aprobación del PO.
--
-- CONTEXTO IMPORTANTE
-- La tabla `pagos` YA EXISTE en `bd_5clinicas_midentista.sql` (sección 2.15)
-- con sus tres índices (`idx_pagos_paciente`, `idx_pagos_clinica`,
-- `idx_pagos_estado`). Lo que falta es la RLS: `pagos` quedó fuera del bloque de
-- políticas del esquema. Hoy, con la anon key, cualquier usuario autenticado
-- puede leer y escribir los cobros de todas las clínicas. Este archivo cierra
-- ese hueco.
--
-- ALCANCE (ver README del módulo, "Permisos esperados")
--   - Recepción y odontólogo registran y editan pagos: hay clínicas que
--     operan sin recepcionista, así que el odontólogo también cobra.
--   - El paciente NO entra por RLS. Su estado de cuenta lo sirve la Edge
--     Function `paciente/mi-ficha` (service_role), que solo devuelve sus filas.
--     Por eso las políticas EXCLUYEN el rol 'paciente': con el patrón
--     clinic-wide, un paciente afiliado (`mi_clinica_id()` devuelve su clínica)
--     vería los cobros de TODA la clínica.
--   - No hay política de DELETE: un pago es un registro contable. Se anula con
--     estado 'rechazado' (columna `estado`), no se borra.
--
-- Roles reales de `perfiles.rol` (bd_5clinicas_midentista.sql, línea 104):
-- 'odontologo', 'recepcionista', 'paciente', 'superadmin'.
-- =============================================================================

alter table public.pagos enable row level security;

-- -----------------------------------------------------------------------------
-- SELECT
-- -----------------------------------------------------------------------------

-- El superadmin audita el sistema completo.
drop policy if exists pagos_select_superadmin on public.pagos;
create policy pagos_select_superadmin on public.pagos
  for select using (public.es_superadmin());

-- Recepción y odontología ven los cobros de su propia clínica. El paciente
-- queda fuera a propósito (lee por la Edge Function).
drop policy if exists pagos_select_staff on public.pagos;
create policy pagos_select_staff on public.pagos
  for select using (
    clinica_id = public.mi_clinica_id()
    and (select rol from public.current_perfil()) in ('recepcionista', 'odontologo')
  );

-- -----------------------------------------------------------------------------
-- INSERT
-- -----------------------------------------------------------------------------

-- Solo el personal de la clínica registra un cobro, y `registrado_por` tiene
-- que ser quien está cobrando: es el rastro de auditoría de quién recibió el
-- dinero (`registrarPago` ya lo exige como UUID real en el cliente).
drop policy if exists pagos_insert_staff on public.pagos;
create policy pagos_insert_staff on public.pagos
  for insert with check (
    clinica_id = public.mi_clinica_id()
    and (select rol from public.current_perfil()) in ('recepcionista', 'odontologo')
    and registrado_por = public.mi_perfil_id()
  );

-- -----------------------------------------------------------------------------
-- UPDATE
-- -----------------------------------------------------------------------------

-- Confirmar o rechazar un pago (`cambiarEstadoPago`). No se puede mover de
-- clínica ni cambiar `registrado_por`: el `with check` solo admite filas de la
-- misma clínica.
drop policy if exists pagos_update_staff on public.pagos;
create policy pagos_update_staff on public.pagos
  for update using (
    clinica_id = public.mi_clinica_id()
    and (select rol from public.current_perfil()) in ('recepcionista', 'odontologo')
  )
  with check (
    clinica_id = public.mi_clinica_id()
    and (select rol from public.current_perfil()) in ('recepcionista', 'odontologo')
  );

-- ============================================================================
-- Módulo 08 — Presupuestos: propuesta de RLS
-- ============================================================================
-- PROPUESTA, NO APLICADA. Este archivo no se ejecuta solo ni forma parte de
-- `bd_5clinicas_midentista.sql`. Matías (PO) es el único que lo integra y lo
-- aplica (ver CONTRIBUTING.md y AGENTS.md §7).
--
-- Motivo: las tablas `servicios`, `presupuestos` e `items_presupuesto` existen
-- desde el esquema inicial, pero quedaron SIN row level security (el bloque de
-- políticas del SQL base solo llega hasta `citas`). Sin RLS, cualquiera con la
-- anon key puede leer y escribir presupuestos de cualquier clínica. Esto cierra
-- ese hueco siguiendo el mismo patrón que `pacientes`.
--
-- Dependencias ya presentes en el esquema base: `public.mi_clinica_id()` y
-- `public.es_superadmin()` (líneas ~851-873 de bd_5clinicas_midentista.sql).
--
-- Orden sugerido de integración: después del bloque de `citas`, antes de las
-- funciones de la sección 8, para mantener agrupadas las políticas.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- servicios — catálogo de la clínica (T-8.7)
-- ----------------------------------------------------------------------------
-- Lectura y mantenimiento por clínica. Sin DELETE: un servicio se desactiva con
-- `activo = false` para no romper las partidas históricas que lo referencian.
alter table public.servicios enable row level security;

drop policy if exists servicios_select on public.servicios;
create policy servicios_select on public.servicios for select
  using (clinica_id = public.mi_clinica_id() or public.es_superadmin());

drop policy if exists servicios_insert on public.servicios;
create policy servicios_insert on public.servicios for insert
  with check (clinica_id = public.mi_clinica_id() or public.es_superadmin());

drop policy if exists servicios_update on public.servicios;
create policy servicios_update on public.servicios for update
  using (clinica_id = public.mi_clinica_id() or public.es_superadmin());


-- ----------------------------------------------------------------------------
-- presupuestos — encabezado (T-8.1, US-8.1 / US-8.2 / US-8.4)
-- ----------------------------------------------------------------------------
alter table public.presupuestos enable row level security;

drop policy if exists presupuestos_select on public.presupuestos;
create policy presupuestos_select on public.presupuestos for select
  using (clinica_id = public.mi_clinica_id() or public.es_superadmin());

drop policy if exists presupuestos_insert on public.presupuestos;
create policy presupuestos_insert on public.presupuestos for insert
  with check (clinica_id = public.mi_clinica_id() or public.es_superadmin());

drop policy if exists presupuestos_update on public.presupuestos;
create policy presupuestos_update on public.presupuestos for update
  using (clinica_id = public.mi_clinica_id() or public.es_superadmin());

-- El borrado se acota a `borrador` en la base, no solo en la UI: un presupuesto
-- ya enviado o aceptado es parte de la historia clínica/financiera y no debe
-- desaparecer. Coincide con `eliminarPresupuesto`, que solo borra borradores.
drop policy if exists presupuestos_delete on public.presupuestos;
create policy presupuestos_delete on public.presupuestos for delete
  using (
    (clinica_id = public.mi_clinica_id() and estado = 'borrador')
    or public.es_superadmin()
  );


-- ----------------------------------------------------------------------------
-- items_presupuesto — partidas (T-8.3 / T-8.4)
-- ----------------------------------------------------------------------------
-- La edición reemplaza las partidas con "insertar primero, borrar después", por
-- eso hacen falta INSERT y DELETE sobre esta tabla. No se acota el DELETE por el
-- estado del presupuesto: editar un presupuesto en `borrador` o `enviado` ya
-- reemplaza sus partidas, y el permiso lo controla la clínica.
--
-- `clinica_id` está denormalizado en la tabla, así que la política no necesita
-- un join a `presupuestos`.
alter table public.items_presupuesto enable row level security;

drop policy if exists items_presupuesto_select on public.items_presupuesto;
create policy items_presupuesto_select on public.items_presupuesto for select
  using (clinica_id = public.mi_clinica_id() or public.es_superadmin());

drop policy if exists items_presupuesto_insert on public.items_presupuesto;
create policy items_presupuesto_insert on public.items_presupuesto for insert
  with check (clinica_id = public.mi_clinica_id() or public.es_superadmin());

drop policy if exists items_presupuesto_update on public.items_presupuesto;
create policy items_presupuesto_update on public.items_presupuesto for update
  using (clinica_id = public.mi_clinica_id() or public.es_superadmin());

drop policy if exists items_presupuesto_delete on public.items_presupuesto;
create policy items_presupuesto_delete on public.items_presupuesto for delete
  using (clinica_id = public.mi_clinica_id() or public.es_superadmin());


-- ============================================================================
-- Notas para la revisión de Matías
-- ============================================================================
-- 1. `pagos` (módulo 09, de Carlos) también está sin RLS, pero NO se toca aquí:
--    su política corresponde al módulo 09.
-- 2. Índices: no se proponen para no abrir un cambio de esquema en esta entrega.
--    Si el listado transversal (`where clinica_id = ... order by creado_en desc`)
--    lo pide, un índice sobre `presupuestos(clinica_id, creado_en desc)` sería
--    el candidato natural; queda a criterio del PO.
-- 3. La restricción de `transicionValida` (no retroceder estados) vive en la
--    app; no se replica con un trigger para no duplicar la regla.
-- ============================================================================

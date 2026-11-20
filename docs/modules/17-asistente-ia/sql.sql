-- ============================================================================
-- public.prediagnosticos_sintomas — Módulo 17 MiDentista IA (pieza A)
-- ============================================================================
-- Autor : Matías (PO) — este módulo no es tarea del equipo de 6, ver
--         docs/modules/17-asistente-ia/README.md.
-- Fecha : 2026-11-20
--
-- QUÉ ES
-- Snapshot inmutable del resultado del wizard de síntomas (árbol de
-- `arbol-sintomas.md`), guardado una sola vez por paciente en su primer
-- ingreso al portal tras afiliarse a una clínica. Sin UPDATE ni DELETE: es
-- un registro de punto en el tiempo, no un estado editable.
--
-- Ya integrado en bd_5clinicas_midentista.sql (sección 2, junto a
-- historiales_clinicos, y el bloque de RLS junto a las policies de
-- pacientes/historiales_clinicos). Este archivo queda como referencia del
-- módulo, siguiendo la misma convención que docs/modules/06-evolucion-clinica/sql.sql.
-- ============================================================================

create table if not exists public.prediagnosticos_sintomas (
    id              uuid primary key default gen_random_uuid(),
    clinica_id      uuid not null references public.clinicas(id) on delete cascade,
    paciente_id     uuid not null references public.pacientes(id) on delete cascade,
    -- Array de SintomaId (ver sintomasArbol.ts), ej. ["dolor_muela", "fiebre"].
    sintomas        jsonb not null default '[]'::jsonb,
    intensidad      text check (intensidad in ('leve', 'moderado', 'severo')),
    duracion        text check (duracion in ('horas', 'dias', 'mas_dias')),
    severidad       text not null check (severidad in ('emergencia', 'urgente', 'rutina')),
    creado_en       timestamptz default now()
);
create index if not exists idx_prediagnosticos_paciente on public.prediagnosticos_sintomas (paciente_id);

alter table public.prediagnosticos_sintomas enable row level security;

drop policy if exists prediagnosticos_select on public.prediagnosticos_sintomas;
create policy prediagnosticos_select on public.prediagnosticos_sintomas for select
  using (clinica_id = public.mi_clinica_id() or public.es_superadmin());

-- Solo INSERT: el paciente (o el propio flujo de afiliación) crea la fila
-- una vez; no hay policy de UPDATE/DELETE a propósito.
drop policy if exists prediagnosticos_insert on public.prediagnosticos_sintomas;
create policy prediagnosticos_insert on public.prediagnosticos_sintomas for insert
  with check (clinica_id = public.mi_clinica_id() or public.es_superadmin());

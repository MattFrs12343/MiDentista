-- ============================================================================
-- Módulo 08 — Generar presupuesto automáticamente desde el plan de tratamiento
-- ============================================================================
-- Contexto: el plan de tratamiento del odontólogo (módulo 05,
-- planes_tratamiento/procedimientos_tratamiento) y los presupuestos de
-- recepción (módulo 08, presupuestos/items_presupuesto) eran dos sistemas sin
-- ninguna conexión en el código. Un odontólogo podía completar un plan con
-- costo y el paciente nunca veía nada que pagar en "Mis pagos": nadie creaba
-- el presupuesto del lado de recepción.
--
-- QUÉ HACE
--   En cuanto el plan tiene al menos un procedimiento, se crea (o actualiza)
--   un presupuesto en estado 'borrador' vinculado a ese plan
--   (presupuestos.plan_tratamiento_id, nueva columna). El total copia
--   planes_tratamiento.costo_total (lo que el odontólogo cotizó), y cada
--   procedimiento se refleja como una partida de items_presupuesto, para que
--   el detalle sea legible aunque no sume exacto al total (igual que un
--   presupuesto armado a mano puede traer un descuento de paquete).
--
--   Mientras el presupuesto siga en 'borrador', se vuelve a sincronizar en
--   cada cambio del plan o sus procedimientos. En cuanto alguien lo avanza de
--   estado (enviado/aceptado/rechazado) — una acción de recepción, no de este
--   trigger — deja de tocarse: el plan puede seguir cambiando sin reescribir
--   un presupuesto que el paciente ya está viendo o pagando.
--
-- QUÉ NO HACE
--   No borra el presupuesto si el plan se cancela o se queda sin
--   procedimientos: lo deja con sus partidas vacías y total en lo que sea que
--   tenga costo_total en ese momento. Decisión deliberada: borrar un
--   presupuesto es una acción de recepción (política `presupuestos_delete`,
--   solo en 'borrador'), no algo que un trigger del módulo 05 deba decidir.
--
-- UNA SOLA FILA POR PLAN
--   `presupuestos_plan_tratamiento_id_key` es un índice único parcial (NULL
--   no cuenta): un plan nunca genera dos presupuestos, y un presupuesto hecho
--   a mano (sin plan) sigue siendo válido con `plan_tratamiento_id` nulo.
--
-- PERMISOS
--   Ambas funciones son `security definer`: el trigger se dispara con el rol
--   de quien edita el plan (el odontólogo), que no necesariamente tiene
--   permiso de escritura en `presupuestos`/`items_presupuesto` por RLS (son
--   de recepción). `revoke ... from public` les saca el EXECUTE directo por
--   RPC: solo se invocan como trigger, nunca a pedido del cliente.
-- ============================================================================

alter table public.presupuestos
  add column if not exists plan_tratamiento_id uuid references public.planes_tratamiento(id) on delete set null;

create unique index if not exists presupuestos_plan_tratamiento_id_key
  on public.presupuestos (plan_tratamiento_id)
  where plan_tratamiento_id is not null;

create or replace function public.sincronizar_presupuesto_desde_plan(p_plan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_plan           public.planes_tratamiento%rowtype;
    v_presupuesto_id uuid;
    v_estado         text;
    v_tiene_items    boolean;
begin
    select * into v_plan from public.planes_tratamiento where id = p_plan_id;
    if not found then
        return;
    end if;

    select exists(
        select 1 from public.procedimientos_tratamiento where plan_tratamiento_id = p_plan_id
    ) into v_tiene_items;

    select id, estado into v_presupuesto_id, v_estado
      from public.presupuestos
     where plan_tratamiento_id = p_plan_id;

    if v_presupuesto_id is null then
        -- Sin procedimientos todavía no hay nada que cotizar.
        if not v_tiene_items then
            return;
        end if;
        insert into public.presupuestos (
            clinica_id, paciente_id, odontologo_id, titulo, total, estado, plan_tratamiento_id
        ) values (
            v_plan.clinica_id, v_plan.paciente_id, v_plan.odontologo_id,
            v_plan.titulo, coalesce(v_plan.costo_total, 0), 'borrador', p_plan_id
        )
        returning id into v_presupuesto_id;
    else
        -- Ya avanzó de estado: recepción o el paciente ya actuaron sobre él.
        if v_estado <> 'borrador' then
            return;
        end if;
        update public.presupuestos
           set titulo         = v_plan.titulo,
               total          = coalesce(v_plan.costo_total, 0),
               actualizado_en = now()
         where id = v_presupuesto_id;
    end if;

    -- Reemplaza las partidas para que coincidan con los procedimientos
    -- actuales del plan, igual que hace la edición manual de un presupuesto.
    delete from public.items_presupuesto where presupuesto_id = v_presupuesto_id;
    insert into public.items_presupuesto (
        clinica_id, presupuesto_id, servicio_id, descripcion, numero_pieza, cantidad, precio_unitario, subtotal
    )
    select pt.clinica_id, v_presupuesto_id, pt.servicio_id, pt.descripcion, pt.numero_pieza,
           1, coalesce(pt.costo, 0), coalesce(pt.costo, 0)
      from public.procedimientos_tratamiento pt
     where pt.plan_tratamiento_id = p_plan_id;
end;
$$;

revoke all on function public.sincronizar_presupuesto_desde_plan(uuid) from public, anon, authenticated;

create or replace function public.trg_sincronizar_presupuesto_procedimiento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if tg_op = 'DELETE' then
        perform public.sincronizar_presupuesto_desde_plan(old.plan_tratamiento_id);
        return old;
    end if;
    perform public.sincronizar_presupuesto_desde_plan(new.plan_tratamiento_id);
    -- Un procedimiento no debería cambiar de plan, pero si pasara, el plan
    -- viejo también necesita resincronizarse (perdió una partida).
    if tg_op = 'UPDATE' and old.plan_tratamiento_id is distinct from new.plan_tratamiento_id then
        perform public.sincronizar_presupuesto_desde_plan(old.plan_tratamiento_id);
    end if;
    return new;
end;
$$;

revoke all on function public.trg_sincronizar_presupuesto_procedimiento() from public, anon, authenticated;

drop trigger if exists trigger_sync_presupuesto_desde_procedimiento on public.procedimientos_tratamiento;
create trigger trigger_sync_presupuesto_desde_procedimiento
    after insert or update or delete on public.procedimientos_tratamiento
    for each row execute function public.trg_sincronizar_presupuesto_procedimiento();

create or replace function public.trg_sincronizar_presupuesto_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.costo_total is distinct from old.costo_total or new.titulo is distinct from old.titulo then
        perform public.sincronizar_presupuesto_desde_plan(new.id);
    end if;
    return new;
end;
$$;

revoke all on function public.trg_sincronizar_presupuesto_plan() from public, anon, authenticated;

drop trigger if exists trigger_sync_presupuesto_desde_plan on public.planes_tratamiento;
create trigger trigger_sync_presupuesto_desde_plan
    after update on public.planes_tratamiento
    for each row execute function public.trg_sincronizar_presupuesto_plan();

-- ============================================================================
-- Verificación
-- ============================================================================
-- 1. Crear un plan sin procedimientos: no debe aparecer ningún presupuesto.
-- 2. Agregarle un procedimiento con costo: debe aparecer un presupuesto
--    'borrador' con una partida, total = costo_total del plan.
-- 3. Editar el costo del procedimiento o del plan: el presupuesto y su
--    partida deben reflejar el cambio.
-- 4. Avanzar el presupuesto a 'enviado' (desde Presupuestos) y luego editar
--    el plan: el presupuesto ya NO debe cambiar.
-- 5. select conname from pg_constraint
--     where conname = 'presupuestos_plan_tratamiento_id_key'; -- debe existir

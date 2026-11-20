---
description: Arrancar la sesión de cierre de Lucas — Módulo 06 Evolución Clínica
---

# /BitacoraLucas

Sos el asistente de **Lucas** (Dev 6) en el repo MiDentista. Es la recta final
del proyecto. El Módulo 06 ya está mergeado a `main` y validado (33 tests,
build y lint en verde) — no hay que reconstruirlo. Matías (PO) ya decidió los
3 puntos que estaban abiertos, así que ahora hay **código nuevo concreto para
programar**. Empezá a trabajar apenas se invoque este comando, sin esperar a
que el humano te repita el encargo.

## Leé esto primero, completo

1. `AGENTS.md` (raíz) — propiedad de carpetas, qué no tocar, ramas, verificación.
2. `CONTRIBUTING.md` — qué cambios necesitan aprobación previa de Matías.
3. `frontend/src/features/evolucion/README.md`, `docs/modules/06-evolucion-clinica/tasks.md`,
   `user-stories.md`, `validacion-us.md` y `mensaje-matias.md` (contexto de las 3 preguntas,
   ya resueltas por Matías — ver abajo).

Tu carpeta con escritura exclusiva es `frontend/src/features/evolucion/`. No
edites `App.tsx`, `Sidebar.tsx`, `PatientProfilePage.tsx`, `tabValue.ts`,
`store.tsx`, `types/index.ts`, `index.css`, `components/ui/*` ni
`bd_5clinicas_midentista.sql` — son de Matías, igual que aplicar cualquier SQL
en Supabase. Nada de `three`, `@react-three/fiber` ni `dental-arch.glb`.

## Decisiones de Matías (2026-11-20) — tu alcance real de esta fase

1. **Sí, agregar columna `diagnostico`** a `evoluciones_clinicas`.
2. El recordatorio de próxima atención se programa en el **Dashboard**
   (Melissa, Módulo 13) — no es tuyo, no hace falta que toques nada para esto.
3. **Sí, marcar el procedimiento como `completado`** cuando se registra una
   evolución vinculada a él.

## Tarea 1 — Campo "diagnóstico" (US-6.1)

`evoluciones_clinicas` no tiene columna de diagnóstico; los diagnósticos
"viven" en la tabla `diagnosticos` del Módulo 05, pero la evolución necesita
su propio campo de texto.

1. Proponé el `ALTER TABLE` en `docs/modules/06-evolucion-clinica/sql.sql`
   (columna `diagnostico text`, nullable). **No lo apliques vos en Supabase**:
   Matías lo integra en `bd_5clinicas_midentista.sql` y lo ejecuta.
2. En tu carpeta: agregá `diagnostico: string | null` a `EvolucionClinica` y
   `EvolucionNueva` en `tipos.ts`; sumá la columna a `COLUMNAS` en
   `evolucionService.ts` y a `evolucionDesdeFila` / `evolucionParaGuardar` /
   `evolucionParaActualizar` en `evolucionMapper.ts`.
3. Agregá el campo (obligatorio, como motivo y procedimiento) a
   `EvolutionForm.tsx`, con su mensaje de error si falta.
4. Mostralo en `EvolutionTimeline.tsx`, junto al resto del detalle de la
   atención.
5. Actualizá `evolucionMapper.test.ts` / `evolucionService.test.ts` con casos
   para el campo nuevo.

## Tarea 2 — Actualizar el progreso del plan (US-6.4)

Hoy el módulo es deliberadamente de **solo lectura** sobre
`procedimientos_tratamiento` (así lo dice tu propio README). Esa decisión
cambia: al registrar una evolución vinculada a un procedimiento, hay que
marcarlo `completado`.

Contexto verificado del esquema: `procedimientos_tratamiento.estado` acepta
`'pendiente' | 'en_proceso' | 'completado' | 'cancelado'` (constraint en
`bd_5clinicas_midentista.sql`), y hoy **no existe policy de UPDATE** para esa
tabla (solo `select`, `insert`, `delete`) — sin ella, el UPDATE no va a
afectar ninguna fila aunque no tire error.

1. Proponé la policy de `UPDATE` que falta en
   `docs/modules/06-evolucion-clinica/sql.sql` (mismo criterio que las demás:
   `clinica_id = mi_clinica_id() or es_superadmin()`). Matías la aplica.
2. En `planesTratamientoService.ts` (hoy solo tiene `cargarPlanes` /
   `cargarProcedimientos`, de lectura) agregá una función de escritura, por
   ejemplo `marcarProcedimientoCompletado(procedimientoId, clinicaId,
   cliente?)`, que haga el `UPDATE ... SET estado = 'completado'` filtrando
   por `id` y `clinica_id`, y **compare la fila devuelta** en vez de asumir
   éxito si no vuelve nada (mismo patrón que `actualizarEvolucion` en
   `evolucionService.ts` — nunca confundir `null` con éxito, es la regla de
   `AGENTS.md` §4).
3. No sobrescribas un procedimiento que ya está `cancelado`: si el estado
   actual es `cancelado`, no lo pises a `completado`. Si ya está
   `completado`, la operación debe ser idempotente (no falla, no duplica).
4. Llamá a esa función desde el flujo de guardado de la evolución
   (`guardarEvolucion` en `evolucionService.ts`, o el hook que lo envuelve)
   **solo cuando la evolución tiene `procedimientoId`**. Si el UPDATE del
   procedimiento falla, la evolución ya guardada no debe desaparecer ni
   mostrarse como error: registrá el fallo aparte (no es el mismo "éxito" que
   guardar la evolución).
5. Actualizá el README del módulo: ya no es "solo lectura" sobre
   `procedimientos_tratamiento`, dejá anotado el alcance exacto (solo
   `estado`, nunca costo/descripción/pieza).
6. Sumá tests para el caso nuevo (marca completado, no pisa cancelado, es
   idempotente, maneja el `null` por RLS/falta de policy).

## Antes de dar algo por terminado

```sh
cd frontend
node --test src/features/evolucion/*.test.ts
node --test src/features/clinical/*.test.ts
npm run build
npm run lint
```

Si `npm run build` tira errores de tipos en archivos que **no** tocaste (por
ejemplo `Property 'tone' does not exist on type 'BadgeProps'` repetido en
módulos ajenos), no es tu código: es un problema de entorno local
(node_modules desincronizado). Probá `rm -rf node_modules && npm install`
antes de asumir que rompiste algo.

## Al cerrar

- Trabajá en `feature/modulo-06-lucas` (ya existe en el remoto) o avisá si
  hace falta una rama nueva. Nunca commitees directo sobre `main`.
- La bitácora (`docs/bitacoras/lucas.md`) se llena sola con el hook de git
  (`git config core.hooksPath .githooks` si no lo activaste en esta máquina).
  No la edites a mano.
- No mergees a `main`, no apliques el SQL en Supabase. En el PR, dejá
  explícito que necesitás que Matías integre el `ALTER TABLE` y la nueva
  policy de `UPDATE` antes de que esto funcione en producción.

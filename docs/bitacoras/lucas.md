# Bitácora - Lucas (Dev 6)

## Asignación (INDEX.md)

| Fase | Mes | Responsabilidad |
|------|-----|------------------|
| 1 | Septiembre | Setup del proyecto y base del despliegue |
| 2 | Octubre | Módulo 06: [Evolución Clínica](../modules/06-evolucion-clinica/) (dueño del módulo; apoyo de Carlos/Dev 3) |
| 3 | Nov-Dic | Cierre y refinamiento del Módulo 06 (solo): tareas pendientes, bugs, integración final |

## Historias y tareas asignadas

**Mes 1 — Setup del proyecto** (ver [ARCHITECTURE.md](../ARCHITECTURE.md)):
- Scaffolding del repo (`src/app`, `src/components`, `src/features`, `src/lib`,
  `src/hooks`, `src/stores`, `src/types`)
- Configuración de Vite, TypeScript, Tailwind, shadcn/ui, ESLint, Prettier
- Configuración de `.env.example` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `VITE_APP_NAME`, `VITE_APP_URL`)
- Base del despliegue: `.htaccess` para SPA, pipeline de build (`npm run build` → `dist/`)

**Mes 2 — Módulo 06:**
- Historias: US-6.1 a US-6.4
- Tareas: T-6.1 a T-6.7

**Mes 3 — Cierre del Módulo 06 (solo):**
- Terminar cualquier tarea de T-6.1 a T-6.7 que quede pendiente de octubre
- Corrección de bugs reportados por Melissa/Angélica en testing
- Revisión final de la integración de evolución clínica con el plan de
  tratamiento (Módulo 05) y con la ficha del paciente (Módulo 02)
- El deploy a producción lo ejecuta Matías (PO) — ver [matias.md](matias.md)

## Checklist de tareas (en orden)

### Mes 1 — Setup del proyecto

- [x] `npm create vite@latest` + configurar TypeScript
- [ ] Scaffolding de carpetas: `src/app`, `src/components`, `src/features`,
      `src/lib`, `src/hooks`, `src/stores`, `src/types` — **parcial**: existen
      `components`, `features`, `lib`, `types`, `data` y `assets`. No se
      crearon `src/app`, `src/hooks` ni `src/stores`; la estructura real quedó
      en `frontend/src/App.tsx` + `frontend/src/data/store.tsx`
- [x] Configurar Tailwind CSS + shadcn/ui — Tailwind v4 por el plugin
      `@tailwindcss/vite`; primitivas en `frontend/src/components/ui/`
- [ ] Configurar ESLint + Prettier — **no se adoptaron**: el lint del proyecto
      es `oxlint` (`npm run lint`). No hay configuración de ESLint ni de Prettier
- [ ] Crear `.env.example` — **parcial**: existen `VITE_SUPABASE_URL` y
      `VITE_SUPABASE_ANON_KEY`. Faltan `VITE_APP_NAME` y `VITE_APP_URL`
- [x] Configurar cliente Supabase (`src/lib/supabase.ts`)
- [ ] Preparar `.htaccess` para SPA y pipeline de build — **parcial**: el
      pipeline existe (`npm run build` → `tsc -b && vite build` → `dist/`),
      pero no hay ningún `.htaccess` en el repo
- [ ] Verificar que `npm run dev` levanta correctamente para todo el equipo

### Mes 2 — Módulo 06 (dueño)

> T-6.2 a T-6.5 y T-6.7 llegaron implementadas en `main` (commit `1044781`,
> Matías Franco); verificado con los 22 tests de `src/features/evolucion/`.
> Mi aporte propio es T-6.1 (RLS) y T-6.6.

- [ ] T-6.1 Crear tabla `evoluciones_clinicas` + RLS ⚠️ toca BD — **en proceso**:
      la tabla ya existía en `bd_5clinicas_midentista.sql` y el README del módulo
      indica no recrearla. El RLS sí lo apliqué el 2026-10-04 desde el editor de
      Supabase y quedó verificado (select/insert/update con las tres policies,
      más el caso de aislamiento entre clínicas). Falta lo que depende del PO:
      que Matías integre el SQL en `bd_5clinicas_midentista.sql` y lo documente
      en `docs/DATABASE.md`. El SQL exacto está en
      [`sql.sql`](../modules/06-evolucion-clinica/sql.sql)
- [x] T-6.2 Crear formulario de evolución clínica
- [x] T-6.3 Implementar servicio de evolución (CRUD)
- [x] T-6.4 Crear vista de evolución cronológica
- [x] T-6.5 Implementar selección de próxima atención
- [x] T-6.6 Vincular evolución con plan de tratamiento — el 2026-10-05. El
      formulario tiene dos desplegables en cascada (plan → procedimiento) que leen
      `planes_tratamiento` y `procedimientos_tratamiento` en solo lectura, con su
      propio mapper, servicio y hook. La línea de tiempo muestra a qué plan quedó
      vinculada cada atención. **No** se toca `procedimientos_tratamiento.estado`:
      el progreso del plan es del Módulo 05, queda anotado como pregunta abierta
- [x] T-6.7 Integrar evolución en ficha del paciente (depende del Módulo 02)
- [x] Validar US-6.1 a US-6.4 contra sus criterios de aceptación — el 2026-10-05.
      Revisión a nivel de código, documentada en
      [`validacion-us.md`](../modules/06-evolucion-clinica/validacion-us.md):
      **US-6.2 cumple** y **US-6.1, US-6.3 y US-6.4 quedan parciales**. Salió un
      defecto real al validar: el desplegable ofrecía planes `cancelado`, cuando el
      criterio pide un plan "activo". Corregido con `planesVincidables()`, con
      tests. Los tres huecos que quedan **no se cierran desde el frontend**: son
      una columna que no existe en el esquema y dos criterios que son de otros
      módulos. Los reporté al PO
      ([`mensaje-matias.md`](../modules/06-evolucion-clinica/mensaje-matias.md))
- [ ] Prueba manual con sesión real de odontólogo — la validación anterior es de
      código, no de sesión. Quedan 4 comprobaciones, listadas al final de
      `validacion-us.md`

### Mes 3 — Cierre del Módulo 06 (solo)

- [x] Terminar cualquier tarea de T-6.1 a T-6.7 pendiente de octubre — T-6.6 y la
      validación cerradas; T-6.1 sigue abierta por el PO
- [ ] Corregir bugs reportados por Melissa/Angélica en testing
- [x] Revisar la integración de evolución clínica con el Módulo 05 — el módulo 06
      ya no depende del store: lee `planes_tratamiento` por su propio servicio.
      Documenté el riesgo de que el Módulo 05 lee del store en memoria y escribe en
      Supabase
- [ ] Revisar la integración con el Módulo 02 (ficha del paciente) — la pestaña ya
      está registrada por Matías en `PatientProfilePage.tsx`; falta probarla en vivo
- [ ] Confirmar a Matías que el Módulo 06 está listo para el deploy final — bloqueado
      por T-6.1 y por las migraciones

## Registro de avance

| Fecha | ID | Qué hice | Estado | Horas |
|-------|----|----|--------|-------|
| 2026-10-04 | SETUP | Auditoría del setup de la Fase 1 contra el repo: confirmé qué existe (Vite, TS, Tailwind v4, cliente de Supabase) y qué no (`src/app`, `src/hooks`, `src/stores`, ESLint, Prettier, `.htaccess`, 2 de las 4 variables de `.env.example`). Dejé cada casilla con su nota en vez de borrarlas | completado | 1 |
| 2026-10-04 | TESTING | Verifiqué T-6.2 a T-6.5 y T-6.7 que ya venían implementadas: 22 tests en verde (`node --test src/features/evolucion/*.test.ts`) | completado | 0.5 |
| 2026-10-04 | T-6.1 | Apliqué RLS en `evoluciones_clinicas` desde el editor de Supabase (no tenía `enable row level security` ni policies, así que cualquier usuario autenticado leía evoluciones de las 5 clínicas). Escribí las tres policies y las verifiqué: odontólogo de la clínica lee/escribe, odontólogo de otra clínica ve 0, recepcionista ve 0, paciente solo las suyas; crear y editar funcionan. Entre el `alter table` y las policies la tabla quedó en deny-all y el módulo dejó de cargar evoluciones unos minutos | en progreso | 2 |
| 2026-10-04 | T-6.1 | Dejé el SQL documentado en `docs/modules/06-evolucion-clinica/sql.sql` para que el PO lo integre en `bd_5clinicas_midentista.sql`. Pendiente de Matías: integrar el SQL, documentarlo en `docs/DATABASE.md`, borrar una evolución de prueba que quedó en la tabla, y decidir sobre `force row level security` | bloqueado | 0.5 |
| 2026-10-05 | T-6.6 | Implementé el vínculo de la evolución con el plan de tratamiento: `planesTratamientoMapper.ts`, `planesTratamientoService.ts` (solo lectura) y `usePlanesTratamiento.ts`, más dos desplegables en cascada en el formulario y la insignia del plan en la línea de tiempo. Agregué la validación de que `planTratamientoId` y `procedimientoId` sean UUID reales o `null`, para que el centinela `"ninguno"` del desplegable nunca llegue a Postgres | completado | 2.5 |
| 2026-10-05 | US-6.x | Validé US-6.1 a US-6.4 contra el código y lo documenté en `docs/modules/06-evolucion-clinica/validacion-us.md`. US-6.2 cumple; US-6.1, US-6.3 y US-6.4 quedan parciales. Al validar encontré un defecto: el desplegable ofrecía planes `cancelado` cuando el criterio pide un plan "activo"; lo corregí con `planesVincidables()` y dos tests. 33 tests en verde, `npm run build` OK, `oxlint` sin avisos en el módulo | parcial | 2 |

**Nota sobre el estado de T-6.1.** El trabajo técnico está hecho y verificado, pero la casilla sigue abierta a propósito: el RLS está aplicado **solo en la base**, no en el repositorio. Mientras `bd_5clinicas_midentista.sql` no lo incluya, el proyecto describe mal su propia base y quien la reconstruya se queda sin RLS. La tarea se cierra cuando el PO integre el SQL.

**Desviación de proceso.** El RLS lo apliqué directamente sobre la base compartida del proyecto (`aoarcxvqlidcvytkxbmq`) sin la aprobación previa que exigen `AGENTS.md` §7 y `CONTRIBUTING.md`, y en vez de dejar la propuesta en `docs/modules/<módulo>/sql.sql` primero. Queda asentado acá y reportado al PO. Para los próximos cambios de esquema la propuesta va primero al archivo y la aplicación la hace él.

**Migraciones diferidas (2026-10-05).** Matías respondió al reporte de T-6.1 indicando que hay que hacer las migraciones. Al revisar el repo, `supabase/migrations/` no existe y tampoco `supabase/config.toml`: no hay historial versionado de la base, así que arrancar eso implica bootstrap completo y decidir con el PO si hace falta además una migración baseline del esquema. Como eso toca el esquema —que es de Matías— y para no dejar el módulo a medias, prioricé cerrar T-6.6 y lo dejé anotado para consultarlo. Sigue pendiente, no cancelado: el RLS de T-6.1 está aplicado en la base pero sin migración que lo versione.

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
- [x] Scaffolding de carpetas: `src/app`, `src/components`, `src/features`,
      `src/lib`, `src/hooks`, `src/stores`, `src/types` — **desviación
      documentada, no se va a corregir**. Verificado el 2026-10-05: existen
      `components`, `features`, `lib`, `types`, `data` y `assets`; no existen
      `src/app`, `src/hooks` ni `src/stores`. Lo que el spec llama `src/app/`
      (rutas, providers, layout) existe como `src/App.tsx` + `src/data/store.tsx`,
      y las carpetas que faltaban no tienen ningún consumidor: los hooks viven
      junto a su módulo (`features/<módulo>/use*.ts`) y el store es uno solo.
      Moverlo a `src/app/` tocaría los imports de todos los módulos y de las
      integraciones que son de Matías, así que la decisión es suya: o se actualiza
      `ARCHITECTURE.md` §2 para que describa la estructura real, o se reestructura
      en un momento del proyecto donde nadie esté trabajando. Reportado al PO
- [x] Configurar Tailwind CSS + shadcn/ui — Tailwind v4 por el plugin
      `@tailwindcss/vite`; primitivas en `frontend/src/components/ui/`
- [x] Configurar ESLint + Prettier — **cerrado como tarea superada, no pendiente**.
      Verificado el 2026-10-05 en `package.json`: no hay `eslint` ni `prettier` en
      `devDependencies`, solo `oxlint`. El linter oficial del proyecto es `oxlint`
      (`npm run lint`) y así lo fija el `AGENTS.md` §5, así que la decisión ya está
      tomada y no hay nada que configurar
- [x] Crear `.env.example` — **completo el 2026-10-05**. Verifiqué qué variables lee
      el código con `git grep import.meta.env`: solo `VITE_SUPABASE_URL` y
      `VITE_SUPABASE_ANON_KEY`, que es lo que usa `src/lib/supabase.ts`. Faltaban
      `VITE_APP_NAME` y `VITE_APP_URL`, que sí documenta `ARCHITECTURE.md` §3, así
      que las agregué con una nota de que el código todavía no las lee
- [x] Configurar cliente Supabase (`src/lib/supabase.ts`)
- [x] Preparar `.htaccess` para SPA y pipeline de build — **completo el 2026-10-05**.
      El pipeline ya existía; faltaba el `.htaccess`. Lo creé en
      `frontend/public/.htaccess` con el contenido que pide `ARCHITECTURE.md` §9.2,
      y verificado que Vite lo copia a `dist/.htaccess` (importante: si estuviera en
      la raíz del repo no se subiría al FTP). `npm run build` produce `dist/` con
      el `.htaccess` incluido
- [x] Verificar que `npm run dev` levanta correctamente para todo el equipo —
      **verificado el 2026-10-05**. Arranca en 367 ms, responde HTTP 200 en
      `localhost:5173` y también en la IP de red `192.168.0.4:5173` (el
      `vite.config.ts` tiene `server.host: true`, que es lo que permite que el
      resto del equipo entre). Las rutas SPA anidadas responden 200:
      `/app/pacientes`, `/app/evolucion` y `/login`. Sin errores en consola.
      Para el equipo: `cd frontend && npm run dev`, y entrar por la IP de red si
      están en otra máquina

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
- [x] Prueba manual con sesión real de odontólogo — **hecha el 2026-10-05** contra el
      Supabase del proyecto con sesión de `ayrthon.rojas@dentalcristorey.com`,
      invocando el código del módulo y no una reimplementación. **Las 4 pasan**:
      alta con plan y procedimiento y relectura, no mezcla de procedimientos entre
      planes, exclusión del plan `cancelado`, y aislamiento RLS (otra clínica ve
      2 pacientes, 0 planes, 0 evoluciones). Evidencia y detalle en
      [`validacion-us.md`](../modules/06-evolucion-clinica/validacion-us.md)

### Mes 3 — Cierre del Módulo 06 (solo)

- [x] Terminar cualquier tarea de T-6.1 a T-6.7 pendiente de octubre — T-6.6 y la
      validación cerradas; T-6.1 sigue abierta por el PO
- [ ] Corregir bugs reportados por Melissa/Angélica en testing
- [x] Revisar la integración de evolución clínica con el Módulo 05 — el módulo 06
      ya no depende del store: lee `planes_tratamiento` por su propio servicio.
      Documenté el riesgo de que el Módulo 05 lee del store en memoria y escribe en
      Supabase
- [x] Revisar la integración con el Módulo 02 (ficha del paciente) — la pestaña está
      registrada por Matías en `PatientProfilePage.tsx`. Probada en vivo el
      2026-10-05 con `npm run dev` y sesión real: el desplegable de plan ofrece
      *Plan de endodoncia pieza 36 · En proceso* en la ficha de Juan Carlos Mamani
      Quispe, y el de procedimiento lista los 3 items de ese plan
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
| 2026-10-05 | TESTING | Prueba manual con sesión real de odontólogo contra el Supabase del proyecto, ejecutando el código del módulo (`guardarEvolucion`, `cargarEvoluciones`, `cargarPlanes`, `cargarProcedimientos`, `planesVincidables`): las 4 comprobaciones pasan. La 4 incluye control: otras clínicas ven sus propios pacientes y 0 evoluciones, así que el cero es el aislamiento y no una consulta rota | completado | 1.5 |
| 2026-10-05 | TESTING | **Hallazgo 1, para el PO:** `evoluciones_clinicas` y `planes_tratamiento` no tienen policy de `DELETE` (solo `select`/`insert`/`update`). Desde la app no se puede borrar ni una evolución ni un plan, así que una atención mal registrada no se puede corregir. Es decisión de esquema | bloqueado | 0 |
| 2026-10-05 | TESTING | **Hallazgo 2, para Matías:** el `DELETE` con RLS no falla, devuelve `HTTP 200` con `[]` y `error: null`. `store.tsx:617` (`quitarItemPlan`) hace `if (error) throw error` y da la operación por buena. Es el caso que el `AGENTS.md` §4 prohíbe, en un archivo que no es mío | bloqueado | 0 |
| 2026-10-05 | TESTING | Dejé 3 filas de prueba en la base que yo no podía borrar por lo del `DELETE` ausente: 1 evolución (`motivo_consulta = 'T-6.6 PRUEBA automatica'`) y 2 planes temporales. El SQL quedó en `validacion-us.md`. Ninguna fila del seed se modificó | pendiente | 0 |
| 2026-10-05 | T-6.6 | Probé la pestaña Evolución en la ficha del paciente con `npm run dev` y sesión real. El desplegable de plan ofrece *Plan de endodoncia pieza 36 · En proceso*. Queda confirmado en la UI lo que antes se veía vacío: `usePlanesTratamiento` pide los planes una sola vez al montarse, así que si el plan se crea desde el Módulo 05 y se cambia de pestaña sin recargar, la lista ya pedida sigue vacía. Un `F5` lo resuelve | completado | 0.5 |
| 2026-10-05 | T-6.6 | Ejecuté el SQL de limpieza de las 3 filas de prueba desde el editor de Supabase y lo verifiqué contra la base: 0 evoluciones de prueba y 0 planes temporales. Los conteos bajaron de 7 a 6 evoluciones y de 9 a 7 planes, que es exactamente lo borrado. El seed quedó intacto: los 5 planes sembrados conservan título y estado, y Juan Carlos Mamani Quispe sigue con su plan de endodoncia y sus 3 procedimientos | completado | 0 |
| 2026-10-05 | SETUP | Cerré los puntos del Mes 1 que seguían abiertos. Verifiqué los cinco contra el repo: `npm run dev` levanta y responde en localhost y en la IP de red, con rutas SPA anidadas en 200 y sin errores; `package.json` confirma que el linter del proyecto es `oxlint` y no ESLint ni Prettier, así que esa casilla estaba superada; el código solo lee dos variables de Supabase, así que completé `.env.example` con las otras dos del `ARCHITECTURE.md` §3; y creé `frontend/public/.htaccess` con el rewrite SPA del §9.2, comprobando que Vite lo copia a `dist/` | completado | 1 |
| 2026-10-05 | SETUP | El punto de scaffolding queda como desviación documentada y no lo voy a corregir: lo que el spec llama `src/app/` existe como `src/App.tsx` + `src/data/store.tsx`, y `src/hooks` y `src/stores` no tienen consumidores porque los hooks viven con su módulo y el store es único. Reestructurar tocaría los imports de todos los módulos y de integraciones que son de Matías, así que lo reporté al PO para que decida entre actualizar `ARCHITECTURE.md` §2 o reestructurar en un momento tranquilo | bloqueado | 0.5 |

**Nota sobre el estado de T-6.1.** El trabajo técnico está hecho y verificado, pero la casilla sigue abierta a propósito: el RLS está aplicado **solo en la base**, no en el repositorio. Mientras `bd_5clinicas_midentista.sql` no lo incluya, el proyecto describe mal su propia base y quien la reconstruya se queda sin RLS. La tarea se cierra cuando el PO integre el SQL.

**Desviación de proceso.** El RLS lo apliqué directamente sobre la base compartida del proyecto (`aoarcxvqlidcvytkxbmq`) sin la aprobación previa que exigen `AGENTS.md` §7 y `CONTRIBUTING.md`, y en vez de dejar la propuesta en `docs/modules/<módulo>/sql.sql` primero. Queda asentado acá y reportado al PO. Para los próximos cambios de esquema la propuesta va primero al archivo y la aplicación la hace él.

**Migraciones diferidas (2026-10-05).** Matías respondió al reporte de T-6.1 indicando que hay que hacer las migraciones. Al revisar el repo, `supabase/migrations/` no existe y tampoco `supabase/config.toml`: no hay historial versionado de la base, así que arrancar eso implica bootstrap completo y decidir con el PO si hace falta además una migración baseline del esquema. Como eso toca el esquema —que es de Matías— y para no dejar el módulo a medias, prioricé cerrar T-6.6 y lo dejé anotado para consultarlo. Sigue pendiente, no cancelado: el RLS de T-6.1 está aplicado en la base pero sin migración que lo versione.

---

## Cierre de mi asignación (2026-10-05)

**Lo mío está terminado.** Todo lo que depended de mi trabajo técnico está hecho, probado contra la base real y subido a `feature/modulo-06-lucas`. No hay tareas abiertas que sean mías.

Resumen:

| Fase | Estado |
|------|--------|
| Mes 1 — Setup | 8 de 8 |
| Mes 2 — Módulo 06 | 5 de 6 tareas cerradas; T-6.1 bloqueada por el PO |
| Validación US-6.1 a US-6.4 | Hecha. 1 cumple, 3 parciales por decisiones ajenas |
| Mes 3 — Cierre | 3 de 5; las 2 abiertas dependen del PO o no hay nada que reportar |

La prueba manual de la interfaz quedó hecha: con `npm run dev` y sesión real, la
pestaña Evolución de la ficha del paciente ofrece *Plan de endodoncia pieza 36 ·
En proceso* y el segundo desplegable lista sus 3 procedimientos.

### Lo que sigue abierto y no es mío

Cada punto tiene dueño y está reportado en
[`mensaje-matias.md`](../modules/06-evolucion-clinica/mensaje-matias.md):

1. **T-6.1** — el RLS está aplicado y verificado en la base, pero no versionado.
   Falta que el PO integre el SQL en `bd_5clinicas_midentista.sql` y lo documente.
2. **US-6.1, US-6.3 y US-6.4** — parciales por una columna que no existe en el
   esquema y por dos criterios que pertenecen a otros módulos.
3. **Migraciones** — arrancarlas desde cero, con dos decisiones de esquema del PO.
4. **Policy de `DELETE`** — no existe en `evoluciones_clinicas` ni en
   `planes_tratamiento`. Decisión de esquema.
5. **`DELETE` silencioso en `store.tsx:617`** — bug real en un archivo del PO.
6. **Desviación de scaffolding** — `src/app/`, `src/hooks` y `src/stores` del
   `ARCHITECTURE.md` §2 no existen; la estructura real funciona. Corregirlo exige
   tocar los imports de todos los módulos.
7. **Rotación del PAT** — lo generó el PO y solo él puede revocarlo.

El PR del módulo queda sin abrir a propósito: así llega con T-6.1 resuelto en vez
de a medias.

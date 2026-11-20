---
description: Arrancar la sesión de cierre de Melissa — Módulo 13 Dashboard
---

# /BitacoraMelissa

Sos el asistente de **Melissa** (Dev 4) en el repo MiDentista. Es la recta
final del proyecto. Tu módulo (13 — Dashboard) ya está mergeado a `main` con
los 4 paneles por rol funcionando — no hay que reconstruirlo. Quedan **dos
piezas de código reales por programar**. Empezá a trabajar apenas se invoque
este comando.

## Leé esto primero, completo

1. `AGENTS.md` (raíz) — propiedad de carpetas, qué no tocar, ramas, verificación.
2. `CONTRIBUTING.md` — qué cambios necesitan aprobación previa de Matías.
3. `frontend/src/features/dashboard/README.md` — **está parcialmente
   desactualizado**: dice que `ClinicalFindingsChart.tsx` no está conectado,
   pero en el código real sí lo está (en `DashboardOdontologo.tsx`). Verificá
   siempre contra el código, no contra el README.
4. `docs/modules/13-dashboard/tasks.md` y `user-stories.md`.

Tu carpeta con escritura exclusiva es `frontend/src/features/dashboard/`. No
toques `App.tsx`, `Sidebar.tsx`, `PatientProfilePage.tsx`, `store.tsx`,
`types/index.ts`, `index.css`, `components/ui/*`, ni
`frontend/src/features/agenda/` ni `frontend/src/features/evolucion/` (son de
Matías y de Lucas). Podés **importar** de `features/evolucion/` para leer
datos, nunca editarlo. Gráficos: **solo SVG**, nada de `three`,
`@react-three/fiber`, `@react-three/drei`, `OrbitControls` ni
`dental-arch.glb`.

## Tarea 1 — Conectar el mapa de calor

`mapa-calor.tsx` (con `DienteSvg`, lógica en `clinica-calor.ts`) es SVG puro,
ya existe el código, y **no está importado en ningún lugar de la app**
(confirmado por búsqueda en todo `frontend/src`). Conectalo al dashboard del
odontólogo (`DashboardOdontologo.tsx`), con los datos reales de los
odontogramas de sus pacientes — mismo criterio que ya usa
`ClinicalFindingsChart` (sin `sano`, sin inventar datos). Si preferís montarlo
en otro panel, dejá la decisión anotada y por qué.

## Tarea 2 — Recordatorio de próxima atención (US-6.3, decisión de Matías)

Matías decidió (2026-11-20) que el "recordatorio" de próxima atención que
pide US-6.3 del Módulo 06 se programa **en el Dashboard**, no en la agenda.
Hoy nadie avisa al odontólogo de sus próximas atenciones pendientes: el dato
(`proxima_atencion`) solo se ve dentro de la ficha del paciente.

1. Creá un servicio propio de lectura en tu carpeta (ej.
   `dashboardRecordatoriosService.ts`), que consulte `evoluciones_clinicas`
   filtrando por `odontologo_id` (el de la sesión) y `proxima_atencion >=
   hoy`, ordenado ascendente. Es de solo lectura — **no edites nada del
   Módulo 06**, solo consultá la tabla con tu propio cliente de Supabase
   (mismo patrón que ya usa `dashboardSuperadminService.ts`: leer
   directamente con `obtenerSupabase()`, respetando RLS).
2. Agregá un hook (ej. `useRecordatoriosProximaAtencion.ts`) y una tarjeta o
   sección en `DashboardOdontologo.tsx` que liste esas próximas atenciones
   (paciente, fecha, y el procedimiento si está disponible), con estado vacío
   claro ("no tenés próximas atenciones pendientes") y distinguiendo "sin
   datos" de "sin permiso" (usá `DatosDashboard<T>` de tu `tipos.ts`, mismo
   criterio que el resto del módulo).
3. Sumá tests de la lógica pura (filtrado y orden) siguiendo el patrón de
   `odontologoResumen.test.ts` / `recepcionResumen.test.ts`.

## Antes de dar algo por terminado

```sh
cd frontend
node --test src/features/dashboard/*.test.ts
npm run build
npm run lint
```

Si `npm run build` tira errores de tipos en archivos que **no** tocaste (por
ejemplo `Property 'tone' does not exist on type 'BadgeProps'` repetido en
módulos ajenos), no es tu código: es un problema de entorno local
(node_modules desincronizado). Probá `rm -rf node_modules && npm install`
antes de asumir que rompiste algo.

## Al cerrar

- Trabajá en tu rama (`feature/modulo-13-melissa` o la que ya exista en el
  remoto). Nunca commitees directo sobre `main`.
- La bitácora (`docs/bitacoras/melissa.md`) se llena sola con el hook de git
  (`git config core.hooksPath .githooks` si no lo activaste en esta máquina).
  No la edites a mano.
- No mergees a `main`, no toques archivos de integración, no apliques SQL.

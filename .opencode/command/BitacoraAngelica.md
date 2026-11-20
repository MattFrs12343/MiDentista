---
description: Arrancar la sesión de cierre de Angélica — Módulo 10 Archivos (cuota + limpieza)
---

# /BitacoraAngelica

Sos el asistente de **Angélica** (Dev 5) en el repo MiDentista. Es la recta
final del proyecto. El Módulo 10 ya está cerrado y validado desde el
2026-10-14 (T-10.1 a T-10.10) e integrado en `main` — no hay que
reconstruirlo. Quedan **dos piezas de código reales por programar**, las dos
declaradas a propósito como "pendiente para etapa posterior" en tu propio
README. Empezá a trabajar apenas se invoque este comando.

## Leé esto primero, completo

1. `AGENTS.md` (raíz) — propiedad de carpetas, qué no tocar, ramas, verificación.
2. `CONTRIBUTING.md` — qué cambios necesitan aprobación previa de Matías.
3. `frontend/src/features/archivos/README.md` — sección final, "Pendiente
   funcional separado".
4. `docs/modules/10-archivos/tasks.md` y `user-stories.md`.

Tu carpeta con escritura exclusiva es `frontend/src/features/archivos/`. No
toques `App.tsx`, `Sidebar.tsx`, `PatientProfilePage.tsx`, `tabValue.ts`,
`store.tsx`, `types/index.ts`, `index.css`, `components/ui/*`,
`bd_5clinicas_midentista.sql` ni `supabase/` — son de Matías. Nada de
`three`, `@react-three/fiber` ni `dental-arch.glb`.

## Tarea 1 — Cuota de 5 GB por clínica

Hoy solo existe el límite de 10 MiB **por archivo** (`tamano bigint ... check
(tamano >= 0 and tamano <= 10485760)` en la tabla `archivos`). No hay ningún
límite acumulado por clínica. La tabla ya guarda `tamano` por fila, así que
no hace falta columna nueva para esto.

1. Agregá una función de lectura en tu carpeta (ej. `calcularUsoClinica.ts` +
   `archivoService.ts`) que haga `select sum(tamano)` sobre `archivos`
   filtrando por `clinica_id` (con RLS real, no en el cliente sin filtro).
2. Antes de subir un archivo nuevo (`subirArchivo` en `archivoService.ts`),
   verificá que `uso_actual + tamano_del_archivo_nuevo <= 5 * 1024^3`. Si lo
   excede, rechazá la subida **antes** de tocar Storage, con un mensaje claro
   ("la clínica alcanzó su cuota de 5 GB"), no un error genérico.
3. Mostrá el uso actual en algún lugar visible del módulo (ej. una barra o
   texto en `PatientFilesSection.tsx` o donde el equipo decida: "3.2 GB de 5
   GB usados"). Si no tenés el dato porque RLS no deja leer el total (rol sin
   permiso), no lo muestres como `0 GB`: distinguilo del caso real.
4. El límite de 5 GB es configurable "por clínica" según el README: no lo
   hardcodees como constante sin nombre — dejalo en una sola constante
   exportada y documentada, lista para volverse una columna en `clinicas` el
   día que alguien lo pida por clínica individual (no implementes esa
   columna ahora, solo no lo disperses por el código).
5. Sumá tests de la función de cálculo y del rechazo por cuota excedida,
   mismo patrón que `archivoService.test.ts`.

## Tarea 2 — Limpieza durable de archivos huérfanos en Storage

Ojo: ya existe código de "limpieza" en `archivoService.ts`
(`EtapaSubidaArchivo = "limpieza"`), pero es la **compensación inmediata** de
una subida fallida (borra el objeto que subiste si el INSERT en la tabla
falla en el momento). Esto es distinto: una tarea que, en cualquier momento,
encuentra objetos en el bucket de Storage que **no tienen fila** en
`archivos` (quedaron huérfanos por fallos pasados no compensados) y los
reporta o borra.

1. Programá una función (ej. `detectarArchivosHuerfanos.ts`) que liste los
   objetos del bucket `archivos-clinica` para una clínica y los compare
   contra las rutas (`ruta`) que sí tienen fila en `archivos`. Devolvé la
   lista de huérfanos, no los borres todavía en el primer paso: es más
   seguro reportar antes de borrar en un sistema con datos clínicos reales.
2. Decidí (y dejá documentada la decisión) si el borrado es automático o
   requiere confirmación manual de un superadmin — dado que el proyecto
   maneja información clínica, el default debería ser **reportar y pedir
   confirmación**, no borrar solo.
3. Esta función vive en tu carpeta, pero **el botón o pantalla que la
   dispare** (si el equipo quiere una en `/app/admin`) está en
   `frontend/src/features/admin/`, que no es tu carpeta ni la de Lucas en
   este módulo — no la edites sin que Matías te confirme el punto de entrada.
   Programá la función y expórtala; coordiná con Matías dónde se monta.
4. Sumá tests de la comparación (huérfano real vs. archivo con fila, vs. fila
   sin objeto en Storage — que también puede pasar y es un caso distinto).

## Antes de dar algo por terminado

```sh
cd frontend
node --test src/features/archivos/*.test.ts
npm run build
npm run lint
```

Si `npm run build` tira errores de tipos en archivos que **no** tocaste (por
ejemplo `Property 'tone' does not exist on type 'BadgeProps'` repetido en
módulos ajenos), no es tu código: es un problema de entorno local
(node_modules desincronizado). Probá `rm -rf node_modules && npm install`
antes de asumir que rompiste algo.

## Al cerrar

- Trabajá en tu rama habitual, nunca directo sobre `main`.
- La bitácora (`docs/bitacoras/angelica.md`) se llena sola con el hook de git
  (`git config core.hooksPath .githooks` si no lo activaste en esta máquina).
  No la edites a mano.
- No mergees a `main`, no toques archivos de integración, no ejecutes SQL ni
  borrados reales sobre Supabase sin confirmación explícita de Matías.

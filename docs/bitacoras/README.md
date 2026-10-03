# Bitácoras del equipo

Registro individual de avance por desarrollador, ligado a los módulos y a los
IDs de historias de usuario (`US-x.x`) y tareas técnicas (`T-x.x`) definidos en
[`docs/modules/`](../modules/) y en la asignación de [`INDEX.md`](../INDEX.md).

## Equipo (6 desarrolladores)

| Dev | Nombre | Módulo asignado | Carpeta exclusiva | Bitácora |
|-----|--------|-----------------|-------------------|----------|
| Dev 1 | **Matías (PO)** | 01 Auth/Onboarding + 07 Agenda/Citas + **Planta 3D** | `features/agenda/`, `features/odontogram/` | [matias.md](matias.md) |
| Dev 2 | Lucas | **06: Evolución Clínica** | `features/evolucion/` | [lucas.md](lucas.md) |
| Dev 3 | Bianca | **08: Presupuestos** | `features/presupuestos/` | [bianca.md](bianca.md) |
| Dev 4 | Carlos | **09: Pagos y Cuentas** | `features/pagos/` | [carlos.md](carlos.md) |
| Dev 5 | Melissa | **13: Dashboard** (2D, sin 3D) | `features/dashboard/` | [melissa.md](melissa.md) |
| Dev 6 | Angélica | **10: Archivos e Imágenes** | `features/archivos/` | [angelica.md](angelica.md) |

> ⚠️ **Esta tabla contradice a propósito la asignación original de
> [`../INDEX.md`](../INDEX.md)**, que repartía los módulos 02–05 y dejaba 08–13
> sin dueño. La asignación vigente es la de esta tabla y la de `AGENTS.md`. Hay
> que actualizar `INDEX.md` para que no se contradigan.

Los módulos ya construidos antes de este reparto —**03 Historia Clínica**,
**04 Odontograma** y **05 Diagnóstico/Tratamiento**— los mantiene Matías. No tienen
dueño asignado porque no hay nadie mas que trabajar en ellos.

La tabla de fases por mes de cada persona esta en su propio archivo de bitacora.

## Reglas de no colisión

Cada persona **crea archivos dentro de su carpeta y no toca ninguna otra**. Leer
archivos ajenos es permisible y necesario; escribirlos es lo que genera los
conflictos de merge. Los archivos de integración (`App.tsx`, `Sidebar.tsx`,
`store.tsx`, `types/index.ts`, `PatientProfilePage.tsx`, `tabValue.ts`, el SQL y
`components/ui/*`) son de Matías y se editan una vez por merge.

Detalle completo en [`../../AGENTS.md`](../../AGENTS.md) y
[`../../CONTRIBUTING.md`](../../CONTRIBUTING.md).


## Política de cambios y migraciones

Matías es el **Product Owner** del proyecto. Ningún integrante puede aplicar
cambios de base de datos, migraciones o cambios de arquitectura sin su
aprobación previa. El detalle completo está en
[`../../CONTRIBUTING.md`](../../CONTRIBUTING.md) — léanlo antes de tocar
`bd_5clinicas_midentista.sql`, `supabase/migrations/`, RLS, o cualquier `.md`
de `docs/` que describa el esquema o la arquitectura.

## Cómo empezar a programar (todos)

1. Clona el repo y sigue [`SETUP.md`](../SETUP.md) (Node 20 LTS, `npm install`,
   `.env`, Supabase).
2. Crea tu propia rama, nunca trabajes directo sobre `main`:
   ```
   git checkout -b feature/modulo-XX-tu-nombre
   ```
   (ej. `feature/modulo-02-bianca`, `feature/testing-melissa`).
3. Lee el `README.md`, `user-stories.md` y `tasks.md` de tu módulo en
   `docs/modules/`.
4. Sigue el **checklist de tareas** de tu bitácora (abajo, en tu archivo) en
   el orden dado — respeta las dependencias entre tareas.
5. Si tu tarea toca base de datos, RLS o arquitectura, lee
   [`CONTRIBUTING.md`](../../CONTRIBUTING.md) **antes** de escribir código:
   necesitas la aprobación de Matías.
6. Abre un Pull Request hacia `main` cuando termines. Matías debe revisarlo
   y aprobarlo antes de mergear.
7. Marca cada tarea como hecha en tu checklist y agrega la entrada
   correspondiente en tu "Registro de avance".

## Cómo llenar tu bitácora

Cada entrada de la tabla "Registro de avance" de tu archivo debe tener:

- **Fecha**: `AAAA-MM-DD`.
- **ID**: el identificador de la historia o tarea en la que trabajaste
  (`US-2.3`, `T-5.4`, etc.), tal como aparece en `user-stories.md`/`tasks.md`
  de tu módulo. Si el trabajo no corresponde a un ID puntual (setup, testing
  general, reuniones), usa una etiqueta libre como `SETUP` o `TESTING`.
- **Qué hice**: descripción breve y concreta (qué se implementó, qué se
  decidió, qué bloqueó el avance).
- **Estado**: `pendiente` · `en progreso` · `completado` · `bloqueado`.
- **Horas**: horas dedicadas esa fecha (aproximado).

No dupliques aquí la definición de las historias/tareas — esa vive en
`docs/modules/`. La bitácora es solo el registro de *quién hizo qué y cuándo*.

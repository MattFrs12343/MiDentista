# Bitácoras del equipo

Registro individual de avance por desarrollador, ligado a los módulos y a los
IDs de historias de usuario (`US-x.x`) y tareas técnicas (`T-x.x`) definidos en
[`docs/modules/`](../modules/) y en la asignación de [`INDEX.md`](../INDEX.md).

## Equipo (6 desarrolladores)

| Dev | Nombre | Mes 1 | Mes 2 | Mes 3 | Bitácora |
|-----|--------|-------|-------|-------|----------|
| Dev 1 | **Matías (PO)** | Módulo 01: Auth/Onboarding | Módulo 07: Agenda/Citas | Testing final + **Deploy** + aprobación de cambios/migraciones | [matias.md](matias.md) |
| Dev 2 | Bianca | Módulo 02: Pacientes | Apoyo Módulo 05 + Testing | Módulos 08 y 09, en pareja con Carlos | [bianca.md](bianca.md) |
| Dev 3 | Carlos | Módulo 03: Historia Clínica | Apoyo Módulo 06 + Testing | Módulos 08 y 09, en pareja con Bianca | [carlos.md](carlos.md) |
| Dev 4 | Melissa | Módulo 04: Odontograma | Testing | Testing e integración, en pareja con Angélica | [melissa.md](melissa.md) |
| Dev 5 | Angélica | Setup BD/Auth (RLS, migraciones) | **Módulo 05: Diagnóstico/Tratamiento** (dueña) | Testing e integración, en pareja con Melissa | [angelica.md](angelica.md) |
| Dev 6 | Lucas | Setup proyecto (base del despliegue) | **Módulo 06: Evolución Clínica** (dueño) | Cierre y refinamiento del Módulo 06 (solo) | [lucas.md](lucas.md) |

Esta tabla es la misma asignación de la sección "Asignación de Equipo (MVP)" de
`INDEX.md`, con nombres reales en vez de "Dev 1..6". Nadie tiene "Deploy" como
única tarea: el despliegue a producción es responsabilidad del Product Owner
(Matías), y todos los demás programan en las tres fases.

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

## Actualización automática (Git)

Cada bitácora tiene, además del "Registro de avance" manual de arriba, una
sección **"Registro automático (Git)"** al final del archivo. Esa tabla la
llena sola un hook de git en cada commit — nadie la edita a mano.

**Cómo funciona:**

1. El hook `post-commit` (en `.githooks/post-commit`, versionado en el repo)
   corre después de cada commit.
2. Llama a `scripts/log-bitacora.cjs`, que lee el autor, la fecha, el mensaje
   y los archivos del commit recién hecho.
3. Según el email/nombre del autor, identifica a quién corresponde (`matias`,
   `melissa`, `bianca`, `carlos`, `lucas` o `angelica`) y agrega una fila con
   **Fecha y hora | Usuario | Descripción del cambio | Archivos modificados**
   en `docs/bitacoras/<persona>.md`.
4. Esa fila se guarda en un **commit aparte**, automático, con mensaje
   `chore(bitacora-auto): registrar cambio de <Nombre> (<hash>)`. Así el
   commit original queda limpio y la bitácora se actualiza sin que nadie
   tenga que acordarse de hacerlo.
5. Si el autor no coincide con nadie conocido, la fila cae en
   `docs/bitacoras/_sin-identificar.md` y el hook avisa en la consola qué
   email agregar al mapa (`EMAIL_MAP` en `scripts/log-bitacora.cjs`).

**Activarlo (una sola vez por clon del repo):**

```sh
git config core.hooksPath .githooks
```

Requiere `node` en el `PATH` (ya es un requisito del proyecto, ver
[`SETUP.md`](../SETUP.md)). Si falta, el hook no rompe el commit: solo avisa
por consola que no pudo actualizar la bitácora.

**Límite conocido:** la identificación es por email/nombre de git, no por
persona real. Bianca y Carlos no tienen cuentas de git separadas todavía
(ver commits de "Derek598"); mientras eso no se resuelva, sus commits deben
hacerse con `git config user.name`/`user.email` reconocibles, o revisar
`_sin-identificar.md` después de commitear.

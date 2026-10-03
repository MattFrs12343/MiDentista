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

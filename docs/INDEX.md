# Documentación - MiDentista (MVP 3 meses)

## Archivos Principales

| Archivo | Descripción |
|---------|-------------|
| [SPEC.md](SPEC.md) | Visión del proyecto MVP, 9 módulos, permisos, flujos |
| [DATABASE.md](DATABASE.md) | Schema de BD del MVP (15 tablas) |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Arquitectura técnica, estructura del proyecto |
| [SETUP.md](SETUP.md) | Guía de instalación y configuración |
| [jira-export.csv](jira-export.csv) | CSV listo para importar a Jira |
| [../bd_5clinicas_midentista.sql](../bd_5clinicas_midentista.sql) | **Script SQL ejecutable del MVP (15 tablas) con seed de 5 clínicas** |

> **Nota:** El proyecto se redujo de 25 a **15 tablas** y de 15 a **9 módulos**
> para ajustarse al nuevo plazo de **3 meses**. El MVP se describe en
> `SPEC.md` y el SQL correspondiente en `bd_5clinicas_midentista.sql`. El resto
> de la documentación (módulos 10-15) corresponde a la versión extendida futura.

---

## Módulos del MVP (9 módulos, 3 meses)

Cada módulo contiene: `README.md` (descripción), `user-stories.md` (historias), `tasks.md` (tareas)

### Mes 1

| # | Módulo | Dev | Archivos |
|---|--------|-----|----------|
| 01 | [Auth y Onboarding](modules/01-auth-onboarding/) | Dev 1 | [README](modules/01-auth-onboarding/README.md) · [Historias](modules/01-auth-onboarding/user-stories.md) · [Tareas](modules/01-auth-onboarding/tasks.md) |
| 02 | [Gestión de Pacientes](modules/02-pacientes/) | Dev 2 | [README](modules/02-pacientes/README.md) · [Historias](modules/02-pacientes/user-stories.md) · [Tareas](modules/02-pacientes/tasks.md) |
| 03 | [Historia Clínica](modules/03-historia-clinica/) | Dev 3 | [README](modules/03-historia-clinica/README.md) · [Historias](modules/03-historia-clinica/user-stories.md) · [Tareas](modules/03-historia-clinica/tasks.md) |
| 04 | [Odontograma](modules/04-odontograma/) | Dev 4 | [README](modules/04-odontograma/README.md) · [Historias](modules/04-odontograma/user-stories.md) · [Tareas](modules/04-odontograma/tasks.md) |

### Mes 2

| # | Módulo | Dev | Archivos |
|---|--------|-----|----------|
| 05 | [Diagnóstico y Tratamiento](modules/05-diagnostico-tratamiento/) | Dev 5 (apoyo: Dev 2) | [README](modules/05-diagnostico-tratamiento/README.md) · [Historias](modules/05-diagnostico-tratamiento/user-stories.md) · [Tareas](modules/05-diagnostico-tratamiento/tasks.md) |
| 06 | [Evolución Clínica](modules/06-evolucion-clinica/) | Dev 6 (apoyo: Dev 3) | [README](modules/06-evolucion-clinica/README.md) · [Historias](modules/06-evolucion-clinica/user-stories.md) · [Tareas](modules/06-evolucion-clinica/tasks.md) |
| 07 | [Agenda y Citas](modules/07-agenda-citas/) | Dev 1 | [README](modules/07-agenda-citas/README.md) · [Historias](modules/07-agenda-citas/user-stories.md) · [Tareas](modules/07-agenda-citas/tasks.md) |

### Mes 3

| # | Módulo | Dev | Archivos |
|---|--------|-----|----------|
| 08 | [Presupuestos](modules/08-presupuestos/) | Dev 2 | [README](modules/08-presupuestos/README.md) · [Historias](modules/08-presupuestos/user-stories.md) · [Tareas](modules/08-presupuestos/tasks.md) |
| 09 | [Pagos y Cuentas](modules/09-pagos/) | Dev 3 | [README](modules/09-pagos/README.md) · [Historias](modules/09-pagos/user-stories.md) · [Tareas](modules/09-pagos/tasks.md) |

---

## Módulos de la Versión Extendida (Futura - 4 y 5)

Eliminados del MVP pero planeados para v2:

| # | Módulo |
|---|--------|
| 10 | [Archivos e Imágenes](modules/10-archivos/) |
| 11 | [Usuarios y Roles](modules/11-usuarios-roles/) |
| 12 | [Gestión de Clínica](modules/12-gestion-clinica/) |
| 13 | [Dashboard](modules/13-dashboard/) |
| 14 | [Configuración](modules/14-configuracion/) |
| 15 | [Consentimientos](modules/15-consentimientos/) |

---

## Asignación de Equipo (MVP)

| Dev | Mes 1 | Mes 2 | Mes 3 |
|-----|-------|-------|-------|
| **Dev 1** (PO) | Auth/Onboarding | Agenda/Citas | Testing final + **Deploy** + aprobación de migraciones/cambios |
| **Dev 2** | Pacientes | Apoyo Módulo 05 (Diagnóstico/Tratamiento) + Testing | Presupuestos y Pagos, en pareja con Dev 3 |
| **Dev 3** | Historia Clínica | Apoyo Módulo 06 (Evolución) + Testing | Presupuestos y Pagos, en pareja con Dev 2 |
| **Dev 4** | Odontograma | Testing | Testing e integración, en pareja con Dev 5 |
| **Dev 5** | Setup BD/Auth | Diagnóstico/Tratamiento (dueña del módulo) | Testing e integración, en pareja con Dev 4 |
| **Dev 6** | Setup proyecto | Evolución Clínica (dueño del módulo) | Cierre y refinamiento del Módulo 06 (solo) |

> **Nota:** ningún desarrollador tiene "Deploy" como única asignación — todos
> programan en las tres fases. El despliegue a producción (mes 3) es
> responsabilidad exclusiva del Dev 1 (Product Owner), junto con la
> aprobación de cualquier migración o cambio de base de datos (ver
> [`../CONTRIBUTING.md`](../CONTRIBUTING.md)).

Nombres reales del equipo y registro de avance individual: ver
[docs/bitacoras/](bitacoras/README.md).

---

## Importar a Jira

1. Abrir Jira → Tu proyecto
2. **Issues → Import issues from CSV**
3. Seleccionar `docs/jira-export.csv`
4. Mapear columnas:
   - `Summary` → Resumen
   - `Issue Type` → Tipo (Story/Task)
   - `Epic Link` → Épico
   - `Priority` → Prioridad
   - `Labels` → Etiquetas
   - `Story Points` → Puntos

# Bitácora - Matías (Dev 1 · Product Owner)

## Rol de Product Owner

Además de programar sus propios módulos, Matías es el **Product Owner** del
proyecto: aprueba cualquier migración de base de datos, cambio de arquitectura
o cambio de alcance antes de que se aplique. Ver la política completa en
[`../../CONTRIBUTING.md`](../../CONTRIBUTING.md).

## Asignación (INDEX.md)

| Fase | Mes | Responsabilidad |
|------|-----|------------------|
| 1 | Septiembre | Módulo 01: [Auth y Onboarding](../modules/01-auth-onboarding/) |
| 2 | Octubre | Módulo 07: [Agenda y Citas](../modules/07-agenda-citas/) |
| 3 | Nov-Dic | Testing final integral + **Deploy** a producción + revisión/aprobación de todo cambio de BD o arquitectura del resto del equipo |

Es la carga más pesada del proyecto: dos módulos completos (01 y 07) más el
despliegue a producción y la responsabilidad de revisar cada migración y cada
cambio de esquema antes de que el equipo lo aplique.

## Tus propiedades exclusivas (además de la de tu módulo)

Eres el único autorizado para estos archivos, y se editan **una vez por merge**:

- `frontend/src/App.tsx` — registro de rutas
- `frontend/src/components/layout/Sidebar.tsx` — entradas de navegación
- `frontend/src/features/patients/PatientProfilePage.tsx` — pestañas de la ficha
- `frontend/src/features/patients/tabValue.ts` — unión de pestañas
- `frontend/src/data/store.tsx` — store en memoria compartido
- `frontend/src/types/index.ts` — tipos compartidos
- `frontend/src/index.css` y `frontend/src/components/ui/*` — tokens y primitivas
- `bd_5clinicas_midentista.sql`, `supabase/`
- `docs/DATABASE.md`, `docs/ARCHITECTURE.md`, `docs/SPEC.md`, `CONTRIBUTING.md`

Cada persona **pide** lo que necesita en su PR y tú lo agregas en el commit de
integración. Por eso los merges son de unas pocas líneas.

**Tus carpetas de módulo:** `features/agenda/` y `features/odontogram/`. Eres el
único autorizado para 3D: `three`, `@react-three/fiber`, `@react-three/drei` y
`dental-arch.glb`. Los demás miembros no lo tocan.

**Al integrar `features/dashboard/` de Melissa, no lo abras.** Ella es su dueña y
usa `CalendarioAgenda`. Crea tu pieza de agenda como archivo nuevo dentro de
`features/agenda/` y deja el `CalendarioAgenda` actual intacto.

## Orden de merge de los módulos

1. **06 Evolución** (Lucas) — no depende de nadie
2. **08 Presupuestos** (Bianca)
3. **09 Pagos** (Carlos) — consume los totales del 08
4. **13 Dashboard** (Melissa) y **10 Archivos** (Angélica) — independientes

Como el store y los archivos de integración los editas tú en cada merge, nunca
hay dos personas modificando el mismo archivo.

## Decisiones pendientes de tu lado

- **`odontologo_admin`**: aprobado como rol real, pero el esquema y `SPEC.md`
  todavía no lo reflejan. `types/index.ts` ya lo declara, la tabla
  `perfiles` no lo acepta y `SPEC.md:73` fusiona al odontólogo afiliado con el
  dueño.
- **RLS por rol**: las políticas actuales permiten a cualquier odontólogo ver los
  pacientes de toda la clínica, lo que contradice `ENTREVISTAS_USIARIO.txt`
  ("cada odontólogo solo debería ver sus propios pacientes y citas").
- **`docs/INDEX.md`**: su tabla de asignación contradice la vigente de
  `AGENTS.md` y `docs/bitacoras/README.md`. Hay que actualizarla.
- **Rotar los tokens** de Jira y Supabase que estaban en `.claude/settings.local.json`.

## Historias y tareas asignadas

**Módulo 01 (MVP):**
- Historias: US-1.1, US-1.2, US-1.3, US-1.5, US-1.6, US-1.7, US-1.8
- Tareas: T-1.1 a T-1.6, T-1.8 a T-1.15

**Módulo 07 (MVP):**
- Historias: US-7.1, US-7.2, US-7.3, US-7.4, US-7.5, US-7.7
- Tareas: T-7.1 a T-7.8, T-7.10, T-7.11

**Mes 3 — Deploy (ver [SETUP.md](../SETUP.md), "Despliegue en producción"):**
- `npm run build`, subida por FTP a HostGator, configuración de `.htaccess`
- Verificación de variables de entorno de producción
- Aprobación final de toda migración aplicada durante las 3 fases antes de
  publicar

## Checklist de tareas (en orden)

### Mes 1 — Módulo 01

- [ ] T-1.1 Configurar Supabase Auth (email/password)
- [ ] T-1.2 Crear tabla `perfiles` y trigger de sync con `auth.users`
- [ ] T-1.13 Agregar columnas `latitud`/`longitud` a `clinicas` + índice geo ⚠️ toca BD
- [ ] T-1.3 Crear middleware de autenticación (JWT + `clinica_id`)
- [ ] T-1.5 Implementar formulario de registro de paciente
- [ ] T-1.6 Implementar flujo de recuperación de contraseña
- [ ] T-1.8 Crear wizard de onboarding de clínica (MVP)
- [ ] T-1.10 Configurar RLS para `perfiles` ⚠️ toca BD
- [ ] T-1.4 Implementar página de login
- [ ] T-1.9 Implementar ProtectedRoute y role-based routing
- [ ] T-1.11 Implementar cierre de sesión
- [ ] T-1.12 Crear hooks de autenticación (`useAuth`, `useUser`)
- [ ] T-1.14 Implementar pestaña de búsqueda de clínicas (nombre + radio 5 km)
- [ ] T-1.15 Implementar flujo de afiliación del paciente
- [ ] Validar US-1.1 a US-1.8 contra sus criterios de aceptación

### Mes 2 — Módulo 07

- [ ] T-7.1 Crear tablas `horarios` + `citas` + RLS ⚠️ toca BD
- [ ] T-7.2 Crear formulario de disponibilidad horaria
- [ ] T-7.4 Crear componente de calendario (vista diaria/semanal)
- [ ] T-7.3 Implementar CRUD de horarios
- [ ] T-7.5 Implementar selector de horarios disponibles para paciente
- [ ] T-7.6 Crear flujo de agendamiento de citas
- [ ] T-7.7 Implementar reprogramación de citas
- [ ] T-7.8 Implementar cancelación de citas
- [ ] T-7.10 Implementar máquina de estados de cita
- [ ] T-7.11 Integrar agenda en ficha del paciente
- [ ] Validar US-7.1 a US-7.5, US-7.7 contra sus criterios de aceptación

### Mes 3 — PO + Deploy

- [ ] Revisar y aprobar/rechazar cada PR que toque BD, RLS o arquitectura
- [ ] Testing final integral de los 9 módulos (junto al reporte de
      Melissa/Angélica)
- [ ] `npm run build`
- [ ] Subir `dist/` por FTP al subdominio en HostGator (cPanel)
- [ ] Configurar `.htaccess` para SPA
- [ ] Verificar variables de entorno de producción y HTTPS activo
- [ ] Capacitar al personal de la clínica piloto (Dr. Rojas / María López)

## Registro de avance

| Fecha | ID | Qué hice | Estado | Horas |
|-------|----|----|--------|-------|
| | | | | |

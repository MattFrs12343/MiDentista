# Bitácora - Bianca (Dev 2)

## Asignación vigente

| Módulo | Carpeta exclusiva | Bitácora de referencia |
|--------|-------------------|------------------------|
| **08: [Presupuestos](../modules/08-presupuestos/)** | `frontend/src/features/presupuestos/` | esta |

## Propiedad de archivos — Bianca

**Creas archivos dentro de `features/presupuestos/` y dentro de nada más.**

**No editas**, aunque los leas: `App.tsx`, `Sidebar.tsx`, `store.tsx`,
`types/index.ts`, `PatientProfilePage.tsx`, `tabValue.ts`, `components/ui/*`,
`index.css`, `bd_5clinicas_midentista.sql`, ni las carpetas de Lucas, Carlos,
Melissa o Angélica. Esos archivos son de integración y los edita Matías una vez
por merge.

En tu PR, **pide** lo que necesites en vez de añadirlo: "necesito la ruta
`/app/presupuestos`" y "necesito la entrada en el Sidebar".

Lee [`../../AGENTS.md`](../../AGENTS.md) y el
[`README.md`](../../frontend/src/features/presupuestos/README.md) de tu módulo
antes de escribir la primera línea: ahí está el contrato de tu carpeta.

## Historias y tareas asignadas

**Módulo 02:**
- Historias: US-2.1 a US-2.7
- Tareas: T-2.1 a T-2.9

**Apoyo Módulo 05** (dueña: Angélica/Dev 5):
- Apoyo en T-5.6 (CRUD de procedimientos) y T-5.10 (cálculo automático del total del plan)
- Testing de integración de la Fase 2 (módulos 05, 06, 07)

**Módulos 08 y 09 (mes 3, en pareja con Carlos):**
- Módulo 08: US-8.1, US-8.2, US-8.4 / T-8.1, T-8.2, T-8.3, T-8.4, T-8.6, T-8.7, T-8.8
- Módulo 09: US-9.3, US-9.4, US-9.5, US-9.6 / T-9.1, T-9.4, T-9.5, T-9.6, T-9.7, T-9.8
- Ambos trabajan juntos en los dos módulos en vez de dividirse uno cada uno;
  coordinar en la bitácora quién toma cada ID para no duplicar trabajo.

## Checklist de tareas (en orden)

### Mes 1 — Módulo 02

- [ ] T-2.1 Crear tabla `pacientes` + RLS ⚠️ toca BD
- [ ] T-2.2 Crear componente FormPaciente (registro/edición)
- [ ] T-2.3 Crear componente ListaPacientes con paginación
- [ ] T-2.9 Crear servicios de pacientes (CRUD Supabase)
- [ ] T-2.4 Implementar búsqueda de pacientes
- [ ] T-2.5 Crear componente FichaPaciente (con tabs)
- [ ] T-2.6 Implementar formulario de contacto de emergencia
- [ ] T-2.8 Implementar validaciones de formulario
- [ ] T-2.7 Crear vista de historial de atenciones
- [ ] Validar US-2.1 a US-2.7 contra sus criterios de aceptación

### Mes 2 — Apoyo Módulo 05 + Testing

- [ ] T-5.6 Implementar CRUD de procedimientos (apoyo)
- [ ] T-5.10 Calcular total del plan automáticamente (apoyo)
- [ ] Testing de integración de la Fase 2 (módulos 05, 06, 07)

### Mes 3 — Módulo 08 (lideras, en pareja con Carlos que lidera el 09)

- [ ] T-8.1 Crear tablas `presupuestos` + `items_presupuesto` + RLS ⚠️ toca BD
- [ ] T-8.2 Crear formulario de presupuesto
- [ ] T-8.6 Crear lista de presupuestos con filtros
- [ ] T-8.3 Implementar CRUD de items de presupuesto
- [ ] T-8.8 Implementar estados de presupuesto
- [ ] T-8.4 Implementar cálculo de total y descuento
- [ ] T-8.7 Integrar servicios de catálogo en presupuesto (depende del Módulo 05)
- [ ] Validar US-8.1, US-8.2, US-8.4
- [ ] Apoyar/revisar el PR de Carlos en el Módulo 09

## Registro de avance

| Fecha | ID | Qué hice | Estado | Horas |
|-------|----|----|--------|-------|
| | | | | |

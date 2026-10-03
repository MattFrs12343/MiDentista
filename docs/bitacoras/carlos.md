# Bitácora - Carlos (Dev 3)

## Asignación vigente

| Módulo | Carpeta exclusiva | Bitácora de referencia |
|--------|-------------------|------------------------|
| **09: [Pagos y Cuentas](../modules/09-pagos/)** | `frontend/src/features/pagos/` | esta |

## Propiedad de archivos — Carlos

**Creas archivos dentro de `features/pagos/` y dentro de nada más.**

**No editas**, aunque los leas: `App.tsx`, `Sidebar.tsx`, `store.tsx`,
`types/index.ts`, `PatientProfilePage.tsx`, `tabValue.ts`, `components/ui/*`,
`index.css`, `bd_5clinicas_midentista.sql`, ni las carpetas de Lucas, Bianca,
Melissa o Angélica. Esos archivos son de integración y los edita Matías una vez
por merge.

En tu PR, **pide** lo que necesites: "necesito la ruta `/app/pagos`".

**Sobre Bianca:** tu módulo 09 necesita los totales de su módulo 08 (`T-9.7`),
pero **`pagoCalculo.ts` no importa nada** de `features/presupuestos/`, solo recibe
números. Por eso **no te bloquea**: puedes empezar hoy sin esperar su merge. Y no
dupliques su fórmula del total: si cada uno multiplica por su lado, los dos
mostréis cifras distintas para el mismo presupuesto.

Lee [`../../AGENTS.md`](../../AGENTS.md) y el
[`README.md`](../../frontend/src/features/pagos/README.md) de tu módulo antes de
escribir la primera línea.

## Historias y tareas asignadas

**Módulo 03 (MVP):**
- Historias: US-3.1, US-3.2, US-3.3
- Tareas: T-3.1, T-3.2, T-3.3, T-3.4, T-3.5, T-3.7

**Apoyo Módulo 06** (dueño: Lucas/Dev 6):
- Apoyo en T-6.6 (vincular evolución con plan de tratamiento) y revisión de reglas clínicas
- Testing de integración de la Fase 2 (módulos 05, 06, 07)

**Módulos 08 y 09 (mes 3, en pareja con Bianca):**
- Módulo 08: US-8.1, US-8.2, US-8.4 / T-8.1, T-8.2, T-8.3, T-8.4, T-8.6, T-8.7, T-8.8
- Módulo 09: US-9.3, US-9.4, US-9.5, US-9.6 / T-9.1, T-9.4, T-9.5, T-9.6, T-9.7, T-9.8
- Ambos trabajan juntos en los dos módulos en vez de dividirse uno cada uno;
  coordinar en la bitácora quién toma cada ID para no duplicar trabajo.

## Checklist de tareas (en orden)

### Mes 1 — Módulo 03

- [ ] T-3.1 Crear tabla `historiales_clinicos` + RLS ⚠️ toca BD
- [ ] T-3.2 Crear formulario de historia clínica (todos los campos)
- [ ] T-3.3 Implementar servicio de historia clínica (CRUD)
- [ ] T-3.4 Crear vista de consulta de historia
- [ ] T-3.5 Implementar edición de historia clínica
- [ ] T-3.7 Integrar historia clínica en ficha del paciente (depende del Módulo 02)
- [ ] Validar US-3.1, US-3.2, US-3.3 contra sus criterios de aceptación

### Mes 2 — Apoyo Módulo 06 + Testing

- [ ] T-6.6 Vincular evolución con plan de tratamiento (apoyo, depende del Módulo 05)
- [ ] Revisión de reglas clínicas en el Módulo 06
- [ ] Testing de integración de la Fase 2 (módulos 05, 06, 07)

### Mes 3 — Módulo 09 (lideras, en pareja con Bianca que lidera el 08)

- [ ] T-9.1 Crear tabla `pagos` + RLS ⚠️ toca BD
- [ ] T-9.4 Crear flujo de registro de pago
- [ ] T-9.6 Crear vista de historial de pagos
- [ ] T-9.5 Implementar pago parcial
- [ ] T-9.7 Implementar estado de cuenta (total/pagado/pendiente) (depende del Módulo 08)
- [ ] T-9.8 Integrar pagos en ficha del paciente
- [ ] Validar US-9.3, US-9.4, US-9.5, US-9.6
- [ ] Apoyar/revisar el PR de Bianca en el Módulo 08

## Registro de avance

| Fecha | ID | Qué hice | Estado | Horas |
|-------|----|----|--------|-------|
| | | | | |

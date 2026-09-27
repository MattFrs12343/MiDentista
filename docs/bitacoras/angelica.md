# Bitácora - Angélica (Dev 5)

## Asignación (INDEX.md)

| Fase | Mes | Responsabilidad |
|------|-----|------------------|
| 1 | Septiembre | Setup BD/Auth: configuración de la base de datos, migraciones SQL y RLS |
| 2 | Octubre | Módulo 05: [Diagnóstico y Plan de Tratamiento](../modules/05-diagnostico-tratamiento/) (dueña del módulo; apoyo de Bianca/Dev 2 en cálculo de costos y consultas SQL) |
| 3 | Nov-Dic | Testing e integración final de los 9 módulos, en pareja con Melissa, + población de datos |

## Historias y tareas asignadas

**Mes 1 — Base de datos** (ver [DATABASE.md](../DATABASE.md) y
[`bd_5clinicas_midentista.sql`](../../bd_5clinicas_midentista.sql)):
- Apoyo en T-1.2 (tabla `perfiles` + trigger de sync), T-1.10 (RLS de `perfiles`),
  T-1.13 (columnas `latitud`/`longitud` + índice geo)
- Migraciones, políticas RLS de las 15 tablas, índices, triggers de
  `actualizado_en`
- ⚠️ Toda migración debe pasar por la revisión de Matías (PO) antes de
  aplicarse — ver [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md)

**Mes 2 — Módulo 05 (MVP):**
- Historias: US-5.1 a US-5.7
- Tareas: T-5.1 a T-5.10

**Mes 3 — Testing e integración (en pareja con Melissa) + datos:**
- Pruebas funcionales de cada módulo contra sus criterios de aceptación
- Población de `supabase/seed.sql` / seed de la clínica piloto (ver Tabla 12
  de volumen en el docx, Capítulo 5.1)

## Checklist de tareas (en orden)

### Mes 1 — Setup BD/Auth (apoyo a Matías en el Módulo 01)

- [ ] Diseñar/revisar `bd_5clinicas_midentista.sql` completo (15 tablas) — ⚠️ proponer a Matías, no aplicar sola
- [ ] T-1.2 Apoyo: tabla `perfiles` + trigger de sync con `auth.users` ⚠️ toca BD
- [ ] T-1.10 Apoyo: configurar RLS para `perfiles` ⚠️ toca BD
- [ ] T-1.13 Apoyo: columnas `latitud`/`longitud` + índice geo ⚠️ toca BD
- [ ] Escribir las políticas RLS de las 15 tablas (`obtener_clinica_usuario()`,
      `obtener_rol_usuario()`) ⚠️ toca BD — requiere aprobación de Matías
- [ ] Crear los triggers de `actualizado_en` para las tablas que se modifican
      ⚠️ toca BD — requiere aprobación de Matías

### Mes 2 — Módulo 05 (dueña)

- [ ] T-5.1 Crear tablas `diagnosticos` + `planes_tratamiento` +
      `procedimientos_tratamiento` + RLS ⚠️ toca BD
- [ ] T-5.2 Crear formulario de diagnóstico
- [ ] T-5.3 Implementar servicio de diagnóstico (CRUD)
- [ ] T-5.5 Crear formulario de plan de tratamiento
- [ ] T-5.4 Crear lista de diagnósticos del paciente
- [ ] T-5.6 Implementar CRUD de procedimientos (con apoyo de Bianca)
- [ ] T-5.7 Implementar máquina de estados del plan
- [ ] T-5.8 Crear vista de tratamientos por estado
- [ ] T-5.10 Calcular total del plan automáticamente (con apoyo de Bianca)
- [ ] T-5.9 Integrar diagnóstico y tratamiento en ficha (depende del Módulo 02)
- [ ] Validar US-5.1 a US-5.7 contra sus criterios de aceptación

### Mes 3 — Testing e integración final (cubres módulos 05, 06, 08, 09; Melissa cubre 01-04 y 07) + datos

- [ ] Pruebas funcionales del Módulo 05 (Diagnóstico/Tratamiento) contra sus US
- [ ] Pruebas funcionales del Módulo 06 (Evolución Clínica) contra sus US
- [ ] Pruebas funcionales del Módulo 08 (Presupuestos) contra sus US
- [ ] Pruebas funcionales del Módulo 09 (Pagos) contra sus US
- [ ] Verificar criterios generales (RLS, paginación, búsqueda) en los módulos
      de tu lista
- [ ] Poblar `supabase/seed.sql` con la clínica piloto (ver Tabla 12 de
      volumen en el docx, Capítulo 5.1)
- [ ] Confirmar con Matías que los datos de prueba están listos antes del
      deploy

## Registro de avance

| Fecha | ID | Qué hice | Estado | Horas |
|-------|----|----|--------|-------|
| | | | | |

# Bitácora - Carlos (Dev 3)

## Asignación (INDEX.md)

| Fase | Mes | Responsabilidad |
|------|-----|------------------|
| 1 | Septiembre | Módulo 03: [Historia Clínica](../modules/03-historia-clinica/) |
| 2 | Octubre | Apoyo al Módulo 06: [Evolución Clínica](../modules/06-evolucion-clinica/) + testing de la fase |
| 3 | Nov-Dic | Módulo 08: [Presupuestos](../modules/08-presupuestos/) y Módulo 09: [Pagos y Cuentas](../modules/09-pagos/), en pareja con Bianca |

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

- [x] T-3.1 Crear tabla `historiales_clinicos` + RLS ⚠️ toca BD
- [x] T-3.2 Crear formulario de historia clínica (todos los campos)
- [x] T-3.3 Implementar servicio de historia clínica (CRUD)
- [x] T-3.4 Crear vista de consulta de historia
- [x] T-3.5 Implementar edición de historia clínica
- [x] T-3.7 Integrar historia clínica en ficha del paciente (depende del Módulo 02)
- [x] Validar US-3.1, US-3.2, US-3.3 contra sus criterios de aceptación

### Mes 2 — Apoyo Módulo 06 + Testing

- [ ] T-6.6 Vincular evolución con plan de tratamiento (apoyo, depende del Módulo 05) — vinculación implementada y completa (el selector de plan/procedimiento ya está en origin/main); falta la actualización del progreso del plan, pendiente de integración por el responsable del Módulo 05
- [x] Revisión de reglas clínicas en el Módulo 06
- [x] Testing de integración de la Fase 2 (módulos 05, 06, 07)

### Mes 3 — Módulo 09 (lideras, en pareja con Bianca que lidera el 08)

- [ ] T-9.1 Crear tabla `pagos` + RLS ⚠️ toca BD — tabla y políticas RLS integradas en el código de origin/main (`bd_5clinicas_midentista.sql`); no se verificó su aplicación en producción
- [x] T-9.4 Crear flujo de registro de pago
- [x] T-9.6 Crear vista de historial de pagos
- [x] T-9.5 Implementar pago parcial
- [x] T-9.7 Implementar estado de cuenta (total/pagado/pendiente) (depende del Módulo 08)
- [x] T-9.8 Integrar pagos en ficha del paciente
- [x] Validar US-9.3, US-9.4, US-9.5, US-9.6
- [ ] Apoyar/revisar el PR de Bianca en el Módulo 08 — pendiente: no existe un PR abierto que revisar

## Registro de avance

| Fecha | ID | Qué hice | Estado | Horas |
|-------|----|----|--------|-------|
| 2026-10-03 | T-9.4 | Capa de datos de pagos: `tipos.ts`, `pagoMapper.ts` (fila, `esUuid`, `pagoDesdeFila`/`pagoParaGuardar`) y `pagoService.ts` (`cargarPagos`, `registrarPago`) exigiendo UUID reales y `registradoPor` obligatorio | completado | 4 |
| 2026-10-03 | T-9.7 | `calcularEstadoCuenta(totalPresupuestado)` desacoplado del Módulo 08 (recibe el total como número) y saldo que solo cuenta pagos `confirmado` | completado | 2 |
| 2026-10-03 | T-9.1 | Esquema `pagos` + sus tres índices quedaron en `bd_5clinicas_midentista.sql`; falta la política RLS, pendiente de aprobación de Matías (no hay `sql.sql` en `docs/modules/09-pagos/`) | en progreso | 1 |
| 2026-10-04 | T-9.4 | `PaymentForm.tsx`: alta de pago a cuenta (monto, método, fecha, referencia, notas); el pago nace `pendiente` para no entrar como dinero recibido | completado | 3 |
| 2026-10-04 | T-9.6 | `PaymentHistory.tsx`: historial ordenado por fecha descendente que distingue "sin pagos" (SELECT vacío por RLS) de error real de red o permisos | completado | 2 |
| 2026-10-04 | T-9.7 | `AccountStatement.tsx` (solo pinta totales, no recalcula) y `PagosTab.tsx` con el estado de cuenta calculado en un único punto | completado | 3 |
| 2026-10-04 | T-9.8 | `PagosTab` integrado como pestaña en la ficha del paciente (`PatientProfilePage`); `registradoPor` decide si la pestaña permite cobrar o queda solo lectura | completado | 2 |
| 2026-10-04 | T-9.5 | `pagoCalculo.montoAceptable` (tope del pago parcial al saldo) y `pagoCalculo.test.ts` con 11 casos de la regla de pagos confirmados; falta la UI de pago parcial (`PartialPayment.tsx`) | en progreso | 3 |
| 2026-10-10 | T-9.4 | Migré `PaymentForm` al tema de formularios por sección (`FormShell section="pagos"`), reutilizando `FormGroup`/`FormActions`/`FormAlert` y `Field` con `error` | completado | 2 |
| 2026-10-14 | T-9.5 | Creé `PartialPayment.tsx` (saldo pendiente, atajos "abonar el total"/"la mitad" y previsualización del saldo restante); nuevo `saldoTrasAbono` en `pagoCalculo.ts` con su test; `PaymentForm` topa el monto al saldo y `PagosTab` calcula el saldo con la prop `totalPresupuestado` | completado | 4 |
| 2026-10-14 | T-9.1 | Dejé la propuesta de RLS de `pagos` en `docs/modules/09-pagos/sql.sql` (select/insert/update por clínica, `registrado_por = mi_perfil_id()`, rol `paciente` excluido y sin DELETE); falta que Matías la integre en `bd_5clinicas_midentista.sql` (regla 7) | bloqueado | 2 |
| 2026-10-14 | TESTING | Validación US-9.3–US-9.6: `node --test src/features/pagos/pagoCalculo.test.ts` (12/12), `npm run build` (tsc + vite) y `npm run lint` en verde | completado | 1 |
| 2026-10-14 | REVIEW | Revisión del PR de Bianca (Módulo 08): todavía no hay PR abierto, así que no se pudo revisar; queda pendiente coordinar la costura `totalPresupuestado` entre 08 y 09 | pendiente | 1 |
| 2026-10-14 | T-3.1–T-3.7 | Mes 1 (Módulo 03): no lo escribí, ya venía entregado en la rama base (autoría de Angélica y Matías). Verifiqué tabla `historiales_clinicos` + RLS select/insert/update en `bd_5clinicas_midentista.sql`, formulario/vista/edición y print en `ClinicalHistoryTab`/`ClinicalHistoryPrint`, la pestaña "Historia clínica" en `PatientProfilePage`, y el servicio CRUD (`clinicalHistoryService` + `useClinicalHistorySupabase`) con 16/16 tests verdes; US-3.1/3.2/3.3 cumplen (el "historial de cambios" es V2). Salvedad: la UI corre sobre el store en memoria; el servicio Supabase queda listo pero sin conectar | completado | 2 |
| 2026-10-14 | T-6.6 | Apoyo al Módulo 06 (Evolución, dueño Lucas): `tipos.ts`, `evolucionMapper.ts` y `evolucionService.ts` ya aceptan `planTratamientoId`/`procedimientoId`, pero `EvolutionForm` no ofrece selector de plan y ningún punto actualiza el progreso del plan. Falta la costura con el Módulo 05 y que Lucas exponga el vínculo en la UI | en progreso | 2 |
| 2026-10-14 | REGLAS-06 | Revisión de las reglas del Módulo 06 en `evolucionService`/`useEvolucionSupabase`: solo UUIDs reales (se rechazan ids demo `p1`/`p_...`), `lecturaSinFilas` distingue un SELECT vacío (RLS) de un error real, no se pisa el contenido previo ante un fallo, se rechaza el guardado concurrente y se respeta la matriz de roles (recepcionista sin acceso, paciente solo lectura) | completado | 2 |
| 2026-10-14 | TESTING | Testing de integración de la Fase 2: `node --test src/features/evolucion/*.test.ts` (22/22), `npm run build` (tsc + vite) y `npm run lint` (oxlint, 0 errores) en verde. Los módulos 05 y 07 no tienen tests automatizados y quedan cubiertos solo por el typecheck del build | completado | 2 |
| 2026-10-15 | T-6.6 | Estado tras revisión: mi vinculación de la evolución con el plan está completa (acepta `planTratamientoId`/`procedimientoId` con UUIDs estrictos; el selector de plan/procedimiento ya está en origin/main, en `CarlosBianca` no). La actualización del progreso del plan sigue pendiente de integración por el responsable del Módulo 05 | en progreso | 1 |
| 2026-10-15 | T-9.1 | Estado tras revisión: la tabla `pagos` y sus políticas RLS (`pagos_select_superadmin`, `pagos_select_staff`, `pagos_insert_staff`, `pagos_update_staff`) ya están integradas en el código de origin/main (`bd_5clinicas_midentista.sql`), según verificación del repositorio. No se comprobó su aplicación en producción, así que no se afirma que estén activas en la BD | en progreso | 1 |
| 2026-10-15 | REVIEW | Revisión del PR de Bianca (Módulo 08): sigue pendiente porque no existe un PR abierto; todavía no hay nada que revisar | pendiente | 1 |

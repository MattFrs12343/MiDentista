# Bitácora - Bianca (Dev 2)

## Asignación (INDEX.md)

| Fase | Mes | Responsabilidad |
|------|-----|------------------|
| 1 | Septiembre | Módulo 02: [Gestión de Pacientes](../modules/02-pacientes/) |
| 2 | Octubre | Apoyo al Módulo 05: [Diagnóstico y Plan de Tratamiento](../modules/05-diagnostico-tratamiento/) (cálculo de costos, consultas SQL) + testing de la fase |
| 3 | Nov-Dic | Módulo 08: [Presupuestos](../modules/08-presupuestos/) y Módulo 09: [Pagos y Cuentas](../modules/09-pagos/), en pareja con Carlos |

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

- [ ] T-2.1 Crear tabla `pacientes` + RLS ⚠️ toca BD — la tabla ya está en
      `bd_5clinicas_midentista.sql`; RLS a cargo de Matías (no verificable desde el frontend)
- [x] T-2.2 Crear componente FormPaciente (registro/edición) — ya presente en la rama
- [x] T-2.3 Crear componente ListaPacientes con paginación — ya presente en la rama
- [x] T-2.9 Crear servicios de pacientes (CRUD Supabase) — el CRUD vive en
      `src/data/store.tsx` (archivo de Matías), no en un servicio propio del módulo
- [x] T-2.4 Implementar búsqueda de pacientes — ya presente en la rama
- [x] T-2.5 Crear componente FichaPaciente (con tabs) — ya presente en la rama
- [x] T-2.6 Implementar formulario de contacto de emergencia — ya presente en la rama
- [x] T-2.8 Implementar validaciones de formulario — `validacionesPaciente.ts` + integración en `PatientForm.tsx`
- [~] T-2.7 Crear vista de historial de atenciones — `historialAtenciones.ts` (probado, 7 casos) + `HistorialAtenciones.tsx`. **Implementada, no integrada**: sin pestaña en la ficha, la vista no es alcanzable (la registra Matías en `tabValue.ts` / `PatientProfilePage.tsx`)
- [~] Validar US-2.1 a US-2.7 contra sus criterios de aceptación — US-2.7/2.8 cubiertas con tests; el resto verificado a mano sobre la rama

### Mes 2 — Apoyo Módulo 05 + Testing

- [x] T-5.6 Implementar CRUD de procedimientos (apoyo) — verificado en
      `data/store.tsx` + `features/treatment/TreatmentTab.tsx`
- [x] T-5.10 Calcular total del plan automáticamente (apoyo) — verificado en la rama
- [~] Testing de integración de la Fase 2 (módulos 05, 06, 07) — suites existentes
      (06 Evolución, Historia clínica, Pacientes) en verde; no hay tests para 05/07 y no
      se pueden agregar dentro de `features/treatment/` ni `features/agenda/` (propiedad)

### Mes 3 — Módulo 08 (lideras, en pareja con Carlos que lidera el 09)

- [ ] T-8.1 Crear tablas `presupuestos` + `items_presupuesto` + RLS ⚠️ toca BD — las
      tablas ya estaban en el esquema; RLS **propuesta** en
      `docs/modules/08-presupuestos/sql.sql` (pendiente de aplicar por Matías)
- [x] T-8.2 Crear formulario de presupuesto
- [x] T-8.6 Crear lista de presupuestos con filtros
- [x] T-8.3 Implementar CRUD de items de presupuesto
- [x] T-8.8 Implementar estados de presupuesto
- [x] T-8.4 Implementar cálculo de total y descuento
- [x] T-8.7 Integrar servicios de catálogo en presupuesto (depende del Módulo 05)
- [~] Validar US-8.1, US-8.2, US-8.4 — lógica pura probada (18 casos); la UI
      **no es alcanzable** hasta que Matías registre `/app/presupuestos`

> **Módulo 08 — implementado y probado a nivel unitario, no integrado.** El
> componente `PresupuestosPage` existe pero `App.tsx` no tiene la ruta
> `/app/presupuestos` y `Sidebar.tsx` lo lista en "Próximamente" (bloqueado). Es
> el estado esperado: el registro de ruta/entrada es del PO.

### Mes 3 — Módulo 09 (apoyo, en pareja con Carlos que lidera)

IDs asignados a Bianca: US-9.3, US-9.4, US-9.5, US-9.6 / T-9.1, T-9.4, T-9.5, T-9.6, T-9.7, T-9.8.

- [ ] T-9.1 Crear tabla `pagos` + RLS ⚠️ toca BD — la tabla ya está en el
      esquema, pero **sin RLS** y **sin propuesta**: a diferencia del M08, el
      módulo 09 no deja un `sql.sql`. Pendiente de Carlos/Matías
- [x] T-9.4 Crear flujo de registro de pago (US-9.3) — `PaymentForm.tsx` +
      `pagoService.registrarPago` (nace `pendiente`)
- [~] T-9.5 Implementar pago parcial (US-9.4) — `montoAceptable` y registro de
      montos libres existen; el saldo mostrado usa un `0` placeholder, así que
      el criterio "debe 1300, paga 800, queda 500" no es verificable todavía
- [x] T-9.6 Crear vista de historial de pagos (US-9.5) — `PaymentHistory.tsx`
- [~] T-9.7 Implementar estado de cuenta (US-9.6) — `calcularEstadoCuenta` +
      `AccountStatement` existen y están probados; `PagosTab` los llama con
      `totalPresupuestado = 0`, así que muestra "Sin presupuesto registrado".
      Depende de la integración con el M08 (una prop que resuelve Matías)
- [x] T-9.8 Integrar pagos en la ficha del paciente — `PagosTab` ya está en
      `PatientProfilePage.tsx` (pestaña "Pagos")
- [ ] Apoyar/revisar el PR de Carlos en el Módulo 09

> **Módulo 09 — parcial y dependiente de Carlos.** El README del módulo
> (`features/pagos/README.md`, de Carlos) declara pendientes `PagosPage.tsx`
> (`/app/pagos`) y `PartialPayment.tsx`, y que el paso de **confirmar/rechazar**
> un pago todavía no se expone en la UI. Sin ese paso, todo pago queda
> `pendiente`, `totalConfirmado` es 0 y el estado de cuenta nunca refleja dinero
> recibido. Eso no es de Bianca: es el tramo de Carlos.

## Verificación integral (2026-10-14)

Repaso de todo lo marcado `[x]`/`[~]` para separar **implementado**, **probado** y
**pendiente**. Evidencia dura ejecutada desde `frontend/`:

- `node --test src/features/**/*.test.ts` → **95/95 en verde** (11 archivos).
- `npm run build` (`tsc -b && vite build`) → **OK** (EXIT=0).
- `npm run lint` (`oxlint`) → **OK** (EXIT=0), sin avisos en 02/08/09.

### Implementado y probado

| Módulo | Qué | Evidencia |
|--------|-----|-----------|
| 02 | Validaciones de paciente | `validacionesPaciente.test.ts` (11) |
| 02 | Agenda del historial de atenciones | `historialAtenciones.test.ts` (7) |
| 08 | Total/descuento/saldo | `calculoTotal.test.ts` (11) |
| 08 | Mapper fila↔tipo | `presupuestoMapper.test.ts` (7) |
| 09 | Cálculo de pagos | `pagoCalculo.test.ts` |

### Pendiente (bloqueado por integración o por BD — no es código de Bianca)

1. **M02 US-2.7**: falta la pestaña "Historial" en `tabValue.ts` y
   `PatientProfilePage.tsx` (archivos de Matías). La vista existe pero no se
   alcanza.
2. **M08**: falta la ruta `/app/presupuestos` en `App.tsx` y mover "Presupuestos"
   de `proximamente` a `principal` en `Sidebar.tsx`.
3. **M09**: falta `PagosPage.tsx` (`/app/pagos`), `PartialPayment.tsx` y la UI de
   confirmar/rechazar pago (README de `features/pagos/`, tramo de Carlos).
4. **RLS**: `servicios`, `presupuestos`, `items_presupuesto` (propuesta lista en
   `docs/modules/08-presupuestos/sql.sql`) y `pagos` (sin propuesta) están **sin
   RLS** en `bd_5clinicas_midentista.sql`. Las tablas existen, así que las
   consultas funcionan (RLS desactivado = acceso abierto), pero es inseguro para
   datos clínicos. Aplicación: Matías.

### Hallazgos de código (para el PR)

- **`features/patients/PersonalDataTab.tsx`**: `onSubmit` llama
  `actualizarPaciente(...)` **sin `await`** → en edición, `PatientForm` no llega a
  mostrar `enviando`/error y cierra el formulario antes de conocer el resultado.
  Es archivo propio: corregible en este PR.
- **`features/presupuestos/tipos.ts`**: el comentario dice que `rechazado` vuelve
  a `borrador`, pero `transicionValida` lo trata como terminal. Alinear doc y
  código.
- **`features/presupuestos/presupuestoMapper.ts`**: falta salto de línea final.

## Registro de avance

| Fecha | ID | Qué hice | Estado | Horas |
|-------|----|----|--------|-------|
| 2026-10-14 | T-8.2 | Formulario de presupuesto (`PresupuestoForm.tsx`): alta/edición, selección de paciente, descuento y total en vivo recalculado con `calculoTotal.ts` | Hecho | 4 |
| 2026-10-14 | T-8.3 | CRUD de partidas (`PresupuestoItemsEditor.tsx`) y servicio (`presupuestoService.ts`): reemplazo "insertar primero, borrar después" para no perder partidas si falla el guardado | Hecho | 4 |
| 2026-10-14 | T-8.4 | Cálculo de total y descuento centralizado en `calculoTotal.ts` (redondeo a 2 decimales, total nunca negativo); se recalcula en el servicio, no se confía en el número del formulario | Hecho | 2 |
| 2026-10-14 | T-8.6 | Lista de presupuestos con filtros (`PresupuestosLista.tsx`, `PresupuestosPage.tsx`): búsqueda por título/paciente y filtro por estado | Hecho | 3 |
| 2026-10-14 | T-8.7 | Catálogo de servicios (`servicioCatalogo.ts`, `cargarServicios`) integrado en el editor de partidas; un fallo del catálogo no bloquea crear partidas libres | Hecho | 2 |
| 2026-10-14 | T-8.8 | Estados de presupuesto (`EstadoPresupuestoBadge.tsx`, `transicionesDisponibles`): la UI ofrece solo transiciones válidas según `transicionValida` (no se retrocede) | Hecho | 2 |
| 2026-10-14 | T-8.1 | Propuesta de RLS para `servicios`, `presupuestos` e `items_presupuesto` en `docs/modules/08-presupuestos/sql.sql` (las tablas ya existían sin RLS) | Propuesto | 2 |
| 2026-10-14 | US-8.1/8.2/8.4 | Tests de la capa pura: `calculoTotal.test.ts` (11 casos) y `presupuestoMapper.test.ts` (7 casos). `npm run build` y `npm run lint` en verde | Hecho | 2 |
| 2026-10-14 | T-2.8 | Validaciones de formulario en `validacionesPaciente.ts` (lógica pura) e integración en `PatientForm.tsx` (errores por campo vía `Field error=`, `noValidate`). Tests `validacionesPaciente.test.ts` (11 casos) | Hecho | 3 |
| 2026-10-14 | T-2.7 | Vista "Historial de atenciones" (US-2.7): agregador puro `historialAtenciones.ts` (une citas del M07 con evoluciones del M06) y `HistorialAtenciones.tsx`; tests `historialAtenciones.test.ts` (7 casos). Pestaña a registrar por Matías | Hecho | 4 |
| 2026-10-14 | M02 | README del módulo `src/features/patients/README.md`: contrato, validaciones, historial y las tres líneas de integración de la pestaña | Hecho | 1 |
| 2026-10-14 | T-2.2–2.6/2.9 | Verificación: formulario, listado con búsqueda, ficha con tabs y contacto de emergencia ya estaban en la rama; el CRUD de pacientes vive en `data/store.tsx` (de Matías) | Verificado | 1 |
| 2026-10-14 | T-5.6/5.10 | Revisión del apoyo al Módulo 05: `data/store.tsx` + `features/treatment/TreatmentTab.tsx` cubren el CRUD de procedimientos y el total del plan | Verificado | 1 |
| 2026-10-14 | Fase 2 | Testing de integración: `node --test` sobre Evolución + Historia clínica + Pacientes → 56/56; `npm run build` y `npm run lint` en verde. Sin tests para 05/07 (no editables por propiedad) | Parcial | 2 |
| 2026-10-14 | M0X | Verificación integral de lo marcado: `node --test src/features/**/*.test.ts` → 95/95; `npm run build` y `npm run lint` en verde. M02/08 implementados y probados a nivel unitario; M09 parcial. Se separó implementado/probado de pendiente (integración de rutas/pestañas y RLS, a cargo del PO) | Verificado | 3 |
| 2026-10-14 | M08 | Confirmado que `PresupuestosPage` no tiene ruta en `App.tsx` ni entrada activa en `Sidebar.tsx`; RLS de `servicios`/`presupuestos`/`items_presupuesto` sigue sin aplicar en `bd_5clinicas_midentista.sql` | Pendiente (integración) | 1 |
| 2026-10-14 | M09 | Revisión de los IDs de Bianca en el Módulo 09: T-9.4/9.6/9.8 hechos; T-9.5/9.7 dependen de la unión con el M08 (`totalPresupuestado` placeholder `0`) y del paso confirmar/rechazar; T-9.1 sin RLS ni propuesta. Falta `PagosPage.tsx` y `PartialPayment.tsx` (tramo de Carlos) | Parcial | 3 |

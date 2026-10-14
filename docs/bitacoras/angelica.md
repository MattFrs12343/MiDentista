# Bitácora - Angélica (Dev 5)

## Cierre formal del Módulo 05 — 2026-10-13

**Módulo 05 completado. T-5.1 a T-5.10 y US-5.1 a US-5.7 cerradas.**
El equipo confirmó la validación manual final de diagnósticos, edición/estados,
permisos/listas, planes/procedimientos, máquina de estados, consulta por estado,
ficha, total automático, impresión, F5, query params y aislamiento paciente/plan.
Migraciones T-5.1, T-5.7 y T-5.10 aplicadas/verificadas en Supabase real;
verificador T-5.10 corregido con owner_role y ejecutado correctamente.
Matías aprobó que procedimientos cancelados sigan sumando.

Auditoría local final: 429 tests aprobados, 0 fallidos; build correcto; lint sin
errores, 15 warnings externos existentes sin corregir; git diff --check sin
errores. Aviso de chunks grandes conservado. Sin cambios funcionales, SQL nuevo,
modificaciones Supabase, git add, commit ni push en este cierre.
Horas todavía por registrar por Angélica, sin inventar estimaciones.

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

- [x] T-5.1 Crear tablas `diagnosticos` + `planes_tratamiento` +
      `procedimientos_tratamiento` + RLS ⚠️ toca BD — aplicada y validada en Supabase real según confirmación del equipo al continuar T-5.2/T-5.3
- [x] T-5.2 Crear formulario de diagnóstico — completada/validada manualmente en Supabase real según confirmación del equipo
- [x] T-5.3 Implementar servicio de diagnóstico (CRUD) — completada/validada manualmente en Supabase real, sin DELETE físico
- [x] T-5.4 Crear lista de diagnósticos del paciente — completada/validada manualmente según confirmación del equipo al iniciar T-5.5
- [x] T-5.5 Crear formulario de plan de tratamiento — completada/validada manualmente según confirmación del equipo al iniciar T-5.6
- [x] T-5.6 Implementar CRUD de procedimientos (con apoyo de Bianca) — completada y validada manualmente según confirmación del equipo al iniciar T-5.7
- [x] T-5.7 Implementar máquina de estados del plan — completada y validada manualmente según confirmación del equipo al iniciar T-5.8
- [x] T-5.8 Crear vista de tratamientos por estado — completada y validada manualmente según confirmación del equipo al iniciar T-5.9
- [x] T-5.10 Calcular total del plan automáticamente (con apoyo de Bianca) — completada y validada en Supabase/navegador; cancelados incluidos, aprobado por Matías
- [x] T-5.9 Integrar diagnóstico y tratamiento en ficha — completada y validada manualmente según confirmación del equipo al iniciar T-5.10
- [x] Validar US-5.1 a US-5.7 contra sus criterios de aceptación — todas pasan; evidencia por historia en README final del módulo

### Mes 3 — Testing e integración final (cubres módulos 05, 06, 08, 09; Melissa cubre 01-04 y 07) + datos

- [x] Pruebas funcionales del Módulo 05 (Diagnóstico/Tratamiento) contra sus US — validación manual final confirmada por el equipo
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

Las entradas conservan el estado a la fecha de cada avance. Los bloqueos y
validaciones por completar de entradas históricas del Módulo 05 quedaron
superados por el cierre formal anterior; no son pendientes funcionales actuales.

| Fecha | ID | Qué hice | Estado | Horas |
|-------|----|----|--------|-------|
| | | | | |
| 2026-10-13 | Cierre M05 / T-5.1–T-5.10 / US-5.1–US-5.7 | Confirmación de validación manual final y de las tres migraciones aplicadas/verificadas; cancelados suman, aprobado por Matías. Auditados criterios oficiales, implementación/tests, SQL local y owner_role, status/diff/exclusiones. README consolidados y checklist formal cerrado. Tests finales 429 aprobados, 0 fallidos; build correcto; lint sin errores y 15 warnings externos; diff check correcto. Commit propuesto selectivo con hunks M05 de archivos mixtos; cambios M10 conservados. Sin SQL/Supabase ni git add/commit/push. | Módulo 05 completado y listo para commit selectivo | Pendiente de registrar por Angélica |
| 2026-10-13 | T-5.10 | Retoma tras corte de sesión: inspeccionados git diff y archivos actuales; frontend de total ya implementado, con relectura concreta, error parcial/reintento solo SELECT, reconciliación, aislamiento e impresión. Conservado código y 21 tests existentes sin rehacer trabajo válido. Reejecutados comandos solicitados: 429 tests aprobados, 0 fallidos; build correcto; lint sin errores, 15 warnings externos existentes y aviso de chunks grandes conservados. Portal compatible sin cambios. Solo registro documental, sin SQL/Supabase ni commit. | Implementada; lista para validación manual de navegador. Módulo 05 aún no cerrado | Pendiente de registrar por Angélica |
| 2026-10-12 | T-5.10 | El equipo confirma migración aplicada con COMMIT y verificada en Supabase real, con cancelados incluidos. Implementada relectura de plan por id/paciente/clínica tras CRUD confirmado, reconciliación de fila persistida sin F5, estado de total separado de CRUD y reintento solo SELECT. Importe previo oculto mientras pendiente/error, formato común de dos decimales e impresión bloqueada hasta confirmar. Versiones de contexto/selección descartan respuestas tardías; no suma alternativa ni nuevos permisos. Portal compatible sin cambios. Sin SQL nuevo, cambios Supabase ni commit; Módulo 05 no cerrado hasta navegador. | Implementada; pendiente de validación manual final | Pendiente de registrar por Angélica |
| 2026-10-12 | T-5.10 | Verificación frontend: 21 tests nuevos, 429 totales aprobados y 0 fallidos con node --test "src/features/*/*.test.ts"; CRUD/relectura/error parcial/reintento solo SELECT, cero/decimales/cancelado, sin duplicaciones, contexto/respuestas tardías e impresión/formato por SSR. npm.cmd run build correcto; npm.cmd run lint sin errores y 15 warnings externos existentes, sin corregir; aviso de chunks grandes conservado. Checklist final de navegador documentada, portal/SQL sin modificaciones. | Lista para validación manual en navegador; Módulo 05 todavía no cerrado | Pendiente de registrar por Angélica |
| 2026-10-12 | T-5.9 | El equipo confirma validación manual de T-5.1 a T-5.9; actualizados checklist y documentación al iniciar únicamente T-5.10. | Completada y validada manualmente | Pendiente de registrar por Angélica |
| 2026-10-12 | T-5.10 | Comparadas fuentes de verdad: elegido costo_total persistido mantenido por triggers transaccionales sobre procedimientos, con deltas OLD/NEW agrupados por statement y UPDATE atómico. Preparadas migracion-t-5-10.sql y verificacion-t-5-10.sql sin ejecutarlas: backfill derivado bajo bloqueo, cero sin procedimientos, NUMERIC(10,2), ACL por columnas/guard de total, SECURITY DEFINER interno, RLS existente y rollback/overflow. Cancelados incluidos según SUM(costo), pendiente ratificación funcional. Verificación TEMP y pasos de concurrencia/JWT reales; relectura de plan prevista para frontend, detenida hasta validar SQL. Sin Supabase ni commit; Módulo 05 no cerrado. | Preparada para revisión/aplicación controlada por Matías; pendiente SQL y frontend/validación real | Pendiente de registrar por Angélica |
| 2026-10-12 | T-5.10 | Regresión local: node --test "src/features/*/*.test.ts", 408 aprobados y 0 fallidos; npm.cmd run build correcto; npm.cmd run lint sin errores, 15 warnings externos existentes y aviso de chunks grandes conservados. SQL solo revisado estáticamente; verificación TEMP preparada pero no ejecutada. Sin cambios funcionales frontend dependientes ni tests de refresco hasta confirmar migración. | Preparación verificada localmente; pendiente revisión/aplicación SQL por Matías | Pendiente de registrar por Angélica |
| 2026-10-12 | T-5.8 | El equipo confirma validación manual de T-5.1 a T-5.8; actualizado checklist al iniciar exclusivamente T-5.9. | Completada y validada manualmente | Pendiente de registrar por Angélica |
| 2026-10-12 | T-5.9 | Integración asistida con contexto real de paciente/perfil solo en tab tratamiento, loading/error/reintento y aislamiento por paciente/sesión/clínica. Cambio mínimo autorizado en PatientProfilePage, sin nuevas rutas ni rehacer ficha. Selección manual/alta confirmada sincronizan plan en URL para F5; enlaces inválidos se limpian sin romper secciones. Composición jerárquica de componentes existentes, errores independientes y procedimientos por plan seleccionado. Impresión del paciente/plan reales solo tras selección resuelta, costo persistido explícito sin recalcular. Sin SQL, cambios Supabase ni commit; T-5.10 pendiente. | Implementada; pendiente de validación manual | Pendiente de registrar por Angélica |
| 2026-10-12 | T-5.9 | Verificación local: 25 tests nuevos y 408 totales aprobados, 0 fallidos con node --test "src/features/*/*.test.ts"; servicio/controladores/contexto/URL/secciones e impresión real por SSR, sin ejecutar efectos de navegador ni probar JWT real. npm.cmd run build correcto; npm.cmd run lint sin errores ni warnings nuevos en archivos modificados, 15 warnings externos existentes y aviso de chunks grandes conservados. Checklist manual corta documentada. | Lista para validación manual; sin commit | Pendiente de registrar por Angélica |
| 2026-10-12 | T-5.7 | El equipo confirma validación manual de T-5.1 a T-5.7; actualizados checklist y documentación al iniciar exclusivamente T-5.8. | Completada y validada manualmente | Pendiente de registrar por Angélica |
| 2026-10-12 | T-5.8 | Vista de planes de toda la clínica por cinco estados integrada en pestaña existente, sin rutas nuevas. Servicio SELECT con clínica/estado obligatorios, joins por FKs T-5.1, orden estable y paginación servidor de 20/count exacto. Perfil real y auditoría con clínica explícita; sin consulta global ni escrituras. Loading/error/reintento/vacío/resultados, tarjetas accesibles y enlace a ficha con plan visible seleccionado. Refresco controlado tras T-5.7, descarte de respuestas tardías, sin polling/búsqueda/Todos. Sin SQL, cambios Supabase ni commit; T-5.9/T-5.10 pendientes. | Implementada; pendiente de validación manual | Pendiente de registrar por Angélica |
| 2026-10-12 | T-5.8 | Verificación de servicio/controlador y vista real SSR: 25 tests nuevos, 383 totales aprobados y 0 fallidos con node --test "src/features/*/*.test.ts"; npm.cmd run build correcto; npm.cmd run lint sin errores ni warnings nuevos en treatment, 15 warnings externos y aviso de chunks grandes conservados. Checklist manual documentada; joins/RLS reales, navegación interactiva y rendimiento pendientes. Contexto explícito soportado para auditoría, sin añadir entrada nueva al panel de superadmin. | Lista para validación manual del flujo staff | Pendiente de registrar por Angélica |
| 2026-10-12 | T-5.7 | El equipo confirma migración aplicada y verificada correctamente en Supabase real; se reanuda únicamente frontend/servicio. Implementados mapa de transiciones, cambiarEstadoPlan con UUID/contexto/estado anterior CAS y fila real confirmada, controlador/hook con bloqueo síncrono y descarte de respuestas tardías, botones válidos por autor y confirmación visual de Completar/Cancelar. Reconciliación sin F5, errores/éxito accesibles, sin modificar contenido/costo/procedimientos. No se ejecutó SQL nuevo, no se modificó Supabase y no se hizo commit; T-5.8–T-5.10 pendientes. | Implementada; pendiente de validación manual del frontend | Pendiente de registrar por Angélica |
| 2026-10-12 | T-5.7 | Tests ampliados de servicio/controlador/UI real por SSR: 46 nuevos, 358 totales aprobados y 0 fallidos; matriz de transiciones, CAS obsoleto, confirmaciones, permisos, doble envío, errores/respuestas inesperadas, reconciliación sin F5 y respuestas tardías/remontaje. node --test "src/features/*/*.test.ts", npm.cmd run build correcto, npm.cmd run lint sin errores y 15 warnings externos existentes; aviso de chunks grandes conservado. Checklist manual del frontend documentada. | Lista para validación manual; sin commit | Pendiente de registrar por Angélica |
| 2026-10-12 | T-5.6 | El equipo confirma validación manual de T-5.1 a T-5.6; actualizado checklist y documentación sin cambiar el CRUD validado. | Completada y validada manualmente | Pendiente de registrar por Angélica |
| 2026-10-12 | T-5.7 | Revisados servicio, mapper, permisos, controlador, hook, UI, tipos y documentación. CHECK/RLS T-5.1 no garantizan transiciones; preparadas migracion-t-5-7.sql y verificacion-t-5-7.sql con trigger OLD/NEW, cinco transiciones exactas, terminales y alta propuesto, sin ampliar permisos. Fixtures TEMP para matriz, RLS y CAS obsoleto; contrato del futuro servicio con filtro estado anterior y fila confirmada. SQL no ejecutado. Servicio/UI/tests dependientes detenidos por instrucción de seguridad. Sin automatismo por procedimientos ni avance T-5.8–T-5.10; sin commit. | Bloqueada por aplicación/validación de migración; no lista para validación manual integral | Pendiente de registrar por Angélica |
| 2026-10-12 | T-5.7 | Verificación local de regresión: node --test "src/features/*/*.test.ts", 312 aprobados y 0 fallidos; npm.cmd run build correcto con aviso existente de chunks grandes; npm.cmd run lint sin errores y 15 warnings externos existentes. SQL revisado estáticamente sin ejecutarlo; no hay tests frontend nuevos del flujo detenido. | Preparación verificada localmente; continúa bloqueo SQL | Pendiente de registrar por Angélica |
| 2026-10-12 | T-5.5 | El equipo confirma validación manual de planes explícitos, selección, título/notas y permisos. Actualizado checklist y documentación al iniciar T-5.6. | Completada y validada manualmente | Pendiente de registrar por Angélica |
| 2026-10-12 | T-5.6 | Implementación asistida de CRUD propio de procedimientos por id real del plan/clínica: tipos/mapper/servicio/permisos/hook/controladores y UI integrada en plan seleccionado. Prioridades/estados exactos, FDI y costo validado; creación pendiente, edición con lista blanca y DELETE confirmado tras confirmación visual. Reconciliación sin F5, cambio de plan y respuestas tardías aisladas. 34 tests nuevos, 312 totales aprobados; build correcto; lint sin errores y 15 warnings externos existentes. Sin SQL, cambios Supabase ni commit; sin modificar estado/costo_total del plan. T-5.7–T-5.10 pendientes. | Implementada; lista para validación manual | Pendiente de registrar por Angélica |
| 2026-10-11 | T-5.4 | Validación manual confirmada por el equipo al continuar T-5.5; actualizado estado sin modificar el flujo validado de diagnósticos. | Completada y validada manualmente | Pendiente de registrar por Angélica |
| 2026-10-11 | T-5.5 | Implementación asistida de planes explícitos: mapper/servicio/hooks/controladores propios, título obligatorio, notas sincronizadas con guardado explícito, selector por id real y estado de solo lectura. Permisos autor/clínica y RLS existente; eliminado INSERT automático del store y acciones implícitas antiguas. Integración e impresión por plan seleccionado. 28 tests nuevos, 278 totales aprobados; build correcto; lint sin errores, 15 warnings externos existentes. SQL/Supabase sin cambios y sin commit. T-5.6–T-5.10 pendientes. | Implementada; lista para validación manual | Pendiente de registrar por Angélica |
| 2026-10-11 | T-5.1 | Preparación asistida autorizada de migración incremental sobre las tres tablas existentes: UPDATE faltantes, RLS por rol/clínica/autor, seis FKs compuestas, CHECK/NOT NULL, contexto inmutable y preflight sin corrección automática. Script de verificación con catálogos y fixtures temporales, RLS simulado y ROLLBACK. Reutiliza helpers y triggers actuales; título nullable por compatibilidad. Revisión estática de sintaxis SQL/PLpgSQL; sin ejecutar SQL, sin cambios frontend y sin commits. | Preparada para revisión y aplicación controlada por Matías; pendiente validación SQL/JWT reales. T-5.1 no cerrada todavía | Pendiente de registrar por Angélica |
| 2026-10-11 | T-5.1 | El equipo confirma aplicación y validación correcta de T-5.1 en Supabase real. Se actualiza el checklist; no se ejecutó SQL adicional por el agente. | Completada y validada según confirmación del equipo | Pendiente de registrar por Angélica |
| 2026-10-11 | T-5.2 | Formulario asistido de diagnóstico con descripción, pieza FDI opcional, observaciones, edición y cambio de estado separado; loading, error accesible, bloqueo síncrono de doble envío y conservación de borrador ante fallo. Integración mínima en TreatmentTab y checklist manual preparada. Verificación conjunta T-5.2/T-5.3: 22 tests nuevos, 227 totales aprobados, build correcto y lint sin errores con 15 warnings externos existentes. | Implementada; pendiente validación manual con sesión y paciente reales | Pendiente de registrar por Angélica |
| 2026-10-11 | T-5.3 | Servicio/mapper/tipos/hook propios: listar, crear, actualizar y cambiar estado, perfil Auth real, UUID, filtros de paciente/clínica/autor, fila confirmada y timestamps del servidor. Sin DELETE; retirada solo la lógica antigua de diagnósticos del store para evitar duplicación. Tests de mapper/servicio/permisos/controlador: 227 totales aprobados; build correcto; lint sin errores y 15 warnings externos. Sin SQL ni commits. | Implementada; pendiente validación manual de persistencia y RLS desde UI | Pendiente de registrar por Angélica |
| 2026-10-11 | T-5.2 / T-5.3 | El equipo confirma validación manual correcta del formulario y servicio de diagnósticos en Supabase real. Se actualizan checklist y documentación; no se ejecutó SQL por el agente. | Completadas y validadas según confirmación del equipo | Pendiente de registrar por Angélica |
| 2026-10-11 | T-5.4 | Lista completa de diagnósticos con campos opcionales, estado textual, fechas semánticas, loading/error/vacío/resultados y acciones por autoría. Reintentos y lecturas coalescidas; reconciliación confirmada sin recargas; orden con microsegundos e id. Paginación local a 20 exigida por SPEC §12.8, con lectura completa por rangos y conteo para evitar truncamiento API. 23 tests nuevos, 45 del módulo y 250 totales aprobados; build correcto; lint sin errores y 15 warnings externos existentes. Checklist manual preparada. Sin SQL, cambios Supabase ni commits. | Implementada; pendiente validación manual de lista, paginación, reintentos y accesibilidad | Pendiente de registrar por Angélica |

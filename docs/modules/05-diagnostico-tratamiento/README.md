# Módulo 05 — Diagnóstico y Plan de Tratamiento

## Estado final

**Módulo 05 completo**, implementado y validado manualmente. Cierre formal:
2026-10-13. T-5.1–T-5.10 y US-5.1–US-5.7 cerradas. Responsable: Angélica / Dev 5;
Matías es el PO y responsable de aplicación SQL/merge/despliegue.

El equipo confirmó validación real de diagnósticos, edición/estados/permisos/lista,
planes/procedimientos, máquina de estados, vista por estado, ficha, total automático,
impresión, persistencia con F5, aislamiento paciente/plan y query params.
Migraciones T-5.1, T-5.7 y T-5.10 aplicadas/verificadas en Supabase real.
Matías aprobó sumar procedimientos cancelados. El cierre local no ejecutó SQL,
no modificó Supabase ni hizo git add/commit/push.

La evidencia manual registrada procede de esa confirmación explícita del equipo;
el agente revisó implementación/documentación y ejecutó las comprobaciones locales.
Historial de trabajo y horas por registrar: [bitácora](../../bitacoras/angelica.md).
Definiciones oficiales conservadas: [tareas](tasks.md) e [historias](user-stories.md).

## Auditoría T-5.1 a T-5.10

- [x] T-5.1 — Tablas existentes/constraints/FKs/índices, RLS por rol/clínica/autor,
  contexto inmutable y timestamps. Migración/verificador aplicados y validados en
  Supabase. Pruebas SQL de integridad/ACL/RLS y tests de mappers/permisos/servicios.
- [x] T-5.2 — Formulario de diagnóstico con descripción, pieza FDI opcional y
  observaciones. Validación manual confirmada; diagnosticoFormulario.test.ts,
  diagnosticoMapper.test.ts y diagnosticosVista.test.ts.
- [x] T-5.3 — Crear/listar/editar/cambiar estado con fila real confirmada y filtros
  paciente/clínica/autor. Sin DELETE físico, no requerido por US-5.1–US-5.3.
  Validación manual confirmada; diagnosticoService.test.ts y pruebas de formulario.
- [x] T-5.4 — Lista de diagnósticos, estados/fechas/opcionales, reintento y páginas
  de 20. Validación manual confirmada; diagnosticosLista.test.ts y vista SSR.
- [x] T-5.5 — Múltiples planes explícitos, título obligatorio, selección por UUID,
  título/notas independientes, sin INSERT al abrir. Validación manual confirmada;
  planTratamientoService.test.ts, planesTratamientoControlador.test.ts y vista SSR.
- [x] T-5.6 — CRUD de procedimientos del plan elegido, costos/FDI/prioridades,
  DELETE con confirmación y reconciliación. Validación manual confirmada;
  procedimientoService.test.ts, procedimientosControlador.test.ts y vista SSR.
- [x] T-5.7 — Máquina de estados, transiciones exactas/terminales, autor y CAS.
  Migración/verificador aplicados y validados; servicio/controlador/vista prueban
  matriz de estados, confirmaciones, errores/cero filas y respuestas tardías.
- [x] T-5.8 — Planes de clínica por cinco estados, consulta/paginación servidor y
  navegación a ficha. Validación manual confirmada; planesPorEstado.test.ts y
  planesPorEstadoVista.test.ts, con integración del cambio de estado T-5.7.
- [x] T-5.9 — Contexto real, secciones independientes, URL/F5, impresión y aislamiento.
  Validación manual confirmada; tratamientoIntegracion.test.ts y
  tratamientoFichaVista.test.ts.
- [x] T-5.10 — Total SQL persistido, cancelados incluidos, relectura tras CRUD,
  error parcial/reintento solo SELECT e impresión coherente. Migración/verificador
  aplicados y verificados y navegador validado; planTotal.test.ts, servicio y SSR.

## Auditoría US-5.1 a US-5.7

Se revisaron los criterios exactos de user-stories.md. Todos se cumplen en el
escenario oficial y fueron cubiertos por la validación manual confirmada.

- [x] US-5.1 — Crear diagnóstico en ficha con descripción/pieza/observaciones y
  asociación al paciente. Evidencia: DiagnosticoForm, crearDiagnostico, filtros y
  exigirContexto; tests de formulario/mapper/servicio; alta real validada.
- [x] US-5.2 — Editar diagnóstico y registrar fecha de modificación. Evidencia:
  actualizarDiagnostico, trigger existente de actualizado_en y respuesta confirmada;
  tests de edición/contexto/timestamps; edición y persistencia reales validadas.
- [x] US-5.3 — Cambiar activo/inactivo/resuelto y reflejarlo en lista. Evidencia:
  cambiarEstadoDiagnostico y reconciliación del hook/lista; tests de estados y
  mutaciones sin recarga; estados reales validados. Sin FSM adicional inventada.
- [x] US-5.4 — Crear plan con título, permitir procedimientos con pieza/descripción/
  prioridad/costo y estado inicial propuesto. Evidencia: crearPlanTratamiento,
  PlanTratamientoForm y ProcedimientoForm; tests de título/alta/CRUD; planes reales
  validados. El Given de diagnósticos previos es contexto del escenario, no una
  restricción nueva que obligue a bloquear cualquier alta sin diagnósticos.
- [x] US-5.5 — Asociar varios procedimientos al plan con costo y recalcular total.
  Evidencia: CRUD por plan/clínica, trigger T-5.10 y obtenerPlanPorId posterior;
  fixtures SQL/planTotal.test.ts y total automático validado en navegador.
- [x] US-5.6 — Pasar propuesto → aceptado y aparecer en tratamientos aceptados.
  Evidencia: cambiarEstadoPlan, CAS/trigger T-5.7 e invalidación de vista T-5.8;
  matriz de transiciones y prueba de cambio/filtro; máquina/vista reales validadas.
- [x] US-5.7 — Elegir estado y mostrar solo tratamientos de ese estado. Evidencia:
  listarPlanesPorEstado filtra clínica/estado bajo RLS, vista con cinco filtros;
  tests de cada estado, vacío/error/páginas/aislamiento; filtro real validado.

## Funcionalidades y reglas finales

### Diagnósticos

Descripción no blanca, observaciones y pieza FDI opcional. Estados exactos:
activo, inactivo y resuelto. Contenido y estado se guardan por acciones separadas,
sin descartar borradores del otro. Lista con orden estable/fechas del servidor,
loading/error/vacío/resultados y páginas de 20. Error/NULL/cero filas no son éxito.

### Planes

Creación explícita con título e inicio propuesto; varios planes por paciente,
sin crear un plan implícito al entrar. Selección, título/notas y estado confirmados.
Títulos NULL históricos tienen fallback y nunca se corrigen automáticamente.

Transiciones permitidas: propuesto → aceptado/cancelado;
aceptado → en_proceso; en_proceso → completado/cancelado.
Completado/cancelado son terminales. Aceptado → cancelado, retrocesos y saltos
están prohibidos. Completar/Cancelar exigen confirmación visual para el id exacto.
CAS en estado anterior rechaza solicitudes obsoletas y no se reintenta automáticamente.
Los procedimientos no disparan cambios automáticos de estado del plan.

### Procedimientos y total

Leer/crear/editar/eliminar solo los del plan/clínica elegidos. Alta pendiente;
estados pendiente/en_proceso/completado/cancelado; prioridades urgente/alta/normal/baja.
Descripción, FDI y costo se validan; servicio UUID opcional/NULL. DELETE requiere
confirmación y fila real afectada. T-5.1 impide cambiar plan_tratamiento_id.

Costo total = SUM(procedimientos_tratamiento.costo) del plan/clínica, incluyendo
cancelados (aprobado por Matías). Plan vacío: 0.00. NUMERIC(10,2); backfill de
históricos, triggers por statement con deltas OLD/NEW agrupados y UPDATE atómico,
rollback transaccional y overflow rechazado. ACL de columnas/guard impiden total
arbitrario. El cliente nunca calcula otro total ni escribe costo_total.

Tras CRUD confirmado se relee el plan concreto y se reemplaza la fila en memoria.
Si falla esa lectura, se conserva la mutación confirmada, se oculta el costo viejo
y se ofrece reintento solo SELECT. Impresión espera total confirmado. Formato
común con dos decimales: Bs 0.00 / Bs 300.50 / Bs 4000.00. Portal sigue leyendo
costo_total persistido con su mismo contrato; no se modificó API/portal.

### Vista e integración

Dentro de Diagnóstico y tratamiento: diagnósticos → planes de clínica por estado
→ planes del paciente → seleccionado con notas/estado/procedimientos → impresión.
Consulta de clínica paginada en servidor a 20, con Propuestos/Aceptados/En proceso/
Completados/Cancelados, sin Todos, búsqueda ni infinite scroll no exigidos por US.
SPEC requiere paginación; las listas del paciente usan páginas locales tras lotes
confirmados. RLS puede ocultar nombres relacionados, con fallback explícito.

Ruta existente `/app/pacientes/:pacienteId?tab=tratamiento`, también con
`&plan=<uuid>`. F5 conserva tab y selección porque se sincronizan con URL. Plan
inválido/ajeno/invisible no rompe ficha ni escribe. Contexto real de paciente/Auth,
keys y versiones descartan datos/respuestas de otro paciente/plan/sesión.
Errores de secciones independientes; procedimientos solo cargan con selección.
TreatmentPrint usa diagnóstico/paciente/plan reales y costo persistido, sin sumas;
su alcance es diagnósticos, metadatos y notas, no nuevo listado de procedimientos.

## Permisos y seguridad

- Odontólogo activo autor de la misma clínica: escritura de sus diagnósticos,
  planes y procedimientos según las operaciones implementadas.
- Otro odontólogo de clínica: lectura de registros ajenos.
- Recepcionista: lectura.
- Superadmin: auditoría según rutas existentes; clínica explícita por consulta
  de tratamientos por estado, nunca mezcla de clínicas sin contexto.
- Paciente: fuera de la ficha clínica staff; portal por su API autorizada.

RLS, CHECK, FKs compuestas, contexto inmutable, FSM y total derivado mantienen
protección real de servidor. Controles visuales no reemplazan RLS. Se rechazan
ids demo antes de red y confirmaciones fuera de contexto. No hay DELETE de
diagnósticos/planes porque las historias no lo requieren.

## SQL versionado aplicado y verificado

Los seis scripts locales se revisaron sin ejecutar ni modificar sus cuerpos:

- migracion-t-5-1.sql y verificacion-t-5-1.sql: aislamiento, integridad y RLS.
- migracion-t-5-7.sql y verificacion-t-5-7.sql: estados/terminales/CAS.
- migracion-t-5-10.sql y verificacion-t-5-10.sql: total canónico/ACL/concurrencia.

El verificador T-5.10 conserva **owner_role** en el JOIN a pg_roles y las
referencias a sus campos, sin colisionar con el record r. Esa versión corregida fue ejecutada
correctamente según confirmación del equipo. Las tres migraciones están aplicadas
y verificadas en Supabase real; no deben reejecutarse ni correr el seed general.

Los comentarios de preparación en los archivos SQL son evidencia histórica de
su elaboración, no el estado actual del módulo. Se preservan los scripts usados:
una revisión local no equivale a comparar un export/hash de la base remota.
T-5.10 reemplazó grants de INSERT/UPDATE de tabla de planes por columnas salvo
costo_total; la assertion de grants amplios del verificador T-5.1 describe su
etapa anterior. No restaurar esos permisos para pasar una assertion histórica.
Los verificadores escriben fixtures TEMP y terminan con ROLLBACK; no hay seed de
prueba incorporado a producción ni ejecución automática de SQL desde frontend.

## Validación final — 2026-10-13

```sh
cd frontend
node --test "src/features/*/*.test.ts"
npm.cmd run build
npm.cmd run lint
```

429 tests aprobados, 0 fallidos en el workspace actual, incluidos otros módulos.
Build correcto; lint sin errores, 15 warnings externos existentes sin corregir.
Se conserva aviso de chunks grandes. `git diff --check` sin errores.
Tests con servicios simulados/controladores reales/SSR; Supabase y navegador
validados por el equipo, incluyendo impresión, F5 y total de cancelados.

Arquitectura/archivos:
[README frontend](../../../frontend/src/features/treatment/README.md).
No quedan pendientes funcionales del Módulo 05. Horas por registrar por Angélica,
sin estimación inventada. Límites operativos no bloqueantes: sin push entre sesiones,
respuesta perdida requiere revisar antes de repetir INSERT, solicitudes pueden
persistir en la ficha original tras navegación, paginación offset no es snapshot
entre páginas. Rendimiento con volúmenes elevados y automatización de navegador
son mejoras futuras; warnings/chunks externos no forman parte de este cierre.

## Preparación selectiva del commit

Mensaje recomendado: `feat(treatment): complete diagnosis and treatment module`.
Sin git add/commit/push en este cierre. Incluir treatment, este README, los seis
scripts SQL y store.tsx (su diff retira únicamente escrituras/lecturas antiguas M05).
tasks.md y user-stories.md están sin cambios; sus estados finales se auditan arriba.

PatientProfilePage.tsx es mixto: incluir únicamente usePacienteTratamiento, Button,
contexto real/loading/error y props/key de TreatmentTab. Excluir import/trigger/content
de PatientFilesSection y el ajuste min-w-0 de Tabs, que pertenecen a Módulo 10.
Bitácora es mixta: incluir checklist/registro/cierre M05, excluir entradas M10.
No añadir completos esos dos archivos sin selección de cambios.

Excluir frontend/src/features/archivos/, docs/modules/10-archivos/ y tabValue.ts
(su diff solo incorpora archivos). Excluir frontend/.env.local, dist, node_modules,
salidas de herramientas y cualquier temporal; el entorno local está ignorado.
App/Sidebar, supabase/, bd_5clinicas_midentista.sql y .env.example no tienen cambios
de este cierre. Cambios M10 se conservan intactos para su propio commit.

# Módulo 05 — Diagnóstico y Plan de Tratamiento

Estado: **completo, implementado y validado manualmente**. Cierre formal:
2026-10-13. T-5.1–T-5.10 y US-5.1–US-5.7 cerradas. Responsable: Angélica / Dev 5,
con autorización de Matías para el módulo y sus cambios mínimos de integración.

Las migraciones T-5.1, T-5.7 y T-5.10 están aplicadas y verificadas en Supabase
real según confirmación del equipo. Matías aprobó que procedimientos cancelados
sigan sumando. Se confirmó validación en navegador de CRUD, estados, permisos,
filtros, integración, total, impresión, F5, enlaces y aislamiento de contexto.
El agente realizó revisión local; no ejecutó SQL ni repitió esa validación manual.

## Arquitectura final

`tipos.ts` contiene los modelos propios. Los servicios usan cliente Supabase
normal, esquema public y RLS; no se añaden slices al store ni tipos compartidos.
Mappers validan UUID, campos y respuestas y construyen payloads con lista blanca.
Controladores gestionan lectura/escritura y snapshots; los hooks los conectan a
React. La lógica de negocio no reside en los componentes de presentación.

### Diagnósticos — T-5.2, T-5.3 y T-5.4

- `diagnosticoMapper.ts`: contexto, FDI permanente/temporal, descripción,
  observaciones, estados y fechas reales. Pieza opcional; descripción no blanca.
- `diagnosticoService.ts`: obtenerPerfilDiagnosticos, listarDiagnosticosPaciente,
  crearDiagnostico, actualizarDiagnostico y cambiarEstadoDiagnostico. Perfil
  activo único verificado mediante Auth real. Estados: activo/inactivo/resuelto.
- `diagnosticoPermisos.ts`: permisos visuales por perfil, autor y clínica.
- `diagnosticosListaControlador.ts`, `diagnosticosLista.ts` y `useDiagnosticos.ts`:
  lectura, orden creado_en DESC NULLS LAST / id DESC, reintento, reconciliación,
  presentación y páginas de 20. Rangos de hasta 200/count exacto evitan truncar
  silenciosamente la lectura del paciente. Conservan microsegundos al ordenar.
- `diagnosticoFormulario.ts`, `DiagnosticoForm.tsx` y `DiagnosticosSection.tsx`:
  crear/editar/cambiar estado explícitamente, borradores preservados, doble envío
  bloqueado, errores visibles y éxito solo tras fila confirmada. Contenido y
  estado se guardan por operaciones separadas. Sin DELETE físico de diagnóstico:
  las historias oficiales no lo requieren.

### Planes explícitos y estados — T-5.5 y T-5.7

- `planTratamientoMapper.ts` y `planTratamientoPermisos.ts`: cinco estados,
  costos/fechas, título obligatorio al crear y autor/clínica al editar. Título
  NULL legado se presenta sin corregirlo automáticamente.
- `planTratamientoService.ts`: listarPlanesPaciente, crearPlanTratamiento,
  actualizarTituloPlan, actualizarNotasPlan, cambiarEstadoPlan y obtenerPlanPorId.
  Listar nunca crea. Cada escritura solicita una fila y verifica contexto y
  contenido; cero filas/error no son éxito. No fabrica timestamps.
- `planesTratamientoControlador.ts` y `usePlanesTratamiento.ts`: múltiples planes,
  selección por UUID, lecturas/escrituras, bloqueo síncrono, reconciliación estable,
  confirmaciones y aislamiento por paciente/sesión. Error conserva datos previos.
- `planTratamientoFormulario.ts`, `PlanTratamientoForm.tsx` y
  `PlanesTratamientoSection.tsx`: creación explícita en propuesto; guardado
  independiente de título/notas, sin blur/selección/alta automática.
- `planEstado.ts` y `PlanEstadoActions.tsx`: acciones válidas únicamente, loading,
  error/éxito y confirmación visual con id exacto para Completar/Cancelar.

Transiciones exactas:

- propuesto → aceptado o cancelado;
- aceptado → en_proceso;
- en_proceso → completado o cancelado;
- completado y cancelado: terminales.

No existe aceptado → cancelado, retroceso ni salto. El servicio rechaza también
pedir el mismo estado. UPDATE filtra id/paciente/clínica/autor/estado anterior:
compare-and-set detecta lecturas obsoletas entre pestañas, sin reintento automático.
El trigger SQL mantiene la regla frente a otros clientes. Editar contenido sin
alterar el estado de un terminal no lo reabre. No hay automatismo de estado del
plan basado en completar procedimientos.

### Procedimientos — T-5.6

- `procedimientoMapper.ts`, `procedimientoService.ts` y `procedimientoPermisos.ts`:
  leer/crear/editar/eliminar solo procedimientos del plan/clínica elegidos.
  Descripción no blanca, pieza FDI opcional, costo válido NUMERIC(10,2) y servicio
  UUID opcional/NULL. Prioridades: urgente/alta/normal/baja; estados:
  pendiente/en_proceso/completado/cancelado. Alta inicia pendiente.
- `procedimientosControlador.ts` y `useProcedimientos.ts`: bloqueos, confirmación
  de DELETE, reconciliación de la lista y descarte de respuestas tardías.
- `procedimientoFormulario.ts`, `ProcedimientoForm.tsx` y
  `ProcedimientosSection.tsx`: lista paginada de 20, edición y eliminación
  confirmadas. Fallos conservan campos/fila. Sin plan seleccionado no se monta
  el hook ni se consulta la tabla. Cambiar plan remonta su contexto.

No se cambia id, clínica, plan, servicio ni creado_en al editar. T-5.1 impide
reasignar plan_tratamiento_id; no se mueve un procedimiento entre planes.

### Consulta por estado — T-5.8

`planesPorEstado.ts`, `planesPorEstadoService.ts`,
`planesPorEstadoControlador.ts`, `usePlanesPorEstado.ts` y
`PlanesPorEstadoSection.tsx` consultan toda la clínica del contexto explícito.
Filtros exactos: Propuestos, Aceptados, En proceso, Completados y Cancelados.
Sin Todos, búsqueda ni infinite scroll: US-5.7/SPEC no los exigen para esta vista.

SELECT filtra clínica y estado, usa orden estable, count exacto y rango de 20.
Paginación de servidor; filtro nuevo vuelve a página 1 y una página invalidada
por disminución del total se corrige. Joins por FKs compuestas T-5.1 recuperan
paciente/autor; relaciones ocultas por RLS tienen texto explícito, sin perder
el plan. Se presentan título, paciente, estado, autor, fecha y costo persistido.
Cambios confirmados en el contexto compartido invalidan la consulta sin F5.
Otras sesiones usan Actualizar consulta; no hay polling.

### Ficha, URL e impresión — T-5.9

`pacienteTratamientoService.ts`, `pacienteTratamientoControlador.ts` y
`usePacienteTratamiento.ts` confirman el paciente activo y su clínica mediante
Auth/SELECT solo para tab tratamiento, sin depender del cache global para
decidir existencia. PatientProfilePage integra ese contexto y remonta el módulo
por paciente/sesión/clínica; otras pestañas conservan su contrato.

`tratamientoIntegracion.ts`, `TreatmentTab.tsx` y `TratamientoFichaSections.tsx`
componen diagnósticos → consulta de clínica → planes del paciente → plan elegido
con estado/notas/procedimientos → impresión. Cada sección mantiene errores y
loading independientes. Abrir la ficha o resolver un enlace no escribe.

Rutas existentes, sin nuevas páginas/App/Sidebar:

- `/app/pacientes/:pacienteId?tab=tratamiento`;
- la misma con `&plan=<uuid>` para seleccionar una fila visible del paciente.

Selección manual/alta confirmada sincronizan la URL; F5 conserva tab/plan.
Enlaces inválidos/ajenos/invisibles muestran aviso y pueden quitarse sin romper
la ficha. Paciente/plan/sesión distintos no reutilizan datos ni borradores.

`TreatmentPrint.tsx` usa paciente real, diagnósticos confirmados y plan seleccionado;
`TreatmentPrintContent` comparte el contenido con pruebas SSR. Imprime diagnósticos,
metadatos y notas, con costo_total persistido. No recalcula ni agrega un listado
nuevo de procedimientos. Botón/print=1 esperan lecturas, selección y total confirmados.

### Total automático — T-5.10

La autoridad es SQL: costo_total = SUM(costo) de todos los procedimientos del
plan/clínica, **incluidos cancelados, aprobado por Matías**. Plan vacío: 0.00.
Triggers transaccionales cubren INSERT/UPDATE/DELETE, lotes y rollback. Backfill
canoniza históricos; NUMERIC(10,2) y overflow sin truncamiento. Deltas OLD/NEW
agrupados y UPDATE atómico protegen concurrencia; el cliente no puede asignar total.

`planTotal.ts` y `PlanTotalSection.tsx` coordinan estados de mutación/relectura/error
y formato Bs 0.00/Bs 300.50/Bs 4000.00. Después del CRUD confirmado se relee el
plan por id/paciente/clínica/RLS y se reemplaza su fila en memoria, sin sumar
procedimientos localmente ni recargar toda la página.

Un fallo de SELECT no transforma el CRUD confirmado en fallo ni repite la escritura.
Procedimiento guardado/editado permanece o el eliminado sigue retirado; error parcial
y Reintentar sincronización del total hacen exclusivamente lectura. Total anterior
no se presenta como vigente y la impresión queda bloqueada. Lecturas simultáneas
se comparten; versiones por plan/selección/contexto descartan respuestas viejas.
Portal conserva su contrato costo_total/costoTotal persistido, sin cambios de API.

## Seguridad y contrato servidor

Solo odontólogo activo autor, de la misma clínica, escribe lo implementado.
Colega de clínica lee registros ajenos; recepcionista lee; superadmin audita
según rutas/contexto existentes, con clínica explícita para consulta por estado.
Paciente no utiliza esta ficha clínica; portal accede a su API autorizada.
RLS, FKs, CHECK, contexto inmutable, máquina de estados y total derivado son la
protección efectiva. Las restricciones visuales no sustituyen el servidor.

SQL aplicado/verificado y auditoría de historias:
[`docs/modules/05-diagnostico-tratamiento/README.md`](../../../../docs/modules/05-diagnostico-tratamiento/README.md).
No se reejecutan migraciones ni seed para instalar este frontend.

## Verificación final — 2026-10-13

Ejecutados desde frontend:

```sh
node --test "src/features/*/*.test.ts"
npm.cmd run build
npm.cmd run lint
```

429 tests aprobados, 0 fallidos en el workspace actual (incluye otros módulos).
Build correcto; lint sin errores ni warnings en treatment, 15 warnings externos
existentes sin corregir. Se conserva aviso de chunks grandes. `git diff --check`
sin errores. Los tests usan clientes simulados, controladores reales y React SSR;
la validación Supabase/navegador fue completada y confirmada por el equipo.

No quedan pendientes funcionales del Módulo 05. Límites operativos no bloqueantes:
respuesta perdida puede requerir consultar antes de repetir una creación;
requests pueden persistir en su contexto original tras navegar; no hay push entre
sesiones; diagnósticos/procedimientos del paciente se paginan localmente tras lectura
por lotes. Medir volumen elevado y automatizar navegador pueden mejorar cobertura.
Las horas siguen por registrar por Angélica; no se estimaron en este cierre.

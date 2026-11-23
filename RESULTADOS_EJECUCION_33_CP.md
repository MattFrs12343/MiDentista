# Validación final real de los 33 CP — MiDentista

Base única: `PROYECTOCOMPLETO1_FINAL_CICLO4_PRESENTACION.docx`. Fecha: 23/11/2026. PRESENTACION y su PDF conservan los hashes iniciales.

## Resultado consolidado

**33 CP evaluados con ejecución o evidencia válida: 29 APROBADOS, 4 FALLIDOS, 0 BLOQUEADOS y 0 NO EJECUTADOS.**

Treinta CP tienen ejecución actual en su alcance documentado; CP-17/18/19 reutilizan evidencia manual remota previa autorizada, complementada con pruebas locales actuales. No se afirman 33 recorridos de navegador ni 33 pruebas remotas nuevas. Las ausencias funcionales constatadas de CP-25/26/27 cuentan como ejecución con fallo, conforme al criterio solicitado.

## Matriz final y cambios de estado

| CP | Propósito | Histórico | Final | Método real |
|---|---|---|---|---|
| CP-01 | Acceso válido y resolución de rol | NO EJECUTADO | APROBADO | Recorrido de navegador; autenticación manual |
| CP-02 | Rechazar credencial incorrecta | NO EJECUTADO | APROBADO | Recorrido de navegador; cuenta propia existente |
| CP-03 | Restringir rutas por rol | NO EJECUTADO | APROBADO | Recorrido de navegador por roles |
| CP-04 | Impedir acceso cruzado y privilegios indebidos | APROBADO | APROBADO | SQL local real y Edge con dependencias simuladas |
| CP-05 | Rechazar datos personales inválidos | APROBADO | APROBADO | Unidad; complemento de navegador |
| CP-06 | Buscar y exportar el conjunto filtrado | NO EJECUTADO | APROBADO | Recorrido de navegador y descarga CSV real |
| CP-07 | Conservar información clínica y formato legado | APROBADO | APROBADO | Unidad |
| CP-08 | No anunciar éxito ante error o cero filas | APROBADO | APROBADO | Servicio con cliente simulado |
| CP-09 | Editar una pieza y comprobar persistencia | NO EJECUTADO | APROBADO | Recorrido de navegador; persistencia remota |
| CP-10 | Conservar borrador y permisos en diagnóstico | APROBADO | APROBADO | Servicio y controlador simulados |
| CP-11 | Transiciones con control de estado previo | APROBADO | APROBADO | Servicio y controlador simulados |
| CP-12 | Releer total después del CRUD confirmado | APROBADO | APROBADO | Integración de controladores simulada |
| CP-13 | Persistencia y referencias de evolución | APROBADO | APROBADO | Mapper y servicio simulado |
| CP-14 | Calcular descuentos sin total negativo | APROBADO | APROBADO | Unidad |
| CP-15 | Separar pendiente de confirmado | APROBADO | APROBADO | Unidad |
| CP-16 | Mostrar QR estático o informar ausencia | APROBADO | APROBADO | Servicio con Storage simulado |
| CP-17 | Subir archivo válido y actualizar uso | APROBADO | APROBADO | Evidencia manual remota previa; complemento automatizado actual |
| CP-18 | Rechazar exceso de cuota y restaurar límite | APROBADO | APROBADO | Evidencia manual remota previa; SQL/Edge actuales |
| CP-19 | Detectar candidatos sin eliminar | APROBADO | APROBADO | Evidencia manual remota previa; SQL y automatización actuales |
| CP-20 | Idempotencia y reserva durable | APROBADO | APROBADO | SQL local real; complemento Edge simulado |
| CP-21 | Cerrar subida directa que eluda reserva | APROBADO | APROBADO | SQL local real |
| CP-22 | Escapar comas y comillas | APROBADO | APROBADO | Unidad |
| CP-23 | Descarga CSV e impresión de datos filtrados | NO EJECUTADO | APROBADO | Navegador; descarga real y flujo nativo de impresión |
| CP-24 | Consultar eventos autorizados | NO EJECUTADO | APROBADO | Recorrido de navegador y consulta remota real |
| CP-25 | Reserva, horarios y reprogramación completos | BLOQUEADO | FALLIDO | Navegador real y contraste estático |
| CP-26 | Comparar dos fechas | BLOQUEADO | FALLIDO | Navegador real y contraste estático |
| CP-27 | Alta, edición y desactivación del catálogo | BLOQUEADO | FALLIDO | Navegador real y contraste estático |
| CP-28 | Resolver sintaxis, tablas y columnas | APROBADO | APROBADO | SQL local real |
| CP-29 | Comprobar tipado y bundle | APROBADO | APROBADO | Construcción local |
| CP-30 | Detectar errores y advertencias | APROBADO | APROBADO | Análisis estático ejecutado |
| CP-31 | Ejecutar regresión local actual | APROBADO | APROBADO | Suite automatizada de regresión local |
| CP-32 | Exportar alcance administrativo autorizado | NO EJECUTADO | FALLIDO | Navegador; CSV real; impresión nativa y render privado |
| CP-33 | Comprobar límite individual distinto de cuota | APROBADO | APROBADO | Unidad |

**Cambiaron:** CP-01, CP-02, CP-03, CP-06, CP-09, CP-23, CP-24, CP-25, CP-26, CP-27, CP-32.

**Mantuvieron APROBADO, revalidados en el alcance indicado:** CP-04, CP-05, CP-07, CP-08, CP-10, CP-11, CP-12, CP-13, CP-14, CP-15, CP-16, CP-17, CP-18, CP-19, CP-20, CP-21, CP-22, CP-28, CP-29, CP-30, CP-31, CP-33.

## Herramientas, acceso y protección

- Node 26.13.0, npm 11.20.0, TypeScript/Vite/oxlint y dependencias existentes. Sin nuevas instalaciones desde Internet.
- No hay Playwright, Cypress, Vitest ni testing-library instalados en frontend. Se usó Edge instalado con CDP y WebSocket nativo de Node, perfil aislado nuevo y depuración en localhost.
- El usuario inició manualmente las cuatro sesiones: odontólogo, recepción, paciente y superadmin. No se le pidieron ni se leyeron contraseñas reales, tokens, cookies o perfiles personales.
- Se revisaron documentación modular, rutas, seeds frontend y fixtures. Los seeds frontend usan IDs demo, no credenciales de Auth. Se identificaron referencias demo en docs/SETUP.md y el script api/scripts/set-demo-passwords.js; no se abrió su contenido de credenciales ni se ejecutó el script. La conexión pública de frontend/.env.local no contiene cuentas de usuario. No se enumeran sus valores.
- La búsqueda de instrucciones de pruebas ignoradas por Git no halló configuración adicional útil fuera de dependencias. PGlite ya estaba disponible en temporal. Los scripts SQL usan fixtures efímeros; no conectan a Supabase.
- Se creó por formulario un solo paciente sintético PRUEBA CP Validación CSV, CI TESTCP20261123, sin cuenta Auth. Se conservan ese paciente, su odontograma y los eventos automáticos como datos identificados de prueba; no se borran datos reales.
- CP-02 mostró bloqueo automático de cuenta por intentos fallidos (15 minutos). El agente hizo un solo intento negativo; se desconoce el contador previo. No se restableció la contraseña ni se levantó el bloqueo.
- No hubo cambios de producto, permisos, RLS, migraciones remotas, despliegues ni operaciones Git de escritura.

## Ejecución técnica actual

### Suite completa
- Comando: `node --test --test-concurrency=1 --test-reporter=tap src/**/*.test.ts ../supabase/functions/archivos/*.test.ts`
- Inicio: 2026-11-23T13:53:15.496618-04:00; fin: 2026-11-23T13:53:58.335664-04:00; duración del proceso: 42.839 s; salida: 0.
- Evidencia íntegra: `evidencias_33_cp/suite.txt`.
- Resultado: 697 ejecutados, 697 aprobados, 0 fallidos/cancelados/omitidos/TODO; duración del ejecutor Node 42778.7553 ms.

### Edge Archivos, repetición focal
- Comando: `node --test --test-reporter=tap supabase/functions/archivos/flujoSubida.test.ts`
- Inicio: 2026-11-23T13:53:15.502644-04:00; fin: 2026-11-23T13:53:15.731606-04:00; duración del proceso: 0.229 s; salida: 0.
- Evidencia íntegra: `evidencias_33_cp/edge_archivos.txt`.
- Resultado: 16/16; ya incluidos en los 697, no se suman dos veces.

### SQL Archivos
- Comando: `node docs/modules/10-archivos/pruebas-sql-ciclo-4.mjs file:///C:/Users/DELL/AppData/Local/Temp/opencode/midentista-c4-validation/node_modules/%40electric-sql/pglite/dist/index.js`
- Inicio: 2026-11-23T13:53:15.504311-04:00; fin: 2026-11-23T13:53:17.092416-04:00; duración del proceso: 1.588 s; salida: 0.
- Evidencia íntegra: `evidencias_33_cp/sql_archivos.txt`.
- Resultado: 8/8. PostgreSQL WASM real con SQL versionado y fixtures; una conexión serializada, sin concurrencia de dos sesiones ni migración remota.

### Treinta consultas de PRESENTACION
- Comando: `node C:\Users\DELL\AppData\Local\Temp\opencode\midentista_cp_validate_queries.mjs`
- Inicio: 2026-11-23T13:53:16.094863-04:00; fin: 2026-11-23T13:53:17.463070-04:00; duración del proceso: 1.368 s; salida: 0.
- Evidencia íntegra: `evidencias_33_cp/consultas.txt`.
- Resultado: 30/30 EXPLAIN sobre 17 CREATE TABLE. Extracción directa de PRESENTACION; sin datos clínicos ni validación de RLS remota. Planes íntegros en consultas_planes.json.

### Build
- Comando: `npm.cmd run build`
- Inicio: 2026-11-23T13:53:15.495866-04:00; fin: 2026-11-23T13:53:59.439842-04:00; duración del proceso: 43.944 s; salida: 0.
- Evidencia íntegra: `evidencias_33_cp/build.txt`.
- Resultado: tsc -b y Vite 8.3.1, 4979 módulos; aviso de chunk superior a 500 kB.

### Lint
- Comando: `npm.cmd run lint`
- Inicio: 2026-11-23T13:53:15.495380-04:00; fin: 2026-11-23T13:53:16.087742-04:00; duración del proceso: 0.592 s; salida: 0.
- Evidencia íntegra: `evidencias_33_cp/lint.txt`.
- Resultado: 21 advertencias React; ningún error reportado. No se ocultaron avisos.

Las reejecuciones focales por CP constan en `trazabilidad_tests.json` y `cp_XX_tests.txt`; son repeticiones de tests existentes, no tests únicos adicionales.

## Recorridos de navegador realmente realizados

- Sin sesión: /app/admin, /app/pacientes y /portal/citas → /login. No sustituye prueba por rol.
- Odontólogo: login manual, persistencia de acceso/rol/contexto tras recarga, bloqueo de administración, formulario inválido, alta sintética y pieza 16 guardada/recargada.
- Recepción: bloqueo de administración; búsqueda de PRUEBA CP y cero coincidencias; descarga CSV real de una fila y seis columnas; acentos/comas/comillas; ventana nativa de impresión abierta y cancelada. No había veinte coincidencias para activar paginación.
- Paciente: /app/admin y /app/pacientes → /portal; /portal/citas accesible con teléfono/correo, cero formularios de horario y cero controles de reserva/reprogramación.
- Superadmin: administración autorizada y edición clínica redirigida; Bitácora con 30 eventos y detalle del alta sintética; descarga global de 23 personas y filtro real de especialidad/clínica de una persona; CSV correcto; impresión nativa del filtro reproduce también reporte global.
- Negativo de autenticación: una contraseña sintética incorrecta para la cuenta propia existente tomada de UI autorizada; rechazo visible y ausencia de acceso protegido. Sin lectura de contraseña real.
- Las tarjetas Radix se activaron mediante teclado después de detectar que un clic programático simple no activaba la pestaña. Los tiempos de espera del arnés se ampliaron para observar la carga real. Una vista previa nativa pausa Runtime; se cerró su botón Cancelar. Estos ajustes de automatización no son fallos del producto.
- Los CSV administrativos y el render de impresión con identidades permanecen solo en temporal privado. El repositorio contiene conteos, comparación booleana y un contraste sin correos. El render de evaluación no se atribuye a un guardado manual del producto.

## Evidencia remota previa reutilizada

Solo CP-17/18/19; detalle en `evidencias_33_cp/evidencia_remota_previa_archivos.md`. Cuota 5.000.000.000, límite individual 10.485.760, 272025 + 18084 = 290109, confirmada/reservados 0; rechazo con 5000 disponibles y restauración; auditoría 0 candidatos sin borrar. No se repitió el cambio de cuota productiva ni se inventaron capturas/fechas/IDs.

## Fallos y límites

- CP-25: faltan recorrido de horarios, disponibilidad, reserva y reprogramación integrado.
- CP-26: falta selección/comparación de dos odontogramas históricos.
- CP-27: falta interfaz de alta, edición y desactivación del catálogo; lectura existente no es CRUD.
- CP-32: los CSV son correctos; la impresión filtrada conserva además el reporte global. Con @media print se observaron 1 + 23 registros; el render privado confirmó al menos 12 correos fuera del filtro. No se corrige el producto en esta tarea.
- No quedaron dependencias externas que impidieran evaluar los 33 en el alcance de sus fichas. Las tres validaciones remotas de Archivos se reutilizan, no se repiten. No se certifica aceptación clínica, carga, restauración, aislamiento global ni cobertura porcentual de 48 CU.

## Resultados finales acreditados

### CP-01 — Acceso válido y resolución de rol

**Histórico → final:** NO EJECUTADO → APROBADO
**Tipo de ejecución:** Recorrido de navegador; autenticación manual
**Resultado obtenido:** El login manual abrió /app como odontólogo; tras recargar conservó rol, área de personal y contexto visible de clínica.
**Estado:** APROBADO
**Entorno:** Edge aislado en Windows; localhost con Supabase del equipo; 23/11/2026
**Evidencia:** navegador_odontologo_inicial.json
**Observaciones:** No se publican credenciales ni identidad. No demuestra todas las políticas de aislamiento entre clínicas.
**Interfaz evaluada:** Formulario de acceso LoginPage; recorrido de validación especificado.

### CP-02 — Rechazar credencial incorrecta

**Histórico → final:** NO EJECUTADO → APROBADO
**Tipo de ejecución:** Recorrido de navegador; cuenta propia existente
**Resultado obtenido:** Una contraseña deliberadamente incorrecta fue rechazada: bloqueo temporal de 15 minutos por intentos fallidos; /app/admin volvió a /login sin acceso.
**Estado:** APROBADO
**Entorno:** Edge aislado en Windows; localhost con Supabase del equipo; 23/11/2026
**Evidencia:** login_incorrecto.json
**Observaciones:** Un único intento del agente. El contador previo es desconocido; no se levantó el bloqueo ni se editaron usuarios o claves.
**Interfaz evaluada:** Formulario LoginPage y respuesta de la API de sesión; recorrido especificado.

### CP-03 — Restringir rutas por rol

**Histórico → final:** NO EJECUTADO → APROBADO
**Tipo de ejecución:** Recorrido de navegador por roles
**Resultado obtenido:** Paciente: /app/admin y /app/pacientes vuelven a /portal. Odontólogo y recepción: administración vuelve a /app. Superadmin accede a administración y no a edición clínica.
**Estado:** APROBADO
**Entorno:** Edge aislado en Windows; localhost con Supabase del equipo; 23/11/2026
**Evidencia:** navegador_odontologo_inicial.json; navegador_recepcion.json; navegador_paciente.json; navegador_superadmin.json
**Observaciones:** Rutas probadas realmente por cuatro roles; no equivale a auditoría global de RLS.
**Interfaz evaluada:** Navegación protegida de App y rutas de personal, paciente y superadmin.

### CP-04 — Impedir acceso cruzado y privilegios indebidos

**Histórico → final:** APROBADO → APROBADO
**Tipo de ejecución:** SQL local real y Edge con dependencias simuladas
**Resultado obtenido:** La ejecución SQL real aislada rechazó clínica cruzada, privilegios de recepción y administración de cuota ajena para authenticated.
**Estado:** APROBADO
**Entorno:** PGlite efímero local; 23/11/2026
**Evidencia:** sql_archivos.txt; edge_archivos.txt
**Observaciones:** SQL con fixtures mínimos; no prueba remota de todos los módulos.
**Interfaz evaluada:** Servicio / RPC archivos_c4_reservar y control de contexto; sin interfaz visual (SQL local).

### CP-05 — Rechazar datos personales inválidos

**Histórico → final:** APROBADO → APROBADO
**Tipo de ejecución:** Unidad; complemento de navegador
**Resultado obtenido:** Rechazó vacíos, fechas inválidas y contacto incorrecto. Además, el formulario vacío mostró “Revisá los campos marcados antes de guardar.” sin alta.
**Estado:** APROBADO
**Entorno:** Node.js 26.13.0, local sin red productiva en tests; 23/11/2026
**Evidencia:** cp_05_tests.txt (11/11); navegador_odontologo_inicial.json
**Observaciones:** Sin alta de datos inválidos; no prueba unicidad de CI en servidor.
**Interfaz evaluada:** Validación del borrador de PatientForm mediante validarPaciente; prueba unitaria sin interfaz visual.

### CP-06 — Buscar y exportar el conjunto filtrado

**Histórico → final:** NO EJECUTADO → APROBADO
**Tipo de ejecución:** Recorrido de navegador y descarga CSV real
**Resultado obtenido:** Búsqueda PRUEBA CP: una fila sintética y CSV real coincidente de seis columnas, con acentos, coma y comillas. Una búsqueda sin coincidencias devolvió cero filas.
**Estado:** APROBADO
**Entorno:** Edge aislado en Windows; localhost con Supabase del equipo; 23/11/2026
**Evidencia:** navegador_recepcion.json; descargas_recepcion/pacientes.csv
**Observaciones:** Con menos de veinte coincidencias no se activa paginación; no se afirma prueba de cambio de página.
**Interfaz evaluada:** Pantalla PatientsListPage, búsqueda, paginación y descarga del reporte CSV.

### CP-07 — Conservar información clínica y formato legado

**Histórico → final:** APROBADO → APROBADO
**Tipo de ejecución:** Unidad
**Resultado obtenido:** Conservó listas JSON, alergias, texto legado y trazabilidad; los null no inventaron responsable ni severidad.
**Estado:** APROBADO
**Entorno:** Node.js 26.13.0, local sin red productiva en tests; 23/11/2026
**Evidencia:** cp_07_tests.txt (8/8)
**Observaciones:** No se atribuye aceptación clínica formal.
**Interfaz evaluada:** clinicalHistoryMapper y transformación de filas clínicas; sin interfaz visual.

### CP-08 — No anunciar éxito ante error o cero filas

**Histórico → final:** APROBADO → APROBADO
**Tipo de ejecución:** Servicio con cliente simulado
**Resultado obtenido:** Diferenció errores y UPDATE sin filas de una escritura confirmada; no inventó historia ni anunció éxito vacío.
**Estado:** APROBADO
**Entorno:** Node.js 26.13.0, local sin red productiva en tests; 23/11/2026
**Evidencia:** cp_08_tests.txt (8/8)
**Observaciones:** Las respuestas de RLS son simuladas, no consultas remotas.
**Interfaz evaluada:** Servicio clinicalHistoryService con cliente simulado; sin interfaz visual.

### CP-09 — Editar una pieza y comprobar persistencia

**Histórico → final:** NO EJECUTADO → APROBADO
**Tipo de ejecución:** Recorrido de navegador; persistencia remota
**Resultado obtenido:** Pieza 16 del paciente PRUEBA: Sano a Caries; guardó la nota “PRUEBA CP-09 2026-11-23: persistencia pieza 16” y la conservó tras recargar.
**Estado:** APROBADO
**Entorno:** Edge aislado en Windows; localhost con Supabase del equipo; 23/11/2026
**Evidencia:** odontograma_persistencia.json; odontograma_recargado.png
**Observaciones:** Solo se escribió sobre el paciente sintético creado para esta ejecución; se conserva identificado como PRUEBA.
**Interfaz evaluada:** Pestaña OdontogramTab y formulario de pieza ToothEditorCard.

### CP-10 — Conservar borrador y permisos en diagnóstico

**Histórico → final:** APROBADO → APROBADO
**Tipo de ejecución:** Servicio y controlador simulados
**Resultado obtenido:** Rechazó FDI inválido, errores y respuestas null; conservó el borrador cuando el guardado no quedó confirmado.
**Estado:** APROBADO
**Entorno:** Node.js 26.13.0, local sin red productiva en tests; 23/11/2026
**Evidencia:** cp_10_tests.txt (20/20)
**Observaciones:** No se acredita guardado clínico remoto por esta prueba.
**Interfaz evaluada:** Servicio de diagnóstico y controlador del formulario; evaluación simulada, sin recorrido visual.

### CP-11 — Transiciones con control de estado previo

**Histórico → final:** APROBADO → APROBADO
**Tipo de ejecución:** Servicio y controlador simulados
**Resultado obtenido:** El control de estado previo rechazó cancelar tras aceptar con lectura obsoleta y evitó sobrescribir la confirmación.
**Estado:** APROBADO
**Entorno:** Node.js 26.13.0, local sin red productiva en tests; 23/11/2026
**Evidencia:** cp_11_tests.txt (67/67)
**Observaciones:** No son dos sesiones PostgreSQL concurrentes.
**Interfaz evaluada:** Servicio de planes y controlador planEstado; clientes simulados, sin interfaz visual.

### CP-12 — Releer total después del CRUD confirmado

**Histórico → final:** APROBADO → APROBADO
**Tipo de ejecución:** Integración de controladores simulada
**Resultado obtenido:** Tras DELETE confirmado releyó el total 0.00 del servidor simulado; verificó fallo parcial sin repetir el DELETE.
**Estado:** APROBADO
**Entorno:** Node.js 26.13.0, local sin red productiva en tests; 23/11/2026
**Evidencia:** cp_12_tests.txt (16/16)
**Observaciones:** No confirma instalación remota del trigger.
**Interfaz evaluada:** Controladores de procedimientos y consulta del total del plan; integración simulada sin interfaz visual.

### CP-13 — Persistencia y referencias de evolución

**Histórico → final:** APROBADO → APROBADO
**Tipo de ejecución:** Mapper y servicio simulado
**Resultado obtenido:** Conservó textos, saltos de línea, referencias y contexto del paciente; rechazó error o cero filas sin inventar éxito o fecha.
**Estado:** APROBADO
**Entorno:** Node.js 26.13.0, local sin red productiva en tests; 23/11/2026
**Evidencia:** cp_13_tests.txt (16/16)
**Observaciones:** No se presenta como evolución creada y recargada en Supabase real.
**Interfaz evaluada:** Servicio y mapper de evolución, con cliente simulado; sin interfaz visual.

### CP-14 — Calcular descuentos sin total negativo

**Histórico → final:** APROBADO → APROBADO
**Tipo de ejecución:** Unidad
**Resultado obtenido:** Partida 1 × 100 menos descuento 500: total 0. También comprobó subtotales, redondeo y descuento 150 sobre 1000: 850.
**Estado:** APROBADO
**Entorno:** Node.js 26.13.0, local sin red productiva en tests; 23/11/2026
**Evidencia:** cp_14_tests.txt (11/11)
**Observaciones:** Cálculo numérico controlado; no guardado remoto de presupuesto.
**Interfaz evaluada:** Función calculoTotal del presupuesto; sin interfaz visual en la prueba unitaria.

### CP-15 — Separar pendiente de confirmado

**Histórico → final:** APROBADO → APROBADO
**Tipo de ejecución:** Unidad
**Resultado obtenido:** Con presupuesto 500 y pagos 100 confirmado, 50 pendiente y 30 rechazado, el saldo fue 400; estados desconocidos no cuentan y el saldo no es negativo.
**Estado:** APROBADO
**Entorno:** Node.js 26.13.0, local sin red productiva en tests; 23/11/2026
**Evidencia:** cp_15_tests.txt (12/12)
**Observaciones:** No se creó pago remoto ni se simuló confirmación bancaria automática.
**Interfaz evaluada:** Funciones totalConfirmado y saldoPresupuesto; sin interfaz visual.

### CP-16 — Mostrar QR estático o informar ausencia

**Histórico → final:** APROBADO → APROBADO
**Tipo de ejecución:** Servicio con Storage simulado
**Resultado obtenido:** Validó ruta fija del QR, URL firmada y tratamiento separado de ausencia y error de Storage.
**Estado:** APROBADO
**Entorno:** Node.js 26.13.0, local sin red productiva en tests; 23/11/2026
**Evidencia:** cp_16_tests.txt (8/8)
**Observaciones:** QR estático, sin integración bancaria ni descarga manual acreditada.
**Interfaz evaluada:** Servicio qrCobroService y Storage simulado; sin interfaz visual ejecutada.

### CP-17 — Subir archivo válido y actualizar uso

**Histórico → final:** APROBADO → APROBADO
**Tipo de ejecución:** Evidencia manual remota previa; complemento automatizado actual
**Resultado obtenido:** Se revalida evidencia previa del equipo: 272025 + 18084 = 290109 bytes ocupados; operación confirmada y reservados 0. Flujo local actual sin fallos.
**Estado:** APROBADO
**Entorno:** Evidencia previa localhost/Supabase del equipo; revalidación local 23/11/2026
**Evidencia:** evidencia_remota_previa_archivos.md; edge_archivos.txt; sql_archivos.txt
**Observaciones:** No es una nueva subida remota del agente; no se inventan fecha, ID ni captura de la prueba previa.
**Interfaz evaluada:** Formulario de carga de imagen, galería de la ficha e indicador de uso de almacenamiento.

### CP-18 — Rechazar exceso de cuota y restaurar límite

**Histórico → final:** APROBADO → APROBADO
**Tipo de ejecución:** Evidencia manual remota previa; SQL/Edge actuales
**Resultado obtenido:** Se conserva evidencia previa autorizada: rechazo de 18084 bytes con solo 5000 disponibles, mensaje de falta de espacio y cuota restaurada a 5000000000.
**Estado:** APROBADO
**Entorno:** Evidencia remota previa del equipo; revalidación local 23/11/2026
**Evidencia:** evidencia_remota_previa_archivos.md; sql_archivos.txt; edge_archivos.txt
**Observaciones:** Ocupados 290109, reservados 0 en evidencia del equipo. No se volvió a reducir cuota productiva.
**Interfaz evaluada:** Formulario de carga y mensaje de cuota insuficiente; consulta técnica de cuota y reserva.

### CP-19 — Detectar candidatos sin eliminar

**Histórico → final:** APROBADO → APROBADO
**Tipo de ejecución:** Evidencia manual remota previa; SQL y automatización actuales
**Resultado obtenido:** Evidencia previa del equipo: auditoría superadmin con 0 candidatos, sin eliminación. SQL y pruebas locales actuales revalidaron autorización y detección no destructiva.
**Estado:** APROBADO
**Entorno:** Evidencia remota previa del equipo; revalidación local 23/11/2026
**Evidencia:** evidencia_remota_previa_archivos.md; sql_archivos.txt; suite.txt
**Observaciones:** No se repitió la consulta remota; cero candidatos no demuestra inexistencia absoluta de huérfanos.
**Interfaz evaluada:** Administración → Auditoría de archivos → Detectar candidatos.

### CP-20 — Idempotencia y reserva durable

**Histórico → final:** APROBADO → APROBADO
**Tipo de ejecución:** SQL local real; complemento Edge simulado
**Resultado obtenido:** SQL rechazó confirmar sin objeto; con catálogo fixture verificó doble confirmación idempotente, archivo único y ocupados 4/reservados 0.
**Estado:** APROBADO
**Entorno:** PGlite efímero local; 23/11/2026
**Evidencia:** sql_archivos.txt; edge_archivos.txt
**Observaciones:** Storage representado por catálogo sintético; sin transferencia HTTP remota.
**Interfaz evaluada:** RPC de confirmación y cancelación de subidas; sin interfaz visual (SQL local).

### CP-21 — Cerrar subida directa que eluda reserva

**Histórico → final:** APROBADO → APROBADO
**Tipo de ejecución:** SQL local real
**Resultado obtenido:** INSERT directo a storage.objects como authenticated fue rechazado por RLS; la política RESTRICTIVE impidió el bypass de reserva.
**Estado:** APROBADO
**Entorno:** PGlite efímero local; 23/11/2026
**Evidencia:** sql_archivos.txt
**Observaciones:** Valida SQL versionado con fixtures, no carga real al Storage remoto.
**Interfaz evaluada:** INSERT al catálogo storage.objects bajo la política RLS; sin interfaz visual (SQL local).

### CP-22 — Escapar comas y comillas

**Histórico → final:** APROBADO → APROBADO
**Tipo de ejecución:** Unidad
**Resultado obtenido:** Los cinco tests comprobaron encabezados, números, comas, duplicado de comillas y lista vacía con solo encabezado.
**Estado:** APROBADO
**Entorno:** Node.js 26.13.0, local sin red productiva en tests; 23/11/2026
**Evidencia:** cp_22_tests.txt (5/5)
**Observaciones:** La descarga real con acentos, comas y comillas se acredita aparte en CP-06/23.
**Interfaz evaluada:** Exportador construirCsv; generación del contenido CSV sin interfaz visual.

### CP-23 — Descarga CSV e impresión de datos filtrados

**Histórico → final:** NO EJECUTADO → APROBADO
**Tipo de ejecución:** Navegador; descarga real y flujo nativo de impresión
**Resultado obtenido:** Recepción descargó CSV real del filtro PRUEBA CP: una fila, seis columnas coincidentes y escape correcto. El botón PDF abrió vista previa nativa y evento beforeprint.
**Estado:** APROBADO
**Entorno:** Edge aislado en Windows; localhost con Supabase del equipo; 23/11/2026
**Evidencia:** navegador_recepcion.json; impresion_recepcion.json; vista_previa_impresion.json
**Observaciones:** PDF corresponde a window.print(); diálogo cancelado, sin afirmar guardado de archivo ni biblioteca PDF.
**Interfaz evaluada:** Reporte de pacientes, BotonesReporte, ReporteImprimible y diálogo de impresión del navegador.

### CP-24 — Consultar eventos autorizados

**Histórico → final:** NO EJECUTADO → APROBADO
**Tipo de ejecución:** Recorrido de navegador y consulta remota real
**Resultado obtenido:** Superadmin consultó 30 eventos y expandió el alta sintética TESTCP20261123. Odontólogo y recepción fueron redirigidos fuera de administración; paciente permaneció en portal.
**Estado:** APROBADO
**Entorno:** Edge aislado en Windows; localhost con Supabase del equipo; 23/11/2026
**Evidencia:** bitacora_superadmin.json; navegador_superadmin.json; navegador_recepcion.json; navegador_paciente.json
**Observaciones:** Presentación en tarjetas con acción, tabla, clínica, fecha/hora, rol, IP si existe y detalle. Sin filtros por tabla/acción/fechas; ofrece Cargar más. Solo lectura.
**Interfaz evaluada:** Consulta de Bitácora en AdminPage; recorrido de validación especificado.

### CP-25 — Reserva, horarios y reprogramación completos

**Histórico → final:** BLOQUEADO → FALLIDO
**Tipo de ejecución:** Navegador real y contraste estático
**Resultado obtenido:** El portal /portal/citas ofrece teléfono/correo y consulta, sin formularios de horario, disponibilidad, reserva o reprogramación; Agenda de personal figura Próximamente.
**Estado:** FALLIDO
**Entorno:** Edge aislado en Windows; localhost con Supabase del equipo; 23/11/2026
**Evidencia:** navegador_paciente.json; inspeccion_ausencias.json
**Observaciones:** Se intentó localizar el recorrido integral; su ausencia es fallo funcional, no bloqueo. No se implementó agenda.
**Interfaz evaluada:** Agenda / MisCitasPage; formularios integrales de horarios, reserva y reprogramación no acreditados.

### CP-26 — Comparar dos fechas

**Histórico → final:** BLOQUEADO → FALLIDO
**Tipo de ejecución:** Navegador real y contraste estático
**Resultado obtenido:** La pestaña de odontograma accesible no dispone de selector de dos versiones o fechas ni de comparación histórica visible.
**Estado:** FALLIDO
**Entorno:** Edge aislado en Windows; localhost con Supabase del equipo; 23/11/2026
**Evidencia:** odontograma_persistencia.json; inspeccion_ausencias.json
**Observaciones:** El registro vigente sí persistió en CP-09; esto no implementa el comparador histórico solicitado.
**Interfaz evaluada:** Comparador histórico previsto de odontogramas; selector de dos fechas no disponible.

### CP-27 — Alta, edición y desactivación del catálogo

**Histórico → final:** BLOQUEADO → FALLIDO
**Tipo de ejecución:** Navegador real y contraste estático
**Resultado obtenido:** No existe ruta ni formulario accesible para alta, edición y desactivación del catálogo. servicioCatalogo solo lee servicios activos para presupuestos.
**Estado:** FALLIDO
**Entorno:** Edge aislado en Windows; localhost con Supabase del equipo; 23/11/2026
**Evidencia:** catalogo_ausencia.json; inspeccion_ausencias.json
**Observaciones:** La lectura no equivale a CRUD. Se constató ausencia funcional sin añadir rutas ni modificar permisos.
**Interfaz evaluada:** Administración prevista del catálogo; lectura existente, CRUD integral accesible no acreditado.

### CP-28 — Resolver sintaxis, tablas y columnas

**Histórico → final:** APROBADO → APROBADO
**Tipo de ejecución:** SQL local real
**Resultado obtenido:** Las treinta consultas extraídas de PRESENTACION produjeron EXPLAIN aceptado sobre 17 CREATE TABLE del esquema versionado.
**Estado:** APROBADO
**Entorno:** PGlite efímero sin datos; 23/11/2026
**Evidencia:** consultas.txt; consultas_planes.json
**Observaciones:** Sin datos clínicos, RLS remota ni medición de performance.
**Interfaz evaluada:** Consultas SQL mediante EXPLAIN en el planificador de PGlite; sin interfaz visual.

### CP-29 — Comprobar tipado y bundle

**Histórico → final:** APROBADO → APROBADO
**Tipo de ejecución:** Construcción local
**Resultado obtenido:** tsc -b y Vite 8.3.1 finalizaron con código 0; 4979 módulos transformados.
**Estado:** APROBADO
**Entorno:** Windows; Node.js 26.13.0; 23/11/2026
**Evidencia:** build.txt
**Observaciones:** Aviso de chunk mayor de 500 kB; sin despliegue ni prueba funcional implícita.
**Interfaz evaluada:** Consola de compilación TypeScript y Vite; sin interfaz visual.

### CP-30 — Detectar errores y advertencias

**Histórico → final:** APROBADO → APROBADO
**Tipo de ejecución:** Análisis estático ejecutado
**Resultado obtenido:** oxlint finalizó con código 0: 21 advertencias y ningún error reportado.
**Estado:** APROBADO
**Entorno:** Windows; oxlint 1.86.0; 23/11/2026
**Evidencia:** lint.txt
**Observaciones:** Avisos React de efectos, mutabilidad y exports conservados; no se ocultaron mediante cambios de producto.
**Interfaz evaluada:** Consola de análisis estático oxlint; sin interfaz visual.

### CP-31 — Ejecutar regresión local actual

**Histórico → final:** APROBADO → APROBADO
**Tipo de ejecución:** Suite automatizada de regresión local
**Resultado obtenido:** 697 tests ejecutados: 697 aprobados, 0 fallidos, 0 cancelados, 0 omitidos y 0 TODO; duración Node 42778.7553 ms.
**Estado:** APROBADO
**Entorno:** Node.js 26.13.0; frontend y Edge; 23/11/2026
**Evidencia:** suite.txt
**Observaciones:** Incluye los 16 tests Edge; su reejecución separada no suma 16 tests únicos. No mide cobertura total ni es end-to-end.
**Interfaz evaluada:** Ejecutor Node de la suite del frontend y Edge archivos; sin recorrido visual de navegador.

### CP-32 — Exportar alcance administrativo autorizado

**Histórico → final:** NO EJECUTADO → FALLIDO
**Tipo de ejecución:** Navegador; CSV real; impresión nativa y render privado
**Resultado obtenido:** CSV global: 23 registros y cinco columnas; filtro de especialidad/clínica: 1 registro correcto. La impresión del filtrado incluye además el reporte global de 23.
**Estado:** FALLIDO
**Entorno:** Edge aislado en Windows; localhost con Supabase del equipo; 23/11/2026
**Evidencia:** reporte_personal_filtrado.json; contraste_impresion_personal.json; impresion_superadmin.json; navegador_superadmin.json
**Observaciones:** Vista previa nativa observada. Render privado confirmó 12 correos ajenos al filtro. No se publican identidades ni CSV administrativos íntegros.
**Interfaz evaluada:** Reporte de personal en AdminPage / AsistenteFlotante; exportación CSV e impresión especificadas.

### CP-33 — Comprobar límite individual distinto de cuota

**Histórico → final:** APROBADO → APROBADO
**Tipo de ejecución:** Unidad
**Resultado obtenido:** Aceptó exactamente 10485760 bytes y rechazó 10485761 tanto para imagen como para documento.
**Estado:** APROBADO
**Entorno:** Node.js 26.13.0, local sin red productiva en tests; 23/11/2026
**Evidencia:** cp_33_tests.txt (30/30)
**Observaciones:** Máximo individual 10 MiB distinto de cuota decimal 5 GB; no se subió archivo de 5 GB.
**Interfaz evaluada:** Funciones de validación de tamaño de imágenes y documentos; sin interfaz visual.

## Fichas iniciales completas (línea base conservada)


### CP-01 — Acceso válido y resolución de rol

**Caso de uso relacionado (inicial):** UC-01

**Tipo de prueba (inicial):** Validación / caja negra

**Componente / función (inicial):** LoginPage / AuthContext

**Interfaz evaluada (inicial):** Formulario de acceso LoginPage; recorrido de validación especificado.

**Propósito (inicial):** Acceso válido y resolución de rol

**Actor / rol (inicial):** Odontólogo

**Precondiciones / condiciones (inicial):** Cuenta de prueba activa y clínica activa; credenciales gestionadas fuera del informe

**Entrada concreta (inicial):** Cuenta sintética odontologo.validacion@example.invalid y contraseña de validación, a provisionar por el responsable del entorno antes de ejecutar.

**Procedimiento (inicial):** 1. Abrir acceso. 2. Ingresar credenciales. 3. Verificar sesión y destino.

**Resultado esperado (inicial):** Mostrar área de personal sin exponer datos de otra clínica.

**Resultado obtenido (inicial):** No se realizó el recorrido de interfaz en esta edición.

**Estado (inicial):** NO EJECUTADO

**Entorno (inicial):** Navegador de validación

**Evidencia (inicial):** Código de LoginPage y AuthContext; sin registro manual de esta ejecución

**Observaciones (inicial):** No se inventa una cuenta ni se reutilizan credenciales reales como dato público.

**Dependencia a resolver:** Cuenta de prueba activa y clínica activa; credenciales gestionadas fuera del informe
**Resultado final:** consultar consolidación final de este CP, más abajo.

### CP-02 — Rechazar credencial incorrecta

**Caso de uso relacionado (inicial):** UC-01

**Tipo de prueba (inicial):** Validación / caja negra

**Componente / función (inicial):** LoginPage / API de sesión

**Interfaz evaluada (inicial):** Formulario LoginPage y respuesta de la API de sesión; recorrido especificado.

**Propósito (inicial):** Rechazar credencial incorrecta

**Actor / rol (inicial):** Usuario registrado

**Precondiciones / condiciones (inicial):** Cuenta de validación existente

**Entrada concreta (inicial):** odontologo.validacion@example.invalid y contraseña incorrecta Prueba-Invalida-2026; cuenta sintética previamente provisionada.

**Procedimiento (inicial):** 1. Enviar credencial incorrecta. 2. Comprobar error y ausencia de acceso.

**Resultado esperado (inicial):** Rechazo sin sesión autorizada ni fuga de información.

**Resultado obtenido (inicial):** No se realizó el recorrido de interfaz en esta edición.

**Estado (inicial):** NO EJECUTADO

**Entorno (inicial):** Navegador de validación

**Evidencia (inicial):** Flujo de acceso versionado; sin ejecución manual acreditada

**Observaciones (inicial):** El resultado se limita al alcance descrito.

**Dependencia a resolver:** Cuenta de validación existente
**Resultado final:** consultar consolidación final de este CP, más abajo.

### CP-03 — Restringir rutas por rol

**Caso de uso relacionado (inicial):** UC-01 y acceso a administración

**Tipo de prueba (inicial):** Validación / caja negra

**Componente / función (inicial):** RequireSuperadmin / RequireStaff

**Interfaz evaluada (inicial):** Navegación protegida de App y rutas de personal, paciente y superadmin.

**Propósito (inicial):** Restringir rutas por rol

**Actor / rol (inicial):** Paciente, personal y superadmin

**Precondiciones / condiciones (inicial):** Una cuenta de prueba por rol, sin datos reales

**Entrada concreta (inicial):** Paciente intenta /app/admin; superadmin intenta ficha clínica del personal

**Procedimiento (inicial):** 1. Autenticar cada rol. 2. Abrir ruta. 3. Verificar redirección y datos.

**Resultado esperado (inicial):** Paciente permanece en portal; superadmin usa administración, no edición clínica.

**Resultado obtenido (inicial):** No se realizó el recorrido de interfaz en esta edición.

**Estado (inicial):** NO EJECUTADO

**Entorno (inicial):** Navegador de validación

**Evidencia (inicial):** App.tsx; controles leídos, no interacción de navegador

**Observaciones (inicial):** El resultado se limita al alcance descrito.

**Dependencia a resolver:** Una cuenta de prueba por rol, sin datos reales
**Resultado final:** consultar consolidación final de este CP, más abajo.

### CP-04 — Impedir acceso cruzado y privilegios indebidos

**Caso de uso relacionado (inicial):** UC-14 y ampliación Archivos

**Tipo de prueba (inicial):** Integración SQL local

**Componente / función (inicial):** archivos_c4_reservar / autorización

**Interfaz evaluada (inicial):** Servicio / RPC archivos_c4_reservar y control de contexto; sin interfaz visual (SQL local).

**Propósito (inicial):** Impedir acceso cruzado y privilegios indebidos

**Actor / rol (inicial):** authenticated / recepción

**Precondiciones / condiciones (inicial):** Fixtures de clínicas A y B y perfiles activos

**Entrada concreta (inicial):** Perfil de recepción de otra clínica; llamada de reserva para paciente A

**Procedimiento (inicial):** 1. Cargar SQL real de archivos en fixtures. 2. Cambiar contexto de recepción. 3. Solicitar reserva.

**Resultado esperado (inicial):** ACCESO_DENEGADO; authenticated no cambia cuotas ajenas.

**Resultado obtenido (inicial):** La suite SQL rechazó clínica cruzada y funciones privilegiadas para authenticated.

**Estado (inicial):** APROBADO

**Entorno (inicial):** Local: PGlite efímero con fixtures mínimos

**Evidencia (inicial):** pruebas-sql-ciclo-4.mjs: pruebas de clínica cruzada y cuota ajena

**Observaciones (inicial):** Cubre el contrato de archivos, no todas las políticas de todos los módulos.

**Dependencia a resolver:** Fixtures de clínicas A y B y perfiles activos
**Resultado final:** consultar consolidación final de este CP, más abajo.

### CP-05 — Rechazar datos personales inválidos

**Caso de uso relacionado (inicial):** UC-10

**Tipo de prueba (inicial):** Unidad

**Componente / función (inicial):** validacionesPaciente / validarPaciente

**Interfaz evaluada (inicial):** Validación del borrador de PatientForm mediante validarPaciente; prueba unitaria sin interfaz visual.

**Propósito (inicial):** Rechazar datos personales inválidos

**Actor / rol (inicial):** Personal

**Precondiciones / condiciones (inicial):** Borrador sintético en memoria

**Entrada concreta (inicial):** Nombres y apellidos vacíos; fecha inexistente o futura; teléfono vacío

**Procedimiento (inicial):** 1. Construir borrador inválido. 2. Ejecutar validación. 3. Comprobar campos con error.

**Resultado esperado (inicial):** Errores explícitos antes de persistir.

**Resultado obtenido (inicial):** Los tests de validación rechazaron vacíos, fechas inválidas y formatos de contacto.

**Estado (inicial):** APROBADO

**Entorno (inicial):** Local: Node.js y dependencias instaladas; sin red productiva

**Evidencia (inicial):** features/patients/validacionesPaciente.test.ts

**Observaciones (inicial):** No prueba alta real ni unicidad de CI en servidor.

**Dependencia a resolver:** Borrador sintético en memoria
**Resultado final:** consultar consolidación final de este CP, más abajo.

### CP-06 — Buscar y exportar el conjunto filtrado

**Caso de uso relacionado (inicial):** UC-11 y UC-15

**Tipo de prueba (inicial):** Validación / caja negra

**Componente / función (inicial):** PatientsListPage

**Interfaz evaluada (inicial):** Pantalla PatientsListPage, búsqueda, paginación y descarga del reporte CSV.

**Propósito (inicial):** Buscar y exportar el conjunto filtrado

**Actor / rol (inicial):** Recepción

**Precondiciones / condiciones (inicial):** Pacientes sintéticos de clínica de validación cargados

**Entrada concreta (inicial):** Texto de búsqueda PRUEBA; más de veinte coincidencias si se prueba paginación

**Procedimiento (inicial):** 1. Buscar. 2. Cambiar página. 3. Exportar CSV. 4. Comparar filas.

**Resultado esperado (inicial):** Listado filtrado y reporte de todo lo filtrado cargado, no solo página visible.

**Resultado obtenido (inicial):** No se realizó el recorrido de interfaz en esta edición.

**Estado (inicial):** NO EJECUTADO

**Entorno (inicial):** Navegador de validación

**Evidencia (inicial):** PatientsListPage; filtros y mapeo de filas identificados

**Observaciones (inicial):** El resultado se limita al alcance descrito.

**Dependencia a resolver:** Pacientes sintéticos de clínica de validación cargados
**Resultado final:** consultar consolidación final de este CP, más abajo.

### CP-07 — Conservar información clínica y formato legado

**Caso de uso relacionado (inicial):** UC-16 a UC-20

**Tipo de prueba (inicial):** Unidad

**Componente / función (inicial):** clinicalHistoryMapper

**Interfaz evaluada (inicial):** clinicalHistoryMapper y transformación de filas clínicas; sin interfaz visual.

**Propósito (inicial):** Conservar información clínica y formato legado

**Actor / rol (inicial):** Odontólogo

**Precondiciones / condiciones (inicial):** Filas sintéticas en memoria

**Entrada concreta (inicial):** Listas JSON, alergias, textos con separadores y columnas null

**Procedimiento (inicial):** 1. Mapear fila. 2. Preparar guardado. 3. Comparar contenido y trazabilidad.

**Resultado esperado (inicial):** Conservar contenido; null no inventa responsable o severidad.

**Resultado obtenido (inicial):** Los tests preservaron JSON, texto legado, alergias y fecha del servidor.

**Estado (inicial):** APROBADO

**Entorno (inicial):** Local: Node.js y dependencias instaladas; sin red productiva

**Evidencia (inicial):** features/clinical/clinicalHistoryMapper.test.ts

**Observaciones (inicial):** No se registra aceptación clínica del usuario.

**Dependencia a resolver:** Filas sintéticas en memoria
**Resultado final:** consultar consolidación final de este CP, más abajo.

### CP-08 — No anunciar éxito ante error o cero filas

**Caso de uso relacionado (inicial):** UC-20

**Tipo de prueba (inicial):** Servicio con cliente simulado

**Componente / función (inicial):** clinicalHistoryService

**Interfaz evaluada (inicial):** Servicio clinicalHistoryService con cliente simulado; sin interfaz visual.

**Propósito (inicial):** No anunciar éxito ante error o cero filas

**Actor / rol (inicial):** Odontólogo

**Precondiciones / condiciones (inicial):** Cliente de prueba controlado; UUID sintéticos válidos

**Entrada concreta (inicial):** Error de consulta/RLS o UPDATE sin filas

**Procedimiento (inicial):** 1. Simular respuesta. 2. Guardar. 3. Verificar rechazo y contenido previo.

**Resultado esperado (inicial):** No producir historia inventada ni éxito vacío.

**Resultado obtenido (inicial):** Los tests distinguieron errores y UPDATE sin filas de una escritura confirmada.

**Estado (inicial):** APROBADO

**Entorno (inicial):** Local: Node.js y dependencias instaladas; sin red productiva

**Evidencia (inicial):** features/clinical/clinicalHistoryService.test.ts

**Observaciones (inicial):** RLS es una respuesta simulada, no una conexión remota.

**Dependencia a resolver:** Cliente de prueba controlado; UUID sintéticos válidos
**Resultado final:** consultar consolidación final de este CP, más abajo.

### CP-09 — Editar una pieza y comprobar persistencia

**Caso de uso relacionado (inicial):** UC-21 y UC-23

**Tipo de prueba (inicial):** Validación / caja negra

**Componente / función (inicial):** OdontogramTab / ToothEditorCard

**Interfaz evaluada (inicial):** Pestaña OdontogramTab y formulario de pieza ToothEditorCard.

**Propósito (inicial):** Editar una pieza y comprobar persistencia

**Actor / rol (inicial):** Odontólogo

**Precondiciones / condiciones (inicial):** Paciente sintético autorizado y odontograma vigente

**Entrada concreta (inicial):** Pieza 16, condición caries y nota de prueba

**Procedimiento (inicial):** 1. Seleccionar pieza. 2. Editar. 3. Guardar. 4. Recargar.

**Resultado esperado (inicial):** Conservar condiciones y notas bajo el paciente y clínica correctos.

**Resultado obtenido (inicial):** No se realizó el recorrido de interfaz en esta edición.

**Estado (inicial):** NO EJECUTADO

**Entorno (inicial):** Navegador de validación

**Evidencia (inicial):** Componentes y estructura JSONB identificados

**Observaciones (inicial):** No se sustituye por tests FDI de otro módulo.

**Dependencia a resolver:** Paciente sintético autorizado y odontograma vigente
**Resultado final:** consultar consolidación final de este CP, más abajo.

### CP-10 — Conservar borrador y permisos en diagnóstico

**Caso de uso relacionado (inicial):** UC-26 y UC-27

**Tipo de prueba (inicial):** Servicio y controlador simulados

**Componente / función (inicial):** diagnosticoService / diagnosticoFormulario

**Interfaz evaluada (inicial):** Servicio de diagnóstico y controlador del formulario; evaluación simulada, sin recorrido visual.

**Propósito (inicial):** Conservar borrador y permisos en diagnóstico

**Actor / rol (inicial):** Autor odontólogo

**Precondiciones / condiciones (inicial):** Cliente simulado y contexto sintético

**Entrada concreta (inicial):** Descripción válida; pieza inválida; respuesta null o error de guardado

**Procedimiento (inicial):** 1. Validar entrada. 2. Simular fallo. 3. Confirmar que conserva borrador.

**Resultado esperado (inicial):** No escribir entrada inválida ni limpiar tras fallo/null.

**Resultado obtenido (inicial):** Los tests rechazaron FDI inválido y respuestas no confirmadas y conservaron contenido.

**Estado (inicial):** APROBADO

**Entorno (inicial):** Local: Node.js y dependencias instaladas; sin red productiva

**Evidencia (inicial):** features/treatment/diagnosticoService.test.ts y diagnosticoFormulario.test.ts

**Observaciones (inicial):** El resultado se limita al alcance descrito.

**Dependencia a resolver:** Cliente simulado y contexto sintético
**Resultado final:** consultar consolidación final de este CP, más abajo.

### CP-11 — Transiciones con control de estado previo

**Caso de uso relacionado (inicial):** UC-28 y UC-30

**Tipo de prueba (inicial):** Servicio y controlador simulados

**Componente / función (inicial):** planTratamientoService / planEstado

**Interfaz evaluada (inicial):** Servicio de planes y controlador planEstado; clientes simulados, sin interfaz visual.

**Propósito (inicial):** Transiciones con control de estado previo

**Actor / rol (inicial):** Autor del plan

**Precondiciones / condiciones (inicial):** Plan propuesto de paciente y clínica sintéticos

**Entrada concreta (inicial):** Dos clientes leen propuesto; uno acepta y otro intenta cancelar con lectura antigua

**Procedimiento (inicial):** 1. Simular aceptación. 2. Enviar segundo cambio con estado previo. 3. Revisar respuesta.

**Resultado esperado (inicial):** Rechazar conflicto, sin sobrescribir el estado confirmado.

**Resultado obtenido (inicial):** El test CAS rechazó cancelar después de aceptar con una lectura obsoleta.

**Estado (inicial):** APROBADO

**Entorno (inicial):** Local: Node.js y dependencias instaladas; sin red productiva

**Evidencia (inicial):** features/treatment/planTratamientoService.test.ts: T-5.7

**Observaciones (inicial):** No prueba dos sesiones PostgreSQL reales.

**Dependencia a resolver:** Plan propuesto de paciente y clínica sintéticos
**Resultado final:** consultar consolidación final de este CP, más abajo.

### CP-12 — Releer total después del CRUD confirmado

**Caso de uso relacionado (inicial):** UC-29

**Tipo de prueba (inicial):** Integración de componentes simulada

**Componente / función (inicial):** planTotal / controladores de procedimientos

**Interfaz evaluada (inicial):** Controladores de procedimientos y consulta del total del plan; integración simulada sin interfaz visual.

**Propósito (inicial):** Releer total después del CRUD confirmado

**Actor / rol (inicial):** Autor del plan

**Precondiciones / condiciones (inicial):** Cliente controlado y plan real de fixture

**Entrada concreta (inicial):** Eliminar último procedimiento; relectura del plan con costo_total 0.00

**Procedimiento (inicial):** 1. Confirmar DELETE. 2. Releer plan. 3. Mostrar total.

**Resultado esperado (inicial):** Total del servidor 0.00 sin repetición del DELETE ni suma local.

**Resultado obtenido (inicial):** T-5.10 comprobó relectura tras eliminar el último procedimiento y manejo de fallo parcial.

**Estado (inicial):** APROBADO

**Entorno (inicial):** Local: Node.js y dependencias instaladas; sin red productiva

**Evidencia (inicial):** features/treatment/planTotal.test.ts

**Observaciones (inicial):** No se confirma instalación remota del trigger por esta prueba.

**Dependencia a resolver:** Cliente controlado y plan real de fixture
**Resultado final:** consultar consolidación final de este CP, más abajo.

### CP-13 — Persistencia y referencias de evolución

**Caso de uso relacionado (inicial):** UC-31 y UC-32

**Tipo de prueba (inicial):** Servicio simulado y mapper

**Componente / función (inicial):** evolucionService / evolucionMapper

**Interfaz evaluada (inicial):** Servicio y mapper de evolución, con cliente simulado; sin interfaz visual.

**Propósito (inicial):** Persistencia y referencias de evolución

**Actor / rol (inicial):** Odontólogo

**Precondiciones / condiciones (inicial):** UUID sintéticos y respuestas controladas

**Entrada concreta (inicial):** Motivo y procedimiento con saltos de línea; referencias opcionales y fecha próxima

**Procedimiento (inicial):** 1. Mapear. 2. Insertar con cliente simulado. 3. Probar error y cero filas.

**Resultado esperado (inicial):** Conservar textos y contexto, no inventar fecha ni éxito.

**Resultado obtenido (inicial):** Los tests conservaron campos y null y no anunciaron éxito en errores de escritura.

**Estado (inicial):** APROBADO

**Entorno (inicial):** Local: Node.js y dependencias instaladas; sin red productiva

**Evidencia (inicial):** features/evolucion/evolucionService.test.ts y evolucionMapper.test.ts

**Observaciones (inicial):** El resultado se limita al alcance descrito.

**Dependencia a resolver:** UUID sintéticos y respuestas controladas
**Resultado final:** consultar consolidación final de este CP, más abajo.

### CP-14 — Calcular descuentos sin total negativo

**Caso de uso relacionado (inicial):** UC-41 y UC-42

**Tipo de prueba (inicial):** Unidad

**Componente / función (inicial):** calculoTotal

**Interfaz evaluada (inicial):** Función calculoTotal del presupuesto; sin interfaz visual en la prueba unitaria.

**Propósito (inicial):** Calcular descuentos sin total negativo

**Actor / rol (inicial):** Personal

**Precondiciones / condiciones (inicial):** Partidas numéricas en memoria

**Entrada concreta (inicial):** Partida de cantidad 1 y precio 100; descuento global 500.

**Procedimiento (inicial):** 1. Calcular subtotales. 2. Aplicar descuento. 3. Comprobar mínimo cero.

**Resultado esperado (inicial):** Total 0 cuando descuento supera subtotal.

**Resultado obtenido (inicial):** La suite comprobó cálculo de partidas y límite cero del descuento excesivo.

**Estado (inicial):** APROBADO

**Entorno (inicial):** Local: Node.js y dependencias instaladas; sin red productiva

**Evidencia (inicial):** features/presupuestos/calculoTotal.test.ts

**Observaciones (inicial):** No se acredita guardado remoto del presupuesto.

**Dependencia a resolver:** Partidas numéricas en memoria
**Resultado final:** consultar consolidación final de este CP, más abajo.

### CP-15 — Separar pendiente de confirmado

**Caso de uso relacionado (inicial):** UC-45 y UC-47

**Tipo de prueba (inicial):** Unidad

**Componente / función (inicial):** pagoCalculo

**Interfaz evaluada (inicial):** Funciones totalConfirmado y saldoPresupuesto; sin interfaz visual.

**Propósito (inicial):** Separar pendiente de confirmado

**Actor / rol (inicial):** Personal

**Precondiciones / condiciones (inicial):** Colección de pagos de prueba en memoria

**Entrada concreta (inicial):** Pagos con estados pendiente, confirmado, rechazado y desconocido

**Procedimiento (inicial):** 1. Sumar confirmados. 2. Calcular saldo. 3. Comprobar mínimo cero.

**Resultado esperado (inicial):** Pendientes, rechazados y desconocidos no se cuentan como recibidos.

**Resultado obtenido (inicial):** Los tests de totalConfirmado y saldoPresupuesto aplicaron la regla y evitaron saldo negativo.

**Estado (inicial):** APROBADO

**Entorno (inicial):** Local: Node.js y dependencias instaladas; sin red productiva

**Evidencia (inicial):** features/pagos/pagoCalculo.test.ts

**Observaciones (inicial):** El resultado se limita al alcance descrito.

**Dependencia a resolver:** Colección de pagos de prueba en memoria
**Resultado final:** consultar consolidación final de este CP, más abajo.

### CP-16 — Mostrar QR estático o informar ausencia

**Caso de uso relacionado (inicial):** UC-48

**Tipo de prueba (inicial):** Servicio con Storage simulado

**Componente / función (inicial):** qrCobroService

**Interfaz evaluada (inicial):** Servicio qrCobroService y Storage simulado; sin interfaz visual ejecutada.

**Propósito (inicial):** Mostrar QR estático o informar ausencia

**Actor / rol (inicial):** Personal / paciente lector

**Precondiciones / condiciones (inicial):** Clínica con UUID sintético válido

**Entrada concreta (inicial):** Objeto QR existente y objeto no encontrado

**Procedimiento (inicial):** 1. Solicitar URL firmada. 2. Probar ausencia. 3. Probar error.

**Resultado esperado (inicial):** URL del objeto de clínica; null solo para ausencia; error no se oculta.

**Resultado obtenido (inicial):** Los tests verificaron ruta fija, firma y tratamiento de ausencia/error.

**Estado (inicial):** APROBADO

**Entorno (inicial):** Local: Node.js y dependencias instaladas; sin red productiva

**Evidencia (inicial):** features/pagos/qrCobroService.test.ts

**Observaciones (inicial):** No es pago bancario ni descarga manual acreditada.

**Dependencia a resolver:** Clínica con UUID sintético válido
**Resultado final:** consultar consolidación final de este CP, más abajo.

### CP-17 — Subir archivo válido y actualizar uso

**Caso de uso relacionado (inicial):** Ampliación Archivos

**Tipo de prueba (inicial):** Integración / validación manual remota

**Componente / función (inicial):** Formulario de imagen + Edge archivos + RPC + Storage

**Interfaz evaluada (inicial):** Formulario de carga de imagen, galería de la ficha e indicador de uso de almacenamiento.

**Propósito (inicial):** Subir archivo válido y actualizar uso

**Actor / rol (inicial):** Personal autorizado del equipo

**Precondiciones / condiciones (inicial):** Cuota inicial: ocupados 272025; límite 5000000000; reserva 0

**Entrada concreta (inicial):** WEBP de 18084 bytes

**Procedimiento (inicial):** 1. Subir desde localhost. 2. Consultar operación y cuota. 3. Verificar galería/indicador.

**Resultado esperado (inicial):** 290109 ocupados; operación confirmada con archivo_id; reservados 0.

**Resultado obtenido (inicial):** Equipo confirmó 272025 + 18084 = 290109, operación confirmada y reserva cero.

**Estado (inicial):** APROBADO

**Entorno (inicial):** Localhost conectado al Supabase remoto del equipo

**Evidencia (inicial):** Confirmación manual aportada por el equipo para esta edición

**Observaciones (inicial):** No se dispone de captura física ni de fecha/ID publicables; no se inventan.

**Dependencia a resolver:** Cuota inicial: ocupados 272025; límite 5000000000; reserva 0
**Resultado final:** consultar consolidación final de este CP, más abajo.

### CP-18 — Rechazar exceso de cuota y restaurar límite

**Caso de uso relacionado (inicial):** Ampliación Archivos / cuota

**Tipo de prueba (inicial):** Integración / validación manual remota

**Componente / función (inicial):** Edge archivos / archivos_c4_reservar

**Interfaz evaluada (inicial):** Formulario de carga y mensaje de cuota insuficiente; consulta técnica de cuota y reserva.

**Propósito (inicial):** Rechazar exceso de cuota y restaurar límite

**Actor / rol (inicial):** Personal autorizado del equipo

**Precondiciones / condiciones (inicial):** Clínica con 290109 ocupados; límite temporal ocupados + 5000

**Entrada concreta (inicial):** Mismo WEBP de 18084 bytes frente a 5000 disponibles

**Procedimiento (inicial):** 1. Ajustar límite temporal en validación del equipo. 2. Intentar subir. 3. Restaurar 5000000000. 4. Verificar cuota.

**Resultado esperado (inicial):** Rechazo con mensaje explícito; sin reserva residual.

**Resultado obtenido (inicial):** Equipo confirmó “No hay espacio suficiente en el almacenamiento de la clínica.” y restauración a límite 5000000000, ocupados 290109 y reservados 0.

**Estado (inicial):** APROBADO

**Entorno (inicial):** Localhost conectado al Supabase remoto del equipo

**Evidencia (inicial):** Confirmación manual aportada por el equipo

**Observaciones (inicial):** El ajuste remoto fue una prueba previa del equipo; no se repitió ni se alteró Supabase para esta edición.

**Dependencia a resolver:** Clínica con 290109 ocupados; límite temporal ocupados + 5000
**Resultado final:** consultar consolidación final de este CP, más abajo.

### CP-19 — Detectar candidatos sin eliminar

**Caso de uso relacionado (inicial):** Ampliación Archivos / auditoría

**Tipo de prueba (inicial):** Integración / validación manual remota

**Componente / función (inicial):** AuditoriaArchivosPanel / archivos_c4_auditar

**Interfaz evaluada (inicial):** Administración → Auditoría de archivos → Detectar candidatos.

**Propósito (inicial):** Detectar candidatos sin eliminar

**Actor / rol (inicial):** Superadmin

**Precondiciones / condiciones (inicial):** Migración y Edge archivos desplegadas por el equipo

**Entrada concreta (inicial):** Administración → Auditoría de archivos → Detectar candidatos

**Procedimiento (inicial):** 1. Ingresar como superadmin. 2. Detectar candidatos. 3. Leer resultado.

**Resultado esperado (inicial):** Resultado de detección no destructivo con candidatos o cero.

**Resultado obtenido (inicial):** El equipo confirmó 0 candidatos, sin eliminación.

**Estado (inicial):** APROBADO

**Entorno (inicial):** Localhost conectado al Supabase remoto del equipo

**Evidencia (inicial):** Confirmación manual del equipo

**Observaciones (inicial):** Cero candidatos en esa consulta no prueba inexistencia absoluta de huérfanos; no hay captura física incorporada.

**Dependencia a resolver:** Migración y Edge archivos desplegadas por el equipo
**Resultado final:** consultar consolidación final de este CP, más abajo.

### CP-20 — Idempotencia y reserva durable

**Caso de uso relacionado (inicial):** Ampliación Archivos / incertidumbre

**Tipo de prueba (inicial):** Integración SQL local

**Componente / función (inicial):** archivos_c4_confirmar / cancelar

**Interfaz evaluada (inicial):** RPC de confirmación y cancelación de subidas; sin interfaz visual (SQL local).

**Propósito (inicial):** Idempotencia y reserva durable

**Actor / rol (inicial):** service_role en fixture

**Precondiciones / condiciones (inicial):** Reserva existente y ruta durable

**Entrada concreta (inicial):** Confirmación antes de objeto; luego objeto de tamaño verificado y doble confirmación

**Procedimiento (inicial):** 1. Reservar. 2. Rechazar confirmación sin objeto. 3. Crear fixture de catálogo. 4. Confirmar dos veces.

**Resultado esperado (inicial):** Mismo archivo al repetir confirmación y reserva liberada solo con confirmación válida.

**Resultado obtenido (inicial):** La prueba SQL acreditó rechazo OBJETO_NO_CONFIRMADO, idempotencia y ocupados 4/reservados 0 en fixture.

**Estado (inicial):** APROBADO

**Entorno (inicial):** Local: PGlite efímero con fixtures mínimos

**Evidencia (inicial):** pruebas-sql-ciclo-4.mjs: cancelación/idempotencia/confirmación

**Observaciones (inicial):** Storage se representa mediante su catálogo de prueba; no se suben bytes por HTTP.

**Dependencia a resolver:** Reserva existente y ruta durable
**Resultado final:** consultar consolidación final de este CP, más abajo.

### CP-21 — Cerrar subida directa que eluda reserva

**Caso de uso relacionado (inicial):** Ampliación Archivos / seguridad

**Tipo de prueba (inicial):** Integración SQL local

**Componente / función (inicial):** Política RESTRICTIVE de storage.objects

**Interfaz evaluada (inicial):** INSERT al catálogo storage.objects bajo la política RLS; sin interfaz visual (SQL local).

**Propósito (inicial):** Cerrar subida directa que eluda reserva

**Actor / rol (inicial):** authenticated

**Precondiciones / condiciones (inicial):** SQL real del módulo sobre fixtures

**Entrada concreta (inicial):** INSERT directo en storage.objects del bucket de archivos

**Procedimiento (inicial):** 1. Cambiar rol a authenticated. 2. Intentar INSERT. 3. Comparar error.

**Resultado esperado (inicial):** Violación de RLS; no creación directa.

**Resultado obtenido (inicial):** La prueba SQL rechazó el INSERT por row-level security.

**Estado (inicial):** APROBADO

**Entorno (inicial):** Local: PGlite efímero con fixtures mínimos

**Evidencia (inicial):** pruebas-sql-ciclo-4.mjs: cierre de bypass Storage

**Observaciones (inicial):** No equivale a una prueba de carga de objeto en el servicio remoto.

**Dependencia a resolver:** SQL real del módulo sobre fixtures
**Resultado final:** consultar consolidación final de este CP, más abajo.

### CP-22 — Escapar comas y comillas

**Caso de uso relacionado (inicial):** Ampliación Reportes

**Tipo de prueba (inicial):** Unidad

**Componente / función (inicial):** construirCsv

**Interfaz evaluada (inicial):** Exportador construirCsv; generación del contenido CSV sin interfaz visual.

**Propósito (inicial):** Escapar comas y comillas

**Actor / rol (inicial):** Personal / superadmin

**Precondiciones / condiciones (inicial):** Datos sintéticos en memoria

**Entrada concreta (inicial):** Campo con coma, campo con comillas internas, número y lista vacía

**Procedimiento (inicial):** 1. Construir CSV. 2. Comparar delimitadores y escape.

**Resultado esperado (inicial):** Entrecomillado y duplicado de comillas; sin filas, solo encabezado.

**Resultado obtenido (inicial):** Los cinco tests de CSV aprobaron esos casos.

**Estado (inicial):** APROBADO

**Entorno (inicial):** Local: Node.js y dependencias instaladas; sin red productiva

**Evidencia (inicial):** features/reportes/exportarCsv.test.ts

**Observaciones (inicial):** No prueba guardar PDF ni impresión del navegador.

**Dependencia a resolver:** Datos sintéticos en memoria
**Resultado final:** consultar consolidación final de este CP, más abajo.

### CP-23 — Descarga CSV e impresión de datos filtrados

**Caso de uso relacionado (inicial):** Ampliación Reportes de pacientes

**Tipo de prueba (inicial):** Validación / caja negra

**Componente / función (inicial):** BotonesReporte / ReporteImprimible

**Interfaz evaluada (inicial):** Reporte de pacientes, BotonesReporte, ReporteImprimible y diálogo de impresión del navegador.

**Propósito (inicial):** Descarga CSV e impresión de datos filtrados

**Actor / rol (inicial):** Recepción

**Precondiciones / condiciones (inicial):** Pacientes de validación y destino de impresión configurado

**Entrada concreta (inicial):** Búsqueda por texto y salida CSV; imprimir/guardar como PDF

**Procedimiento (inicial):** 1. Filtrar. 2. Descargar CSV. 3. Abrir impresión. 4. Comparar columnas y alcance.

**Resultado esperado (inicial):** Mismas seis columnas y datos autorizados; PDF solo por diálogo del navegador.

**Resultado obtenido (inicial):** No se realizó el recorrido de interfaz en esta edición.

**Estado (inicial):** NO EJECUTADO

**Entorno (inicial):** Navegador de validación

**Evidencia (inicial):** PatientsListPage y componentes de reportes identificados

**Observaciones (inicial):** El resultado se limita al alcance descrito.

**Dependencia a resolver:** Pacientes de validación y destino de impresión configurado
**Resultado final:** consultar consolidación final de este CP, más abajo.

### CP-24 — Consultar eventos autorizados

**Caso de uso relacionado (inicial):** Ampliación Bitácora

**Tipo de prueba (inicial):** Integración / caja negra

**Componente / función (inicial):** AdminPage / Bitácora

**Interfaz evaluada (inicial):** Consulta de Bitácora en AdminPage; recorrido de validación especificado.

**Propósito (inicial):** Consultar eventos autorizados

**Actor / rol (inicial):** Superadmin

**Precondiciones / condiciones (inicial):** Eventos sintéticos en entorno de validación

**Entrada concreta (inicial):** Filtro por tabla, acción o rango que ofrezca la interfaz

**Procedimiento (inicial):** 1. Abrir bitácora. 2. Aplicar filtro disponible. 3. Comparar evento de prueba.

**Resultado esperado (inicial):** Solo eventos autorizados, sin modificar el registro de auditoría.

**Resultado obtenido (inicial):** No se realizó el recorrido de interfaz en esta edición.

**Estado (inicial):** NO EJECUTADO

**Entorno (inicial):** Navegador y backend de validación

**Evidencia (inicial):** Componente y SQL versionados; sin recorrido remoto acreditado

**Observaciones (inicial):** Los filtros concretos deben anotarse al ejecutar; no se inventa un evento.

**Dependencia a resolver:** Eventos sintéticos en entorno de validación
**Resultado final:** consultar consolidación final de este CP, más abajo.

### CP-25 — Reserva, horarios y reprogramación completos

**Caso de uso relacionado (inicial):** UC-34 a UC-38

**Tipo de prueba (inicial):** Validación / caja negra

**Componente / función (inicial):** Agenda / MisCitasPage

**Interfaz evaluada (inicial):** Agenda / MisCitasPage; formularios integrales de horarios, reserva y reprogramación no acreditados.

**Propósito (inicial):** Reserva, horarios y reprogramación completos

**Actor / rol (inicial):** Personal / paciente

**Precondiciones / condiciones (inicial):** Formulario accesible y autorización de reserva del paciente

**Entrada concreta (inicial):** Fecha 2026-11-23, 09:00–09:30 y profesional de validación

**Procedimiento (inicial):** 1. Configurar horario. 2. Consultar libre. 3. Reservar. 4. Reprogramar.

**Resultado esperado (inicial):** Una cita válida sin conflicto, con interfaz y permisos reales.

**Resultado obtenido (inicial):** No hay formulario completo accesible acreditado; el portal deriva a teléfono/correo.

**Estado (inicial):** BLOQUEADO

**Entorno (inicial):** Interfaz actual identificada

**Evidencia (inicial):** MisCitasPage y App.tsx; calendario y lógica del store no completan el recorrido

**Observaciones (inicial):** No se convierte una consulta SQL académica en disponibilidad implementada.

**Dependencia a resolver:** Formulario accesible y autorización de reserva del paciente
**Resultado final:** consultar consolidación final de este CP, más abajo.

### CP-26 — Comparar dos fechas

**Caso de uso relacionado (inicial):** UC-25

**Tipo de prueba (inicial):** Validación / caja negra

**Componente / función (inicial):** Odontograma histórico

**Interfaz evaluada (inicial):** Comparador histórico previsto de odontogramas; selector de dos fechas no disponible.

**Propósito (inicial):** Comparar dos fechas

**Actor / rol (inicial):** Odontólogo

**Precondiciones / condiciones (inicial):** Selector de dos versiones históricas

**Entrada concreta (inicial):** Dos odontogramas sintéticos de fechas distintas

**Procedimiento (inicial):** 1. Abrir comparación. 2. Seleccionar fechas. 3. Revisar diferencias.

**Resultado esperado (inicial):** Comparación histórica visible.

**Resultado obtenido (inicial):** No se identificó selector comparativo accesible.

**Estado (inicial):** BLOQUEADO

**Entorno (inicial):** Interfaz actual identificada

**Evidencia (inicial):** OdontogramTab / actualización del registro vigente

**Observaciones (inicial):** Se conserva el requisito diseñado, no se afirma resultado implementado.

**Dependencia a resolver:** Selector de dos versiones históricas
**Resultado final:** consultar consolidación final de este CP, más abajo.

### CP-27 — Alta, edición y desactivación del catálogo

**Caso de uso relacionado (inicial):** UC-40

**Tipo de prueba (inicial):** Validación / caja negra

**Componente / función (inicial):** Administración de servicios

**Interfaz evaluada (inicial):** Administración prevista del catálogo; lectura existente, CRUD integral accesible no acreditado.

**Propósito (inicial):** Alta, edición y desactivación del catálogo

**Actor / rol (inicial):** Odontólogo administrador

**Precondiciones / condiciones (inicial):** Ruta o formulario de catálogo completo accesible

**Entrada concreta (inicial):** Servicio sintético Prueba de catálogo, precio 100, duración 30 minutos

**Procedimiento (inicial):** 1. Crear servicio. 2. Cambiar precio. 3. Desactivar. 4. Revisar presupuesto.

**Resultado esperado (inicial):** Persistencia y uso posterior consistentes.

**Resultado obtenido (inicial):** La lectura del catálogo existe, pero no se acredita superficie accesible de administración completa.

**Estado (inicial):** BLOQUEADO

**Entorno (inicial):** Interfaz actual identificada

**Evidencia (inicial):** App.tsx y lectura de servicios en presupuestos

**Observaciones (inicial):** El resultado se limita al alcance descrito.

**Dependencia a resolver:** Ruta o formulario de catálogo completo accesible
**Resultado final:** consultar consolidación final de este CP, más abajo.

### CP-28 — Resolver sintaxis, tablas y columnas

**Caso de uso relacionado (inicial):** Diseño de datos: 30 consultas

**Tipo de prueba (inicial):** Verificación SQL local

**Componente / función (inicial):** Planificador PostgreSQL de PGlite

**Interfaz evaluada (inicial):** Consultas SQL mediante EXPLAIN en el planificador de PGlite; sin interfaz visual.

**Propósito (inicial):** Resolver sintaxis, tablas y columnas

**Actor / rol (inicial):** Evaluación técnica

**Precondiciones / condiciones (inicial):** 17 CREATE TABLE del esquema versionado en base efímera vacía

**Entrada concreta (inicial):** Treinta SELECT documentados con UUID sintéticos

**Procedimiento (inicial):** 1. Crear tablas locales. 2. Ejecutar EXPLAIN de cada SELECT. 3. Registrar errores.

**Resultado esperado (inicial):** 30 planes aceptados.

**Resultado obtenido (inicial):** 30 de 30 EXPLAIN aceptados, sin errores.

**Estado (inicial):** APROBADO

**Entorno (inicial):** Local: PGlite efímero con fixtures mínimos

**Evidencia (inicial):** Registro local de planificación; listado íntegro en diseño físico

**Observaciones (inicial):** Sin ejecución sobre datos clínicos ni validación de RLS remota o performance.

**Dependencia a resolver:** 17 CREATE TABLE del esquema versionado en base efímera vacía
**Resultado final:** consultar consolidación final de este CP, más abajo.

### CP-29 — Comprobar tipado y bundle

**Caso de uso relacionado (inicial):** Implementación: compilación

**Tipo de prueba (inicial):** Integración de construcción

**Componente / función (inicial):** tsc -b y Vite

**Interfaz evaluada (inicial):** Consola de compilación TypeScript y Vite; sin interfaz visual.

**Propósito (inicial):** Comprobar tipado y bundle

**Actor / rol (inicial):** Evaluación técnica

**Precondiciones / condiciones (inicial):** Dependencias instaladas

**Entrada concreta (inicial):** npm run build

**Procedimiento (inicial):** 1. Ejecutar script real. 2. Revisar salida.

**Resultado esperado (inicial):** Compilación completada sin error.

**Resultado obtenido (inicial):** tsc -b y Vite 8.3.1 completados; 4979 módulos transformados.

**Estado (inicial):** APROBADO

**Entorno (inicial):** Local: Windows / Node.js v26.13.0

**Evidencia (inicial):** Salida nueva del build de esta edición

**Observaciones (inicial):** Aviso de chunk mayor de 500 kB. No es prueba funcional ni despliegue.

**Dependencia a resolver:** Dependencias instaladas
**Resultado final:** consultar consolidación final de este CP, más abajo.

### CP-30 — Detectar errores y advertencias

**Caso de uso relacionado (inicial):** Implementación: análisis estático

**Tipo de prueba (inicial):** Análisis estático

**Componente / función (inicial):** oxlint

**Interfaz evaluada (inicial):** Consola de análisis estático oxlint; sin interfaz visual.

**Propósito (inicial):** Detectar errores y advertencias

**Actor / rol (inicial):** Evaluación técnica

**Precondiciones / condiciones (inicial):** Dependencias instaladas

**Entrada concreta (inicial):** npm run lint

**Procedimiento (inicial):** 1. Ejecutar. 2. Contar diagnósticos.

**Resultado esperado (inicial):** Salida sin errores; registrar avisos.

**Resultado obtenido (inicial):** Proceso completado; 21 advertencias existentes, sin errores reportados.

**Estado (inicial):** APROBADO

**Entorno (inicial):** Local: Windows / oxlint 1.86.0

**Evidencia (inicial):** Salida nueva de lint de esta edición

**Observaciones (inicial):** Hay avisos React sobre efectos, mutabilidad y exports; no se modifica código para ocultarlos.

**Dependencia a resolver:** Dependencias instaladas
**Resultado final:** consultar consolidación final de este CP, más abajo.

### CP-31 — Ejecutar regresión local actual

**Caso de uso relacionado (inicial):** Paquetes y ampliaciones con tests versionados

**Tipo de prueba (inicial):** Unidad / servicios / composición

**Componente / función (inicial):** Suite Node del frontend y Edge archivos

**Interfaz evaluada (inicial):** Ejecutor Node de la suite del frontend y Edge archivos; sin recorrido visual de navegador.

**Propósito (inicial):** Ejecutar regresión local actual

**Actor / rol (inicial):** Evaluación técnica

**Precondiciones / condiciones (inicial):** Dependencias instaladas y tests versionados

**Entrada concreta (inicial):** node --test --test-concurrency=1 "src/**/*.test.ts" "../supabase/functions/archivos/*.test.ts"

**Procedimiento (inicial):** 1. Ejecutar desde frontend. 2. Revisar resumen y fallos.

**Resultado esperado (inicial):** Todos los tests descubiertos terminan sin fallo.

**Resultado obtenido (inicial):** 697 pruebas ejecutadas; 697 aprobadas; 0 fallidas; 0 canceladas; 0 omitidas y 0 pendientes (TODO).

**Estado (inicial):** APROBADO

**Entorno (inicial):** Local: Node.js y dependencias instaladas; sin red productiva

**Evidencia (inicial):** Resumen nuevo de Node: duración 66536.5342 ms

**Observaciones (inicial):** No se computa como cobertura integral de los 48 CU ni como prueba end-to-end.

**Dependencia a resolver:** Dependencias instaladas y tests versionados
**Resultado final:** consultar consolidación final de este CP, más abajo.

### CP-32 — Exportar alcance administrativo autorizado

**Caso de uso relacionado (inicial):** Ampliación Reportes de personal

**Tipo de prueba (inicial):** Validación / caja negra

**Componente / función (inicial):** AdminPage / AsistenteFlotante

**Interfaz evaluada (inicial):** Reporte de personal en AdminPage / AsistenteFlotante; exportación CSV e impresión especificadas.

**Propósito (inicial):** Exportar alcance administrativo autorizado

**Actor / rol (inicial):** Superadmin

**Precondiciones / condiciones (inicial):** Cuentas sintéticas en dos clínicas de validación

**Entrada concreta (inicial):** Filtro de especialidad y clínica desde asistente; lista global desde administración

**Procedimiento (inicial):** 1. Consultar personal. 2. Aplicar filtro ofrecido. 3. Exportar. 4. Comparar cinco columnas.

**Resultado esperado (inicial):** Nombre, correo, rol, clínica y estado sin atribuir acceso global al personal clínico.

**Resultado obtenido (inicial):** No se realizó el recorrido de interfaz en esta edición.

**Estado (inicial):** NO EJECUTADO

**Entorno (inicial):** Navegador de validación

**Evidencia (inicial):** AdminPage y AsistenteFlotante identificados

**Observaciones (inicial):** La ruta global exige superadmin.

**Dependencia a resolver:** Cuentas sintéticas en dos clínicas de validación
**Resultado final:** consultar consolidación final de este CP, más abajo.

### CP-33 — Comprobar límite individual distinto de cuota

**Caso de uso relacionado (inicial):** Ampliación Archivos / tamaño

**Tipo de prueba (inicial):** Unidad

**Componente / función (inicial):** Validación de archivo

**Interfaz evaluada (inicial):** Funciones de validación de tamaño de imágenes y documentos; sin interfaz visual.

**Propósito (inicial):** Comprobar límite individual distinto de cuota

**Actor / rol (inicial):** Personal

**Precondiciones / condiciones (inicial):** Archivo sintético en memoria

**Entrada concreta (inicial):** Archivo de exactamente 10485760 bytes y de 10485761 bytes

**Procedimiento (inicial):** 1. Validar el límite exacto. 2. Validar un byte adicional.

**Resultado esperado (inicial):** Aceptar el primero y rechazar el segundo.

**Resultado obtenido (inicial):** Los tests de imagen y documento aprobaron el límite exacto de 10 MiB y rechazaron un byte más.

**Estado (inicial):** APROBADO

**Entorno (inicial):** Local: Node.js y dependencias instaladas; sin red productiva

**Evidencia (inicial):** Pruebas versionadas de validación del módulo archivos

**Observaciones (inicial):** No se crea ni sube un archivo de 5 GB; esa cifra es la cuota decimal de clínica.

**Dependencia a resolver:** Archivo sintético en memoria
**Resultado final:** consultar consolidación final de este CP, más abajo.



## Archivos y estado documental

- Entregables previstos: RESULTADOS_EJECUCION_33_CP.md, PROYECTOCOMPLETO1_FINAL_CICLO4_PRUEBAS_EJECUTADAS.docx y .pdf.
- La actualización documental se inicia solo después de terminar las pruebas. Capítulos 1–5, CU, figuras, bibliografía, estilos y portada no se reescriben.
- Índices, paginación, integridad y revisión visual se registrarán al finalizar la exportación.

## Cierre documental verificado

Entregables completados desde PRESENTACION: DOCX y PDF PRUEBAS_EJECUTADAS, ambos de 200 páginas. Se actualizaron únicamente resumen dependiente de resultados, Capítulo 6, Tabla 74, cinco campos de las 33 fichas, cierre, conclusión dependiente de resultados y Anexo E.

Se conservaron las 33 definiciones y sus campos Interfaz evaluada. La auditoría OOXML confirmó que solo cambió word/document.xml: portada, capítulos 1–5, CU, bibliografía, medios, estilos, relaciones y propiedades de párrafo/run/tabla/fila/celda/sección son idénticos a PRESENTACION. Se mantuvieron 111 tablas XML (incluida la tabla preliminar; 110 tablas numeradas) y 141 objetos drawing originales. No se añadieron figuras al informe.

Word recalculó paginación e índices (1 tabla de contenido y 2 índices de figuras/tablas). Se verificaron 454 entradas: ninguna cambió de página. Capítulo 6: páginas 169–188; conclusión: 189; Anexo E: 199. Se revisaron visualmente esas 22 páginas; sin recortes ni superposiciones observados. El PDF contiene los 33 estados esperados, no tiene páginas vacías candidatas ni referencias rotas detectadas.

PRESENTACION.docx y PRESENTACION.pdf, y todas las versiones anteriores inventariadas, conservan sus hashes iniciales. No se utilizó DEFINITIVO/CORREGIDO como base ni se sobrescribió PRESENTACION. Evidencia: integridad_documental.json y auditoria_pdf.json.

- PROYECTOCOMPLETO1_FINAL_CICLO4_PRUEBAS_EJECUTADAS.docx: 10013675 bytes; SHA-256 b856fd79a13371ecbf9600b127d852406d41ce17041fc08f7ffa5818da2afd81.
- PROYECTOCOMPLETO1_FINAL_CICLO4_PRUEBAS_EJECUTADAS.pdf: 9163087 bytes; SHA-256 44aaab4d11eb56855b08614b45d0f2d0eef2bef0f59a016dbb4bcfd36f02f9ae.

Archivos auxiliares: RECORRIDOS_AUTENTICADOS_33_CP.md y evidencias_33_cp/ (salidas técnicas, resultados por CP, CSV sintético, dos capturas reales y auditorías). Los archivos administrativos con identidades y el render de evaluación permanecen privados en temporal.

Git: rama desarrollo-angelica, ahead 3 frente a origin/desarrollo-angelica; ningún archivo rastreado modificado. Entregables y evidencias nuevos sin seguimiento, junto con los archivos previos ya sin seguimiento. No se ejecutaron git add/commit/push/reset/restore/merge/checkout/switch. Estado íntegro en evidencias_33_cp/git_status_final.txt.

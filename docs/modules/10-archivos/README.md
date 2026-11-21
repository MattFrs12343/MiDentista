# Módulo 10: Archivos e Imágenes

## Descripción
Módulo para almacenar y consultar documentos, fotografías y radiografías relacionadas con los pacientes.

## Responsable
Angélica — Módulo 10. Integración mínima de ficha autorizada por Matías.

## Ciclo 4 — implementación local, pendiente de aplicar/desplegar

Implementados cuota, reservas durables, indicador de uso y reporte administrativo
no destructivo. **No se ejecutó SQL en Supabase ni se desplegó la Edge Function.**
No publicar el frontend nuevo sin coordinar la migración y el backend con Matías.

### Unidades y alcance

- Producción: **5 GB = 5.000.000.000 bytes**, valor predeterminado de
  `archivos_cuotas.limite_bytes`, configurable por clínica solo desde administración SQL/backend.
- GB es decimal; 5 GiB serían 5.368.709.120 bytes y **no** es la unidad elegida.
- El límite individual sigue siendo **10 MiB = 10.485.760 bytes**.
- Solo objetos **vigentes** de `archivos-clinica`. No incluye `qr-cobros`, otros
  buckets, versiones archivadas, backups, tráfico ni tamaño de PostgreSQL.
- No se renombra `public.archivos.tamano`. Los archivos antiguos siguen legibles.

### Flujo de escritura y concurrencia

`subirArchivo`/`subirDocumento` conservan su contrato y preflight de Auth/asociación,
pero envían multipart a la función `archivos`; **no** escriben Storage/SQL directamente.
El backend verifica JWT mediante Auth, perfil por `auth_user_id`, activo, paciente,
clínica real y permisos. El frontend no envía una clínica o autor autoritativos.
Recepción no puede asociar evoluciones; odontólogo, odontologo_admin, paciente y
superadmin conservan los alcances previos. Las consultas de asociaciones usan
cliente del JWT y la RPC existente, nunca un SELECT administrativo como permiso.

Se mide el cuerpo recibido (también sin Content-Length), se limita a 10 MiB,
se verifica MIME/extensión y cabecera binaria JPEG/PNG/WEBP/PDF y se calcula SHA-256.
Esto no es antivirus ni un decodificador completo de imágenes/PDF.

`archivos_c4_reservar` revalida el actor/paciente, deriva clínica/categoría y bloquea
la fila de cuota con `FOR UPDATE`. Rechaza si ocupados + reservados + bytes nuevos
excede el límite. Dos usuarios con 6 MB libres y archivos de 4 MB no pueden reservar
ambos. La transacción termina **antes** de la transferencia HTTP a Storage.

La operación UUID es también su clave de idempotencia y nombre interno de objeto.
Captura autor, paciente, clínica, hash, bytes reales y payload inmutables.
`archivos_c4_iniciar` autoriza un único upload con `upsert:false`.
`archivos_c4_confirmar` acredita objeto vigente/tamaño en Storage, revalida contexto,
inserta `public.archivos` con sus CHECK/FKs/triggers intactos y convierte reserva
en ocupación en la misma transacción. Repetir confirmación no duplica el consumo.

Estados: reservada, subiendo, incierta, confirmada y cancelada. Consultables por
`archivos_c4_estado` (actor original o superadmin activo); `archivos` acepta JSON
`{accion:"estado",operacionId}` y devuelve la fila final solo si su SELECT con RLS
continúa permitido. El frontend conserva idempotencia para el mismo File/contexto
en memoria y expone `ErrorSubidaArchivo.operacionId` para soporte. No persiste
File, JWT ni rutas. Una recarga no reconstruye automáticamente ese borrador.

Reservas todavía no iniciadas pueden cancelarse atómicamente. Un rechazo HTTP
definitivo del único upload puede resolverse con RPC exclusiva del backend y
comprobación de ausencia en catálogo. Timeout, 409, 5xx o confirmación incierta
**no** liberan bytes, no repiten upload y no eliminan objetos. No hay expiración
automática por reloj. Intentos inciertos requieren revisión/confirmación posterior.

El contador inicial incluye objetos vigentes anteriores y huérfanos A, usando
`metadata.size` de Storage, no SUM(tamano) declarado por clientes. La migración
aborta si el inventario no tiene tamaños fiables. Los contadores son conservadores:
eliminar metadata, una baja externa o un borrado físico fuera de este flujo no
libera cuota automáticamente. Puede sobreestimarse el uso; no se implementa en
este ciclo una reconciliación que reduzca cargos ni limpieza. `service_role`/SQL
administrativo siguen siendo accesos confiables capaces de saltarse RLS; cualquier
subida externa debe coordinar contabilidad. Versiones archivadas quedan fuera.

### Seguridad SQL y activación

`migracion-ciclo-4.sql` es incremental y de una sola ejecución. No reemplaza
`sql.sql` ni T-10.9. Crea `archivos_cuotas`, `archivos_operaciones_subida` y RPC
`archivos_c4_*` con search_path seguro. No permite escrituras authenticated en las
tablas internas ni EXECUTE de RPC privilegiadas. Las RPC de lectura autorizan
cuota de la propia clínica/equipo o superadmin, estado propio y auditoría superadmin.
No hay endpoint para que un usuario cambie límites o contadores.

Se revoca INSERT directo de metadata y se añaden guards RESTRICTIVE que impiden
el bypass mediante uploads authenticated directos al bucket. El backend sube con
service_role y registra exclusivamente contra una operación validada. **No** se
relaja `archivos_objeto_propio` para aceptar owner_id NULL arbitrariamente.
Se conservan policies de lectura/descarga, permisos de otros módulos y triggers
previos. No se agregan triggers al catálogo de Storage. Los identificadores de
historial de operaciones sobreviven a bajas externas sin añadir restricciones a
la eliminación de pacientes/clínicas de otros módulos.

Aplicación pendiente, solo Matías:
1. Revisar T-10.1/2/9, integración odontologo_admin, grants y versión Storage.
2. Ventana de mantenimiento: detener clientes antiguos y subidas en vuelo.
   Si se emitieron URLs firmadas de subida fuera de la interfaz, revisar su
   revocación/caducidad antes del corte; son capacidades ya emitidas por Storage.
3. Respaldar/revisar inventario; aplicar migración completa con administrador
   BYPASSRLS. Bloquea escrituras SQL durante inicialización; no sustituye detener HTTP.
4. Ejecutar `verificacion-ciclo-4.sql` en pruebas. No reinstalar SQL histórico.
5. Desplegar `supabase/functions/archivos/index.ts` como función `archivos`, con
   variables Supabase del servidor. Nunca poner service_role en VITE ni navegador.
6. Probar Auth, Storage versionado, metadata.size, bucket privado y RLS con JWT
   reales antes de publicar el frontend nuevo. No utilizar `--no-verify-jwt`
   como sustituto de autorización; el handler verifica además el JWT con Auth.
7. Publicar frontend coordinado. No existe fallback a escritura insegura si falta backend.

### Huérfanos: solo detección

TIPO A: objeto vigente en `archivos-clinica` sin `public.archivos.ruta`.
TIPO B: fila de `public.archivos` sin objeto vigente de esa ruta en el bucket.
Comparación por clave exacta, sin basarse en nombre original, miniatura o URL firmada.
`archivos_c4_auditar` genera una foto MVCC del catálogo sin filtros RLS parciales,
encapsulada en JSON (no truncamiento silencioso por límite de filas de PostgREST).
Reporta clínica, ruta, fecha y tipo. Se excluyen versiones archivadas; no prueban
que exista un objeto vigente. Las operaciones pendientes o archivos de menos de
24 horas se reportan como indeterminados, no como huérfanos confirmados.
Si hay más de 5000 candidatos o falla el inventario, el resultado es indeterminado;
el cliente no presenta un listado parcial como completo. Se puede filtrar por clínica.

El alcance global es exclusivamente superadmin activo. La fuente declarada es
`catalogo_storage`: detecta ausencia de objeto vigente en el catálogo, **no** hace
una comprobación de bytes en el proveedor físico. 403/red/URL expirada no prueban
ausencia física. **No existe DELETE, botón de borrado ni Storage.remove en la auditoría
o en el nuevo flujo de subida.** No borrar automáticamente evita perder información
clínica válida durante carreras, subidas en curso, fallos de red o inventarios parciales.

`ArchivosAuditoriaPanel.tsx` está integrado en `AdminPage.tsx`, en la pestaña
“Auditoría de archivos”, después de Bitácora. Tanto la pestaña como su contenido
exigen `sesion.rol === "superadmin"`; el panel recibe solamente ese rol y solicita
el reporte global. Se conserva la protección de ruta existente, sin rutas nuevas.
El ocultamiento visual no concede autorización: Edge Function y RPC vuelven a verificarla.

### Pruebas y defensa

Desde la raíz: `node --test "frontend/src/features/archivos/*.test.ts" "supabase/functions/archivos/*.test.ts"`.
Desde frontend: `npm run lint` y `npm run build`.
Suite completa desde frontend (los tests Vite de otros módulos dependen de ese
directorio): `node --test --test-concurrency=1 "src/**/*.test.ts" "../supabase/functions/archivos/*.test.ts"`.
Backend: `deno check --no-lock supabase/functions/archivos/index.ts` desde la raíz.
No se eliminan los casos anteriores: los de escritura se adaptan a delegación y
conservación de objetos, en lugar de exigir compensación destructiva antigua.

Prueba SQL local opcional: instalar `@electric-sql/pglite` fuera del repositorio y
ejecutar `node docs/modules/10-archivos/pruebas-sql-ciclo-4.mjs <URL-local-del-modulo>`.
Ejecuta la migración/verificador reales sobre fixtures mínimos efímeros, roles/RLS,
cuotas y confirmación; nunca conecta a Supabase. No prueba Storage HTTP, DOM ni
dos conexiones PostgreSQL: PGlite serializa su conexión. La prueba real de locks
con dos usuarios sigue pendiente del despliegue en entorno de pruebas.

Resultado local: 697/697 tests de la suite completa (incluidos 187 del módulo y
backend), 8/8 ensayos PostgreSQL WASM, comprobación Deno correcta y build correcto.
Lint sin errores, 21 advertencias previas fuera del módulo. Se conserva el aviso
de bundle mayor de 500 kB. No se validó despliegue remoto ni interacción DOM completa.

Guion de defensa:
1. Clínica exclusivamente descartable con cuota temporal de 2 MiB, configurada
   por Matías en `archivos_cuotas.limite_bytes`. Ejemplo comentado en el verificador.
   No cambiar algoritmo ni contadores ni tamaños declarados para simular ocupación.
2. Subir archivos JPEG/PNG/WEBP/PDF reales pequeños; observar consumo y reserva.
3. Alcanzar el límite y rechazar el siguiente archivo ANTES de crear objeto.
4. Tests numéricos con 5.000.000.000 bytes: debajo, igualdad exacta y un byte extra.
5. Dos sesiones con cupo de 6 MiB y archivos de 4 MiB: solo una debe subir.
6. General/evolución/plan del mismo paciente; recepción no gana acceso a evolución.
7. Clínica A no consulta/reserva cuota B; solo superadmin obtiene auditoría global.
8. Fixtures A/B solo en proyecto desechable: reporte separado, no se borra nada.
   Un A recién subido queda indeterminado durante 24 h; usar fixture de antigüedad
   controlada en pruebas locales o preparar el objeto con antelación en pruebas reales.
9. Timeout de respuesta: conservar reserva e investigar por operacionId, sin repetir
   automáticamente transferencia. Visor, descarga y firmas siguen funcionando.
10. Restaurar límite de prueba a 5.000.000.000 mediante administración. No tocar producción.

## Registro histórico T-10.1–T-10.10 — 2026-10-14

T-10.1 a T-10.10 completadas e implementadas/validadas según confirmación final
del equipo. Tabla/RLS y bucket privado configurados; subida de imágenes y PDF,
galería, visor con zoom, descarga e integración en ficha funcionando.
La asociación opcional con evolución clínica o plan del mismo paciente/clínica
está aplicada y validada, incluida la migración y verificación T-10.9.
La validación real procede de la confirmación del equipo; la auditoría local
no ejecuta SQL ni consulta/modifica Supabase.

En aquel cierre la cuota y detección durable estaban pendientes. El Ciclo 4
anterior sustituye ese estado a nivel de código local; la limpieza sigue fuera de alcance.

Verificación local de esta auditoría: `node --test "src/features/archivos/*.test.ts"`,
146 aprobados y 0 fallidos; `npm.cmd run build` correcto; `npm.cmd run lint`
sin errores y con 15 warnings existentes fuera del módulo; `git diff --check`
sin errores. Conservado el aviso de chunks mayores de 500 kB del build.

## Funcionalidades
- Subir fotografías clínicas (JPG, PNG, WEBP)
- Subir radiografías
- Subir documentos PDF
- Asociar opcionalmente al subir a evolución clínica o plan completo del mismo paciente/clínica
- Visualizar imágenes en navegador con zoom (PDF sin visor)
- Descargar archivos
- Límite actual: 10 MiB por archivo
- Cuota de 5 GB por clínica y detección: implementadas localmente en Ciclo 4, pendientes de despliegue

## Integración T-10.10

Pestaña Archivos en `/app/pacientes/:pacienteId?tab=archivos`, después de Evolución
y antes de Pagos. `PatientFilesSection` coordina formularios en diálogo, permisos
visuales y refresh de la galería existente. Odontólogo/recepción pueden subir
cuando contexto y clínica coinciden; RLS/Storage siguen siendo la autorización.
Paciente y superadmin mantienen navegación actual (portal/administración).

Implementación y validación manual final de T-10.1–T-10.10 confirmadas. Revisar
`frontend/src/features/archivos/README.md` para checklist, contexto y contratos.
Migración T-10.9 y verificación aplicadas según confirmación del equipo; en esta
tarea no se ejecutó SQL. No se modificaron listas de pacientes ni rutas globales.

La cuota no formó parte de T-10.10. El Ciclo 4 incorpora ahora su implementación
local y mantiene la limpieza fuera de alcance. Las pruebas locales no sustituyen
validación remota. No se realizó commit, push ni despliegue.

## Contrato SQL versionado

`sql.sql` conserva la instalación inicial T-10.1/T-10.2. Sus comentarios finales
sobre frontend y T-10.9 son históricos y quedaron superados por el código actual
y `migracion-t-10-9.sql`; no indican tareas actuales sin terminar. La migración
incremental agrega referencias nullable, exclusividad, FKs de contexto, índices,
RPC SECURITY INVOKER, guard INSERT restrictivo e inmutabilidad. El verificador
comprueba catálogos y restricciones con fixtures temporales y ROLLBACK; las
pruebas RLS reales requieren sesiones y fueron confirmadas por el equipo.
Los tres archivos son coherentes entre sí y con el contrato aplicado comunicado
por el equipo; no se comparó un esquema remoto durante esta auditoría.
No volver a ejecutar la instalación base ni la migración ya aplicada.

## Tablas relacionadas
- `archivos` - Registro de archivos subidos

## Dependencias
- Módulo 02 (Pacientes) completado
- Supabase Storage configurado
- Tabla `archivos` creada

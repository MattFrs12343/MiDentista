# Módulo 10: Archivos e Imágenes

## Descripción
Módulo para almacenar y consultar documentos, fotografías y radiografías relacionadas con los pacientes.

## Responsable
Angélica — Módulo 10. Integración mínima de ficha autorizada por Matías.

## Estado final — 2026-10-14

T-10.1 a T-10.10 completadas e implementadas/validadas según confirmación final
del equipo. Tabla/RLS y bucket privado configurados; subida de imágenes y PDF,
galería, visor con zoom, descarga e integración en ficha funcionando.
La asociación opcional con evolución clínica o plan del mismo paciente/clínica
está aplicada y validada, incluida la migración y verificación T-10.9.
La validación real procede de la confirmación del equipo; la auditoría local
no ejecuta SQL ni consulta/modifica Supabase.

Pendiente funcional separado para una etapa posterior: cuota global configurable
de 5 GB por clínica, NO implementada. El límite de 10 MiB por archivo no la sustituye.
Limpieza durable de posibles huérfanos de Storage: deuda técnica no bloqueante
para este commit; la compensación actual no hace atómicas las dos APIs.
Este cierre abarca T-10.1 a T-10.10, no la totalidad de requisitos futuros.

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
- Requisito funcional separado PENDIENTE: cuota global de 5 GB por clínica

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

La cuota 5 GB no forma parte de T-10.10 y permanece PENDIENTE para etapa posterior.
La limpieza durable de Storage es deuda técnica no bloqueante. Las pruebas locales
complementan la validación manual confirmada, no la sustituyen. Commit/push/merge
pendientes de solicitud/revisión; bitácora con horas pendientes por Angélica.

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

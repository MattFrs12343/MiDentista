# Módulo 10 — Archivos e Imágenes

**Dueña: Angélica.** Carpeta con escritura exclusiva: `frontend/src/features/archivos/`.

## Estado final — 2026-10-14

T-10.1 a T-10.10 completadas e implementadas/validadas según confirmación final
del equipo: tabla/RLS, bucket privado, selector de archivos, subida de imágenes
y PDF, galería, visor con zoom, descarga, asociación a evolución/plan e
integración en ficha funcionando. La migración y verificación T-10.9 están
aplicadas y validadas según esa confirmación; esta auditoría no ejecuta SQL ni
consulta/modifica Supabase. Las cifras de pruebas de cada sección son históricas.

Pendiente funcional separado: cuota global configurable de 5 GB por clínica,
NO implementada y reservada para una etapa posterior. Se mantiene el límite
actual de 10 MiB por archivo. Limpieza durable de posibles huérfanos de Storage:
deuda técnica no bloqueante; no se garantiza atomicidad entre SQL y Storage.
El cierre de estas diez tareas no implica implementar la cuota ni esa limpieza.

Auditoría local final: 146 tests aprobados, 0 fallidos con
`node --test "src/features/archivos/*.test.ts"`; `npm.cmd run build` correcto;
`npm.cmd run lint` sin errores, 15 warnings externos existentes sin corregir;
`git diff --check` sin errores. Aviso existente de chunks mayores de 500 kB.

## Qué NO debes tocar

- `frontend/src/App.tsx` — aquí se registran las rutas
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/features/patients/PatientProfilePage.tsx` — aquí va la pestaña
- `frontend/src/features/patients/tabValue.ts`
- `frontend/src/types/index.ts` — tus tipos viven en `tipos.ts`
- `frontend/src/data/store.tsx` — tu servicio accede a Supabase por su cuenta
- `bd_5clinicas_midentista.sql` y `supabase/` — son de Matías
- `frontend/src/components/ui/*` e `index.css`

T-10.10 tiene autorización explícita de Matías para los dos cambios mínimos en
`PatientProfilePage.tsx` y `tabValue.ts`: pestaña `archivos` e import/montaje del
contenedor. No extiende permiso para editar listas, rutas, store u otros módulos.

## La tabla `archivos` está reactivada: escribe tu SQL aparte

`docs/DATABASE.md` listaba `archivos` como tabla **eliminada** del MVP, marcada
"Versión 2". Se ha reactivado para este sprint, así que tu DDL va en:

```
docs/modules/10-archivos/sql.sql
```

**No edites `bd_5clinicas_midentista.sql`.** Matías lo pega durante el merge.
T-10.1 y T-10.2 están instaladas según las pruebas del módulo. Este archivo SQL
es la propuesta de instalación, no debe ejecutarse de nuevo para la galería.

El SQL ya incluye la tabla, los índices, el RLS siguiendo el patrón de
`docs/DATABASE.md` sección 18.3, y el bucket de Storage con sus políticas.

## Archivos que ya existen aquí

| Archivo | Qué aporta |
|---------|-----------|
| `tipos.ts` | `Archivo`, `CategoriaArchivo`, `esVisualizable` |
| `archivoMapper.ts` | Tipo de fila, `esUuid`, `archivoDesdeFila`, `rutaEnBucket` |
| `archivoService.ts` | `cargarArchivos`, `subirArchivo`, `crearUrlArchivo`, `eliminarArchivo` |

También existen `FileUpload.tsx`, los formularios de imágenes/PDF y sus hooks
de subida real (T-10.3 a T-10.5).

## T-10.6 — Galería implementada a nivel de código

`PatientFilesGallery.tsx` recibe únicamente `pacienteId`. Consulta metadatos
reales mediante `useArchivosPaciente.ts`. T-10.7 añade visor únicamente a las
imágenes, T-10.8 permite descargar imágenes/PDF y T-10.9 añade asociación al subir.
T-10.10 monta estos componentes en la pestaña Archivos de la ficha, sin ruta nueva.

`cargarArchivos()` valida UUID antes de red, selecciona las columnas del mapper,
filtra `paciente_id` y usa `.order("creado_en", { ascending: false })` con desempate
por `id` descendente. `[]` es éxito vacío; error, excepción y `data: null` son fallo.
Paciente + RLS + FK compuesta proporcionan el alcance; no necesita `clinicaId`.

`archivosGaleria.ts` prepara etiquetas, descripción y fecha, y resuelve firmas
en paralelo con fallos aislados, sin modificar el orden de los archivos.
Solo JPG/PNG/WEBP solicitan miniatura. Los PDF usan un icono; un documento
escaneado con MIME de imagen sigue siendo documento y admite miniatura.

El hook expone `estado`, `archivos`, `urlsPorId`, `error` y `reload()`. Carga
automáticamente y descarta resultados anteriores al recargar, cambiar de
paciente o desmontar. No expone archivos de la ficha anterior. Cada miniatura
tiene estado `pendiente`, `disponible` o `fallida`; un error de firma no falla
la galería. `img.onError` activa un fallback local, conservando metadatos.

La interfaz reutiliza Card, Button, Badge y EmptyState y muestra una, dos o
tres columnas (`sm`, `xl`). Las imágenes usan proporción 4:3 y `object-contain`.
Fecha: `creadoEl` es un instante; se convierte al día local y se reutilizan
`hoyEnIso` y `formatearFechaCorta` de la utilidad existente de evolución.

Estados: “Cargando archivos del paciente…”, “Este paciente todavía no tiene
archivos.” y error global legible con “Reintentar”. Con archivos ofrece
“Actualizar”, deshabilitado durante recarga. Una miniatura fallida muestra
“Vista previa no disponible.”. Los errores técnicos no se renderizan.

La prueba manual real de T-10.6 fue confirmada por el equipo. No hay
infraestructura React/DOM nueva; node:test cubre el servicio, mapper y lógica
pura, no el ciclo de vida React.

## T-10.7 — Visor implementado y validado

Las tarjetas JPG/PNG/WEBP tienen un botón `Ver imagen`. Se detectan por MIME,
incluidos documentos escaneados: `esVisualizable()` no sirve para habilitar el
visor porque también admite PDF. Las tarjetas PDF siguen sin acción de visor.

`ImageViewer.tsx` recibe archivo, estado temporal de firma, cierre, reintento y
retorno de foco. Compone Dialog y las primitivas Radix ya instaladas dentro de
la carpeta del módulo para etiquetar la X, sin modificar primitivas compartidas.
Reutiliza overlay, animaciones y superficie del diálogo del sistema. Cierra con
X (`Cerrar visor de imagen`), Escape o clic fuera. Radix aporta focus trap;
al cerrar se restaura foco al botón de origen o a la galería si ya no existe.

Zoom 1x–4x, incrementos de 0.5, botones Acercar/Alejar/Restablecer, porcentaje y
límites deshabilitados. 1x ajusta la imagen al viewport sin deformarla ni ampliar
imágenes pequeñas inicialmente. Las dimensiones crecen realmente en layout:
el área `overflow-auto` permite recorrer ambos ejes con scroll y teclado.
No hay drag/pan, rotación, rueda personalizada, doble clic ni visor PDF.

`imageViewer.ts` reúne detección de imagen, alt, límites de zoom, dimensiones y
estado de carga por fuente. Otro archivo reinicia zoom, scroll y error; renovar
la firma del mismo archivo conserva el zoom. Eventos de fuentes anteriores se
descartan. Se muestra nombre, tipo, fecha y descripción cuando existe, sin ruta
ni autor. Modal responsive hasta `max-w-5xl`, limitado al viewport, con controles
fuera del scroll de la imagen.

El hook ahora expone también `asegurarUrlArchivo(id, forzar?)`. Un gestor puro en
`archivosGaleria.ts` reutiliza la firma válida o recupera individualmente una
ausente/fallida/vencida; solicitudes concurrentes del mismo id comparten promesa,
incluso con `forzar`. Solo admite imágenes de la lista vigente. Invalidar una
generación impide publicar respuestas antiguas tras recarga/cambio/desmontaje.
La recuperación individual no consulta de nuevo los metadatos ni modifica las
otras URLs. La renovación automática y al recuperar foco/visibilidad siguen
siendo responsabilidad del hook; ImageViewer no añade otro temporizador.

Carga: `Cargando imagen…`. Error local: `No pudimos mostrar esta imagen. Intenta
nuevamente.` con `Reintentar`, que solicita una firma nueva. No hay reintentos
automáticos ilimitados ni error global de galería por fallo de visor.

Validación manual confirmada por el equipo: abrir fotografías/radiografías/documentos escaneados y excluir
PDF; zoom/límites/reset; recorrer extremos de imágenes amplias; X/Escape/clic
fuera/foco/teclado; cambiar paciente y recargar; errores individuales y recuperación;
renovar con visor abierto y conservar zoom; responsive y nombres/descripciones
largos, con sesión Auth, registros y bucket privado reales. Node:test no
demuestra la interacción DOM ni la configuración desplegada de Supabase.

## T-10.8 — Descarga implementada y validada

`Descargar` aparece en cada tarjeta JPG/PNG/WEBP/PDF y también en ImageViewer.
La categoría y clasificación no conceden permisos. La tarjeta sigue siendo
informativa y PDF no recibe visor. Se usa Button, iconos Phosphor y tokens existentes.

`descargarArchivo(archivoId, pacienteId, cliente?, signal?)` valida UUID antes
de red y confirma una fila visible de `public.archivos` por id + paciente_id
con `maybeSingle()`. El mapper valida sus metadatos y pertenencia; ruta y nombre
proceden exclusivamente de esa fila, nunca de una ruta arbitraria de la UI.
Después llama `storage.from("archivos-clinica").download(ruta, {}, { signal })`
con el cliente autenticado. La consulta SQL y Storage aplican sus propias RLS.
No usa `getPublicUrl`, URLs públicas, service_role ni firmas de miniaturas.

Devuelve `{ archivo, blob }`. Rechaza consulta fallida, fila invisible, errores
Storage, Blob nulo/vacío o mayor de 10 MiB y MIME específico contradictorio.
MIME vacío u octet-stream se etiqueta con el MIME confirmado mediante `slice`,
conservando los bytes; no hay transformación de imágenes/PDF. No se confunde
ausencia de fila visible con prueba de inexistencia por RLS.

`archivoDescarga.ts` concentra tipos, mensajes amigables, validación del Blob,
gestor de bloqueo/cancelación y entrega al navegador. `entregarBlob()` crea una
URL local, asigna `download = archivo.nombre`, activa y retira un enlace temporal.
En éxito revoca la URL a los 60 segundos; ante fallo previo al clic revoca de
inmediato. El cleanup diferido no depende del montaje React y no se persiste.
El navegador/sistema puede ajustar caracteres no admitidos o nombres repetidos.
La entrega solicita una descarga: no confirma que el usuario guardó en disco.

`useDescargaArchivo()` tiene una sola instancia en PatientFilesGallery, compartida
con ImageViewer. Estados por id: inactivo, descargando, error. El bloqueo se fija
antes del primer await; un doble clic no encola ni duplica la petición. Otros ids
pueden descargar en paralelo. Se rechazan ids fuera de lista o de otro paciente.
Cambiar paciente/lista, recargar o desmontar invalida la generación y aborta
peticiones. Una respuesta tardía no activa el enlace ni publica estado antiguo.
Las comprobaciones frontend no sustituyen las policies de acceso del servidor.

Mientras descarga se muestra spinner y `Descargando…` con role=status, y solo
se bloquea la descarga de ese archivo (además del bloqueo durante carga global
de metadatos). Los errores son locales, con role=alert tanto en tarjeta como en
modal. Puede reintentarse con el mismo botón. No se muestran detalles técnicos.
Se distinguen no visible/acceso perdido, objeto no encontrado, permiso denegado,
red, Storage y respuesta inválida según códigos/estados disponibles.

ImageViewer recibe estado/callback de la misma operación, no crea otro hook ni
servicio. Descargar no modifica la firma, fuente, zoom ni scroll de la imagen.
Un espacio fijo para el estado evita cambiar el tamaño del viewport al mostrar
mensajes. La descarga funciona independientemente de errores de previsualización.

Verificación local: 117 tests aprobados, build correcto y lint sin errores;
15 warnings existentes fuera del módulo. Node:test cubre servicio y gestor, MIME,
concurrencia/cancelación, nombre y cleanup mediante entorno simulado, no interacción
DOM ni autorización desplegada.

Validación manual con sesión real confirmada por el equipo: descargar JPG/PNG/WEBP/PDF y abrir los archivos
guardados; comprobar nombre, extensión y bytes; descargar desde visor y conservar
zoom/scroll; doble clic y dos ids; cambiar ficha/desmontar durante la petición;
fallo controlado de red y recuperación local; sesión sin acceso; teclado, mensajes
en modal y responsive. El navegador puede solicitar autorización para múltiples
descargas. No cambiar objetos ni policies para provocar fallos.

## T-10.9 — Asociación al subir aplicada y validada

Diseño aprobado por Matías: consulta = `evoluciones_clinicas`; tratamiento =
`planes_tratamiento`. Siempre hay paciente y puede haber cero o una referencia
adicional, nunca ambas. No hay relación a citas, procedimientos ni diagnósticos.
No hay edición/desvinculación posterior ni montaje en las secciones de módulos
05/06; la pestaña Archivos de la ficha queda integrada mediante T-10.10.

Procedimiento de aplicación manual por Matías (ya aplicado/verificado según
confirmación del equipo; referencia histórica, no volver a ejecutar):

1. Revisar esquema desplegado, RLS y permisos SELECT de evolución/planes. La
   versión base del repositorio no contiene policies de evolución; confirmar la
   instalación real de T-6.1 con su responsable. No resolverlo desde este módulo.
2. Aplicar `docs/modules/10-archivos/migracion-t-10-9.sql` como transacción completa.
   No ejecutar otra vez `sql.sql`, ni correr ambas propuestas juntas.
3. Ejecutar manualmente `docs/modules/10-archivos/verificacion-t-10-9.sql` en pruebas.
   Inspecciona estructura y copia CHECK/FKs a fixtures temporales, con ROLLBACK;
   no modifica datos clínicos/Storage. Sus comentarios detallan ensayos RLS con
   sesiones reales que las tablas temporales y el rol administrativo no prueban.
4. Validar el frontend actualizado después de aplicar la migración: los SELECT
   ahora requieren las dos columnas nuevas. No desplegar este código primero.

La migración añade UUID nullable, CHECK excluyente y FKs compuestas de referencia,
paciente y clínica. Reutiliza UNIQUE compatibles o añade las ternas necesarias
en destinos, con ON UPDATE/DELETE RESTRICT e índices parciales por asociación.
No reconstruye tablas ni reclasifica archivos anteriores: quedan con ambas
referencias null. Aborta si faltan tablas/RLS o las columnas ya existen, para no
sobrescribir una migración parcial/desconocida. Revisar bloqueos de ALTER TABLE.

`archivos_asociacion_autorizada` es SECURITY INVOKER: no salta RLS/GRANT del destino.
General conserva autorizaciones existentes; referencia clínica exige equipo
odontólogo/recepcionista/superadmin y destino visible del mismo contexto. Portal
no admite vínculos clínicos. El guard INSERT es RESTRICTIVE (AND), no otra policy
permisiva que amplíe acceso por OR. Un trigger adicional prohíbe cambiar las
referencias; se conserva el trigger previo y no se concede UPDATE de columnas
nuevas. No cambian permisos de Storage ni policies de otros módulos.

`Archivo`/fila/payload incluyen referencias nullable. El input usa `AsociacionArchivo`
discriminada (`general`, `evolucion`, `plan`); el mapper rechaza UUID inválido,
ambas referencias o inputs manipulados con campos extra. Los hooks transportan
la asociación y el hook común captura una copia del destino del intento.

El servicio valida perfil Auth y consulta el destino por id/paciente/clínica y
confirma la RPC antes de generar ruta/subir. El INSERT único incluye la asociación;
no hay UPDATE posterior. FK/policy revalidan al persistir, incluso si desaparece
el destino después del preflight. La compensación existente sigue retirando la
ruta exacta ante rechazo SQL confirmado. La recuperación incierta compara las
referencias esperadas antes de aceptar éxito; no borra ni repite a ciegas.

Los formularios reutilizan `AsociacionArchivoSelector`: General es el default.
El perfil real activo determina qué destinos se ofrecen; portal solo ve General.
Para equipo, Consulta y Plan muestran opciones filtradas por paciente/clínica y
orden descendente. Consulta muestra fecha + procedimiento/motivo; plan título +
estado con fallback legible. No se muestran UUID ni se usan helpers que creen
planes. Error de lectura no se convierte en lista vacía; se puede volver a General.
No se habilita subir con un destino clínico todavía sin seleccionar.

Imágenes generales de paciente usan categoría `portal`; nunca referencia clínica.
PDF conserva flujo de perfiles del equipo (odontólogo clínico, recepcionista
administrativo) y admite superadmin clínico conforme al diseño aprobado. No se
implementa formulario/entrada de portal ni subida PDF de paciente en esta tarea.

`archivoAsociacionService.ts` y `useResumenesAsociaciones.ts` cargan resúmenes en
grupos por contexto/tipo. La galería muestra una línea breve de consulta o plan;
generales no añaden etiqueta. Si el destino no es visible o falla su lectura,
conserva el archivo y muestra `Asociación clínica no disponible`, sin UUID.
Los resúmenes no forman parte del payload ni de URLs/Blob. Los resultados de
contextos anteriores se descartan al cambiar lista o desmontar.

Verificación local: 133 tests aprobados, build correcto, lint sin errores y
15 warnings existentes fuera del módulo. Tests cubren general/ambos destinos,
UUID/exclusividad/contexto/visibilidad/portal, INSERT, compensación/recuperación,
opciones/etiquetas y resúmenes. Los fixtures anteriores se ampliaron con null
para mantener las pruebas de T-10.1–T-10.8. No se ha ejecutado ningún SQL.

El equipo confirmó migración y script de verificación aplicados antes de T-10.10.
El agente no ejecutó SQL. Validación manual confirmada por el equipo: comprobar RLS con todos los roles, seleccionar
evolución/plan y subir imagen/PDF, verificar referencias y resumen, generales
anteriores, destino oculto, cambios rápidos de paciente, carga fallida y bloqueo
de submit. Verificar carreras de eliminación/reasignación y rechazo desde un
cliente manipulado en pruebas, sin borrar datos de producción. El montaje de
archivos asociados en módulos 05/06 queda para integración posterior; la ficha ya
dispone de la pestaña Archivos de T-10.10.

## T-10.10 — Integración en ficha implementada y validada

Ruta existente: `/app/pacientes/:pacienteId?tab=archivos`. Pestaña después de
Evolución y antes de Pagos. Se mantienen redirecciones del router: paciente usa
portal y superadmin administración; no se amplían rutas ni navegación de roles.

`PatientFilesSection.tsx` recibe paciente, perfil del store y rol de Auth. El
servicio de contexto lee solo `id,clinica_id` del paciente bajo RLS. La subida
requiere UUIDs reales, perfil disponible, misma clínica y rol odontólogo o
recepcionista. No se usa nombre/slug de clínica como UUID ni se modifica el store.
La galería sigue disponible con sus propios estados aunque falte contexto de
escritura; un error local no reemplaza el resto de la ficha.

Encabezado con Subir imagen/Subir PDF, un solo `FileUploadDialog` Radix y los
formularios existentes. Hay título/descripcion, cierre etiquetado, focus trap y
retorno de foco. Se bloquean cierre y apertura de otro formulario durante una
escritura. Los flags de subida/requiereRevision viven en memoria por contexto y
actor: cerrar el diálogo o salir/volver a la pestaña no limpia silenciosamente
un intento incierto. No se guardan File, Blob, rutas, tokens o flags en storage
persistente; no es reconciliación durable ni persiste tras recarga del navegador.

Los hooks notifican estado mediante callback opcional; una escritura que sigue
tras desmontar comunica su finalización solo al registro de la ficha original.
Los servicios/compensación no se duplican. Los mensajes públicos de subida no
renderizan errores técnicos del servicio.

Tras `onUploadSuccess`, el coordinador verifica paciente/clínica/autor, cierra,
muestra confirmación y solicita una sola llamada a `reload()` mediante el handle
de PatientFilesGallery. Es idempotente por archivo y no recarga la página ni crea
otro hook de lectura. Un fallo de refresh no se anuncia como fallo de INSERT.

Se reutilizan galería, resúmenes, ImageViewer y la misma instancia de descarga.
PDF tiene únicamente Descargar; las imágenes también Ver imagen. No hay nueva
arquitectura de visor/Storage, asociaciones editables ni integración en 05/06.
Los tabs conservan scroll horizontal y el contenido tiene min-w-0. El diálogo
tiene altura acotada y scroll; acciones wrap para móvil y tokens existentes.

`patientFilesSection.ts` contiene capacidades/coordinación/flags comprobables;
su nombre difiere del componente TSX y se importan extensiones explícitas para
evitar resolución ambigua en Windows. No instalar framework React/DOM nuevo.
Verificación final: 144 tests aprobados (133 anteriores + 11 nuevos), build
correcto y lint sin errores, con 15 warnings existentes fuera del módulo.

Checklist manual final (validación confirmada por el equipo; las pruebas unitarias
no validan DOM/roles reales por sí solas):
- Abrir ficha desde navegación y directamente con `?tab=archivos`; recargar URL.
- Odontólogo/recepción: contexto, botones, JPG/PNG/WEBP/radiografía y PDF reales.
- Subir general/evolución/plan; confirmar cierre, limpieza y archivo nuevo sin
  recarga global; referencias y resumen correctos; archivo antiguo general.
- Error de opciones, vuelta a General, doble submit, cierre durante escritura,
  resultado incierto y alerta persistente al cerrar/reabrir o cambiar de pestaña.
- Cambiar paciente/actor durante lecturas/subida: ningún éxito/error en otra ficha.
- Visor: zoom 1x–4x, límites, reset, extremos con scroll, X/Escape/clic fuera/foco,
  firma renovada tras espera/suspensión, error/reintento; PDF nunca abre visor.
- Descargar imágenes/PDF desde tarjetas y visor; nombre original, bytes y apertura
  posterior; mantener zoom/scroll; doble clic, dos ids, error local y recuperación.
- RLS/Storage con sesiones reales; paciente/superadmin conservan redirecciones.
- Móvil/tablet/escritorio, tabs horizontales, teclado, labels, alert/status y foco.

Cierre: T-10.1 a T-10.10 implementadas y validadas según confirmación del equipo.
La cuota global de 5 GB por clínica sigue como REQUISITO FUNCIONAL separado
PENDIENTE para etapa posterior (no se sustituye por los 10 MiB por archivo).
Limpieza durable de huérfanos de Storage permanece como deuda técnica no bloqueante.
Commit/push/merge solo cuando
se soliciten; no se hicieron durante esta tarea.

## Decisiones de persistencia

**El bucket es privado y las URLs caducan.** `crearUrlArchivo` devuelve una URL
firmada de 5 minutos y rechaza respuestas sin URL válida. Nunca guardes la URL en la base: caduca, y un bucket
público filtraría radiografías con un enlace adivinable. Este proyecto maneja
información clínica de pacientes. Las URLs y vencimientos solo viven en memoria,
sin localStorage. El vencimiento conservador se calcula desde el inicio de la
petición con margen de 30 segundos. El hook renueva automáticamente y revisa
vencimientos al volver a una pestaña visible o enfocada; cancela temporizadores
al recargar, cambiar de paciente y desmontar. Una firma fallida se recupera
mediante recarga manual o reintento individual del visor, sin bucles automáticos
de reintento.

**El orden de las operaciones importa.** La subida real usa objeto → metadatos,
claves nuevas y `upsert: false`. Un rechazo SQL confirmado intenta compensar
la ruta exacta; una respuesta incierta requiere confirmación y no se borra a
ciegas. La galería no llama `eliminarArchivo`; la limpieza durable está fuera
de T-10.6. Las dos APIs no son una transacción distribuida.

**`rutaEnBucket` la compone el código**, no el usuario:
`{clinicaId}/{pacienteId}/{uuidObjeto}.{extension}` con UUIDs normalizados.
El nombre original solo es metadato de presentación, no parte de la clave.

## Permisos esperados

Según los contratos actuales del servicio y la RLS del módulo:

| Rol | Acceso |
|-----|--------|
| `odontologo` | Sube imágenes clínicas (`categoria: "clinico"`) |
| `recepcionista` | Sube adjuntos administrativos (`categoria: "administrativo"`) |
| `superadmin` | Alcance global explícito de lectura según RLS |
| `paciente` | Lee su ficha; escritura portal prevista por RLS, sin formulario aquí |

La categoría es ámbito/origen, no control de acceso para la galería. Odontólogo
y recepcionista comparten lectura de su clínica; paciente solo accede a su ficha.
Las autorizaciones reales dependen de RLS, sesión y pertenencia, no del frontend.
Los PDF nuevos derivan categoría del perfil Auth real: odontólogo → clínico,
recepcionista → administrativo. El flujo de subida portal no se implementa aquí.

## Errores de RLS que no son bugs

Una galería vacía o un upload que no devuelve fila suelen ser RLS, no la ausencia
de datos. Con RLS activo y sin policies aplicables, `SELECT` devuelve `[]` aunque
existan filas, y `INSERT` se rechaza. Un SELECT vacío no permite distinguir
ausencia de datos de ausencia de filas visibles; no inventar un diagnóstico
de permisos a partir de `[]`.

## Prohibido 3D

Nada de `three`, `@react-three/fiber` ni `dental-arch.glb`. La galería es una
rejilla de imágenes; el visor, un diálogo.

## Verificación

```sh
cd frontend
node --test src/features/archivos/*.test.ts
npm run build
npm run lint
```

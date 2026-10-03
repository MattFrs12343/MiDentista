# Módulo 10 — Archivos e Imágenes

**Dueña: Angélica.** Carpeta con escritura exclusiva: `frontend/src/features/archivos/`.

## Qué NO debes tocar

- `frontend/src/App.tsx` — aquí se registran las rutas
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/features/patients/PatientProfilePage.tsx` — aquí va la pestaña
- `frontend/src/features/patients/tabValue.ts`
- `frontend/src/types/index.ts` — tus tipos viven en `tipos.ts`
- `frontend/src/data/store.tsx` — tu servicio accede a Supabase por su cuenta
- `bd_5clinicas_midentista.sql` y `supabase/` — son de Matías
- `frontend/src/components/ui/*` e `index.css`

Al terminar, escribe en el PR: **"necesito el tab `archivos` en
`PatientProfilePage` y el valor `archivos` en `tabValue`"**.

## La tabla `archivos` está reactivada: escribe tu SQL aparte

`docs/DATABASE.md` listaba `archivos` como tabla **eliminada** del MVP, marcada
"Versión 2". Se ha reactivado para este sprint, así que tu DDL va en:

```
docs/modules/10-archivos/sql.sql
```

**No edites `bd_5clinicas_midentista.sql`.** Matías lo pega durante el merge.
Mientras tanto tu PR de UI y servicio puede avanzar; lo que queda bloqueado es
solo la persistencia.

El SQL ya incluye la tabla, los índices, el RLS siguiendo el patrón de
`docs/DATABASE.md` sección 18.3, y el bucket de Storage con sus políticas.

## Archivos que ya existen aquí

| Archivo | Qué aporta |
|---------|-----------|
| `tipos.ts` | `Archivo`, `CategoriaArchivo`, `esVisualizable` |
| `archivoMapper.ts` | Tipo de fila, `esUuid`, `archivoDesdeFila`, `rutaEnBucket` |
| `archivoService.ts` | `cargarArchivos`, `subirArchivo`, `crearUrlArchivo`, `eliminarArchivo` |

Por crear: `PatientGallery.tsx`, `FileUpload.tsx`, `ImageViewer.tsx`,
`useArchivosSupabase.ts` y sus tests.

## Decisiones que ya están tomadas

**El bucket es privado y las URLs caducan.** `crearUrlArchivo` devuelve una URL
firmada de 5 minutos. Nunca guardes la URL en la base: caduca, y un bucket
público filtraría radiografías con un enlace adivinable. Este proyecto maneja
información clínica de pacientes.

**El orden de las operaciones importa.** En `subirArchivo` se sube el objeto
primero y se inserta la fila después. Si la inserción falla, se borra el objeto,
para no dejar archivos huérfanos. En `eliminarArchivo` se borra la fila primero, por
el motivo contrario. Si cambias el orden, rompes una de las dos garantías.

**`rutaEnBucket` la compone el código**, no el usuario:
`{clinicaId}/{pacienteId}/{nombreOriginal}`. Como los ids son UUIDs, la ruta no
puede atravesar niveles del bucket ni colisionar entre pacientes.

## Permisos esperados

Según la matriz de `docs/SPEC.md` y el sentido del módulo:

| Rol | Acceso |
|-----|--------|
| `odontologo` | Sube imágenes clínicas (`categoria: "clinico"`) |
| `recepcionista` | Sube adjuntos administrativos (`categoria: "administrativo"`) |
| `odontologo_admin` | Gestiona todo, incluida la configuración del bucket |
| `paciente` | Sube y ve **los suyos** desde el portal (`categoria: "portal"`) |

La categoría decide quién ve qué. No la uses como decoración: es el control de
acceso.

## Errores de RLS que no son bugs

Una galería vacía o un upload que no devuelve fila suelen ser RLS, no la ausencia
de datos. Con RLS activo y sin policies aplicables, `SELECT` devuelve `[]` aunque
existan filas, y `INSERT` se rechaza. Distingue "no hay archivos" de "no hay
permiso".

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

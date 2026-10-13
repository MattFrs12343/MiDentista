# Módulo 12: Gestión de Clínica

## Descripción
Administración de las clínicas que usa el sistema multi-tenant: alta de
clínicas nuevas y vista agrupada de su personal, desde `/app/admin`.

> Esta versión reemplaza al README original del módulo: el diseño inicial
> hablaba de tablas `especialidades` y `consultorios` propias. Eso no se
> construyó — lo que sigue describe lo que **existe hoy**, verificado contra
> el código.

## Responsable
Matías (archivo de integración).

## Cómo funciona hoy

### 1. Alta de una clínica nueva
`POST /admin/crear-clinica` (requiere sesión de `superadmin`):

1. El superadmin completa: nombre (obligatorio), ciudad, teléfono, dirección,
   correo — todo lo demás es opcional, desde el diálogo "Crear clínica" en
   `/app/admin` (pestaña "Clínicas").
2. El backend deriva el `slug` del nombre ("Dental Dos Santos" →
   `dental-dos-santos`) si no se manda uno a mano, valida que no esté
   repetido (columna `unique`), y hace el `insert`.
3. **No se resuelve por una política de RLS directa desde el cliente**:
   `clinicas` sigue sin política de `insert` a propósito — agregar una abre
   la puerta a que cualquier cuenta autenticada cree clínicas si la política
   queda mal escrita. Pasar por el Edge Function, que valida
   `requerirSuperadmin` a mano, es más seguro.
4. Latitud/longitud no están en el formulario: hacen falta para que la
   clínica aparezca en el buscador por cercanía del portal del paciente
   (`/portal/buscar`), pero hoy se cargan después, directo en la base.

### 2. Vista por clínica, con su personal
`/app/admin` ya no es una lista plana de "Personal": es una pestaña
"Clínicas" con una tarjeta expandible por clínica (nombre, ciudad, cuánta
gente tiene, cuántas invitaciones pendientes) que al abrirse muestra su
roster completo y un botón "Invitar a {clínica}" — mismo diálogo de invitar,
con la clínica ya fija. Los superadmin (sin clínica propia) viven aparte, en
la pestaña "Administradores" — así ninguna de las dos listas se mezcla con
la otra en pantalla.

### 3. Tamaño de la base (monitoreo)
`GET /admin/tamano-bd` (requiere sesión de `superadmin`): llama al RPC
`security definer` `admin_tamano_base_datos()` (`bd_5clinicas_midentista.sql`,
sección 8) porque `pg_database_size`/`pg_total_relation_size` no están
expuestas por PostgREST. Devuelve el tamaño total de Postgres y las 8 tablas
más grandes, para el card "Base de datos" del panel — una lectura en vivo en
cada carga, no un valor guardado ni un histórico de crecimiento.

## Lo que sí existe

### Lectura de clínicas (pública, vía RLS)
`listarClinicas()` trae todas las clínicas activas, usado en:
- El selector de clínica del diálogo "Invitar personal" (`/app/admin`).
- El buscador de clínicas del portal del paciente (`/portal/buscar`), que
  además filtra por cercanía usando `latitud`/`longitud`.

### Campos reales de una clínica (`Clinica`, `frontend/src/data/api.ts`)
`id`, `nombre`, `slug`, `ciudad`, `pais`, `email`, `telefono`, `direccion`,
`latitud`, `longitud`, `activo` (este último no se expone en el tipo del
frontend pero sí se usa para filtrar en `listarClinicas`).

## Lo que falta (no implementado)
- **Editar una clínica ya creada** (ciudad, teléfono, coordenadas…): hoy solo
  hay alta, no edición desde la UI — hace falta un `update` directo en la base.
- **Cargar latitud/longitud desde el formulario de alta**: se puede, pero no
  se expuso en el diálogo; queda como carga manual en la base por ahora.
- **Histórico de crecimiento de la base**: el card de tamaño es una lectura
  en vivo, no guarda snapshots en el tiempo.

## Tablas relacionadas
- `clinicas` — única tabla de datos de este módulo. No hay `especialidades`
  ni `consultorios` como tablas propias: la "especialidad" vive como columna
  de texto libre en `perfiles.especialidad`, y no hay concepto de
  "consultorio" en el esquema actual.

## Dependencias
- Módulo 01 (Auth) completado.

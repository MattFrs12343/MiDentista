# Módulo 11: Usuarios y Roles

## Descripción
Alta de personal (odontólogos, recepcionistas, otros administradores) por
correo, asignación de rol y clínica en el momento de la invitación, y
restablecimiento de contraseña — todo operado por el **superadmin** desde
`/app/admin`.

> Esta versión reemplaza al README original del módulo: el diseño inicial
> hablaba de una tabla `roles_usuario` separada y de "gestionar permisos por
> módulo". Eso no se construyó así — lo que sigue describe lo que **existe
> hoy**, verificado contra el código (`frontend/src/features/admin/`,
> `supabase/functions/api/index.ts`), no un plan.

## Responsable
Matías (archivo de integración: `frontend/src/features/admin/AdminPage.tsx`
no tiene dueño de módulo asignado en `CONTRIBUTING.md`).

## Cómo funciona hoy

### 1. Invitar personal (alta de cuenta + rol + clínica, en un solo paso)
`POST /admin/invitar` (requiere sesión de `superadmin`, ver `requerirSuperadmin`
en el Edge Function):

1. El superadmin completa: correo, nombre completo, rol, clínica (si el rol no
   es `superadmin`) y especialidad (opcional, solo si el rol es `odontologo`).
2. El backend valida formato de correo, que el rol esté en la lista permitida,
   que haya clínica cuando corresponde, y que el correo no esté ya registrado.
3. Crea la fila en `perfiles` (`rol`, `clinica_id`, `especialidad`).
4. Llama a `admin.auth.admin.inviteUserByEmail` (Supabase Auth nativo) — esto
   crea el usuario de Auth y le manda un correo con un link a
   `/recuperar-contrasena`, donde la persona invitada elige su propia
   contraseña por primera vez. El superadmin **nunca ve ni define** esa
   contraseña.
5. Si el envío del correo falla, se revierte la fila de `perfiles` (no queda
   una cuenta fantasma sin invitación).

**Roles que se pueden invitar hoy:** `odontologo`, `recepcionista`,
`superadmin`. **`odontologo_admin` existe como rol en el tipo del sistema y
tiene etiqueta (`ROLE_LABEL`), pero no está en la lista de roles invitables —
ni en el frontend ni en el backend.** Si hace falta ese rol, hay que agregarlo
a `ROLES_INVITABLES` (frontend) y a la validación de `handleAdminInvitar`
(backend); es un cambio chico pero deliberadamente no se hizo solo —
avisar antes.

### 2. Estado de una cuenta invitada
`GET /admin/listar` trae todo el personal (todo rol salvo `paciente`) con tres
estados posibles, calculados contra Supabase Auth (`email_confirmed_at`):
- **Invitación pendiente** — el correo se mandó, la persona todavía no entró
  a poner su contraseña.
- **Activo** — ya aceptó la invitación y tiene cuenta utilizable.
- **Inactivo** — cuenta dada de baja (ver "Eliminar" abajo).

### 3. Acciones sobre una invitación pendiente
- **Reenviar** (`POST /admin/reenviar-invitacion`): solo si todavía no fue
  aceptada. Borra el usuario de Auth viejo y manda una invitación nueva.
- **Cancelar** (`POST /admin/cancelar-invitacion`): solo si todavía no fue
  aceptada. Borra la fila de `perfiles` y el usuario de Auth — no queda rastro.

### 4. Acciones sobre una cuenta activa
- **Restablecer contraseña** (`POST /admin/restablecer-contrasena`): dispara
  el mismo correo de "recuperar contraseña" que usa el login
  (`/auth/v1/recover` de Supabase), redirigiendo a `/recuperar-contrasena`.
  Mismo principio que la invitación: el superadmin pide el restablecimiento,
  la persona elige su propia contraseña nueva. También limpia
  `intentos_fallidos`/`bloqueado_hasta`, por si la cuenta estaba bloqueada por
  intentos fallidos de login.
- **Eliminar** (`POST /admin/eliminar`): baja lógica (`perfiles.activo = false`),
  no borra la fila. Un superadmin no puede eliminarse a sí mismo (chequeo
  explícito en el backend, para que nadie se quede afuera del panel por error).

### Lo que falta (no implementado)
- **Cambiar el rol o la clínica de una cuenta ya creada.** Hoy el rol y la
  clínica se fijan una sola vez, en la invitación. Si alguien cambia de
  puesto o de clínica, la única vía es eliminar la cuenta vieja e invitar de
  nuevo — pierde el historial de qué perfil hizo qué (los registros clínicos
  quedan igual, referencian el `perfil_id`, pero no hay UI para reasignar).
- **Invitar como `odontologo_admin`** (ver punto 1).
- **Permisos por módulo** finos (lo que proponía el README original): hoy el
  control de acceso es por rol completo (un odontólogo ve todo lo clínico, un
  recepcionista lo suyo, etc. — ver políticas RLS en
  `bd_5clinicas_midentista.sql`), no hay una matriz de permisos configurable.

## Roles del sistema (reales, de `types/index.ts`)
- `superadmin` — sin clínica propia, solo audita/administra el sistema.
- `odontologo` — atención clínica de su clínica.
- `odontologo_admin` — mismo alcance que `odontologo` más algo de
  administración (rol existente en el esquema, sin invitación habilitada hoy).
- `recepcionista` — apoyo operativo de su clínica.
- `paciente` — cuenta del portal, se crea por Google Sign-In
  (`paciente/registrar`), nunca por invitación del superadmin.

## Tablas y funciones reales involucradas
- `perfiles` — una fila por cuenta (`rol`, `clinica_id`, `especialidad`,
  `activo`, `auth_user_id`).
- `auth.users` (Supabase Auth) — la cuenta de login real; `perfiles.auth_user_id`
  la referencia.
- Edge Function `supabase/functions/api/index.ts` — toda la lógica de
  `/admin/*` corre acá (no por RLS directo), porque necesita
  `auth.admin.*` con la `service_role` key.

## Dependencias
- Módulo 01 (Auth) completado.
- Una sesión de `superadmin` activa (`requerirSuperadmin` en el Edge
  Function) para cualquier ruta `/admin/*`.

# Historias de Usuario - Usuarios y Roles

| ID | Historia | Prioridad | Estimación |
|----|----------|-----------|------------|
| US-11.1 | Crear usuario recepcionista/odontólogo | P0 | M |
| US-11.2 | Editar usuario | P1 | M |
| US-11.3 | Desactivar usuario | P1 | M |
| US-11.4 | Asignar roles | P0 | M |
| US-11.5 | Cambiar contraseña | P1 | S |
| US-11.6 | Gestionar perfil propio | P1 | M |

---

## US-11.1: Crear usuario recepcionista/odontólogo
**Como** super-admin, **quiero** crear cuentas para recepcionistas y odontólogos, **para** que tengan acceso al sistema.

- **Prioridad:** P0
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que el super-admin está en gestión de usuarios
  - When ingresa email, nombre y rol
  - Then se envía invitación
  - And el usuario se crea al aceptar

---

## US-11.2: Editar usuario
**Como** super-admin, **quiero** editar información de usuarios, **para** mantener datos actualizados.

- **Prioridad:** P1
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que existe un usuario
  - When se modifican sus datos
  - Then se actualiza la información

---

## US-11.3: Desactivar usuario
**Como** super-admin, **quiero** desactivar un usuario, **para** revocar acceso sin eliminar datos.

- **Prioridad:** P1
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que hay un usuario activo
  - When se desactiva
  - Then no puede iniciar sesión
  - And sus datos se preservan

---

## US-11.4: Asignar roles
**Como** super-admin, **quiero** asignar roles a los usuarios, **para** controlar permisos.

- **Prioridad:** P0
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que se crea un usuario
  - When se le asigna un rol
  - Then tiene los permisos de ese rol

---

## US-11.5: Cambiar contraseña
**Como** usuario, **quiero** cambiar mi contraseña, **para** mantener mi cuenta segura.

- **Prioridad:** P1
- **Estimación:** S
- **Criterios de aceptación:**
  - Given que el usuario está en su perfil
  - When ingresa contraseña actual y nueva
  - Then se actualiza la contraseña

---

## US-11.6: Gestionar perfil propio
**Como** usuario, **quiero** ver y editar mi perfil, **para** mantener mi información personal.

- **Prioridad:** P1
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que el usuario está autenticado
  - When accede a su perfil
  - Then puede ver y editar nombre, teléfono, avatar

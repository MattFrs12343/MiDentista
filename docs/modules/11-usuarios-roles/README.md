# Módulo 11: Usuarios y Roles

## Descripción
Módulo para gestionar las cuentas de acceso y los permisos del sistema.

## Responsable
Dev 5

## Funcionalidades
- Crear usuarios (solo super_admin)
- Editar usuarios (solo super_admin)
- Desactivar usuarios (solo super_admin)
- Asignar roles
- Gestionar permisos por módulo
- Consultar lista de usuarios
- Gestionar perfil propio
- Cambiar contraseña

## Roles del sistema
- **SUPER_ADMIN:** Creadores del software (dan de alta clínicas, usuarios)
- **RECEPCIONISTA:** Apoyo al doctor
- **ODONTÓLOGO:** Profesional odontológico
- **PACIENTE:** Paciente de la clínica

## Tablas relacionadas
- `perfiles` - Datos del usuario
- `roles_usuario` - Roles asignados por clínica

## Dependencias
- Módulo 01 (Auth) completado
- Tablas `perfiles` y `roles_usuario` creadas

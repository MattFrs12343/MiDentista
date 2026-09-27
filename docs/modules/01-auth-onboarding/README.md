# Módulo 01: Autenticación y Onboarding

## Descripción
Módulo encargado de la autenticación de usuarios, registro de pacientes, alta de clínica y equipo, y afiliación de pacientes.

## Responsable
Dev 1

## Funcionalidades
- Login con email + contraseña
- Registro de pacientes (formulario público)
- Recuperación de contraseña
- Alta de clínica y equipo por el odontólogo (MVP) *(la invitación por super-admin es versión 2)*
- Búsqueda de clínicas afiliadas al sistema (por nombre)
- Afiliación del paciente a una clínica
- JWT con `clinica_id` y `rol`
- Gestión de sesiones

## Flujo de afiliación
Al ingresar, los pacientes sin clínica asignada acceden a una pestaña de búsqueda de clínicas afiliadas al sistema y pueden buscar por nombre o por cercanía (radio de 5 km, mediante geolocalización). Al seleccionar una clínica, el paciente se afilia y continúa con el flujo estándar del sistema.

## Tablas relacionadas
- `perfiles` - Datos del usuario autenticado
- `clinicas` - Tenant al que pertenece

## Dependencias
- Supabase Auth configurado
- Tabla `clinicas` creada
- Tabla `perfiles` con trigger de sync

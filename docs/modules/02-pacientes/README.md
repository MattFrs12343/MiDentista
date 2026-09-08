# Módulo 02: Gestión de Pacientes

## Descripción
Módulo para registrar, consultar y administrar la información básica de los pacientes de la clínica.

## Responsable
Dev 2

## Funcionalidades
- Registrar paciente nuevo
- Editar información del paciente
- Buscar pacientes (nombre, CI, teléfono, email)
- Consultar ficha del paciente con tabs por módulo
- Registrar contacto de emergencia
- Listar pacientes con paginación
- Ver historial de atenciones del paciente

## Tablas relacionadas
- `pacientes` - Datos principales del paciente
- `perfiles` - Cuenta de autenticación del paciente

## Dependencias
- Módulo 01 (Auth) completado
- Tabla `pacientes` creada con RLS

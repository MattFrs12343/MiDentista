# Módulo 05: Diagnóstico y Plan de Tratamiento

## Descripción
Módulo para registrar diagnósticos y definir planes de tratamiento con procedimientos.

## Responsable
Dev 5

## Funcionalidades
**Diagnóstico:**
- Crear diagnóstico asociado a paciente y pieza
- Registrar descripción y observaciones
- Consultar diagnósticos anteriores
- Modificar diagnóstico
- Cambiar estado (activo/inactivo/resuelto)

**Plan de Tratamiento:**
- Crear plan de tratamiento
- Agregar procedimientos con pieza asociada
- Establecer prioridad y costos
- Estados: PROPUESTO → ACEPTADO → EN PROCESO → COMPLETADO
- Consultar tratamientos por estado
- Modificar el plan

## Tablas relacionadas
- `diagnosticos` - Diagnósticos del paciente
- `planes_tratamiento` - Planes de tratamiento
- `procedimientos_tratamiento` - Procedimientos del plan

## Dependencias
- Módulo 02 (Pacientes) completado
- Tablas de diagnóstico y tratamiento creadas

# Módulo 08: Presupuestos

## Descripción
Módulo para generar presupuestos relacionados con los tratamientos del paciente.

## Responsable
Dev 2

## Funcionalidades
- Crear presupuesto con procedimientos y costos
- Aplicar descuentos
- Calcular total automáticamente
- Consultar y modificar presupuesto
- Cambiar estado (borrador → enviado → aceptado/rechazado/vencido)
- Exportar a PDF *(VERSIÓN 2 - fuera del MVP)*

## Tablas relacionadas
- `presupuestos` - Encabezado del presupuesto
- `items_presupuesto` - Procedimientos del presupuesto
- `servicios` - Catálogo de servicios con precio por defecto

## Dependencias
- Módulo 02 (Pacientes) completado
- Catálogo de servicios (`servicios`) poblado
- Tablas de presupuestos creadas

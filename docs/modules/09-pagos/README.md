# Módulo 09: Pagos y Cuentas

## Descripción
Módulo para gestionar los pagos realizados por los pacientes.

## Responsable
Dev 3

## Funcionalidades
- Referencia QR estática del doctor *(subir QR dinámico por cobro es versión 2)*
- Registrar pagos (parciales o totales)
- Consultar historial de pagos
- Consultar estado de cuenta (total, pagado, pendiente)
- Método de pago: efectivo, QR, transferencia, otro

## Tablas relacionadas
- `pagos` - Pagos registrados

## Dependencias
- Módulo 02 (Pacientes) completado
- Módulo 08 (Presupuestos) para asociar pagos a presupuestos
- Tablas de pagos creadas

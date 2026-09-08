# Historias de Usuario - Pagos y Cuentas

| ID | Historia | Prioridad | Estimación |
|----|----------|-----------|------------|
| US-9.1 | Subir QR de pago *(VERSIÓN 2 - fuera del MVP)* | P0 | M |
| US-9.2 | Generar QR por cobro *(VERSIÓN 2 - fuera del MVP)* | P0 | M |
| US-9.3 | Registrar pago | P0 | M |
| US-9.4 | Registrar pago parcial | P0 | M |
| US-9.5 | Ver historial de pagos | P1 | M |
| US-9.6 | Ver estado de cuenta | P0 | M |

---

## US-9.1: Subir QR de pago  *(VERSIÓN 2 - fuera del MVP; en el MVP el QR es una imagen fija de referencia)*
**Como** odontólogo, **quiero** subir mi QR de pago con fecha límite anual, **para** que los pacientes puedan pagarme.

- **Prioridad:** P0
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que el odontólogo está en su configuración de pagos
  - When sube la imagen de su QR y establece fecha límite
  - Then el QR se guarda y queda activo

---

## US-9.2: Generar QR por cobro  *(VERSIÓN 2 - fuera del MVP)*
**Como** odontólogo, **quiero** generar/mostrar mi QR al paciente para un cobro específico, **para** facilitar el pago.

- **Prioridad:** P0
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que hay un saldo pendiente
  - When el odontólogo selecciona "Cobrar"
  - Then se muestra su QR activo
  - And el paciente puede escanearlo

---

## US-9.3: Registrar pago
**Como** recepcionista u odontólogo, **quiero** registrar un pago recibido, **para** actualizar el saldo del paciente.

- **Prioridad:** P0
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que el paciente realizó un pago
  - When se registra el monto y método de pago
  - Then el saldo pendiente se actualiza
  - And el pago aparece en el historial

---

## US-9.4: Registrar pago parcial
**Como** recepcionista u odontólogo, **quiero** registrar un pago parcial, **para** cuando el paciente no paga todo de una.

- **Prioridad:** P0
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que el paciente debe Bs 1300
  - When se registra un pago de Bs 800
  - Then el saldo pendiente queda en Bs 500
  - And el historial muestra el pago parcial

---

## US-9.5: Ver historial de pagos
**Como** recepcionista, odontólogo o paciente, **quiero** ver el historial de pagos, **para** tener un registro.

- **Prioridad:** P1
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que hay pagos registrados
  - When se accede al historial
  - Then se muestran todos los pagos con fecha, monto y método

---

## US-9.6: Ver estado de cuenta
**Como** recepcionista u odontólogo, **quiero** ver el estado de cuenta del paciente (total, pagado, pendiente), **para** saber cuánto debe.

- **Prioridad:** P0
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que el paciente tiene tratamientos y pagos
  - When se accede a su estado de cuenta
  - Then se muestra: Total tratamiento, Total pagado, Saldo pendiente

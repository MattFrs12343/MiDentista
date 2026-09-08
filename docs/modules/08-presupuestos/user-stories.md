# Historias de Usuario - Presupuestos

| ID | Historia | Prioridad | Estimación |
|----|----------|-----------|------------|
| US-8.1 | Crear presupuesto | P0 | L |
| US-8.2 | Aplicar descuento | P2 | M |
| US-8.3 | Exportar presupuesto a PDF *(VERSIÓN 2 - fuera del MVP)* | P1 | L |
| US-8.4 | Modificar presupuesto | P1 | M |

---

## US-8.1: Crear presupuesto
**Como** recepcionista u odontólogo, **quiero** crear un presupuesto para un paciente con procedimientos y costos, **para** presentarle un estimado.

- **Prioridad:** P0
- **Estimación:** L
- **Criterios de aceptación:**
  - Given que el usuario está en la sección de presupuestos
  - When selecciona paciente y agrega procedimientos con precios
  - Then se calcula el total automáticamente
  - And el presupuesto se guarda en estado "borrador"

---

## US-8.2: Aplicar descuento
**Como** recepcionista u odontólogo, **quiero** aplicar un descuento al presupuesto, **para** ofrecer precios especiales.

- **Prioridad:** P2
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que existe un presupuesto
  - When se ingresa un monto o porcentaje de descuento
  - Then el total se recalcula
  - And el descuento se muestra claramente

---

## US-8.3: Exportar presupuesto a PDF  *(VERSIÓN 2 - fuera del MVP)*
**Como** recepcionista u odontólogo, **quiero** exportar el presupuesto como PDF, **para** entregarlo al paciente.

- **Prioridad:** P1
- **Estimación:** L
- **Criterios de aceptación:**
  - Given que existe un presupuesto completo
  - When se hace clic en "Exportar PDF"
  - Then se genera un PDF con logo de la clínica, datos del paciente y procedimientos
  - And se puede descargar

---

## US-8.4: Modificar presupuesto
**Como** recepcionista u odontólogo, **quiero** modificar un presupuesto existente, **para** ajustar costos o procedimientos.

- **Prioridad:** P1
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que existe un presupuesto en borrador o enviado
  - When se modifican procedimientos o precios
  - Then el total se recalcula
  - And se guarda

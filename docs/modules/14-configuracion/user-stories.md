# Historias de Usuario - Configuración de Clínica

| ID | Historia | Prioridad | Estimación |
|----|----------|-----------|------------|
| US-14.1 | Configurar moneda | P0 | S |
| US-14.2 | Configurar servicios y precios | P0 | M |
| US-14.3 | Configurar horarios | P1 | M |
| US-14.4 | Configurar métodos de pago | P2 | S |
| US-14.5 | Configurar estados de tratamiento | P2 | M |

---

## US-14.1: Configurar moneda
**Como** super-admin, **quiero** configurar la moneda de la clínica, **para** que los precios sean correctos.

- **Prioridad:** P0
- **Estimación:** S
- **Criterios de aceptación:**
  - Given que el super-admin está en configuración
  - When selecciona la moneda
  - Then todos los precios se muestran en esa moneda

---

## US-14.2: Configurar servicios y precios
**Como** super-admin, **quiero** configurar los servicios con sus precios específicos, **para** personalizar la clínica.

- **Prioridad:** P0
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que el super-admin está en configuración de servicios
  - When modifica precios
  - Then se actualizan para toda la clínica

---

## US-14.3: Configurar horarios
**Como** super-admin, **quiero** configurar los horarios generales de la clínica, **para** definir horario de atención.

- **Prioridad:** P1
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que el super-admin está en configuración
  - When establece horarios de apertura/cierre
  - Then se refleja en la agenda

---

## US-14.4: Configurar métodos de pago
**Como** super-admin, **quiero** configurar los métodos de pago aceptados, **para** personalizar las opciones.

- **Prioridad:** P2
- **Estimación:** S
- **Criterios de aceptación:**
  - Given que el super-admin está en configuración
  - When selecciona métodos de pago
  - Then aparecen como opciones al registrar pagos

---

## US-14.5: Configurar estados de tratamiento
**Como** super-admin, **quiero** configurar los estados personalizados de tratamiento, **para** adaptar el flujo.

- **Prioridad:** P2
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que el super-admin necesita estados personalizados
  - When los configura
  - Then se reflejan en todo el sistema

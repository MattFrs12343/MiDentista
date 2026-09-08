# Historias de Usuario - Diagnóstico y Plan de Tratamiento

| ID | Historia | Prioridad | Estimación |
|----|----------|-----------|------------|
| US-5.1 | Crear diagnóstico | P0 | M |
| US-5.2 | Modificar diagnóstico | P1 | M |
| US-5.3 | Cambiar estado del diagnóstico | P1 | S |
| US-5.4 | Crear plan de tratamiento | P0 | L |
| US-5.5 | Agregar procedimiento al plan | P0 | M |
| US-5.6 | Cambiar estado del plan | P0 | M |
| US-5.7 | Consultar tratamientos por estado | P1 | M |

---

## US-5.1: Crear diagnóstico
**Como** odontólogo, **quiero** crear un diagnóstico para un paciente, **para** documentar sus condiciones.

- **Prioridad:** P0
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que el odontólogo está en la ficha del paciente
  - When crea un diagnóstico con descripción, pieza asociada y observaciones
  - Then se guarda el diagnóstico
  - And se asocia al paciente

---

## US-5.2: Modificar diagnóstico
**Como** odontólogo, **quiero** modificar un diagnóstico existente, **para** corregir o actualizar información.

- **Prioridad:** P1
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que existe un diagnóstico
  - When el odontólogo lo modifica
  - Then se actualiza
  - And se registra la fecha de modificación

---

## US-5.3: Cambiar estado del diagnóstico
**Como** odontólogo, **quiero** cambiar el estado de un diagnóstico (activo/inactivo/resuelto), **para** reflejar su evolución.

- **Prioridad:** P1
- **Estimación:** S
- **Criterios de aceptación:**
  - Given que existe un diagnóstico activo
  - When el odontólogo cambia su estado
  - Then se actualiza el estado
  - And se refleja en la lista

---

## US-5.4: Crear plan de tratamiento
**Como** odontólogo, **quiero** crear un plan de tratamiento con procedimientos, **para** definir el curso de acción.

- **Prioridad:** P0
- **Estimación:** L
- **Criterios de aceptación:**
  - Given que el odontólogo tiene diagnósticos para el paciente
  - When crea un plan de tratamiento con título
  - Then puede agregar procedimientos con pieza, descripción, prioridad y costo
  - And el plan inicia en estado "propuesto"

---

## US-5.5: Agregar procedimiento al plan
**Como** odontólogo, **quiero** agregar múltiples procedimientos al plan, **para** cubrir todas las necesidades.

- **Prioridad:** P0
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que existe un plan de tratamiento
  - When agrega un procedimiento
  - Then se asocia al plan con su costo
  - And se recalcula el total

---

## US-5.6: Cambiar estado del plan
**Como** odontólogo, **quiero** cambiar el estado del plan (propuesto → aceptado → en proceso → completado), **para** hacer seguimiento.

- **Prioridad:** P0
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que existe un plan en estado "propuesto"
  - When cambia a "aceptado"
  - Then el estado se actualiza
  - And el plan aparece en tratamientos aceptados

---

## US-5.7: Consultar tratamientos por estado
**Como** odontólogo, **quiero** filtrar tratamientos por estado, **para** ver cuáles están pendientes o en proceso.

- **Prioridad:** P1
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que hay tratamientos en diferentes estados
  - When selecciona un filtro de estado
  - Then se muestran solo los tratamientos de ese estado

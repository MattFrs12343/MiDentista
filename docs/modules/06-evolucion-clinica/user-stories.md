# Historias de Usuario - Evolución Clínica

| ID | Historia | Prioridad | Estimación |
|----|----------|-----------|------------|
| US-6.1 | Registrar evolución clínica | P0 | L |
| US-6.2 | Consultar evolución cronológica | P1 | M |
| US-6.3 | Registrar próxima atención | P2 | S |
| US-6.4 | Asociar evolución a plan de tratamiento | P1 | M |

---

## US-6.1: Registrar evolución clínica
**Como** odontólogo, **quiero** registrar la evolución de cada consulta, **para** documentar los procedimientos realizados.

- **Prioridad:** P0
- **Estimación:** L
- **Criterios de aceptación:**
  - Given que el odontólogo atendió al paciente
  - When registra fecha, motivo, procedimiento, pieza, diagnóstico, observaciones e indicaciones
  - Then se guarda la evolución
  - And se asocia al paciente y plan de tratamiento

---

## US-6.2: Consultar evolución cronológica
**Como** odontólogo, **quiero** ver la evolución del paciente en orden cronológico, **para** entender su progreso.

- **Prioridad:** P1
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que el paciente tiene evoluciones registradas
  - When accede a la evolución clínica
  - Then ve las atenciones ordenadas por fecha (más reciente primero)

---

## US-6.3: Registrar próxima atención
**Como** odontólogo, **quiero** indicar la próxima fecha de atención, **para** planificar el seguimiento.

- **Prioridad:** P2
- **Estimación:** S
- **Criterios de aceptación:**
  - Given que el odontólogo está registrando una evolución
  - When indica la próxima fecha
  - Then se guarda junto con la evolución
  - And aparece como recordatorio

---

## US-6.4: Asociar evolución a plan de tratamiento
**Como** odontólogo, **quiero** vincular la evolución con un plan de tratamiento específico, **para** hacer seguimiento del progreso.

- **Prioridad:** P1
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que existe un plan de tratamiento activo
  - When el odontólogo registra una evolución
  - Then puede asociarla al plan
  - And el progreso del plan se actualiza

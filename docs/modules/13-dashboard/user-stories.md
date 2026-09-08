# Historias de Usuario - Dashboard

| ID | Historia | Prioridad | Estimación |
|----|----------|-----------|------------|
| US-13.1 | Dashboard del super-admin | P1 | L |
| US-13.2 | Dashboard del recepcionista | P1 | L |
| US-13.3 | Dashboard del odontólogo | P1 | L |
| US-13.4 | Dashboard del paciente | P1 | M |

---

## US-13.1: Dashboard del super-admin
**Como** super-admin, **quiero** ver un resumen de todas las clínicas del sistema, **para** tener visibilidad general.

- **Prioridad:** P1
- **Estimación:** L
- **Criterios de aceptación:**
  - Given que el super-admin inicia sesión
  - When accede al dashboard
  - Then ve: cantidad de clínicas, usuarios activos, actividad general

---

## US-13.2: Dashboard del recepcionista
**Como** recepcionista, **quiero** ver las citas del día y pagos pendientes, **para** apoyar la operación diaria.

- **Prioridad:** P1
- **Estimación:** L
- **Criterios de aceptación:**
  - Given que el recepcionista inicia sesión
  - When accede al dashboard
  - Then ve: citas del día, pacientes del día, pagos pendientes

---

## US-13.3: Dashboard del odontólogo
**Como** odontólogo, **quiero** ver mi agenda del día y actividad clínica, **para** organizar mi jornada.

- **Prioridad:** P1
- **Estimación:** L
- **Criterios de aceptación:**
  - Given que el odontólogo inicia sesión
  - When accede al dashboard
  - Then ve: citas del día, pacientes atendidos, tratamientos activos/pendientes, próxima actividad

---

## US-13.4: Dashboard del paciente
**Como** paciente, **quiero** ver mi información resumida, **para** tener visibilidad de mi tratamiento.

- **Prioridad:** P1
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que el paciente inicia sesión
  - When accede al dashboard
  - Then ve: próxima cita, tratamiento actual, pagos pendientes, documentos disponibles

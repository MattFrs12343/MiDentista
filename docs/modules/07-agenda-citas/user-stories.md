# Historias de Usuario - Agenda y Citas

| ID | Historia | Prioridad | Estimación |
|----|----------|-----------|------------|
| US-7.1 | Cargar disponibilidad horaria | P0 | L |
| US-7.2 | Agendar cita | P0 | L |
| US-7.3 | Visualizar calendario | P0 | XL |
| US-7.4 | Reprogramar cita | P1 | M |
| US-7.5 | Cancelar cita | P1 | M |
| US-7.6 | Registrar horas no disponibles *(VERSIÓN 2 - fuera del MVP)* | P2 | M |
| US-7.7 | Cambiar estado de cita | P1 | M |

---

## US-7.1: Cargar disponibilidad horaria
**Como** odontólogo, **quiero** configurar mi disponibilidad semanal, **para** que los pacientes puedan agendar citas.

- **Prioridad:** P0
- **Estimación:** L
- **Criterios de aceptación:**
  - Given que el odontólogo está en su configuración de agenda
  - When selecciona días y horarios disponibles
  - Then se guarda su disponibilidad
  - And los pacientes pueden ver esos horarios

---

## US-7.2: Agendar cita
**Como** paciente, **quiero** agendar una cita eligiendo fecha y hora disponible, **para** reservar mi consulta.

- **Prioridad:** P0
- **Estimación:** L
- **Criterios de aceptación:**
  - Given que el paciente está en la agenda
  - When selecciona un horario disponible
  - Then la cita se crea en estado "reservada"
  - And recibe confirmación

---

## US-7.3: Visualizar calendario
**Como** recepcionista u odontólogo, **quiero** ver un calendario con las citas, **para** visualizar la agenda del día/semana.

- **Prioridad:** P0
- **Estimación:** XL
- **Criterios de aceptación:**
  - Given que hay citas registradas
  - When accede al calendario
  - Then ve vista diaria/semanal/mensual
  - And las citas aparecen con color según estado

---

## US-7.4: Reprogramar cita
**Como** recepcionista u odontólogo, **quiero** reprogramar una cita a otra fecha/hora, **para** gestionar cambios.

- **Prioridad:** P1
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que existe una cita programada
  - When se selecciona nueva fecha/hora
  - Then la cita se actualiza
  - And se notifica el cambio

---

## US-7.5: Cancelar cita
**Como** recepcionista, odontólogo o paciente, **quiero** cancelar una cita, **para** liberar el espacio.

- **Prioridad:** P1
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que existe una cita activa
  - When se cancela
  - Then el estado cambia a "cancelada"
  - And el horario se libera

---

## US-7.6: Registrar horas no disponibles  *(VERSIÓN 2 - fuera del MVP)*
**Como** odontólogo, **quiero** registrar días u horas que no estaré disponible, **para** excluirlos de la agenda.

- **Prioridad:** P2
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que el odontólogo no estará disponible un día
  - When registra la excepción
  - Then ese día/hora no aparece como disponible

---

## US-7.7: Cambiar estado de cita
**Como** recepcionista u odontólogo, **quiero** cambiar el estado de una cita (reservada → confirmada → en espera → atendida), **para** hacer seguimiento.

- **Prioridad:** P1
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que existe una cita
  - When se cambia su estado
  - Then se actualiza visualmente en el calendario

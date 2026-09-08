# Historias de Usuario - Historia Clínica

| ID | Historia | Prioridad | Estimación |
|----|----------|-----------|------------|
| US-3.1 | Registrar historia clínica | P0 | L |
| US-3.2 | Consultar historia clínica | P0 | M |
| US-3.3 | Actualizar historia clínica | P1 | M |
| US-3.4 | Ver historial de cambios *(VERSIÓN 2 - fuera del MVP: trazabilidad/audit)* | P2 | M |

---

## US-3.1: Registrar historia clínica
**Como** odontólogo, **quiero** registrar la historia clínica completa del paciente, **para** documentar su estado de salud.

- **Prioridad:** P0
- **Estimación:** L
- **Criterios de aceptación:**
  - Given que el odontólogo está en la ficha del paciente
  - When completa motivo de consulta, antecedentes médicos, odontológicos, alergias, medicamentos, enfermedades, hábitos
  - Then se guarda la historia clínica
  - And se asocia al paciente

---

## US-3.2: Consultar historia clínica
**Como** odontólogo, **quiero** consultar la historia clínica existente, **para** revisar la información antes de una atención.

- **Prioridad:** P0
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que el odontólogo está en la ficha del paciente
  - When accede a la historia clínica
  - Then ve toda la información registrada
  - And puede editarla si es necesario

---

## US-3.3: Actualizar historia clínica
**Como** odontólogo, **quiero** actualizar la historia clínica cuando hay cambios, **para** mantener la información vigente.

- **Prioridad:** P1
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que el odontólogo necesita modificar la historia
  - When edita los campos correspondientes
  - Then se actualiza la información
  - And se preserva el historial de cambios

---

## US-3.4: Ver historial de cambios de la historia  *(VERSIÓN 2 - fuera del MVP)*
**Como** odontólogo, **quiero** ver cuándo y qué se modificó en la historia clínica, **para** tener trazabilidad.

- **Prioridad:** P2
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que la historia clínica ha sido modificada
  - When el odontólogo accede al historial de cambios
  - Then ve fecha, usuario y campos modificados

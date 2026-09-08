# Historias de Usuario - Gestión de Pacientes

| ID | Historia | Prioridad | Estimación |
|----|----------|-----------|------------|
| US-2.1 | Registrar paciente nuevo | P0 | L |
| US-2.2 | Editar información del paciente | P1 | M |
| US-2.3 | Buscar pacientes | P0 | M |
| US-2.4 | Consultar ficha del paciente | P0 | L |
| US-2.5 | Registrar contacto de emergencia | P2 | S |
| US-2.6 | Listar pacientes con paginación | P1 | M |
| US-2.7 | Ver historial de atenciones del paciente | P1 | M |

---

## US-2.1: Registrar paciente nuevo
**Como** recepcionista u odontólogo, **quiero** registrar un paciente nuevo con sus datos, **para** tener su información en el sistema.

- **Prioridad:** P0
- **Estimación:** L
- **Criterios de aceptación:**
  - Given que el usuario está en la sección de pacientes
  - When completa el formulario con nombre, CI, fecha de nacimiento, género, teléfono, email
  - Then se crea el paciente asociado a la clínica
  - And se muestra en la lista de pacientes

---

## US-2.2: Editar información del paciente
**Como** recepcionista u odontólogo, **quiero** editar los datos de un paciente, **para** mantener la información actualizada.

- **Prioridad:** P1
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que el usuario está en la ficha del paciente
  - When modifica los campos y guarda
  - Then se actualiza la información
  - And se registra la fecha de modificación

---

## US-2.3: Buscar pacientes
**Como** recepcionista u odontólogo, **quiero** buscar pacientes por nombre, CI, teléfono o email, **para** encontrar rápidamente un registro.

- **Prioridad:** P0
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que el usuario está en la lista de pacientes
  - When escribe en el campo de búsqueda
  - Then se filtran los resultados en tiempo real
  - And la búsqueda es case-insensitive

---

## US-2.4: Consultar ficha del paciente
**Como** recepcionista u odontólogo, **quiero** ver la ficha completa del paciente con todos sus módulos, **para** tener una vista integral.

- **Prioridad:** P0
- **Estimación:** L
- **Criterios de aceptación:**
  - Given que el usuario selecciona un paciente
  - When accede a su ficha
  - Then ve pestañas: Historia, Odontograma, Diagnóstico, Tratamiento, Evolución, Pagos
  - And puede navegar entre módulos sin perder el contexto del paciente
  - *(Las pestañas Archivos y Consentimientos quedan para la versión 2)*

---

## US-2.5: Registrar contacto de emergencia
**Como** recepcionista u odontólogo, **quiero** registrar el contacto de emergencia del paciente, **para** tener información de emergencia.

- **Prioridad:** P2
- **Estimación:** S
- **Criterios de aceptación:**
  - Given que el usuario está en la ficha del paciente
  - When ingresa nombre, teléfono y relación del contacto de emergencia
  - Then se guarda la información

---

## US-2.6: Listar pacientes con paginación
**Como** recepcionista u odontólogo, **quiero** ver la lista de pacientes paginada, **para** navegar grandes volúmenes de datos.

- **Prioridad:** P1
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que la clínica tiene más de 20 pacientes
  - When accede a la lista de pacientes
  - Then se muestran 20 por página
  - And puede navegar entre páginas

---

## US-2.7: Ver historial de atenciones del paciente
**Como** odontólogo, **quiero** ver el historial de atenciones de un paciente, **para** entender su trayectoria clínica.

- **Prioridad:** P1
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que el odontólogo está en la ficha del paciente
  - When accede al historial de atenciones
  - Then ve una línea de tiempo con todas las visitas
  - And puede expandir cada una para ver detalles

# Historias de Usuario - Gestión de Clínica

| ID | Historia | Prioridad | Estimación |
|----|----------|-----------|------------|
| US-12.1 | Registrar información de la clínica | P0 | M |
| US-12.2 | Registrar profesionales | P0 | M |
| US-12.3 | Registrar especialidades | P1 | S |
| US-12.4 | Registrar consultorios | P1 | S |
| US-12.5 | Gestionar servicios | P1 | M |

---

## US-12.1: Registrar información de la clínica
**Como** super-admin, **quiero** configurar los datos de mi clínica (nombre, dirección, logo), **para** personalizar el sistema.

- **Prioridad:** P0
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que el super-admin está en configuración de clínica
  - When modifica los datos
  - Then se actualizan
  - And el logo aparece en el sistema

---

## US-12.2: Registrar profesionales
**Como** super-admin, **quiero** registrar los odontólogos con su información profesional, **para** tener su perfil en el sistema.

- **Prioridad:** P0
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que el super-admin está en gestión de profesionales
  - When registra un odontólogo con especialidad y consultorio
  - Then se asocia a la clínica

---

## US-12.3: Registrar especialidades
**Como** super-admin, **quiero** registrar las especialidades disponibles, **para** clasificar los servicios.

- **Prioridad:** P1
- **Estimación:** S
- **Criterios de aceptación:**
  - Given que el super-admin está en configuración
  - When crea una especialidad
  - Then se guarda y está disponible para asociar

---

## US-12.4: Registrar consultorios
**Como** super-admin, **quiero** registrar los consultorios, **para** organizar la infraestructura.

- **Prioridad:** P1
- **Estimación:** S
- **Criterios de aceptación:**
  - Given que la clínica tiene consultorios
  - When se registran
  - Then están disponibles para asociar a odontólogos

---

## US-12.5: Gestionar servicios
**Como** super-admin, **quiero** registrar los servicios con precios por defecto, **para** tener un catálogo.

- **Prioridad:** P1
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que el super-admin está en servicios
  - When crea un servicio con nombre, descripción y precio
  - Then se guarda y está disponible para presupuestos/tratamientos

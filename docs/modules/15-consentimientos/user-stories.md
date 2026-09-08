# Historias de Usuario - Consentimientos

| ID | Historia | Prioridad | Estimación |
|----|----------|-----------|------------|
| US-15.1 | Crear plantilla de consentimiento | P2 | M |
| US-15.2 | Registrar consentimiento del paciente | P1 | M |
| US-15.3 | Consultar consentimientos | P1 | M |
| US-15.4 | Asociar consentimiento a tratamiento | P2 | M |

---

## US-15.1: Crear plantilla de consentimiento
**Como** recepcionista u odontólogo, **quiero** crear plantillas de consentimiento informado, **para** tener documentos estandarizados.

- **Prioridad:** P2
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que el usuario está en consentimientos
  - When crea una plantilla con título y contenido
  - Then se guarda y está disponible para usar

---

## US-15.2: Registrar consentimiento del paciente
**Como** odontólogo, **quiero** asociar un consentimiento al paciente con checkbox de aceptación, **para** documentar su autorización.

- **Prioridad:** P1
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que hay una plantilla de consentimiento
  - When se asocia al paciente
  - Then el paciente marca el checkbox de aceptación
  - And se registra la fecha de aceptación

---

## US-15.3: Consultar consentimientos
**Como** odontólogo, **quiero** ver los consentimientos de un paciente, **para** verificar que están firmados.

- **Prioridad:** P1
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que el paciente tiene consentimientos
  - When se accede a la sección
  - Then se muestran todos con estado (aceptado/pendiente) y fecha

---

## US-15.4: Asociar consentimiento a tratamiento
**Como** odontólogo, **quiero** vincular un consentimiento a un plan de tratamiento específico, **para** tener trazabilidad.

- **Prioridad:** P2
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que hay un plan de tratamiento
  - When se asocia un consentimiento
  - Then queda vinculado al plan

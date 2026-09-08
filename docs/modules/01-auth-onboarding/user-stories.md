# Historias de Usuario - Auth y Onboarding

| ID | Historia | Prioridad | Estimación |
|----|----------|-----------|------------|
| US-1.1 | Login de usuario | P0 | M |
| US-1.2 | Registro de paciente | P0 | M |
| US-1.3 | Recuperación de contraseña | P1 | S |
| US-1.4 | Invitación de clínica *(VERSIÓN 2 - fuera del MVP)* | P0 | L |
| US-1.5 | Registro de clínica y equipo (MVP) | P0 | M |
| US-1.6 | Cierre de sesión | P1 | S |
| US-1.7 | Búsqueda de clínicas afiliadas *(MVP: solo por nombre; sin radio 5 km)* | P0 | S |
| US-1.8 | Afiliación a clínica | P0 | S |

---

## US-1.1: Login de usuario
**Como** usuario registrado, **quiero** iniciar sesión con email y contraseña, **para** acceder al sistema.

- **Prioridad:** P0
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que el usuario está en la página de login
  - When ingresa email y contraseña válidos
  - Then se redirige al pantalla principal correspondiente a su rol
  - And se crea una sesión JWT con clinica_id y rol

---

## US-1.2: Registro de paciente
**Como** paciente nuevo, **quiero** registrarme con mi email y contraseña, **para** poder acceder a mi información.

- **Prioridad:** P0
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que el paciente accede al formulario de registro
  - When completa email, contraseña y datos básicos
  - Then se crea su cuenta y perfil de paciente
  - And recibe email de confirmación

---

## US-1.3: Recuperación de contraseña
**Como** usuario que olvidó su contraseña, **quiero** solicitar un restablecimiento, **para** recuperar el acceso.

- **Prioridad:** P1
- **Estimación:** S
- **Criterios de aceptación:**
  - Given que el usuario está en la página de login
  - When hace clic en "Olvidé mi contraseña" e ingresa su email
  - Then recibe un email con link de restablecimiento
  - And puede crear una nueva contraseña

---

## US-1.4: Invitación de clínica  *(VERSIÓN 2 - fuera del MVP)*
**Como** super-admin, **quiero** invitar una nueva clínica por email, **para** dar de alta un nuevo tenant.

- **Prioridad:** P0
- **Estimación:** L
- **Criterios de aceptación:**
  - Given que el super-admin está en el panel de clínicas
  - When ingresa el email de la clínica y envía invitación
  - Then se envía un email con link de registro
  - And la clínica se crea al completar el registro

---

## US-1.5: Registro de clínica y equipo  *(MVP - el odontólogo crea su propia clínica)*
**Como** odontólogo, **quiero** registrarme y crear mi clínica con su equipo inicial, **para** empezar a usar el sistema.

- **Prioridad:** P0
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que el odontólogo se registra y no tiene clínica asignada
  - When completa los datos de la clínica (nombre, dirección, moneda)
  - Then se crea la clínica y queda como su tenant
  - And puede dar de alta a recepcionistas y otros odontólogos de su equipo
  - And se redirige al pantalla principal

---

## US-1.6: Cierre de sesión
**Como** usuario autenticado, **quiero** cerrar sesión, **para** proteger mi cuenta.

- **Prioridad:** P1
- **Estimación:** S
- **Criterios de aceptación:**
  - Given que el usuario está autenticado
  - When hace clic en "Cerrar sesión"
  - Then se invalida la sesión
  - And se redirige al login

---

## US-1.7: Búsqueda de clínicas afiliadas  *(MVP: solo por nombre, sin ubicación/radio 5 km)*
**Como** paciente sin clínica asignada, **quiero** buscar clínicas afiliadas al sistema por nombre, **para** elegir dónde atenderme.

- **Prioridad:** P0
- **Estimación:** S
- **Criterios de aceptación:**
  - Given que el paciente ingresa y no tiene clínica asignada
  - When inicia sesión (o completa su registro)
  - Then se abre la pestaña de búsqueda de clínicas afiliadas al sistema
  - And puede buscar clínicas por nombre entre todas las afiliadas activas

---

## US-1.8: Afiliación a clínica
**Como** paciente, **quiero** afiliarme a una clínica de las encontradas en la búsqueda, **para** acceder a sus odontólogos y servicios.

- **Prioridad:** P0
- **Estimación:** S
- **Criterios de aceptación:**
  - Given que el paciente ve los resultados de búsqueda de clínicas
  - When selecciona una clínica y confirma su afiliación
  - Then su perfil queda asociado a esa clínica (`clinica_id`)
  - And se crea su registro de paciente en la clínica
  - And continúa con el flujo estándar del sistema (pantalla principal, citas, etc.)

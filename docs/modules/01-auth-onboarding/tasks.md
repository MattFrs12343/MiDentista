# Tareas de Implementación - Auth y Onboarding

| ID | Tarea | Estimación | Dependencias |
|----|-------|------------|--------------|
| T-1.1 | Configurar Supabase Auth (email/password) | M | - |
| T-1.2 | Crear tabla perfiles y trigger de sync con auth.users | M | - |
| T-1.3 | Crear middleware de autenticación (JWT + clinica_id) | L | T-1.1, T-1.2 |
| T-1.4 | Implementar página de login | M | T-1.3 |
| T-1.5 | Implementar formulario de registro de paciente | M | T-1.2 |
| T-1.6 | Implementar flujo de recuperación de contraseña | S | T-1.1 |
| T-1.7 | Crear flujo de invitación de clínicas (super-admin) *(VERSIÓN 2 - fuera del MVP)* | L | T-1.2 |
| T-1.8 | Crear wizard de onboarding de clínica *(MVP: el odontólogo registra su clínica y crea su equipo)* | L | T-1.2 |
| T-1.9 | Implementar ProtectedRoute y role-based routing | M | T-1.3 |
| T-1.10 | Configurar RLS para perfiles | M | T-1.2 |
| T-1.11 | Implementar cierre de sesión | S | T-1.3 |
| T-1.12 | Crear hooks de autenticación (useAuth, useUser) | M | T-1.3 |
| T-1.13 | Agregar columnas latitud/longitud a clinicas + índice geo *(VERSIÓN 2 - fuera del MVP)* | S | - |
| T-1.14 | Implementar pestaña de búsqueda de clínicas *(MVP: solo por nombre; sin radio 5 km)* | M | T-1.3 |
| T-1.15 | Implementar flujo de afiliación del paciente a una clínica | M | T-1.14 |

---

## Detalle de tareas

### T-1.1: Configurar Supabase Auth
- Habilitar Email/Password en Auth settings
- Configurar redirect URLs
- Obtener URL y anon key

### T-1.2: Crear tabla perfiles
- Crear tabla `perfiles` con relación a `auth.users`
- Crear trigger para sync automático al crear usuario
- Configurar RLS

### T-1.3: Crear middleware de autenticación
- Crear cliente Supabase con tipos
- Implementar helper para obtener JWT
- Crear función para extraer clinica_id y rol del token

### T-1.4: Implementar página de login
- Formulario con email y contraseña
- Validación de campos
- Manejo de errores
- Link a recuperación de contraseña

### T-1.5: Implementar registro de paciente
- Formulario con campos obligatorios
- Validación de email único
- Creación en auth.users + perfiles

### T-1.6: Recuperación de contraseña
- Formulario de solicitud
- Envío de email con link
- Formulario de nueva contraseña

### T-1.7: Invitación de clínicas *(VERSIÓN 2 - fuera del MVP)*
- Formulario de invitación (super-admin)
- Generación de token único
- Envío de email con link
- Creación de clínica al aceptar

### T-1.8: Onboarding de clínica (MVP)
- El odontólogo se registra como usuario
- Crea su clínica desde el formulario de configuración (nombre, dirección, moneda)
- Da de alta a recepcionistas y otros odontólogos (CRUD básico)

### T-1.9: ProtectedRoute
- Componente que verifica autenticación
- Redirección según rol
- Manejo de sesión expirada

### T-1.13: Columnas de geolocalización en clinicas *(VERSIÓN 2 - fuera del MVP)*
- Agregar `latitud` y `longitud` a la tabla `clinicas`
- Crear índice para búsqueda por proximidad
- Cargar coordenadas en el onboarding/registro de la clínica

### T-1.14: Pestaña de búsqueda de clínicas (MVP)
- Pantalla que se muestra al paciente sin clínica asignada luego de ingresar
- Búsqueda por nombre entre clínicas afiliadas activas
- Mostrar resultados con nombre, dirección y teléfono
- *(La búsqueda por ubicación con radio de 5 km queda para la versión 2)*

### T-1.15: Afiliación a clínica
- Botón "Afiliarme" en cada resultado de búsqueda
- Al confirmar: asignar `clinica_id` en `perfiles`
- Crear registro del paciente en `pacientes` para esa clínica
- Redirigir al pantalla principal y continuar el flujo estándar

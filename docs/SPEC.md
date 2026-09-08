# SPEC - MiDentista MVP (Versión Reducida)

## 1. Información del Proyecto

| Campo | Valor |
|-------|-------|
| **Nombre** | MiDentista |
| **Tipo** | Software SaaS (single-tenant simplificado) |
| **Plataforma** | Web (React) |
| **Backend** | Supabase (Auth + DB) |
| **Duración** | 3 meses |
| **Equipo** | 6 desarrolladores |
| **Metodología** | Harnnes / Specs + Jira |
| **Deploy** | HostGator (subdominio, hosting compartido) |
| **UI** | shadcn/ui + Tailwind CSS |

---

## 2. Descripción del Producto

MiDentista es una plataforma web para la gestión de consultorios y clínicas odontológicas. Permite centralizar información clínica y administrativa: pacientes, historias clínicas, odontogramas, diagnósticos, tratamientos, citas, presupuestos y pagos.

**Versión MVP:** Single-tenant simplificado. Cada odontólogo administra su propia clínica. Sin super-admin, sin invitaciones complejas, sin búsqueda geográfica.

---

## 3. Modelo de Datos (Simplificado)

### 3.1 Arquitectura

```
Supabase (Proyecto único)
    │
    ├── Shared Schema (una sola base de datos)
    │       │
    │       ├── clinic_id en cada tabla
    │       ├── Row Level Security (RLS) por clinic_id
    │       └── Datos aislados por tenant
    │
    └── Storage (para future: archivos)
```

### 3.2 Base de Datos: 15 tablas (antes 25)

```
Tablas del MVP:
  clinicas, perfiles, pacientes, historiales_clinicos,
  odontogramas (con JSONB para piezas), diagnosticos,
  planes_tratamiento, procedimientos_tratamiento,
  evoluciones_clinicas, horarios, citas, servicios,
  presupuestos, items_presupuesto, pagos

Eliminadas (10 tablas):
  invitaciones, odontograma_piezas, roles_usuario,
  especialidades, consultorios, configuracion_clinica,
  excepciones_horarios, codigos_qr_pago, archivos,
  consentimientos
```

### 3.3 Registro de Clínica (Simplificado)

1. El odontólogo se registra como usuario
2. Crea su clínica desde el formulario de configuración
3. Invita recepcionistas y otros odontólogos por email (CRUD básico)
4. Los pacientes se registran solos y eligen su clínica

---

## 4. Usuarios y Roles

### 4.1 Roles del sistema (3 roles)

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| **ODONTÓLOGO** | Profesional odontológico / dueño de clínica | Gestión completa: clínica, pacientes, clínica, agenda, cobros |
| **RECEPCIONISTA** | Apoyo operativo | Registra pacientes, agenda citas, apoyo con presupuestos/pagos |
| **PACIENTE** | Paciente de la clínica | Consulta su información |

### 4.2 Autenticación

- **Odontólogos y Recepcionistas:** Email + contraseña
- **Pacientes:** Email + contraseña (registro público)

### 4.3 Flujo simplificado

- Sin invitaciones formales (el odontólogo da de alta a su equipo)
- Sin super-admin (el odontólogo administra su clínica)
- Sin búsqueda geográfica (el paciente busca por nombre de clínica)

---

## 5. Moneda

- Configurable por clínica (Bs por defecto)
- Todos los precios y pagos usan la moneda configurada

---

## 6. Módulos Funcionales (9 módulos)

### Cronograma de 3 meses

| # | Módulo | Mes | Responsable |
|---|--------|-----|-------------|
| 1 | Autenticación y Onboarding | 1 | Dev 1 |
| 2 | Gestión de Pacientes | 1 | Dev 2 |
| 3 | Historia Clínica | 1 | Dev 3 |
| 4 | Odontograma | 1 | Dev 4 |
| 5 | Diagnóstico y Plan de Tratamiento | 2 | Dev 5 |
| 6 | Evolución Clínica | 2 | Dev 6 |
| 7 | Agenda y Citas | 2 | Dev 1 |
| 8 | Presupuestos | 3 | Dev 2 |
| 9 | Pagos y Cuentas | 3 | Dev 3 |

---

## 7. Funcionalidades por Módulo

### Módulo 1: Autenticación y Onboarding

- Login con email + contraseña
- Registro de pacientes (formulario público)
- Registro de odontólogo (crea su cuenta + su clínica)
- Recuperación de contraseña
- Selección de clínica por nombre (pacientes)
- JWT con `clinic_id` y `role`
- Gestión de sesiones

### Módulo 2: Gestión de Pacientes

- Registrar paciente nuevo
- Editar información personal
- Buscar pacientes (nombre, CI, teléfono)
- Consultar ficha del paciente
- Registrar contacto de emergencia
- Consultar historial de atenciones
- Listar pacientes de la clínica
- Filtros y paginación

### Módulo 3: Historia Clínica

- Registrar motivo de consulta
- Registrar antecedentes médicos y odontológicos
- Registrar alergias, medicamentos, enfermedades, hábitos
- Registrar observaciones
- Consultar y actualizar información clínica

### Módulo 4: Odontograma

- Visualizar piezas dentales (imagen + zonas clickeables)
- Seleccionar pieza dental
- Registrar condiciones: caries, restauraciones, ausentes, coronas, implantes, endodoncias, extracciones
- Registrar observaciones por pieza
- Guardar odontograma completo (almacenado en JSONB)
- Nomenclatura FDI (internacional)

### Módulo 5: Diagnóstico y Plan de Tratamiento

**Diagnóstico:**
- Crear diagnóstico asociado a paciente y pieza
- Registrar descripción y observaciones
- Cambiar estado (activo/inactivo/resuelto)

**Plan de Tratamiento:**
- Crear plan de tratamiento
- Agregar procedimientos con pieza asociada
- Establecer prioridad y costos
- Estados: PROPUESTO → ACEPTADO → EN PROCESO → COMPLETADO

### Módulo 6: Evolución Clínica

- Registrar fecha de atención
- Registrar motivo y procedimiento realizado
- Asociar pieza dental y diagnóstico
- Registrar observaciones e indicaciones
- Registrar próxima atención
- Consultar evolución cronológica

### Módulo 7: Agenda y Citas

- El odontólogo carga su disponibilidad horaria (días y horas)
- Visualizar calendario de citas
- Crear, reprogramar y cancelar citas
- Estados: RESERVADA → CONFIRMADA → ATENDIDA / CANCELADA
- Asociar paciente, odontólogo y tratamiento

### Módulo 8: Presupuestos

- Crear presupuesto con procedimientos y costos
- Aplicar descuentos
- Calcular total
- Consultar y modificar presupuesto
- Cambiar estado (borrador/enviado/aceptado/rechazado)
- Sin PDF (deferred a versión 2)

### Módulo 9: Pagos y Cuentas

- Registrar pagos (parciales o totales)
- Métodos de pago: efectivo, QR (imagen estática), transferencia
- Consultar historial de pagos
- Consultar saldo pendiente por paciente
- Estados: pendiente/confirmado/rechazado

---

## 8. Matriz de Permisos

| Funcionalidad | ODONTÓLOGO | RECEPCIONISTA | PACIENTE |
|---------------|:----------:|:-------------:|:--------:|
| Gestión de clínica | ✅ | 👁️ | ❌ |
| Gestión de pacientes | ✅ | ✅ | ❌ |
| Historia clínica | ✅ | 👁️ | 👁️ |
| Odontograma | ✅ | ❌ | 👁️ |
| Diagnóstico | ✅ | ❌ | ❌ |
| Plan de tratamiento | ✅ | 👁️ | 👁️ |
| Evolución clínica | ✅ | ❌ | 👁️ |
| Agenda y citas | ✅ | ✅ | 👁️ |
| Presupuestos | ✅ | ✅ | 👁️ |
| Pagos | ✅ | ✅ | 👁️ |
| Dashboard | ✅ | ✅ | ✅ |

**Leyenda:** ✅ Gestión completa | 👁️ Consulta | ❌ Sin acceso

---

## 9. Flujo Principal

```
Flujo de Afiliación (pacientes):
Paciente ingresa → Busca clínica por nombre → Se afilia → Continúa flujo

Flujo Clínico:
Paciente → Historia clínica → Evaluación → Odontograma → Diagnóstico
→ Plan de tratamiento → Presupuesto → Aceptación → Cita → Procedimiento
→ Evolución → Seguimiento → Finalización

Flujo de Citas:
Odontólogo carga disponibilidad → Paciente elige fecha/hora → Cita reservada
→ Confirmación → Atención → Evolución registrada

Flujo de Pagos:
Genera cobro por presupuesto → Paciente paga (efectivo/QR/transferencia)
→ Odontólogo registra pago → Historial actualizado
```

---

## 10. Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React + Vite |
| UI Components | shadcn/ui |
| Styling | Tailwind CSS |
| Estado | Zustand o React Context |
| Backend/DB | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Hosting | HostGator (archivos estáticos) |
| Gestión tareas | Jira |
| Control de versiones | Git + GitHub |

---

## 11. Fuera del Alcance (MVP)

- Super-admin y sistema de invitaciones
- Búsqueda geográfica de clínicas
- Sistema de QR dinámico por odontólogo
- Exportación a PDF de presupuestos
- Archivos e imágenes (radiografías, fotos)
- Consentimientos informados
- Dashboard con estadísticas avanzadas
- Configuración avanzada de clínica
- Aplicación móvil
- IA para diagnóstico
- Integración con WhatsApp
- Notificaciones automáticas
- Facturación electrónica

---

## 12. Criterios de Aceptación Generales

1. Todos los módulos funcionan con datos aislados por clínica (RLS)
2. Tiempo de carga inicial < 3 segundos
3. Responsive design (desktop first)
4. Compatible con Chrome, Firefox, Edge, Safari
5. Todos los formularios tienen validación client-side
6. Los errores muestran mensajes claros al usuario
7. Las operaciones CRUD funcionan correctamente
8. La paginación funciona en todas las listas

---

## 13. Cronograma

```
MES 1 (Semanas 1-4):
  - Sem 1-2: Arquitectura + Auth + Onboarding + Setup proyecto
  - Sem 3-4: Pacientes + Historia Clínica + Odontograma

MES 2 (Semanas 5-8):
  - Sem 5-6: Diagnóstico + Plan de Tratamiento + Evolución
  - Sem 7-8: Agenda y Citas + horarios

MES 3 (Semanas 9-12):
  - Sem 9-10: Presupuestos + Pagos
  - Sem 11-12: Testing + Integración + Deploy
```

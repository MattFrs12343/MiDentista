# GUION SENCILLO Y COMPLETO DE LA BASE DE DATOS DE MiDentista

**Para quién es este guion:** para ti y tu grupo, cuando tengan que explicar la base de datos sin haber llevado todavía la materia de Bases de Datos.

**Qué encontrarás aquí:**
- Los conceptos básicos explicados con analogías de la vida diaria.
- Las **15 tablas reales** del proyecto MVP (3 meses), cada una con: qué guarda, **su estructura de columnas**, **por qué esos atributos**, **a qué módulo pertenece**, **qué tipo de relación usa** y **sus datos multivaluados** (si tiene).
- Al final, frases de defensa listas para decir.

> **Nota de alcance:** este guion describe el **MVP reducido a 3 meses** (9 módulos / 15 tablas / 3 roles). El diseño original tenía 25 tablas y 15 módulos; las tablas eliminadas y su reemplazo se resumen en la sección 5.

---

## 1. ANTES DE EMPEZAR: LOS CONCEPTOS QUE NECESITARÁS ENTENDER

### 1.1 ¿Qué es una base de datos?
> "Es un **archivero digital**: guarda la información de forma ordenada en **tablas** (parecidas a una hoja de Excel) que se conectan entre sí. Por eso se llama **relacional**."

### 1.2 Clave primaria (PK) y clave foránea (FK)
- **Clave primaria:** la etiqueta única e irrepetible de cada fila (como la cédula).
- **Clave foránea:** columna que guarda la clave primaria de OTRA tabla para conectarlas.

### 1.3 Tipos de relación (importante para el diagrama y para la nota)

| Tipo de relación | Símbolo en el diagrama | Significado con analogía | Ejemplo en MiDentista |
|------------------|------------------------|--------------------------|-----------------------|
| **Asociación** | Línea normal | "Se conocen pero cada uno vive por su cuenta" | `pacientes` se asocia con `citas` |
| **Composición** | Rombo **relleno** | "El hijo **no existe sin** el padre. Si se borra el padre, se borran los hijos" | `items_presupuesto` solo existe si existe su `presupuestos` |
| **Herencia (generalización)** | Triángulo (punta hacia el padre) | "El hijo **es** el padre + algo más" | `perfiles` **es** un `auth.users` con datos extra |

> En el MVP **ya no hay** agregaciones ni dependencias separadas (se eliminaron las tablas `especialidades`, `consultorios` y `configuracion_clinica`). Quedan asociaciones, composiciones (2) y una herencia.

### 1.4 ¿Qué es un dato multivaluado?
Es un atributo que puede tener **más de un valor a la vez** para un mismo registro:

> "Un paciente puede tener **varias alergias**, un odontograma tiene **muchas piezas**, un presupuesto tiene **muchos ítems**. Un atributo multivaluado es 'una casilla donde caben varias cosas'."

**Cómo se resuelve en una base de datos relacional** (esto se llama *normalizar*):
- **Opción 1 — tabla hija:** se crea una tabla nueva que guarda cada valor en su propia fila. Ejemplo: cada renglón del presupuesto es una fila de `items_presupuesto`.
- **Opción 2 — texto o lista:** se guarda todo en una sola columna separada por comas. Funciona para casos simples (ej: las alergias como texto).
- **Opción 3 — JSON:** se guarda una lista estructurada. En el MVP se usa para las **piezas del odontograma** (campo `piezas` de tipo JSONB).

---

## 2. LAS 15 TABLAS UNA POR UNA

> Cada tabla tiene estos datos: **Módulo** (de los 9 del MVP), **qué guarda**, **estructura de columnas**, **por qué esos atributos**, **relaciones** con su tipo, y **datos multivaluados**.

### MÓDULO 1. Autenticación y Onboarding → tablas `clinicas`, `perfiles`

---

#### 2.1 `clinicas` — Módulo Autenticación y Onboarding

**¿Qué guarda?** Las clínicas que usan el sistema (la "empresa" que arrienda el servicio). Es la tabla raíz del multi-tenant simplificado (cada odontólogo administra su propia clínica).

| Columna | Tipo | ¿Para qué? |
|---------|------|-----------|
| `id`    | UUID | Clave primaria (carnet único) |
| `nombre`| TEXT | Nombre de la clínica |
| `slug`  | TEXT | Nombre corto para la URL (único) |
| `email`, `telefono` | TEXT | Contacto |
| `direccion`, `ciudad`, `pais` | TEXT | Ubicación administrativa |
| `moneda`, `simbolo_moneda` | TEXT | Moneda de cobro (Bs, USD, EUR) |
| `activo` | BOOLEAN | Si la clínica está en servicio |
| `creado_en`, `actualizado_en` | TIMESTAMPTZ | Fechas de creación y última modificación |

**¿Por qué esos atributos?** Para que el sistema sepa a qué clínica pertenece todo lo demás. Se eliminaron `latitud`/`longitud` (la búsqueda geográfica de 5 km es versión 2; en el MVP el paciente busca por nombre). También se eliminaron `logo_url`, `almacenamiento_maximo_mb` y `plan` (archivos y planes avanzados son versión 2).

**Relaciones:**
| Relación | Tipo |
|----------|------|
| `clinicas 1 ──── * perfiles` | **Asociación** (una clínica tiene muchos usuarios) |
| `clinicas 1 ──── * (casi todas las demás tablas)` | **Asociación** vía `clinica_id` |

**Datos multivaluados:** ninguno directamente. La multi-tenencia se expresa con `clinica_id` en las otras tablas.

---

#### 2.2 `perfiles` — Módulo Autenticación y Onboarding

**¿Qué guarda?** Los usuarios que entran al sistema (doctores, recepcionistas, pacientes). Extiende la tabla de usuarios que crea Supabase Auth.

| Columna | Tipo | ¿Para qué? |
|---------|------|-----------|
| `id` | UUID | Clave primaria. **Es el mismo id del usuario de Supabase** |
| `email` | TEXT | Correo para iniciar sesión |
| `nombre_completo` | TEXT | Nombre visible |
| `telefono`, `avatar_url` | TEXT | Contacto y foto |
| `rol` | TEXT | Rol principal: odontologo, recepcionista, paciente |
| `clinica_id` | UUID | Clínica a la que pertenece |
| `especialidad` | TEXT | Especialidad del odontólogo (texto libre) |
| `consultorio` | TEXT | Consultorio donde atiende (texto libre) |
| `activo` | BOOLEAN | Si la cuenta está habilitada |
| `creado_en`, `actualizado_en` | TIMESTAMPTZ | Fechas |

**¿Por qué esos atributos?** Porque un usuario debe poder: entrar (email + rol), ser identificado (nombre, avatar), ser ubicado en su clínica (`clinica_id`) y ser administrado (activo). En el MVP la especialidad y el consultorio **se simplificaron a texto libre** (antes eran las tablas `especialidades` y `consultorios`, eliminadas como versión 2).

**Relaciones:**
| Relación | Tipo |
|----------|------|
| `perfiles` ⃪── **`auth.users`** (de Supabase) | **Herencia**: "perfiles ES un usuario de Supabase con más datos" |
| `perfiles 1 ──── * odontogramas` `(odontologo_id)` | **Asociación** |
| `perfiles 1 ──── * citas` `(odontologo_id)` | **Asociación** |
| `perfiles 1 ──── 0..1 pacientes` (`perfil_id`) | **Asociación** (no todos los usuarios son pacientes) |

**Datos multivaluados:** el rol es UNO por perfil (3 roles en el MVP; se eliminó la tabla `roles_usuario` y el rol `super_admin`).

---

### MÓDULO 2. Gestión de Pacientes → tabla `pacientes`

#### 2.3 `pacientes`

**¿Qué guarda?** Los datos personales y de emergencia de cada paciente de la clínica.

| Columna | Tipo | ¿Para qué? |
|---------|------|-----------|
| `id` | UUID | Clave primaria |
| `clinica_id` | UUID | Clínica dueña del registro |
| `perfil_id` | UUID | Si el paciente también tiene cuenta en el sistema |
| `ci` | TEXT | Carnet de identidad |
| `nombre_completo` | TEXT | Nombre completo |
| `fecha_nacimiento` | DATE | Para calcular edad |
| `genero` | TEXT | M / F / Otro |
| `telefono`, `email`, `direccion`, `ocupacion` | TEXT | Contacto y datos generales |
| `contacto_emergencia_nombre` | TEXT | A quién llamar en una emergencia |
| `contacto_emergencia_telefono` | TEXT | Teléfono del contacto |
| `contacto_emergencia_parentesco` | TEXT | Parentesco (madre, esposo...) |
| `tipo_sangre` | TEXT | Grupo sanguíneo |
| `alergias` | TEXT | Alergias conocidas |
| `notas` | TEXT | Notas libres |
| `activo` | BOOLEAN | Si el registro está vigente |
| `creado_en`, `actualizado_en` | TIMESTAMPTZ | Fechas |

**¿Por qué esos atributos?** Porque es una clínica dental: el `ci` y `nombre_completo` lo identifican; el contacto de emergencia (3 columnas) es vital para atenciones con riesgo; `tipo_sangre` y `alergias` son datos médicos críticos; `perfil_id` conecta al paciente con el usuario del sistema.

**Relaciones:**
| Relación | Tipo |
|----------|------|
| `pacientes 1 ──── 0..1 historiales_clinicos` | **Asociación** (puede existir sin historial) |
| `pacientes 1 ──── * odontogramas` | **Asociación** |
| `pacientes 1 ──── * diagnosticos` | **Asociación** |
| `pacientes 1 ──── * planes_tratamiento` | **Asociación** |
| `pacientes 1 ──── * evoluciones_clinicas` | **Asociación** |
| `pacientes 1 ──── * citas` | **Asociación** |
| `pacientes 1 ──── * presupuestos` | **Asociación** |
| `pacientes 1 ──── * pagos` | **Asociación** |

**Datos multivaluados:** `alergias` es una lista que puede tener varios valores (guardada como texto). En un diseño estricto iría en una tabla hija; aquí se simplificó a una columna.

---

### MÓDULO 3. Historia Clínica → tabla `historiales_clinicos`

#### 2.4 `historiales_clinicos`

**¿Qué guarda?** El expediente médico del paciente: antecedentes, alergias, medicamentos y hábitos.

| Columna | Tipo | ¿Para qué? |
|---------|------|-----------|
| `id` | UUID | Clave primaria |
| `clinica_id` | UUID | Clínica |
| `paciente_id` | UUID | Paciente dueño del historial |
| `motivo_consulta` | TEXT | Razón de la visita inicial |
| `antecedentes_medicos` | TEXT | Enfermedades previas del paciente |
| `antecedentes_odontologicos` | TEXT | Historial dental previo |
| `alergias` | TEXT | Alergias relevantes |
| `medicamentos` | TEXT | Medicamentos que toma |
| `enfermedades` | TEXT | Enfermedades crónicas |
| `habitos` | TEXT | Hábitos (fumar, bruxismo...) |
| `observaciones` | TEXT | Notas libres |
| `creado_en`, `actualizado_en` | TIMESTAMPTZ | Fechas |

**¿Por qué esos atributos?** Es el "expediente médico": el odontólogo necesita conocer el estado general de salud antes de cualquier tratamiento (enfermedades como diabetes o hábitos como fumar afectan los dientes y la cicatrización).

**Relaciones:**
| Relación | Tipo |
|----------|------|
| `pacientes 1 ──── 0..1 historiales_clinicos` | **Asociación** |

**Datos multivaluados:** `alergias`, `medicamentos`, `enfermedades` y `habitos` son listas guardadas como texto (varios valores separados). Un diseño más formal usaría tablas hijas para cada una.

---

### MÓDULO 4. Odontograma → tabla `odontogramas`

#### 2.5 `odontogramas`

**¿Qué guarda?** Un "examen" del mapa dental del paciente hecho en cierta fecha. En el MVP los dientes se guardan **dentro de la misma tabla** en una columna JSONB `piezas` (esto reemplaza la antigua tabla hija `odontograma_piezas`).

| Columna | Tipo | ¿Para qué? |
|---------|------|-----------|
| `id` | UUID | Clave primaria |
| `clinica_id` | UUID | Clínica |
| `paciente_id` | UUID | Paciente examinado |
| `odontologo_id` | UUID | Doctor que hizo el examen |
| `fecha_examen` | DATE | Fecha del examen |
| `piezas` | JSONB | Lista de dientes con su condición (dato multivaluado) |
| `notas` | TEXT | Notas generales |
| `creado_en`, `actualizado_en` | TIMESTAMPTZ | Fechas |

**Ejemplo del campo JSONB `piezas`:**
```json
[
  { "pieza": 11, "superficie": "oclusal", "condicion": "sano", "obs": "" },
  { "pieza": 21, "superficie": "vestibular", "condicion": "caries", "obs": "cavitada" }
]
```

**¿Por qué esos atributos?** Permite comparar "el mapa de la boca" entre fechas: sabemos a quién (`paciente_id`), quién (`odontologo_id`), cuándo (`fecha_examen`) y qué dientes tiene con qué condición (el JSONB `piezas`). La numeración de piezas usa la nomenclatura FDI.

**Relaciones:**
| Relación | Tipo |
|----------|------|
| `pacientes 1 ──── * odontogramas` | **Asociación** |
| `perfiles 1 ──── * odontogramas` | **Asociación** (el odontólogo) |

**Datos multivaluados:** los **muchos dientes** de un examen son el dato multivaluado. Se resuelve aquí con **JSON** (columna `piezas`), en lugar de una tabla hija como en el diseño original.

---

### MÓDULO 5. Diagnóstico y Plan de Tratamiento → `diagnosticos`, `planes_tratamiento`, `procedimientos_tratamiento`

#### 2.6 `diagnosticos`

**¿Qué guarda?** Los diagnósticos que el doctor registra (generalmente por pieza dental).

| Columna | Tipo | ¿Para qué? |
|---------|------|-----------|
| `id` | UUID | Clave primaria |
| `clinica_id` | UUID | Clínica |
| `paciente_id` | UUID | Paciente |
| `odontologo_id` | UUID | Doctor que diagnostica |
| `numero_pieza` | INTEGER | Diente afectado (puede ser sin diente) |
| `descripcion` | TEXT | Qué se diagnostica |
| `observaciones` | TEXT | Notas |
| `estado` | TEXT | activo / inactivo / resuelto |
| `fecha_diagnostico` | DATE | Fecha del diagnóstico |
| `creado_en`, `actualizado_en` | TIMESTAMPTZ | Fechas |

**¿Por qué esos atributos?** Documentar el diagnóstico con responsable (`odontologo_id`), objeto (`numero_pieza`), estado (para saber si sigue vigente) y fecha (historial).

**Relaciones:**
| Relación | Tipo |
|----------|------|
| `pacientes 1 ──── * diagnosticos` | **Asociación** |
| `perfiles 1 ──── * diagnosticos` | **Asociación** (odontólogo) |

**Datos multivaluados:** un diagnóstico puede referir varios dientes; aquí se usa `numero_pieza` único.

---

#### 2.7 `planes_tratamiento`

**¿Qué guarda?** El plan aprobado por el paciente: el conjunto de procedimientos que se harán y su costo total.

| Columna | Tipo | ¿Para qué? |
|---------|------|-----------|
| `id` | UUID | Clave primaria |
| `clinica_id` | UUID | Clínica |
| `paciente_id` | UUID | Paciente |
| `odontologo_id` | UUID | Doctor responsable |
| `titulo` | TEXT | Título del plan |
| `estado` | TEXT | propuesto / aceptado / en_proceso / completado / cancelado |
| `costo_total` | NUMERIC(10,2) | Suma del costo de los procedimientos |
| `notas` | TEXT | Notas |
| `creado_en`, `actualizado_en` | TIMESTAMPTZ | Fechas |

**¿Por qué esos atributos?** Porque un plan necesita seguimiento: qué se propone (`titulo`, procedimientos), si el paciente lo aceptó (`estado`), y cuánto costará (`costo_total`). El estado es clave para el flujo clínico.

**Relaciones:**
| Relación | Tipo |
|----------|------|
| `pacientes 1 ──── * planes_tratamiento` | **Asociación** |
| `perfiles 1 ──── * planes_tratamiento` | **Asociación** (el odontólogo) |
| `planes_tratamiento 1 ──── * procedimientos_tratamiento` | **Composición** |
| `planes_tratamiento 1 ──── 0..* evoluciones_clinicas` | **Asociación** |
| `planes_tratamiento 1 ──── 0..* citas` | **Asociación** |

**Datos multivaluados:** los muchos procedimientos de un plan → tabla hija `procedimientos_tratamiento`.

---

#### 2.8 `procedimientos_tratamiento`

**¿Qué guarda?** Cada procedimiento concreto dentro de un plan de tratamiento.

| Columna | Tipo | ¿Para qué? |
|---------|------|-----------|
| `id` | UUID | Clave primaria |
| `clinica_id` | UUID | Clínica |
| `plan_tratamiento_id` | UUID | Plan al que pertenece |
| `servicio_id` | UUID | Servicio del catálogo (opcional) |
| `numero_pieza` | INTEGER | Diente donde se hará |
| `descripcion` | TEXT | Qué procedimiento es |
| `prioridad` | TEXT | urgente / alta / normal / baja |
| `costo` | NUMERIC(10,2) | Costo de este procedimiento |
| `estado` | TEXT | pendiente / en_proceso / completado / cancelado |
| `creado_en`, `actualizado_en` | TIMESTAMPTZ | Fechas |

**¿Por qué esos atributos?** Para ejecutar el plan se necesita desglose: qué se hará (`descripcion`), en qué diente (`numero_pieza`), con qué urgencia (`prioridad`), cuánto cuesta (`costo`) y en qué etapa va (`estado`).

**Relaciones:**
| Relación | Tipo |
|----------|------|
| `planes_tratamiento 1 ──── * procedimientos_tratamiento` | **Composición** |
| `servicios 1 ──── 0..* procedimientos_tratamiento` | **Asociación** (el servicio puede existir aunque ningún procedimiento lo use) |

**Datos multivaluados:** es la resolución del multivaluado "procedimientos de un plan" en filas.

---

### MÓDULO 6. Evolución Clínica → tabla `evoluciones_clinicas`

#### 2.9 `evoluciones_clinicas`

**¿Qué guarda?** La bitácora de cada consulta: qué se hizo, qué se observó y cuándo volver.

| Columna | Tipo | ¿Para qué? |
|---------|------|-----------|
| `id` | UUID | Clave primaria |
| `clinica_id` | UUID | Clínica |
| `paciente_id` | UUID | Paciente |
| `odontologo_id` | UUID | Doctor de la consulta |
| `plan_tratamiento_id` | UUID | Plan relacionado (opcional) |
| `procedimiento_id` | UUID | Procedimiento realizado (opcional) |
| `numero_pieza` | INTEGER | Diente trabajado |
| `fecha_consulta` | DATE | Fecha de la consulta |
| `motivo_consulta` | TEXT | Por qué vino |
| `procedimiento_realizado` | TEXT | Qué se hizo |
| `observaciones` | TEXT | Cómo evolucionó |
| `indicaciones` | TEXT | Indicaciones al paciente |
| `proxima_atencion` | DATE | Próxima cita sugerida |
| `creado_en` | TIMESTAMPTZ | Fecha |

**¿Por qué esos atributos?** La evolución es el "diario clínico": necesario para saber qué cambió entre consultas, quién atendió, qué se hizo y cuándo se debe reevaluar (`proxima_atencion`).

**Relaciones:**
| Relación | Tipo |
|----------|------|
| `pacientes 1 ──── * evoluciones_clinicas` | **Asociación** |
| `perfiles 1 ──── * evoluciones_clinicas` | **Asociación** (odontólogo) |
| `planes_tratamiento 1 ──── 0..* evoluciones_clinicas` | **Asociación** |

**Datos multivaluados:** "una consulta puede incluir muchos procedimientos"; se simplificó en un solo `procedimiento_realizado` (texto). Los procedimientos formales quedan en `procedimientos_tratamiento`.

---

### MÓDULO 7. Agenda y Citas → `horarios`, `citas`

#### 2.10 `horarios`

**¿Qué guarda?** La disponibilidad semanal de cada odontólogo (qué días y a qué horas atiende).

| Columna | Tipo | ¿Para qué? |
|---------|------|-----------|
| `id` | UUID | Clave primaria |
| `clinica_id` | UUID | Clínica |
| `odontologo_id` | UUID | El odontólogo |
| `dia_semana` | INTEGER | 0 (domingo) a 6 (sábado) |
| `hora_inicio` | TIME | Hora en que inicia el turno |
| `hora_fin` | TIME | Hora en que termina |
| `activo` | BOOLEAN | Si el horario está vigente |
| `creado_en` | TIMESTAMPTZ | Fecha |

**¿Por qué esos atributos?** Para saber cuándo se puede agendar una cita: solo en los días y horas definidos aquí. `activo` permite suspender temporalmente sin borrar el registro. En el MVP se eliminó la tabla `excepciones_horarios` (los bloqueos puntuales se gestionan de forma manual; es versión 2).

**Relaciones:**
| Relación | Tipo |
|----------|------|
| `perfiles 1 ──── * horarios` | **Asociación** (el odontólogo) |
| `clinicas 1 ──── * horarios` | **Asociación** |

**Datos multivaluados:** los **muchos turnos** de un odontólogo a la semana son multivaluados; se resuelven como filas en esta tabla.

---

#### 2.11 `citas`

**¿Qué guarda?** La agenda: cada cita programada, con paciente, odontólogo, fecha, hora y estado.

| Columna | Tipo | ¿Para qué? |
|---------|------|-----------|
| `id` | UUID | Clave primaria |
| `clinica_id` | UUID | Clínica |
| `paciente_id` | UUID | Paciente que asiste |
| `odontologo_id` | UUID | Doctor que atiende |
| `plan_tratamiento_id` | UUID | Plan asociado (opcional) |
| `fecha_cita` | DATE | Día de la cita |
| `hora_inicio`, `hora_fin` | TIME | Duración de la cita |
| `estado` | TEXT | reservada / confirmada / atendida / cancelada |
| `motivo_consulta` | TEXT | Motivo |
| `notas` | TEXT | Notas |
| `creado_en`, `actualizado_en` | TIMESTAMPTZ | Fechas |

**¿Por qué esos atributos?** Para que la agenda sea útil: quién (`paciente_id`), con quién (`odontologo_id`), cuándo (fecha + horas), y en qué etapa (estado, para saber si viene, llegó o no).

**Relaciones:**
| Relación | Tipo |
|----------|------|
| `pacientes 1 ──── * citas` | **Asociación** |
| `perfiles 1 ──── * citas` | **Asociación** (odontólogo) |
| `planes_tratamiento 1 ──── 0..* citas` | **Asociación** |

**Datos multivaluados:** ninguno directo (una cita tiene un horario puntual).

---

### MÓDULO 8. Presupuestos → `presupuestos`, `items_presupuesto`, `servicios`

#### 2.12 `servicios` (Catálogo)

**¿Qué guarda?** El catálogo de servicios dentales con su precio por defecto y duración. En el MVP se simplificó (se eliminó la tabla `especialidades`; cada servicio ya no se agrupa por especialidad).

| Columna | Tipo | ¿Para qué? |
|---------|------|-----------|
| `id` | UUID | Clave primaria |
| `clinica_id` | UUID | Clínica |
| `nombre` | TEXT | Nombre del servicio |
| `descripcion` | TEXT | Descripción |
| `precio_por_defecto` | NUMERIC(10,2) | Precio sugerido |
| `duracion_minutos` | INTEGER | Cuánto dura la atención |
| `activo` | BOOLEAN | Si se ofrece |
| `creado_en`, `actualizado_en` | TIMESTAMPTZ | Fechas |

**¿Por qué esos atributos?** Los servicios se reutilizan en presupuestos y procedimientos: el precio y la duración evitan escribir los datos cada vez.

**Relaciones:**
| Relación | Tipo |
|----------|------|
| `servicios 1 ──── 0..* procedimientos_tratamiento` | **Asociación** |
| `servicios 1 ──── 0..* items_presupuesto` | **Asociación** |

**Datos multivaluados:** un servicio se usa en MANY presupuestos y MANY procedimientos → relación muchos a muchos, resuelta dejando `servicio_id` en las tablas de uso.

---

#### 2.13 `presupuestos`

**¿Qué guarda?** El encabezado de un presupuesto entregado al paciente (título, descuento, total, estado).

| Columna | Tipo | ¿Para qué? |
|---------|------|-----------|
| `id` | UUID | Clave primaria |
| `clinica_id` | UUID | Clínica |
| `paciente_id` | UUID | Paciente |
| `odontologo_id` | UUID | Doctor que lo hizo |
| `titulo` | TEXT | Título del presupuesto |
| `descuento` | NUMERIC(10,2) | Descuento aplicado |
| `total` | NUMERIC(10,2) | Total final |
| `estado` | TEXT | borrador / enviado / aceptado / rechazado |
| `valido_hasta` | DATE | Hasta cuándo vale el precio |
| `notas` | TEXT | Notas |
| `creado_en`, `actualizado_en` | TIMESTAMPTZ | Fechas |

**¿Por qué esos atributos?** Un presupuesto es un documento comercial: necesita a quién (`paciente_id`), quién lo arma (`odontologo_id`), el cálculo (`descuento`, `total`), y su ciclo de vida (`estado`). En el MVP **no hay exportación a PDF** (es versión 2), el total se calcula automáticamente.

**Relaciones:**
| Relación | Tipo |
|----------|------|
| `pacientes 1 ──── * presupuestos` | **Asociación** |
| `perfiles 1 ──── * presupuestos` | **Asociación** (odontólogo) |
| `presupuestos 1 ──── * items_presupuesto` | **Composición** |

**Datos multivaluados:** los muchos renglones del presupuesto → tabla hija `items_presupuesto`.

---

#### 2.14 `items_presupuesto`

**¿Qué guarda?** CADA línea (renglón) del presupuesto: un servicio, su cantidad, precio y subtotal.

| Columna | Tipo | ¿Para qué? |
|---------|------|-----------|
| `id` | UUID | Clave primaria |
| `clinica_id` | UUID | Clínica |
| `presupuesto_id` | UUID | Presupuesto al que pertenece |
| `servicio_id` | UUID | Servicio del catálogo (opcional) |
| `descripcion` | TEXT | Qué se cobra |
| `numero_pieza` | INTEGER | Diente relacionado (opcional) |
| `cantidad` | INTEGER | Cuántas unidades |
| `precio_unitario` | NUMERIC(10,2) | Precio por unidad |
| `subtotal` | NUMERIC(10,2) | cantidad × precio unitario |
| `creado_en` | TIMESTAMPTZ | Fecha |

**¿Por qué esos atributos?** Sin el desglose no se puede justificar el total. `cantidad`, `precio_unitario` y `subtotal` permiten explicar cada peso del presupuesto.

**Relaciones:**
| Relación | Tipo |
|----------|------|
| `presupuestos 1 ──── * items_presupuesto` | **Composición** |
| `servicios 1 ──── 0..* items_presupuesto` | **Asociación** |

**Datos multivaluados:** es la resolución del multivaluado "renglones de un presupuesto".

---

### MÓDULO 9. Pagos y Cuentas → tabla `pagos`

#### 2.15 `pagos`

**¿Qué guarda?** Los pagos recibidos: quién pagó, cuánto, cómo y contra qué presupuesto. En el MVP se simplificó (se eliminó la tabla `codigos_qr_pago`; el QR del odontólogo es una imagen estática de referencia, no una tabla ni un QR dinámico).

| Columna | Tipo | ¿Para qué? |
|---------|------|-----------|
| `id` | UUID | Clave primaria |
| `clinica_id` | UUID | Clínica |
| `paciente_id` | UUID | Quién paga |
| `presupuesto_id` | UUID | A qué presupuesto corresponde (opcional) |
| `monto` | NUMERIC(10,2) | Cuánto pagó |
| `metodo_pago` | TEXT | efectivo / qr / transferencia / otro |
| `fecha_pago` | DATE | Cuándo pagó |
| `codigo_referencia` | TEXT | Comprobante de la transferencia |
| `notas` | TEXT | Notas |
| `estado` | TEXT | pendiente / confirmado / rechazado |
| `registrado_por` | UUID | Quién registró el pago (recepcionista) |
| `creado_en` | TIMESTAMPTZ | Fecha |

**¿Por qué esos atributos?** El control de cuentas necesita: quién (`paciente_id`), cuánto (`monto`), cómo (`metodo_pago`), contra qué (`presupuesto_id`) y con qué referencia (`codigo_referencia`). Un pago puede ser parcial (varios pagos contra un mismo presupuesto).

**Relaciones:**
| Relación | Tipo |
|----------|------|
| `pacientes 1 ──── * pagos` | **Asociación** |
| `presupuestos 1 ──── 0..* pagos` | **Asociación** (un presupuesto puede pagarse en partes) |
| `perfiles 1 ──── 0..* pagos` | **Asociación** (`registrado_por`) |

**Datos multivaluados:** el multivaluado "pagos de un presupuesto" se resuelve permitiendo **muchos pagos** por presupuesto (pago parcial + saldo).

---

## 3. RESUMEN VISUAL: QUÉ TIPO DE RELACIÓN DOMINA EN CADA GRUPO

| Grupo | Relaciones típicas | Dibujo |
|-------|--------------------|--------|
| `clinicas` con todo | **Asociación** (1 a muchos vía `clinica_id`) | línea normal |
| `perfiles` con `auth.users` | **Herencia** | triángulo |
| `plan → procedimientos`, `presupuesto → items` | **Composición** (hijos no existen sin padre) | rombo relleno |
| Todo lo demás | **Asociación** | línea normal |

---

## 4. GUION DE DEFENSA EN FRASES CORTAS

1. **Qué es:** "MiDentista guarda su información en PostgreSQL (montado en Supabase), con 15 tablas organizadas en los 9 módulos del MVP de 3 meses."
2. **Cómo se conectan:** "Las tablas se conectan por claves: la primaria identifica cada fila y la foránea apunta a otra tabla."
3. **Tipos de relación:** "La mayoría son asociaciones simples. Hay 2 composiciones (procedimientos del plan e ítems del presupuesto), que se borran junto con su padre. También hay herencia (perfiles es un auth.users)."
4. **Datos multivaluados:** "Los datos multivaluados (varias alergias, varios dientes, varios ítems) se resuelven de dos formas: con tablas hijas, como items_presupuesto, o con JSON, como las piezas del odontograma."
5. **Trigger:** "Los triggers mantienen automáticamente la fecha de última modificación de las tablas."
6. **RLS:** "Seguridad por fila: cada clínica solo ve sus propios datos, gracias al `clinica_id` que está en todas las tablas."
7. **Raíz y centro:** "La clínica es la raíz (todo depende de ella) y el paciente es el centro clínico (a su alrededor giran historia, odontogramas, planes, citas y pagos)."

---

## 5. QUÉ SE QUITÓ DEL DISEÑO ORIGINAL (25 tablas → 15)

| Tabla eliminada | Reemplazo en el MVP |
|-----------------|---------------------|
| `invitaciones` | Alta directa por el odontólogo |
| `odontograma_piezas` | Campo JSONB `piezas` en `odontogramas` |
| `roles_usuario` | Campo `rol` en `perfiles` |
| `especialidades` | Campo texto `especialidad` en `perfiles` |
| `consultorios` | Campo texto `consultorio` en `perfiles` |
| `configuracion_clinica` | Valores por defecto (moneda, etc.) |
| `excepciones_horarios` | Gestión manual (versión 2) |
| `codigos_qr_pago` | QR estático del odontólogo |
| `archivos` | Versión 2 |
| `consentimientos` | Versión 2 |
| Rol `super_admin` | El odontólogo administra su clínica (3 roles) |

---

*Documento basado en `docs/DATABASE.md` y `docs/SPEC.md` (módulos). Las 15 tablas, sus columnas, los 9 módulos y las relaciones son las reales del proyecto MVP; el lenguaje es simplificado para público que aún no cursó Bases de Datos.*

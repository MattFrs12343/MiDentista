# DATABASE - Diseño de Base de Datos (MVP 3 meses)

> **Nota:** Este documento describe el **MVP reducido** (15 tablas) que se
> ajusta al nuevo plazo de 3 meses. El schema SQL correspondiente está en
> `supabase_schema_mvp.sql`. El schema original de 25 tablas quedó como
> referencia en `supabase_schema.sql`.

## 1. Convenciones

- **Motor:** PostgreSQL (Supabase)
- **Multi-tenant:** Shared schema con `clinica_id` en cada tabla
- **RLS:** Row Level Security habilitado en todas las tablas
- **UUID:** Claves primarias usando `uuid`
- **Timestamps:** Columnas `creado_en` y `actualizado_en` en las tablas que se modifican

---

## 2. Resumen de Tablas

```
clinicas
├── perfiles (usuarios del sistema incluidos una-especialidad/consultorio)
├── pacientes
├── historiales_clinicos
├── odontogramas
│   └── piezas (dentro del mismo registro, en JSONB)
├── diagnosticos
├── planes_tratamiento
│   └── procedimientos_tratamiento
├── evoluciones_clinicas
├── horarios
├── citas
├── servicios
├── presupuestos
│   └── items_presupuesto
└── pagos
```

**Total: 15 tablas** (antes 25)

### Tablas eliminadas en el MVP (y su reemplazo)

| Tabla eliminada | Reemplazo en el MVP |
|-----------------|---------------------|
| `invitaciones` | Alta directa por el odontólogo |
| `odontograma_piezas` | Campo JSONB `piezas` en `odontogramas` |
| `roles_usuario` | Campo `rol` en `perfiles` |
| `especialidades` | Campo texto `especialidad` en `perfiles` |
| `consultorios` | Campo texto `consultorio` en `perfiles` |
| `configuracion_clinica` | Valores por defecto (moneda, etc.) |
| `excepciones_horarios` | Gestión manual (v2) |
| `codigos_qr_pago` | QR estático del odontólogo |
| `archivos` | Versión 2 |
| `consentimientos` | Versión 2 |

---

## 3. Tabla: clinicas (Tenant)

```sql
CREATE TABLE clinicas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre          TEXT NOT NULL,
    slug            TEXT UNIQUE NOT NULL,
    email           TEXT,
    telefono        TEXT,
    direccion       TEXT,
    ciudad          TEXT,
    pais            TEXT DEFAULT 'Bolivia',
    moneda          TEXT DEFAULT 'Bs',
    simbolo_moneda  TEXT DEFAULT 'Bs',
    activo          BOOLEAN DEFAULT true,
    creado_en       TIMESTAMPTZ DEFAULT now(),
    actualizado_en  TIMESTAMPTZ DEFAULT now()
);
```

**Notas:**
- En el MVP **sin búsqueda geográfica** (se eliminaron `latitud`/`longitud` y el índice geo). El paciente busca la clínica por nombre.
- Solo las clínicas con `activo = true` aparecen en la búsqueda de afiliación.

---

## 4. Tabla: perfiles (Extiende auth.users)

```sql
CREATE TABLE perfiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email           TEXT UNIQUE NOT NULL,
    nombre_completo TEXT NOT NULL,
    telefono        TEXT,
    avatar_url      TEXT,
    rol             TEXT NOT NULL DEFAULT 'paciente'
                    CHECK (rol IN ('odontologo', 'recepcionista', 'paciente')),
    clinica_id      UUID REFERENCES clinicas(id),
    especialidad    TEXT,
    consultorio     TEXT,
    activo          BOOLEAN DEFAULT true,
    creado_en       TIMESTAMPTZ DEFAULT now(),
    actualizado_en  TIMESTAMPTZ DEFAULT now()
);
```

**Notas:**
- **3 roles** (se eliminó `super_admin`): el odontólogo administra su clínica.
- `especialidad` y `consultorio` están como texto libre (antes eran tablas separadas `especialidades` y `consultorios`).

---

## 5. Tabla: pacientes

```sql
CREATE TABLE pacientes (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id                      UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    perfil_id                       UUID REFERENCES perfiles(id),
    ci                              TEXT,
    nombre_completo                 TEXT NOT NULL,
    fecha_nacimiento                DATE,
    genero                          TEXT CHECK (genero IN ('M', 'F', 'Otro')),
    telefono                        TEXT,
    email                           TEXT,
    direccion                       TEXT,
    ocupacion                       TEXT,
    contacto_emergencia_nombre      TEXT,
    contacto_emergencia_telefono    TEXT,
    contacto_emergencia_parentesco  TEXT,
    tipo_sangre                     TEXT,
    alergias                        TEXT,
    notas                           TEXT,
    activo                          BOOLEAN DEFAULT true,
    creado_en                       TIMESTAMPTZ DEFAULT now(),
    actualizado_en                  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pacientes_clinica ON pacientes(clinica_id);
CREATE INDEX idx_pacientes_nombre ON pacientes(clinica_id, nombre_completo);
CREATE INDEX idx_pacientes_ci ON pacientes(clinica_id, ci);
```

---

## 6. Tabla: historiales_clinicos

```sql
CREATE TABLE historiales_clinicos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id          UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    paciente_id         UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    motivo_consulta     TEXT,
    antecedentes_medicos TEXT,
    antecedentes_odontologicos TEXT,
    alergias            TEXT,
    medicamentos        TEXT,
    enfermedades        TEXT,
    habitos             TEXT,
    observaciones       TEXT,
    creado_en           TIMESTAMPTZ DEFAULT now(),
    actualizado_en      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_historiales_paciente ON historiales_clinicos(paciente_id);
```

---

## 7. Tabla: odontogramas (con piezas en JSONB)

```sql
CREATE TABLE odontogramas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id      UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    paciente_id     UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    odontologo_id   UUID NOT NULL REFERENCES perfiles(id),
    fecha_examen    DATE DEFAULT CURRENT_DATE,
    piezas          JSONB DEFAULT '[]'::jsonb,
    notas           TEXT,
    creado_en       TIMESTAMPTZ DEFAULT now(),
    actualizado_en  TIMESTAMPTZ DEFAULT now()
);
```

**Piezas en JSONB:** reemplaza la tabla `odontograma_piezas`. Formato de filas:

```json
[
  {"pieza": 11, "superficie": "oclusal", "condicion": "sano", "obs": ""},
  {"pieza": 21, "superficie": "vestibular", "condicion": "caries", "obs": "cavitada"}
]
```

**Condiciones válidas:** `sano`, `caries`, `restauracion`, `ausente`, `corona`, `implante`, `endodoncia`, `extraccion`, `protesis`, `fractura`, `mancha`, `otro`.

---

## 8. Tabla: diagnosticos

```sql
CREATE TABLE diagnosticos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id      UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    paciente_id     UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    odontologo_id   UUID NOT NULL REFERENCES perfiles(id),
    numero_pieza    INTEGER,
    descripcion     TEXT NOT NULL,
    observaciones   TEXT,
    estado          TEXT DEFAULT 'activo'
                    CHECK (estado IN ('activo', 'inactivo', 'resuelto')),
    fecha_diagnostico DATE DEFAULT CURRENT_DATE,
    creado_en       TIMESTAMPTZ DEFAULT now(),
    actualizado_en  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_diagnosticos_paciente ON diagnosticos(paciente_id);
```

---

## 9. Tabla: planes_tratamiento

```sql
CREATE TABLE planes_tratamiento (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id      UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    paciente_id     UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    odontologo_id   UUID NOT NULL REFERENCES perfiles(id),
    titulo          TEXT,
    estado          TEXT DEFAULT 'propuesto'
                    CHECK (estado IN ('propuesto', 'aceptado', 'en_proceso', 'completado', 'cancelado')),
    costo_total     NUMERIC(10,2) DEFAULT 0,
    notas           TEXT,
    creado_en       TIMESTAMPTZ DEFAULT now(),
    actualizado_en  TIMESTAMPTZ DEFAULT now()
);
```

---

## 10. Tabla: procedimientos_tratamiento

```sql
CREATE TABLE procedimientos_tratamiento (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id              UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    plan_tratamiento_id     UUID NOT NULL REFERENCES planes_tratamiento(id) ON DELETE CASCADE,
    servicio_id             UUID REFERENCES servicios(id),
    numero_pieza            INTEGER,
    descripcion             TEXT NOT NULL,
    prioridad               TEXT DEFAULT 'normal'
                            CHECK (prioridad IN ('urgente', 'alta', 'normal', 'baja')),
    costo                   NUMERIC(10,2) DEFAULT 0,
    estado                  TEXT DEFAULT 'pendiente'
                            CHECK (estado IN ('pendiente', 'en_proceso', 'completado', 'cancelado')),
    creado_en               TIMESTAMPTZ DEFAULT now(),
    actualizado_en          TIMESTAMPTZ DEFAULT now()
);
```

---

## 11. Tabla: evoluciones_clinicas

```sql
CREATE TABLE evoluciones_clinicas (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id              UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    paciente_id             UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    odontologo_id           UUID NOT NULL REFERENCES perfiles(id),
    plan_tratamiento_id     UUID REFERENCES planes_tratamiento(id),
    procedimiento_id        UUID REFERENCES procedimientos_tratamiento(id),
    numero_pieza            INTEGER,
    fecha_consulta          DATE DEFAULT CURRENT_DATE,
    motivo_consulta         TEXT,
    procedimiento_realizado TEXT,
    observaciones           TEXT,
    indicaciones            TEXT,
    proxima_atencion        DATE,
    creado_en               TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_evoluciones_paciente ON evoluciones_clinicas(paciente_id);
CREATE INDEX idx_evoluciones_fecha ON evoluciones_clinicas(fecha_consulta);
```

---

## 12. Tabla: horarios (Disponibilidad del odontólogo)

```sql
CREATE TABLE horarios (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id      UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    odontologo_id   UUID NOT NULL REFERENCES perfiles(id),
    dia_semana      INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
    hora_inicio     TIME NOT NULL,
    hora_fin        TIME NOT NULL,
    activo          BOOLEAN DEFAULT true,
    creado_en       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_horarios_odontologo ON horarios(odontologo_id);
```

**Nota:** la tabla `excepciones_horarios` (días bloqueados) se eliminó en el MVP; se gestiona como variable en la clínica.

---

## 13. Tabla: citas

```sql
CREATE TABLE citas (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id              UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    paciente_id             UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    odontologo_id           UUID NOT NULL REFERENCES perfiles(id),
    plan_tratamiento_id     UUID REFERENCES planes_tratamiento(id),
    fecha_cita              DATE NOT NULL,
    hora_inicio             TIME NOT NULL,
    hora_fin                TIME NOT NULL,
    estado                  TEXT DEFAULT 'reservada'
                            CHECK (estado IN ('reservada', 'confirmada', 'atendida', 'cancelada')),
    motivo_consulta         TEXT,
    notas                   TEXT,
    creado_en               TIMESTAMPTZ DEFAULT now(),
    actualizado_en          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_citas_clinica_fecha ON citas(clinica_id, fecha_cita);
CREATE INDEX idx_citas_odontologo ON citas(odontologo_id, fecha_cita);
CREATE INDEX idx_citas_paciente ON citas(paciente_id);
```

**Nota:** estados simplificados de 6 a 4 (`en_espera` y `no_asistio` eliminados en el MVP).

---

## 14. Tabla: servicios

```sql
CREATE TABLE servicios (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id          UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    nombre              TEXT NOT NULL,
    descripcion         TEXT,
    precio_por_defecto  NUMERIC(10,2),
    duracion_minutos    INTEGER,
    activo              BOOLEAN DEFAULT true,
    creado_en           TIMESTAMPTZ DEFAULT now(),
    actualizado_en      TIMESTAMPTZ DEFAULT now()
);
```

**Nota:** se eliminó la tabla `especialidades`; el campo `especialidad` queda como texto en `perfiles`.

---

## 15. Tabla: presupuestos

```sql
CREATE TABLE presupuestos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id      UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    paciente_id     UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    odontologo_id   UUID NOT NULL REFERENCES perfiles(id),
    titulo          TEXT,
    descuento       NUMERIC(10,2) DEFAULT 0,
    total           NUMERIC(10,2) DEFAULT 0,
    estado          TEXT DEFAULT 'borrador'
                    CHECK (estado IN ('borrador', 'enviado', 'aceptado', 'rechazado')),
    valido_hasta    DATE,
    notas           TEXT,
    creado_en       TIMESTAMPTZ DEFAULT now(),
    actualizado_en  TIMESTAMPTZ DEFAULT now()
);
```

**Nota:** se eliminó el estado `vencido` (4 estados en el MVP).

---

## 16. Tabla: items_presupuesto

```sql
CREATE TABLE items_presupuesto (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id      UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    presupuesto_id  UUID NOT NULL REFERENCES presupuestos(id) ON DELETE CASCADE,
    servicio_id     UUID REFERENCES servicios(id),
    descripcion     TEXT NOT NULL,
    numero_pieza    INTEGER,
    cantidad        INTEGER DEFAULT 1,
    precio_unitario NUMERIC(10,2) NOT NULL,
    subtotal        NUMERIC(10,2) NOT NULL,
    creado_en       TIMESTAMPTZ DEFAULT now()
);
```

---

## 17. Tabla: pagos

```sql
CREATE TABLE pagos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id          UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    paciente_id         UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    presupuesto_id      UUID REFERENCES presupuestos(id),
    monto               NUMERIC(10,2) NOT NULL,
    metodo_pago         TEXT DEFAULT 'efectivo'
                        CHECK (metodo_pago IN ('efectivo', 'qr', 'transferencia', 'otro')),
    fecha_pago          DATE DEFAULT CURRENT_DATE,
    codigo_referencia   TEXT,
    notas               TEXT,
    estado              TEXT DEFAULT 'confirmado'
                        CHECK (estado IN ('pendiente', 'confirmado', 'rechazado')),
    registrado_por      UUID REFERENCES perfiles(id),
    creado_en           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pagos_paciente ON pagos(paciente_id);
CREATE INDEX idx_pagos_clinica ON pagos(clinica_id, fecha_pago);
```

**Nota:** se eliminó `codigo_qr_pago_id` (el QR del odontólogo es una imagen estática, no una tabla).

---

## 18. Row Level Security (RLS)

### 18.1 Funciones helper

```sql
CREATE OR REPLACE FUNCTION obtener_clinica_usuario()
RETURNS UUID AS $$
    SELECT clinica_id FROM perfiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION obtener_rol_usuario()
RETURNS TEXT AS $$
    SELECT rol FROM perfiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### 18.2 Políticas clave

```sql
-- Lectura pública de clínicas activas (búsqueda de afiliación)
CREATE POLICY "clinicas_busqueda_publica" ON clinicas
    FOR SELECT USING (activo = true);

-- Recepcionista y odontólogo ven todos los pacientes de su clínica
CREATE POLICY "pacientes_acceso_clinica" ON pacientes
    FOR ALL USING (clinica_id = obtener_clinica_usuario());

-- Paciente solo ve sus propios datos
CREATE POLICY "pacientes_datos_propios" ON pacientes
    FOR SELECT
    USING (
        perfil_id = auth.uid()
        OR obtener_rol_usuario() IN ('recepcionista', 'odontologo')
    );
```

### 18.3 Patrón de RLS para cada tabla con `clinica_id`

```sql
ALTER TABLE {tabla} ENABLE ROW LEVEL SECURITY;

CREATE POLICY "{tabla}_acceso_clinica" ON {tabla}
    FOR ALL
    USING (clinica_id = obtener_clinica_usuario());
```

---

## 19. Índices

```sql
-- Búsquedas frecuentes
CREATE INDEX idx_perfiles_clinica ON perfiles(clinica_id);
CREATE INDEX idx_perfiles_email ON perfiles(email);
CREATE INDEX idx_citas_estado ON citas(estado);
CREATE INDEX idx_pagos_estado ON pagos(estado);
CREATE INDEX idx_planes_tratamiento_estado ON planes_tratamiento(estado);

-- Búsqueda de texto en pacientes
CREATE INDEX idx_pacientes_busqueda ON pacientes
    USING gin(to_tsvector('spanish', nombre_completo || ' ' || COALESCE(ci, '')));
```

**Nota:** se eliminó `idx_clinicas_geo` (búsqueda por radio de la versión original) y los índices de las tablas eliminadas.

---

## 20. Triggers

```sql
CREATE OR REPLACE FUNCTION actualizar_fecha_modificacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_perfiles_actualizar
    BEFORE UPDATE ON perfiles FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_modificacion();

CREATE TRIGGER trigger_pacientes_actualizar
    BEFORE UPDATE ON pacientes FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_modificacion();

-- ... aplicar a todas las tablas con columna actualizado_en
```

---

## 21. Relaciones entre Tablas

```
clinicas (1) ──── (N) perfiles
clinicas (1) ──── (N) pacientes
clinicas (1) ──── (N) servicios

perfiles (1) ──── (N) pacientes
perfiles (1) ──── (N) odontogramas
perfiles (1) ──── (N) diagnosticos
perfiles (1) ──── (N) planes_tratamiento
perfiles (1) ──── (N) evoluciones_clinicas
perfiles (1) ──── (N) horarios
perfiles (1) ──── (N) citas
perfiles (1) ──── (N) presupuestos

pacientes (1) ──── (1) historiales_clinicos
pacientes (1) ──── (N) odontogramas
pacientes (1) ──── (N) diagnosticos
pacientes (1) ──── (N) planes_tratamiento
pacientes (1) ──── (N) evoluciones_clinicas
pacientes (1) ──── (N) citas
pacientes (1) ──── (N) presupuestos
pacientes (1) ──── (N) pagos

planes_tratamiento (1) ──── (N) procedimientos_tratamiento
presupuestos (1) ──── (N) items_presupuesto

citas (1) ──── (N) evoluciones_clinicas
planes_tratamiento (1) ──── (N) evoluciones_clinicas
```

---

## 22. Resumen para Defensa

### Conceptos clave:
1. **Multi-tenant:** Todas las tablas tienen `clinica_id` para aislar datos
2. **RLS:** Row Level Security filtra datos según el usuario autenticado
3. **JWT:** El token contiene `clinica_id` y `rol` para autorización
4. **15 tablas** que cubren los 9 módulos del MVP (antes 25 tablas / 15 módulos)

### Flujo de datos:
```
Usuario se autentica → JWT con clinic_id y rol
        ↓
RLS filtra datos por clinic_id
        ↓
Solo ve datos de su clínica
```

### Tablas principales (las que más se usan):
1. `perfiles` - Usuarios del sistema
2. `pacientes` - Datos de pacientes
3. `odontogramas` - Estado dental (piezas en JSONB)
4. `planes_tratamiento` + `procedimientos_tratamiento` - Tratamientos
5. `citas` - Agenda
6. `pagos` - Control de pagos

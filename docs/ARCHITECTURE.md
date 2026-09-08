# ARCHITECTURE - Arquitectura Técnica

## 1. Stack Tecnológico

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND                              │
│                                                         │
│  React 18+  │  Vite  │  TypeScript  │  Tailwind CSS    │
│  shadcn/ui  │  React Router  │  Zustand               │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                    BACKEND (BaaS)                        │
│                                                         │
│  Supabase                                             │
│  ├── Auth (autenticación + JWT)                        │
│  ├── PostgreSQL (base de datos)                        │
│  ├── Row Level Security (aislamiento multi-tenant)     │
│  ├── Storage (archivos e imágenes)                     │
│  └── Edge Functions (lógica server-side si necesaria)  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                    DEPLOY                                │
│                                                         │
│  HostGator (archivos estáticos)                        │
│  └── Build de Vite → index.html + assets estáticos     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Arquitectura del Proyecto

```
midentista/
├── public/                    # Archivos estáticos
│   ├── favicon.ico
│   └── images/
│       └── odontograma/       # Imágenes del odontograma
│
├── src/
│   ├── app/                   # Configuración de la app
│   │   ├── routes.tsx         # Definición de rutas
│   │   ├── providers.tsx      # Providers globales
│   │   └── layout.tsx         # Layout raíz
│   │
│   ├── components/            # Componentes compartidos
│   │   ├── ui/                # Componentes shadcn/ui
│   │   ├── layout/            # Sidebar, Header, etc.
│   │   ├── shared/            # Componentes reutilizables
│   │   └── forms/             # Componentes de formulario
│   │
│   ├── features/              # Módulos funcionales
│   │   ├── auth/
│   │   │   ├── components/    # LoginForm, RegisterForm
│   │   │   ├── hooks/         # useAuth
│   │   │   ├── services/      # auth.service.ts
│   │   │   └── types/         # auth.types.ts
│   │   │
│   │   ├── patients/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── types/
│   │   │
│   │   ├── medical-records/
│   │   ├── odontogram/
│   │   ├── diagnoses/
│   │   ├── treatments/
│   │   ├── evolutions/
│   │   ├── appointments/
│   │   ├── budgets/
│   │   └── payments/
│   │
│   ├── lib/                   # Utilidades
│   │   ├── supabase.ts        # Cliente de Supabase
│   │   ├── utils.ts           # Utilidades generales
│   │   ├── constants.ts       # Constantes
│   │   └── validations.ts     # Validaciones compartidas
│   │
│   ├── hooks/                 # Hooks compartidos
│   │   ├── use-clinic.ts      # Contexto de clínica
│   │   ├── use-pagination.ts
│   │   └── use-debounce.ts
│   │
│   ├── stores/                # Estado global
│   │   ├── auth.store.ts
│   │   └── clinic.store.ts
│   │
│   └── types/                 # Tipos globales
│       ├── database.ts        # Tipos generados de Supabase
│       └── index.ts
│
├── supabase/
│   ├── migrations/            # Migraciones de BD
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   └── 003_triggers.sql
│   ├── seed.sql               # Datos de prueba
│   └── config.toml            # Configuración de Supabase
│
├── docs/                      # Documentación
│   ├── SPEC.md
│   ├── DATABASE.md
│   ├── USER-STORIES.md
│   ├── TASKS.md
│   ├── ARCHITECTURE.md
│   └── modules/
│
├── scripts/                   # Scripts útiles
│   ├── generate-types.sh      # Generar tipos de BD
│   └── seed.sh                # Ejecutar seed
│
├── .env.example               # Variables de entorno
├── .eslintrc.cjs              # Configuración ESLint
├── .prettierrc                # Configuración Prettier
├── components.json            # Configuración de shadcn
├── index.html                 # Entry point HTML
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

---

## 3. Variables de Entorno

```env
# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxxxx

# App
VITE_APP_NAME=MiDentista
VITE_APP_URL=https://midentista.tudominio.com
```

---

## 4. Configuración de Supabase

### 4.1 Cliente de Supabase

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
```

### 4.2 Estructura del JWT

El JWT de Supabase contiene:

```json
{
  "sub": "uuid-del-usuario",
  "email": "usuario@email.com",
  "role": "authenticated",
  "app_metadata": {
    "role": "odontologo",
    "clinic_id": "uuid-de-la-clinica"
  },
  "user_metadata": {
    "full_name": "Dr. Juan Pérez"
  }
}
```

### 4.3 Row Level Security

Cada tabla con datos tiene RLS habilitado. Las políticas usan:

```sql
-- Obtener clinic_id del usuario actual
auth.user_clinic_id()  -- Retorna UUID

-- Obtener rol del usuario actual
auth.user_role()       -- Retorna TEXT
```

**Patrón estándar:**

```sql
-- Admin y odontólogo ven todo de su clínica
CREATE POLICY "{tabla}_clinic_access" ON {tabla}
    FOR ALL
    USING (clinic_id = auth.user_clinic_id());

-- Paciente solo ve sus propios datos
CREATE POLICY "{tabla}_patient_access" ON {tabla}
    FOR SELECT
    USING (
        patient_id = (SELECT patient_id FROM profiles WHERE id = auth.uid())
        OR auth.user_role() IN ('recepcionista', 'odontologo')
    );
```

---

## 5. Componentes Principales

### 5.1 Layout de la Aplicación

```
┌──────────────────────────────────────────┐
│  Header (logo, notificaciones, perfil)   │
├──────────┬───────────────────────────────┤
│          │                               │
│ Sidebar  │        Content Area           │
│ (menú)   │        <Outlet />             │
│          │                               │
│          │                               │
│          │                               │
└──────────┴───────────────────────────────┘
```

### 5.2 Sidebar según Rol

**Recepcionista (MVP):**
```
Pacientes
Agenda
Presupuestos
Pagos
```

**Odontólogo (MVP):**
```
Pacientes
├── Historia Clínica
├── Odontograma
├── Diagnósticos
├── Plan de Tratamiento
└── Evolución Clínica
Agenda
Presupuestos
Pagos
```

**Paciente (MVP):**
```
Mi Perfil
Mis Citas
Mi Tratamiento
Mis Pagos
```

> **Nota de alcance:** los módulos de Archivos, Consentimientos, Dashboard avanzado y Configuración avanzada quedan para la **versión 2** y no se listan en el MVP.

### 5.3 Ficha del Paciente

```
┌─────────────────────────────────────────┐
│  👤 Juan Pérez                          │
│  CI: 1234567  Edad: 32  Tel: 70000000  │
├─────────────────────────────────────────┤
│  [Historia] [Odontograma] [Diagnóstico]│
│  [Tratamiento] [Evolución] [Pagos]      │
├─────────────────────────────────────────┤
│                                         │
│  Contenido del módulo seleccionado      │
│                                         │
└─────────────────────────────────────────┘
```

---

## 6. Flujo de Autenticación

```
1. Usuario ingresa email + contraseña
         │
         ▼
2. Supabase Auth valida credenciales
         │
         ▼
3. Se genera JWT con:
   - user_id
   - clinic_id (de profiles)
   - role (de profiles)
         │
         ▼
4. El JWT se almacena en localStorage
         │
         ▼
5. Cada request a Supabase incluye el JWT
         │
         ▼
6. RLS filtra datos por clinic_id
         │
         ▼
7. El frontend renderiza según el role
```

---

## 7. Flujo Multi-Tenant

```
┌─────────────────────────────────────┐
│          SUPABASE PROJECT           │
│                                     │
│  ┌─────────────────────────────┐    │
│  │     Tabla: patients         │    │
│  │                             │    │
│  │  id | clinic_id | name | ...│    │
│  │  ---|-----------|------|    │    │
│  │  1  | clinic-A  | Juan |    │    │
│  │  2  | clinic-B  | María|    │    │
│  │  3  | clinic-A  | Pedro|    │    │
│  └─────────────────────────────┘    │
│                                     │
│  RLS Policy:                        │
│  WHERE clinic_id =                  │
│    (SELECT clinic_id FROM profiles  │
│     WHERE id = auth.uid())          │
│                                     │
│  Resultado:                         │
│  - Usuario de clinic-A solo ve      │
│    pacientes de clinic-A            │
│  - Usuario de clinic-B solo ve      │
│    pacientes de clinic-B            │
└─────────────────────────────────────┘
```

---

## 8. Storage de Archivos  *(VERSIÓN 2 - fuera del MVP)*

> En el **MVP** el módulo de archivos e imágenes está suspendido. Supabase Storage
> solo se usaría en el MVP para guardar el logo de la clínica y la imagen QR fija
> del odontólogo. La estructura de carpetas completa es para la versión 2.

### 8.1 Estructura de carpetas

```
clinic-files/
├── clinic-uuid-1/
│   ├── pacientes/
│   │   ├── patient-uuid-1/
│   │   │   ├── fotografias/
│   │   │   ├── radiografias/
│   │   │   └── documentos/
│   │   └── patient-uuid-2/
│   │       └── ...
│   ├── consentimientos/
│   └── qr-payments/
│       └── odontologo-uuid/
│
├── clinic-uuid-2/
│   └── ...
```

### 8.2 Límites

- **Tamaño máximo por archivo:** 10 MB
- **Almacenamiento por clínica:** 5 GB (configurable)
- **Formatos permitidos:** JPG, PNG, PDF
- ** bucket:** `clinic-files` (privado)

---

## 9. Deploy

### 9.1 Build para producción

```bash
npm run build
```

Genera archivos estáticos en `dist/`.

### 9.2 Deploy en HostGator

1. Ejecutar `npm run build`
2. Subir contenido de `dist/` por FTP al subdominio
3. Configurar redirección en `.htaccess` para SPA:

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
```

### 9.3 Variables de producción

Las variables de entorno de Supabase se compilan en el build (Vite las inyecta en el bundle). No se exponen en el cliente porque el `anon_key` es público por diseño. La seguridad está en RLS.

---

## 10. Dependencias Principales

```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "react-router-dom": "^6.x",
    "@supabase/supabase-js": "^2.x",
    "zustand": "^4.x",
    "class-variance-authority": "^0.7.x",
    "clsx": "^2.x",
    "tailwind-merge": "^2.x",
    "lucide-react": "^0.x",
    "date-fns": "^3.x",
    "jspdf": "^2.x"
  },
  "devDependencies": {
    "@types/react": "^18.x",
    "typescript": "^5.x",
    "vite": "^5.x",
    "tailwindcss": "^3.x",
    "autoprefixer": "^10.x",
    "postcss": "^8.x",
    "eslint": "^8.x",
    "prettier": "^3.x"
  }
}
```

---

## 11. Convenciones de Código

### 11.1 Nomenclatura

| Tipo | Convención | Ejemplo |
|------|-----------|---------|
| Archivos | kebab-case | `patient-list.tsx` |
| Componentes | PascalCase | `PatientList` |
| Funciones | camelCase | `getPatientById` |
| Tablas BD | snake_case | `medical_records` |
| Constantes | UPPER_SNAKE | `MAX_FILE_SIZE` |
| Tipos/Interfaces | PascalCase | `Patient`, `MedicalRecord` |

### 11.2 Estructura de un módulo

```
features/
└── patients/
    ├── components/
    │   ├── PatientList.tsx
    │   ├── PatientForm.tsx
    │   ├── PatientFile.tsx
    │   └── PatientSearch.tsx
    ├── hooks/
    │   ├── usePatients.ts
    │   └── usePatient.ts
    ├── services/
    │   └── patients.service.ts
    ├── types/
    │   └── patients.types.ts
    └── index.ts              # Exportaciones públicas
```

### 11.3 Servicio de ejemplo

```typescript
// features/patients/services/patients.service.ts
import { supabase } from '@/lib/supabase'
import type { Patient, PatientInsert, PatientUpdate } from '../types/patients.types'

export const patientsService = {
  async list(clinicId: string, page = 1, pageSize = 20) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count } = await supabase
      .from('patients')
      .select('*', { count: 'exact' })
      .eq('clinic_id', clinicId)
      .order('full_name')
      .range(from, to)

    return { data, count }
  },

  async getById(id: string) {
    const { data } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single()

    return data
  },

  async create(patient: PatientInsert) {
    const { data } = await supabase
      .from('patients')
      .insert(patient)
      .select()
      .single()

    return data
  },

  async update(id: string, patient: PatientUpdate) {
    const { data } = await supabase
      .from('patients')
      .update(patient)
      .eq('id', id)
      .select()
      .single()

    return data
  },

  async search(clinicId: string, query: string) {
    const { data } = await supabase
      .from('patients')
      .select('*')
      .eq('clinic_id', clinicId)
      .or(`full_name.ilike.%${query}%,ci.ilike.%${query}%,phone.ilike.%${query}%`)
      .order('full_name')
      .limit(20)

    return data
  }
}
```

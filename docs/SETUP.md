# SETUP - Guía de Inicio del Proyecto

## 1. Requisitos Previos

- Node.js 18+ (recomendado: 20 LTS)
- npm o yarn
- Git
- Cuenta en Supabase (supabase.com)
- Editor: VS Code (recomendado)

---

## 2. Instalación

### 2.1 Clonar el repositorio

```bash
git clone https://github.com/tu-org/midentista.git
cd midentista
```

### 2.2 Instalar dependencias

```bash
npm install
```

### 2.3 Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con tus credenciales de Supabase:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
VITE_APP_NAME=MiDentista
VITE_APP_URL=http://localhost:5173
```

### 2.4 Configurar Supabase

1. Crear proyecto en Supabase
2. Obtener URL y anon key desde Settings > API
3. Ejecutar las migraciones de BD (ver `supabase/migrations/`)
4. Habilitar RLS en todas las tablas
5. Configurar Storage bucket

### 2.5 Iniciar desarrollo

```bash
npm run dev
```

La app estará disponible en `http://localhost:5173`

---

## 3. Comandos Disponibles

```bash
# Desarrollo
npm run dev              # Servidor de desarrollo

# Build
npm run build            # Build para producción
npm run preview          # Preview del build

# Linting
npm run lint             # Verificar lint
npm run lint:fix         # Corregir lint automáticamente

# Tipos
npm run typecheck        # Verificar tipos TypeScript

# Supabase
npm run db:generate      # Generar tipos de BD
npm run db:push          # Push de migraciones
npm run db:seed          # Ejecutar datos de prueba
```

---

## 4. Estructura de Trabajo

### 4.1 Branches

```
main          ← Producción (deploy automático)
├── develop   ← Desarrollo integrado
│   ├── feature/auth-login
│   ├── feature/patient-crud
│   ├── feature/odontogram
│   └── ...
```

### 4.2 Flujo de trabajo

1. Crear branch desde `develop`
2. Desarrollar la funcionalidad
3. Crear PR hacia `develop`
4. Code review
5. Merge a `develop`
6. Al final de fase: merge `develop` → `main` para deploy

### 4.3 Convenciones de commits

```
feat(auth): add login page
feat(patients): create patient form
fix(odontogram): fix tooth selection
docs(spec): update user stories
chore(deps): update dependencies
```

---

## 5. Variables de Entorno por Ambiente

### Desarrollo (.env.local)

```env
VITE_SUPABASE_URL=https://dev.supabase.co
VITE_SUPABASE_ANON_KEY=dev-key
VITE_APP_URL=http://localhost:5173
```

### Producción (.env.production)

```env
VITE_SUPABASE_URL=https://prod.supabase.co
VITE_SUPABASE_ANON_KEY=prod-key
VITE_APP_URL=https://midentista.tudominio.com
```

---

## 6. Deploy

### Build

```bash
npm run build
```

### Subir a HostGator

1. Acceder al cPanel de HostGator
2. Ir a File Manager
3. Navegar al subdominio configurado
4. Subir todo el contenido de la carpeta `dist/` por FTP
5. Crear/configurar `.htaccess` para SPA:

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
```

---

## 7. Configuración de Supabase

### 7.1 Tablas iniciales (MVP)

Ejecutar el schema MVP (`../supabase_schema_mvp.sql`):
1. `001_initial_schema.sql` - Tablas principales
2. `002_rls_policies.sql` - Políticas de seguridad
3. `003_triggers.sql` - Triggers y funciones

### 7.2 Storage *(VERSIÓN 2 - fuera del MVP)*

En el MVP los archivos están suspendidos: Storage solo guarda el logo y el QR fijo.

### 7.3 Auth

1. Habilitar Email/Password en Auth settings
3. Deshabilitar confirmación de email para desarrollo (opcional)

---

## 8. Integrantes del Equipo

| Dev | Módulos Asignados (MVP) | Jira User |
|-----|-------------------------|-----------|
| Dev 1 | Auth/Onboarding, Agenda/Citas | user-1 |
| Dev 2 | Pacientes, Diagnóstico/Tratamiento, Presupuestos | user-2 |
| Dev 3 | Historia Clínica, Evolución, Pagos | user-3 |
| Dev 4 | Odontograma | user-4 |
| Dev 5 | Setup BD/Auth, Diagnóstico/Tratamiento | user-5 |
| Dev 6 | Setup proyecto, Deploy | user-6 |

> **Nota de alcance:** los módulos de Dashboard, Configuración, Archivos,
> Consentimientos y Usuarios/Roles avanzados quedan para la **versión 2** y
> ya no forman parte del asignado del MVP de 3 meses.

---

## 9. Recursos Útiles

- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
- [React Router](https://reactrouter.com)
- [Zustand](https://zustand-demo.pmnd.rs)
- [Vite](https://vitejs.dev)

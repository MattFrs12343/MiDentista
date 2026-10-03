# AGENTS.md — MiDentista

Instrucciones para cualquier agente de IA (Claude Code, opencode, Cursor) que
trabaje en este repositorio. **Leer completo antes de modificar una sola línea.**

Este equipo son seis personas trabajando en paralelo sobre el mismo repositorio.
La regla que más rápido rompe el proyecto no es escribir código malo: es que dos
personas toquen el mismo archivo y se pisen en el merge.

---

## 1. Identidad

- **Matías Franco** — Dev 1, `@MattFrs12343`, Product Owner.
  Único autorizado para mergear a `main`, aplicar migraciones y desplegar.
- Los demás integrantes no son este agente. No se atribuyan tareas de otra
  persona, no firmen commits como otro autor y no modifiquen su bitácora.

## 2. La regla que evita los conflictos

> **Cada persona crea archivos nuevos dentro de la carpeta de su módulo y nada más.**

Es permisible —y necesario— **leer** archivos de otros. Es incorrecto **escribirlos**.

### Carpetas con dueño exclusivo

| Carpeta | Dueño | Módulo |
|---------|-------|--------|
| `frontend/src/features/evolucion/` | Lucas | 06 Evolución Clínica |
| `frontend/src/features/presupuestos/` | Bianca | 08 Presupuestos |
| `frontend/src/features/pagos/` | Carlos | 09 Pagos y Cuentas |
| `frontend/src/features/dashboard/` | Melissa | 13 Dashboard |
| `frontend/src/features/archivos/` | Angélica | 10 Archivos e Imágenes |
| `frontend/src/features/agenda/` | Matías | 07 Agenda/Citas |
| `frontend/src/features/odontogram/` | Matías | 04 Odontograma 3D |
| `frontend/src/features/planta/` | Matías | 12 Gestión de Clínica (planta 2D + 3D) |
| `frontend/src/features/clinical/` | — ya construido | 03 Historia Clínica |
| `frontend/src/features/treatment/` | — ya construido | 05 Diagnóstico/Tratamiento |

### Archivos de integración: solo Matías

Estos se editan **una vez por merge**, en el commit de integración de Matías.
Nadie más los abre:

- `frontend/src/App.tsx` — registro de rutas
- `frontend/src/components/layout/Sidebar.tsx` — entradas de navegación
- `frontend/src/features/patients/PatientProfilePage.tsx` — pestañas de la ficha
- `frontend/src/features/patients/tabValue.ts` — unión de pestañas
- `frontend/src/data/store.tsx` — store en memoria compartido
- `frontend/src/types/index.ts` — tipos compartidos
- `frontend/src/index.css` — tokens de diseño
- `frontend/src/components/ui/*` — primitivas
- `bd_5clinicas_midentista.sql`, `supabase/`
- `docs/DATABASE.md`, `docs/ARCHITECTURE.md`, `docs/SPEC.md`, `CONTRIBUTING.md`

**Cómo se evita el conflicto:** si un módulo necesita una ruta nueva, el
integrante **no edita `App.tsx`**. Crea su componente en su carpeta y avisa en su
PR: *"necesito la ruta `/app/presupuestos`"*. Matías añade el `lazy()` y el
`<Route>` durante el merge. El merge de cada módulo son tres líneas.

## 3. Prohibido el 3D para todos salvo Matías

Nadie debe crear ni modificar nada de esto sin autorización explícita del PO:

- `three`, `@react-three/fiber`, `@react-three/drei`
- `frontend/public/models/dental-arch.glb`
- cualquier componente 2.5D, isométrico o con `OrbitControls`

La odontología 3D, la planta de consultorios y los mapas de calor son de Matías.
Si un módulo necesita un gráfico, usa SVG con los componentes de
`components/ui/` y `mapa-calor.tsx` (que ya es SVG puro).

## 4. Acceso a datos: cada módulo con su propio servicio

No añadir slices a `data/store.tsx`. Cada módulo tiene su servicio y su mapper,
siguiendo el patrón de `features/clinical/`:

```
features/<modulo>/
  tipos.ts                 # tipos propios, NO van a types/index.ts
  <modulo>Mapper.ts        # tipos de fila + esUuid + filaDesde/paraGuardar
  <modulo>Service.ts       # carga/guarda, con obtenerSupabase()
  README.md                # contrato de propiedad
```

Reglas que ya se aplicando en `features/clinical/`:

- Solo se aceptan UUIDs reales; los ids de demo (`p1`, `p_...`) se rechazan antes
  de tocar la red.
- Un `SELECT` vacío puede deberse a RLS, no a que el dato no exista.
- Nunca conflir `null` con éxito.
- No pisar contenido previo si una escritura falla.
- Las escrituras concurrentes del mismo hook se rechazan, no se encolan.

## 5. Antes de cada commit

```sh
cd frontend
npm run build    # tsc -b && vite build
npm run lint     # oxlint
node --test src/features/<modulo>/*.test.ts
```

`tsconfig.app.json` es estricto: `noUnusedLocals`, `noUnusedParameters`,
`verbatimModuleSyntax` (usar `import type`) y `erasableSyntaxOnly` (prohibidos
los `enum`, los `namespace` y las parameter properties). Todo lo que haya bajo
`src/` se typechequea, aunque todavía no esté conectado a la app.

## 6. Ramas y merges

- Rama propia: `feature/modulo-XX-tu-nombre`. Nunca directo sobre `main`.
- Orden de merge acordado: **06 → 08 → 09 → 13 / 10**.
  El 09 consume el contrato de lectura del 08, por eso va después.
- Un PR por módulo. Un merge por PR, revisado por Matías.

## 7. Base de datos

Cambios de esquema, RLS o migraciones **requieren aprobación previa de Matías**
(ver `CONTRIBUTING.md`). Para escribir SQL sin colisión, cada quien deja su
propuesta en un archivo propio —`docs/modules/<modulo>/sql.sql`— y Matías la
integra en `bd_5clinicas_midentista.sql`.

## 8. Bitácora

Al terminar una tarea del checklist, registrar la entrada en
`docs/bitacoras/<tu-nombre>.md` con fecha, ID (`T-6.3`, `US-8.1`), qué se hizo,
estado y horas. El comando `/bitacora` ayuda a redactarla.

## 9. Reglas de la casa

- Documentación y comentarios en **español**.
- Nunca versionar secretos: claves de Supabase, tokens de Jira. `.claude/` y
  `*.local` están en `.gitignore`.
- No eliminar datos de producción. Este proyecto maneja información clínica de
  pacientes: los cambios destructivos se confirman con Matías antes de escribirse.

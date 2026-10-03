# Política de cambios y migraciones - MiDentista

## Product Owner

**Matías** (Dev 1, [@MattFrs12343](https://github.com/MattFrs12343)) es el
Product Owner del proyecto. Ninguna persona del equipo (Bianca, Carlos,
Melissa, Angélica, Lucas) aplica los siguientes cambios sin su aprobación
previa:

- Migraciones o cambios de esquema de base de datos (`bd_5clinicas_midentista.sql`,
  `supabase/migrations/`, cualquier `CREATE TABLE`, `ALTER TABLE`, política RLS
  nueva o modificada).
- Cambios en `docs/DATABASE.md` o `docs/ARCHITECTURE.md` (son los documentos
  que describen el esquema y la arquitectura del sistema).
- Cambios de alcance del MVP (agregar o quitar funcionalidad respecto a lo que
  ya está definido en `docs/SPEC.md` y `docs/modules/`).
- Despliegue a producción (HostGator) — lo ejecuta únicamente Matías.
- Merge a la rama `main`.

## Por qué existe esta regla

El equipo está empezando a usar herramientas de IA (como Claude Code) para
programar. Una IA puede generar cambios de base de datos o de arquitectura
que parecen correctos pero rompen el aislamiento multi-tenant (RLS), la
consistencia del esquema, o el alcance acordado del MVP. Revisar antes de
aplicar evita que un cambio mal entendido rompa el proyecto para todo el
equipo.

## Cómo proponer un cambio

1. Trabaja en tu propia rama (`feature/modulo-XX-descripcion`), nunca
   directamente sobre `main`.
2. Si tu cambio toca base de datos, arquitectura o alcance, avisa a Matías
   **antes** de escribir el código (no solo antes de mergear) — puede ahorrar
   trabajo si la idea necesita ajustarse.
3. Abre un Pull Request hacia `main`. Matías debe aprobarlo antes de que se
   pueda mergear.
4. Cambios que **no** requieren aprobación previa (pero sí PR revisado):
   trabajo normal dentro de tu propio módulo que no toca el esquema de BD ni
   la arquitectura — componentes, formularios, servicios, historias de
   usuario ya definidas en `docs/modules/`.

## Propiedad de archivos: cómo se evitan los conflictos

Seis personas trabajan en paralelo sobre el mismo repositorio. El conflicto de
merge no viene de escribir mal, sino de que dos personas editen el mismo archivo.
Para evitarlo, el equipo aplica una regla de propiedad:

> **Cada persona crea archivos nuevos dentro de la carpeta de su módulo y nada más.**

**Leer** archivos de otros módulos es permisible y necesario. **Escribirlos** no.

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

### Archivos de integración: solo Matías

Estos se editan una vez por merge, en el commit de integración de Matías.
Nadie más los abre:

- `frontend/src/App.tsx`
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/features/patients/PatientProfilePage.tsx`
- `frontend/src/features/patients/tabValue.ts`
- `frontend/src/data/store.tsx`
- `frontend/src/types/index.ts`
- `frontend/src/index.css` y `frontend/src/components/ui/*`

Si tu módulo necesita una ruta o una pestaña nueva, **no edites esos archivos**.
Crea el componente en tu carpeta y menciónalo en el PR: *"necesito la ruta
`/app/presupuestos`"*. Matías añade el import y el tag durante el merge, que son
unas pocas líneas.

### Base de datos

`bd_5clinicas_midentista.sql` es un archivo único y compartido: lo edita solo
Matías. Si tu módulo necesita una tabla o una política nueva, deja el SQL en un
archivo propio —`docs/modules/<modulo>/sql.sql`— y Matías lo integra. Así dos
personas pueden proponer esquema en el mismo sprint sin pisarse.

## Orden de merge

Los módulos se integran de uno en uno, en este orden:

1. **06 Evolución** (Lucas) — no depende de nadie.
2. **08 Presupuestos** (Bianca) — publica su contrato de lectura en las primeras 48 h.
3. **09 Pagos** (Carlos) — consume el contrato de lectura del 08.
4. **13 Dashboard** (Melissa) y **10 Archivos** (Angélica) — independientes entre sí.

El 09 va después del 08 porque el estado de cuenta necesita los totales de
presupuesto. Como el store y los archivos de integración los edita solo Matías en
cada merge, **nunca hay dos personas modificando el mismo archivo**: los merges se
serializan aunque el trabajo de código ocurra en paralelo.

## Ejemplo práctico: un PR sin conflictos

Bianca (módulo 08) entrega su carpeta y su contrato:

```
frontend/src/features/presupuestos/PresupuestosPage.tsx
frontend/src/features/presupuestos/presupuestoService.ts
frontend/src/features/presupuestos/presupuestoMapper.ts
frontend/src/features/presupuestos/tipos.ts
```

Su PR **no toca** `App.tsx` ni `store.tsx`. En la descripción escribe que necesita
la ruta `/app/presupuestos`. Al mergear, Matías añade en `App.tsx`:

```tsx
const PresupuestosPage = lazy(() =>
  import("@/features/presupuestos/PresupuestosPage").then((m) => ({ default: m.PresupuestosPage })),
);
// ...
<Route path="/app/presupuestos" element={<PresupuestosPage />} />
```

Carlos puede trabajar al mismo tiempo en `features/pagos/` e **importar** el
servicio de Bianca, porque importar no es editar.

## Referencia rápida: ¿necesito aprobación?

| Cambio | ¿Aprobación previa de Matías? |
|--------|-------------------------------|
| Nueva tabla, columna o índice | Sí |
| Nueva política RLS | Sí |
| Cambiar `docs/DATABASE.md` o `docs/ARCHITECTURE.md` | Sí |
| Agregar/quitar funcionalidad fuera de tu módulo asignado | Sí |
| Editar un archivo de otro módulo o un archivo de integración | Sí |
| Editar `bd_5clinicas_midentista.sql` | Sí (o deja el SQL en `docs/modules/<tu-modulo>/sql.sql`) |
| Desplegar a producción | Sí (lo hace Matías) |
| Crear componentes y servicios nuevos dentro de tu carpeta de módulo | No, pero sí PR revisado |
| Importar el servicio o los tipos de otro módulo | No |
| Corregir un bug dentro de tu módulo | No, pero sí PR revisado |

Ver también la asignación de equipo y las bitácoras en
[`docs/bitacoras/`](docs/bitacoras/README.md).

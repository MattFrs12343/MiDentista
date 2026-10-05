# Módulo 06 — Evolución Clínica

**Dueño: Lucas.** Carpeta con escritura exclusiva: `frontend/src/features/evolucion/`.

## Qué NO debes tocar

Estos archivos son de integración. Editarlos provoca conflicto con los demás módulos:

- `frontend/src/App.tsx` — aquí se registra la ruta
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/features/patients/PatientProfilePage.tsx` — aquí va la pestaña
- `frontend/src/features/patients/tabValue.ts` — aquí va el valor de la pestaña
- `frontend/src/types/index.ts` — tus tipos viven en `tipos.ts`
- `frontend/src/data/store.tsx` — tu servicio accede a Supabase por su cuenta
- `frontend/src/components/ui/*` e `index.css` — si necesitas un primitivo nuevo, pidelo

Cuando termines, escribe en el PR: **"necesito el tab `evolucion` en
`PatientProfilePage` y el valor `evolucion` en `tabValue`"**. Matías lo agrega.

## Archivos que ya existen aquí

| Archivo | Qué aporta |
|---------|-----------|
| `tipos.ts` | Tipos propios del módulo. Replican las columnas 1:1 |
| `evolucionMapper.ts` | Tipo de fila, `esUuid`, `evolucionDesdeFila`, `evolucionParaGuardar` |
| `evolucionService.ts` | `cargarEvoluciones`, `guardarEvolucion`, `actualizarEvolucion`, `registrarProximaAtencion` |
| `planesTratamientoMapper.ts` | Tipos de fila del módulo 05, `tituloDePlan`, y la traducción del desplegable |
| `planesTratamientoService.ts` | `cargarPlanes`, `cargarProcedimientos` — solo lectura |
| `usePlanesTratamiento.ts` | Hook de lectura con guarda de cargas concurrentes |
| `EvolutionTab.tsx`, `EvolutionForm.tsx`, `EvolutionTimeline.tsx`, `NextVisitPicker.tsx` | La UI de la pestaña |

## Vínculo con el plan de tratamiento (T-6.6)

La evolución se puede atribuir a un plan del módulo 05 y, dentro de él, a un
procedimiento concreto. Es **solo lectura**: este módulo no escribe en
`planes_tratamiento` ni en `procedimientos_tratamiento`.

Lo que **no** hace, a propósito: al registrar una atención no se cambia
`procedimientos_tratamiento.estado` a `completado`. El progreso del plan es del
módulo 05; si este módulo lo tocara, el plan mostraría un estado que cambió sin
que nadie lo decidiera. Queda anotado como pregunta abierta para Matías.

Dos detalles que conviene no romper:

- El desplegable usa el centinela `"ninguno"` para "sin plan", porque Radix
  Select rechaza `value=""`. `referenciaDesdeSeleccion` lo traduce a `null` y
  `evolucionService` valida que cualquier id que venga sea un UUID real, para que
  el centinela nunca llegue a Postgres como error de sintaxis.
- Si una atención tiene plan pero su título no se puede resolver —plan borrado, o
  un rol que no puede leerlo—, la línea de tiempo lo dice como "vinculado a un plan
  no disponible" en vez de inventar un nombre.

### Riesgo de integración conocido

`TreatmentTab.tsx` (módulo 05) lee los planes del **store en memoria**, pero
`store.tsx` los **escribe en Supabase**. Mientras esas dos rutas no se unan, un
plan creado desde la UI puede no aparecer en este selector, y el que se ve en la
pestaña 05 puede no ser el mismo que hay en la tabla. Se arregla en el módulo 05.

## Accesos a Supabase

La tabla ya existe: `evoluciones_clinicas` (`docs/DATABASE.md`, sección 11). **No
crees la tabla.** La tarea `T-6.1` de tu bitácora dice "crear tabla `evoluciones_clinicas`",
pero ya está creada en el esquema; tu trabajo es la capa de aplicación.

Solo se aceptan UUIDs reales. Los ids de demo (`p1`, `p2`, `p_...`) se rechazan
antes de tocar la red.

## Permisos esperados

Según la matriz de `docs/SPEC.md`:

| Rol | Acceso |
|-----|--------|
| `odontologo` | Escribe y lee |
| `odontologo_admin` | Escribe y lee (propietario de la clínica) |
| `recepcionista` | **Sin acceso** |
| `paciente` | Solo lectura, y solo de las suyas |

Un `SELECT` que devuelve `[]` puede deberse a RLS, no a que el dato no exista.
No concluyas que el paciente no tiene evoluciones sin distinguir los dos casos.

## Roles: pendiente de integración

El tipo `Role` ya declara `odontologo_admin`, pero la base de datos todavía lo
rechaza y `docs/SPEC.md` lo fusiona con `odontologo`. Matías lo corrige al integrar.
Tú no toques el SQL.

## Prohibido 3D

Nada de `three`, `@react-three/fiber` ni `dental-arch.glb` en este módulo. Si
necesitas un gráfico, usa SVG con `components/ui/` o `features/dashboard/mapa-calor.tsx`.

## Verificación

```sh
cd frontend
node --test src/features/evolucion/*.test.ts
npm run build
npm run lint
```

`npm run build` ejecuta `tsc -b`, que typechequea **todo** `src/`, así que tu
código se valida aunque todavía no esté conectado a la app. `tsconfig.app.json`
es estricto: `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax` (usa
`import type`) y `erasableSyntaxOnly` (prohibidos `enum` y parameter properties).

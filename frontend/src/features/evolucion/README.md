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

Los que te faltan crear: `EvolutionTab.tsx`, `EvolutionForm.tsx`,
`EvolutionTimeline.tsx`, `NextVisitPicker.tsx`,
`useEvolucionSupabase.ts` y los `.test.ts` del mapper y del servicio.

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

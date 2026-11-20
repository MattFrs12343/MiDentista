---
description: Arrancar la sesión de cierre de Bianca — Módulo 08 Presupuestos (PDF)
---

# /BitacoraBianca

Sos el asistente de **Bianca** (Dev 2) en el repo MiDentista. Es la recta
final del proyecto. El Módulo 08 ya está mergeado a `main`, integrado
(ruta `/app/presupuestos`, tablas en el esquema) y validado — no hay que
reconstruirlo. Lo único que queda por programar es **T-8.5: generación de
PDF**, la única tarea del módulo que quedó fuera del MVP y nunca se escribió.
Empezá a trabajar apenas se invoque este comando.

## Leé esto primero, completo

1. `AGENTS.md` (raíz) — propiedad de carpetas, qué no tocar, ramas, verificación.
2. `CONTRIBUTING.md` — qué cambios necesitan aprobación previa de Matías.
3. `frontend/src/features/presupuestos/README.md` — contrato del módulo.
4. `docs/modules/08-presupuestos/tasks.md` y `user-stories.md` (US-8.3, T-8.5).

Tu carpeta con escritura exclusiva es `frontend/src/features/presupuestos/`.
Podés **importar** `frontend/src/features/pagos/` (de Carlos), nunca
editarlo. No toques `App.tsx`, `Sidebar.tsx`, `store.tsx`, `types/index.ts`,
`index.css`, `components/ui/*` ni `bd_5clinicas_midentista.sql` — son de
Matías. Nada de `three`, `@react-three/fiber` ni `dental-arch.glb`.

## Tarea — Generar PDF del presupuesto (T-8.5 / US-8.3)

Hoy no existe ningún código de PDF en el módulo (confirmado: no hay ninguna
mención fuera del README). El proyecto no tiene instalada ninguna librería de
PDF (`frontend/package.json` no tiene `jspdf` ni similares).

1. **Antes de sumar una dependencia nueva**, confirmá con Matías si preferís
   una librería (ej. `jspdf` + `jspdf-autotable`) o una vista de impresión
   nativa del navegador (`window.print()` con una hoja de estilos
   `@media print` dedicada, cero dependencias nuevas). Si no hay respuesta
   todavía, programá la opción de impresión nativa: es la que no necesita
   aprobar una dependencia nueva y es consistente con un proyecto que hoy no
   trae ninguna librería de PDF.
2. Armá una vista de presupuesto lista para imprimir/exportar: encabezado de
   la clínica y el paciente, tabla de ítems (`PresupuestoItemsEditor`
   reutiliza los datos, pero la vista de impresión es de solo lectura, no el
   editor), subtotal, descuento y total — reutilizando **la misma fórmula**
   de `calculoTotal.ts` (no la reimplementes: la regla del módulo es que el
   total se calcula en un solo lugar).
3. Agregá la acción "Descargar PDF" (o "Imprimir") en `PresupuestosLista.tsx`
   y/o en el detalle de un presupuesto individual. Debe funcionar para
   cualquier estado del presupuesto (`borrador`, `enviado`, `aceptado`,
   `rechazado`) — es un documento de consulta, no cambia el ciclo de vida.
4. Si el total es $0 por un descuento mayor al subtotal, el PDF debe mostrar
   `0`, nunca un número negativo (misma regla que ya aplica `calculoTotal.ts`
   en la UI).
5. Sumá un test de la lógica pura que armás (ej. qué datos arma el documento
   a partir de un presupuesto), siguiendo el patrón de
   `calculoTotal.test.ts` / `presupuestoMapper.test.ts`.

## Antes de dar algo por terminado

```sh
cd frontend
node --test src/features/presupuestos/*.test.ts
npm run build
npm run lint
```

Si `npm run build` tira errores de tipos en archivos que **no** tocaste (por
ejemplo `Property 'tone' does not exist on type 'BadgeProps'` repetido en
módulos ajenos), no es tu código: es un problema de entorno local
(node_modules desincronizado). Probá `rm -rf node_modules && npm install`
antes de asumir que rompiste algo.

## Al cerrar

- Trabajá en tu rama (`feature/modulo-08-bianca` o la que ya exista en el
  remoto). Nunca commitees directo sobre `main`.
- La bitácora (`docs/bitacoras/bianca.md`) se llena sola con el hook de git
  (`git config core.hooksPath .githooks` si no lo activaste en esta máquina).
  No la edites a mano.
- No mergees a `main`, no toques archivos de integración, no apliques SQL. Si
  sumás una dependencia nueva al `package.json`, decilo explícito en el PR.

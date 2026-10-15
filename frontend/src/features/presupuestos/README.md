# Módulo 08 — Presupuestos

**Dueño: Bianca.** Carpeta con escritura exclusiva: `frontend/src/features/presupuestos/`.

## Qué NO debes tocar

- `frontend/src/App.tsx` — aquí se registra la ruta
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/types/index.ts` — tus tipos viven en `tipos.ts`
- `frontend/src/data/store.tsx` — tu servicio accede a Supabase por su cuenta
- `frontend/src/features/pagos/` — es de Carlos. Puedes **importar**, no editar
- `frontend/src/components/ui/*` e `index.css`
- `bd_5clinicas_midentista.sql` — la RLS se propone aparte (ver abajo)

Al terminar, escribe en el PR: **"necesito la ruta `/app/presupuestos`"**. Matías
la agrega junto con tu entrada en la barra lateral.

## Ruta transversal, no pestaña

Presupuestos es una pantalla de **recepción**: "cuánto se presupuestó a cada
paciente". Por eso `/app/presupuestos` es una ruta de listado transversal y no una
pestaña de la ficha del paciente — el mismo criterio que sigue el módulo 09 con
`/app/pagos`. El listado muestra los presupuestos de toda la clínica y desde ahí
se crea, edita, avanza de estado y elimina.

## Archivos que ya existían aquí (capa de datos)

| Archivo | Qué aporta |
|---------|-----------|
| `tipos.ts` | `Presupuesto`, `ItemPresupuesto`, `EstadoPresupuesto`, `Decimal` y `transicionValida` |
| `calculoTotal.ts` | Aritmética del presupuesto (única fuente de totales) |
| `presupuestoMapper.ts` | Traducción fila ↔ objetos, `esUuid` y los mappers `*ParaGuardar` |
| `presupuestoService.ts` | Carga y guarda contra Supabase |

## Archivos que aporta la entrega

| Archivo | Qué aporta |
|---------|-----------|
| `presupuestoFormato.ts` | `formatearMoneda`, `formatearFecha`, `hoyIso`, `ETIQUETA_ESTADO` y `transicionesDisponibles` |
| `servicioCatalogo.ts` | `Servicio`, `ServicioFila`, `cargarServicios` (catálogo de `servicios`, T-8.7) |
| `usePresupuestoSupabase.ts` | `cargarClinica` / `cargarUno` / `crear` / `actualizar` / `cambiarEstado` / `eliminar` con estado `{ presupuestos, cargando, guardando, error }` |
| `EstadoPresupuestoBadge.tsx` | Pastilla de color por estado |
| `PresupuestoItemsEditor.tsx` | Editor de partidas: desde el catálogo o partida libre (T-8.3 / T-8.7) |
| `PresupuestoForm.tsx` | Alta y edición, con total y descuento en vivo (T-8.2 / T-8.4) |
| `PresupuestosLista.tsx` | Tabla de presupuestos con acciones de estado, editar y eliminar (T-8.6 / T-8.8) |
| `PresupuestosPage.tsx` | La pantalla transversal `/app/presupuestos` |
| `calculoTotal.test.ts` | Aritmética del total, descuento y saldo (11 casos) |
| `presupuestoMapper.test.ts` | Mappers, `esUuid` y ciclo de vida (7 casos) |

Tareas cubiertas: **T-8.2, T-8.3, T-8.4, T-8.6, T-8.7, T-8.8**. T-8.1 (crear
tablas) y su RLS van como propuesta en `docs/modules/08-presupuestos/sql.sql`.
T-8.5 (PDF) queda fuera del MVP.

## El total se calcula en un solo lugar

`calculoTotal.ts` es la **única** fórmula. La UI la usa para mostrar el total en
vivo (`totalPresupuesto` + `itemsConSubtotal`) y el servicio la vuelve a correr
antes de guardar, para no confiar en un número que llega del formulario. No
dupliques el cálculo: si la pantalla multiplica por su lado y el servicio por el
suyo, el mismo presupuesto termina con dos cifras distintas.

Detalles que no son obvios:

- El total se redondea a dos decimales (`NUMERIC(10,2)`) y **nunca es negativo**:
  un descuento mayor que el subtotal lo deja en `0`, no en rojo.
- `aNumero` tolera el `NUMERIC` de Postgres, que llega como texto.

## El ciclo de vida no retrocede

`transicionValida` (en `tipos.ts`) es la fuente de verdad: `borrador → enviado`,
`enviado → aceptado | rechazado`. `aceptado` y `rechazado` son **terminales**;
`rechazado` no vuelve a borrador.

`transicionesDisponibles` (en `presupuestoFormato.ts`) solo traduce esa misma
regla a botones, así que la UI nunca ofrece una acción que el servicio
rechazaría. Si se cambia la regla, se cambia en `tipos.ts`.

> Nota para Matías: el comentario de `tipos.ts` mencionaba que `rechazado` volvía
> a `borrador`, pero `transicionValida` no lo permite. Se respetó la función.

Eliminar un presupuesto está restringido a `borrador` y pide confirmación: sus
partidas caen por `ON DELETE CASCADE`.

## Cómo se reemplazan las partidas al editar

Al modificar, el servicio **inserta primero y borra después**. Si el INSERT de las
partidas nuevas falla, las viejas siguen ahí: el peor caso es un duplicado visible
que se corrige, nunca una pérdida. Un borrado-antes-de-insertar dejaría el
presupuesto vacío ante un fallo.

## Contrato de lectura para el módulo 09

`totalPresupuestado(presupuestos)` (en `calculoTotal.ts`) suma los presupuestos
vigentes y **omite los rechazados**. Es el número que necesita el estado de cuenta
de Carlos. `pagoCalculo.ts` no importa nada de este módulo a propósito: siguen
desacoplados y compilan por separado. La costura la resuelve Matías cuando ambos
módulos estén integrados.

## Permisos esperados

| Rol | Acceso |
|-----|--------|
| `recepcionista` | Crea, edita y avanza presupuestos |
| `odontologo` | Crea y consulta |
| `odontologo_admin` | Crea, consulta y gestiona |
| `paciente` | Solo consulta los suyos (portal) |

## Lo que necesita Matías para enganchar la ruta

Un `lazy()` y un `<Route>` en `App.tsx`, más la entrada en `Sidebar.tsx`:

```tsx
const PresupuestosPage = lazy(() =>
  import("@/features/presupuestos/PresupuestosPage").then((m) => ({
    default: m.PresupuestosPage,
  })),
);

<Route path="/app/presupuestos" element={<PresupuestosPage />} />
```

No hace falta tocar `PatientProfilePage.tsx` ni `tabValue.ts`: no es una pestaña.

## Va por separado

- **RLS**: `docs/modules/08-presupuestos/sql.sql` deja la propuesta para que Matías
  la integre en `bd_5clinicas_midentista.sql`. No se aplica desde aquí.
- **PDF (US-8.3, T-8.5)**: fuera del MVP.

## Prohibido 3D

Nada de `three`, `@react-three/fiber` ni `dental-arch.glb`. Este módulo no
necesita gráficos.

## Verificación

```sh
cd frontend
node --test src/features/presupuestos/*.test.ts
npm run build
npm run lint
```

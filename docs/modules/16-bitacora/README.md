# Módulo 16 — Bitácora de auditoría

## Por qué existe

El sistema no tenía ningún registro de auditoría: ninguna tabla guardaba
quién hizo qué, cuándo, desde qué IP, ni el detalle de la transacción. Lo más
parecido era el permiso de "superadmin audita el sistema" (puede **leer**
cualquier clínica), que es un concepto distinto de un registro histórico de
**acciones**.

## Qué se agregó

- `docs/modules/16-bitacora/sql.sql` — tabla `bitacora`, función
  `registrar_bitacora()` (trigger `security definer`) y un trigger
  `trg_bitacora` sobre las 12 tablas de negocio listadas en ese archivo.
  **No aplicado todavía**: hay que correrlo en el SQL Editor de Supabase.
- `frontend/src/features/admin/bitacoraService.ts` — lectura paginada,
  solo lectura, sin escritura desde el cliente (coherente con que la tabla
  rechaza INSERT/UPDATE/DELETE directo).
- Pestaña **Bitácora** en `/app/admin` (`AdminPage.tsx`), visible solo para
  superadmin (mismo criterio de acceso que el resto de esa página): fecha y
  hora, quién, rol, clínica, acción, tabla e IP, con detalle expandible.

## Qué registra cada fila

`acción` (INSERT/UPDATE/DELETE), `tabla_afectada`, `registro_id`, `detalle`
(JSON con la fila antes/después), `ip_address` (la del navegador, vía header
`x-forwarded-for` que expone PostgREST — ver el comentario "IP DEL CLIENTE"
en `sql.sql` para por qué no sirve `inet_client_addr()`), `perfil_id`, `rol` y
`creado_en`.

## Qué falta para que quede operativo

1. Correr `sql.sql` en Supabase (SQL Editor o `psql`).
2. Verificar con los pasos de la sección "Verificación" al final de ese
   archivo.

## Fuera de alcance (deliberado)

- `clinicas`, `horarios` y `perfiles_recuperacion` no tienen trigger — ver
  "QUÉ NO HACE" en `sql.sql`.
- No hay export a CSV/PDF ni filtros avanzados en la pestaña: paginación
  simple, más reciente primero. Se puede ampliar después si se pide.

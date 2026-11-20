---
description: Arrancar la sesión de cierre de Carlos — Módulo 09 Pagos (QR dinámico)
---

# /BitacoraCarlos

Sos el asistente de **Carlos** (Dev 3) en el repo MiDentista. Es la recta
final del proyecto. El Módulo 09 ya está mergeado a `main`, integrado (ruta
`/app/pagos`, confirmar/rechazar pago ya funciona en `PaymentHistory.tsx`) y
validado — no hay que reconstruirlo. Lo único que queda por programar es el
**QR dinámico por cobro**. Empezá a trabajar apenas se invoque este comando.

## Leé esto primero, completo

1. `AGENTS.md` (raíz) — propiedad de carpetas, qué no tocar, ramas, verificación.
2. `CONTRIBUTING.md` — qué cambios necesitan aprobación previa de Matías.
3. `frontend/src/features/pagos/README.md` — **está desactualizado en dos
   puntos**: dice "te falta crear `PagosPage.tsx`" y "falta exponer
   confirmar/rechazar" — ambos ya están hechos y mergeados. No los
   reimplementes. Verificá siempre contra el código, no contra el README.
4. `docs/modules/09-pagos/tasks.md` y `user-stories.md` (T-9.2, T-9.3).

Tu carpeta con escritura exclusiva es `frontend/src/features/pagos/`. Podés
**importar** `frontend/src/features/presupuestos/` (de Bianca), nunca
editarlo. No toques `App.tsx`, `Sidebar.tsx`, `store.tsx`, `types/index.ts`,
`index.css`, `components/ui/*` ni `bd_5clinicas_midentista.sql` — son de
Matías. Nada de `three`, `@react-three/fiber` ni `dental-arch.glb`.

## Primero, corregí el README (2 minutos)

Sacá las menciones de "falta `PagosPage.tsx`" y "falta confirmar/rechazar en
PaymentHistory": ya están en el código (`PagosPage.tsx` existe,
`PagosTab.tsx` ya pasa `onCambiarEstado` a `PaymentHistory.tsx`). Dejar el
README desactualizado hace que alguien reprograme algo que ya existe.

## Tarea — QR dinámico por cobro (T-9.2 / T-9.3)

Hoy existe `QrCobro.tsx` + `useQrCobro.ts` + `qrCobroService.ts`: un QR
**estático** que el odontólogo/recepción sube como imagen fija de la
clínica (un solo QR para toda la clínica, sin monto). Eso ya está resuelto y
no lo toques. Lo que falta programar es un QR **generado**, no subido, con el
monto de un cobro puntual — para que el paciente escanee un QR que ya trae
el importe exacto a pagar, en vez de tener que escribirlo a mano sobre el QR
fijo de la clínica.

1. **Antes de programar**, confirmá con Matías el formato exacto que debe
   codificar el QR (por ejemplo: texto simple con monto + referencia, o un
   deep link al medio de pago de la clínica — esto es una decisión de
   producto, no la inventes). Si no hay respuesta todavía, programá la
   versión más simple y verificable: un QR que codifique el monto y un
   `codigo_referencia` generado por tu propio código (no uno que el usuario
   escriba), como texto plano.
2. El proyecto no tiene instalada ninguna librería de generación de QR
   (`frontend/package.json` no tiene `qrcode` ni similar) — vas a necesitar
   sumar una dependencia liviana. Decilo explícito en el PR.
3. Construí el componente (ej. `QrCobroDinamico.tsx`) que, dado un monto
   (`saldoPendiente` que ya calcula `pagoCalculo.ts`), genera la imagen QR en
   el cliente — sin tabla nueva, sin tocar Supabase: es una representación
   visual derivada de datos que ya tenés, igual que la foto del QR estático
   es solo una imagen.
4. Montalo donde tiene sentido para cobrar: junto a `PartialPayment.tsx` o
   `PaymentForm.tsx`, antes de confirmar el pago — mostrando el QR dinámico
   junto al QR fijo de la clínica, no en vez de él.
5. Sumá un test de la función pura que arma el contenido del QR (el string
   que se codifica), separado del componente visual — mismo patrón que
   `qrCobroValidacion.test.ts`.

## Antes de dar algo por terminado

```sh
cd frontend
node --test src/features/pagos/*.test.ts
npm run build
npm run lint
```

Si `npm run build` tira errores de tipos en archivos que **no** tocaste (por
ejemplo `Property 'tone' does not exist on type 'BadgeProps'` repetido en
módulos ajenos), no es tu código: es un problema de entorno local
(node_modules desincronizado). Probá `rm -rf node_modules && npm install`
antes de asumir que rompiste algo.

## Al cerrar

- Trabajá en tu rama (`feature/modulo-09-carlos` o la que ya exista en el
  remoto). Nunca commitees directo sobre `main`.
- La bitácora (`docs/bitacoras/carlos.md`) se llena sola con el hook de git
  (`git config core.hooksPath .githooks` si no lo activaste en esta máquina).
  No la edites a mano.
- No mergees a `main`, no toques archivos de integración, no apliques SQL. Si
  sumás una dependencia nueva al `package.json`, decilo explícito en el PR.

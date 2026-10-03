# Módulo 09 — Pagos y Cuentas

**Dueño: Carlos.** Carpeta con escritura exclusiva: `frontend/src/features/pagos/`.

## Qué NO debes tocar

- `frontend/src/App.tsx` — aquí se registra la ruta
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/types/index.ts` — tus tipos viven en `tipos.ts`
- `frontend/src/data/store.tsx` — tu servicio accede a Supabase por su cuenta
- `frontend/src/features/presupuestos/` — es de Bianca. Puedes **importar**, no editar
- `frontend/src/components/ui/*` e `index.css`

Al terminar, escribe en el PR: **"necesito la ruta `/app/pagos`"**. Matías la
agrega junto con tu entrada en la barra lateral.

## Archivos que ya existen aquí

| Archivo | Qué aporta |
|---------|-----------|
| `tipos.ts` | `Pago`, `MetodoPago`, `EstadoPago`, `EstadoCuenta` |
| `pagoMapper.ts` | Tipo de fila, `esUuid`, `pagoDesdeFila`, `pagoParaGuardar` |
| `pagoCalculo.ts` | `saldoPresupuesto`, `totalConfirmado`, `montoAceptable` |
| `pagoService.ts` | `cargarPagos`, `registrarPago`, `cambiarEstadoPago`, `calcularEstadoCuenta` |

Los que te faltan crear: `PagosPage.tsx`, `PaymentForm.tsx`, `PartialPayment.tsx`,
`AccountStatement.tsx`, `PaymentHistory.tsx`, `usePagosSupabase.ts` y sus tests.

## Tu dependencia con el módulo 08, y cómo NO te bloquea

`T-9.7` (estado de cuenta) necesita los totales del presupuesto de Bianca. Parece
una dependencia, pero **están desacoplados a propósito**:

- `pagoCalculo.ts` **no importa nada** de `features/presupuestos/`. Solo recibe
  números. Por eso compila aunque el módulo 08 no esté mergeado.
- `calcularEstadoCuenta(pacienteId, pagos, totalPresupuestado)` recibe el total
  ya calculado como número.
- No dupliques la fórmula del saldo. Si tú multiplicas por tu lado y Bianca por el
  suyo, los dos mostréis cifras distintas para el mismo presupuesto.

Cuando los dos estén integrados, la capa de UI le pasa a
`calcularEstadoCuenta` el total que venga del presupuesto.

## El error clásico de este módulo

`saldoPresupuesto` y `totalConfirmado` **solo cuentan los pagos `confirmado`**.
Un pago `pendiente` todavía no es dinero recibido, y uno `rechazado` nunca lo fue.
Sumarlos todos da saldos falsos, que es el error más fácil de cometer aquí.

## El QR es una imagen, no una tabla

`codigos_qr_pago` se eliminó del esquema a propósito: el QR del odontólogo es una
imagen estática. `T-9.2` y `T-9.3` están fuera del MVP, y `T-9.1` aclara que el QR
es un archivo, no un registro. No crees la tabla ni un flujo de QR dinámico.

`codigo_referencia` sí existe y es texto libre: es donde va la referencia bancaria
o el número de operación.

## Permisos esperados

| Rol | Acceso |
|-----|--------|
| `recepcionista` | Registra y edita pagos. Es el rol que cobra |
| `odontologo` | Consulta saldos y estados de cuenta |
| `odontologo_admin` | Consulta y gestiona |
| `paciente` | Solo su estado de cuenta |

Esto viene de `ENTREVISTAS_USIARIO.txt`: *"Yo como recepcionista necesito ver
cuánto debe cada paciente"*. Por eso el módulo 08 y este son de recepción, y por
eso `/app/pagos` es una ruta de listado transversal y no una pestaña del paciente.

## Prohibido 3D

Nada de `three`, `@react-three/fiber` ni `dental-arch.glb`. Los gráficos de este
módulo son SVG con `components/ui/`.

## Verificación

```sh
cd frontend
node --test src/features/pagos/*.test.ts
npm run build
npm run lint
```

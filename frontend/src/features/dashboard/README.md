# Módulo 13 — Dashboard

**Dueña: Melissa.** Carpeta con escritura exclusiva: `frontend/src/features/dashboard/`.

Este módulo ya tiene `DashboardPage.tsx`, `dashboard.css`, `mapa-calor.tsx`,
`clinica-calor.ts` y `ClinicalFindingsChart.tsx`. Son tuyos: puedes editarlos.

## El acuerdo con Matías sobre `CalendarioAgenda`

`DashboardPage.tsx` usa la agenda, y Matías está construyendo el módulo 07. Para
que no se pisen:

- **Melissa** escribe dentro de `features/dashboard/`.
- **Matías NO crea ni edita** `DashboardPage.tsx`, `CalendarioAgenda.tsx` ni
  `dashboard.css`.
- Matías crea su pieza de agenda como archivo nuevo
  (`features/agenda/AgendaDayGrid.tsx`) y no toca el `CalendarioAgenda` actual.

Si necesitas un dato nuevo para tu dashboard, **pídeselo en el PR**. No abras su
carpeta para añadirlo tú.

## Qué NO debes tocar

- `frontend/src/App.tsx` — aquí se registran las rutas de los 4 dashboards
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/features/patients/PatientProfilePage.tsx`
- `frontend/src/types/index.ts` — tus tipos viven en `tipos.ts`
- `frontend/src/data/store.tsx`
- `frontend/src/features/agenda/` — es de Matías
- `frontend/src/components/ui/*` e `index.css`

Al terminar, escribe en el PR qué rutas necesitas (por ejemplo
`/app/dashboard/odontologo`, `/app/dashboard/recepcionista`).

## El módulo ES una matriz de roles

Hay **un dashboard distinto por rol**, porque los indicadores de cada uno son
distintos. Un dashboard único con todo mezclado no le sirve a nadie.

| Rol | Dashboard | Qué mira |
|-----|-----------|----------|
| `superadmin` | `DashboardSuperadmin` | Salud del sistema: clínicas, usuarios, Errors |
| `recepcionista` | `DashboardRecepcion` | Hoy: quién viene, quién falta, quién debe |
| `odontologo` | `DashboardOdontologo` | Su agenda y sus pacientes |
| `paciente` | `DashboardPaciente` | Sus citas, su saldo, su evolución |

El mapa rol → componente ya está en `tipos.ts`, en `DASHBOARD_POR_ROL`. Cámbialo
cuando crees los componentes.

**Nota:** El rol `odontologo_admin` fue **descartado por decisión del equipo**.
No forma parte de la matriz de roles del Módulo 13 ni requiere un dashboard
propio. El selector de `DashboardPage` incluye un estado "rol no disponible"
para mantener la compatibilidad con el tipo `Role` compartido (que, por ahora,
todavía declara ese rol).

## Gráficos: 2D. Nada de 3D

Este módulo es el que más tentación a 3D tiene, y es justo donde la regla es
estricta. **Prohibido**: `three`, `@react-three/fiber`, `@react-three/drei`,
`OrbitControls` y `dental-arch.glb`.

Ya tienes dos gráficos **en SVG puro** que hoy no están conectados a nada:

- `mapa-calor.tsx` — mapa de calor dental, con `DienteSvg`
- `ClinicalFindingsChart.tsx` — hallazgos clínicos

Conéctalos al dashboard del odontólogo. Si necesitas otro gráfico, escribe SVG con
`components/ui/`. Los tokens de color salen de `index.css`, que no se edita.

## Permisos esperados

| Rol | Alcance |
|-----|---------|
| `superadmin` | Sistema entero. Es el único sin `clinica` (`clinica: null`) |
| `recepcionista` | Agenda y deudas de la clínica; **no** historia clínica |
| `odontologo` | **Solo suyos**: sus pacientes y sus citas, no los de sus colegas |
| `paciente` | Solo lo suyo |

Ese alcance por rol sale de `ENTREVISTAS_USIARIO.txt`:
*"Cada odontólogo solo debería ver sus propios pacientes y citas, no los de los
demás"* y *"María como recepcionista sí puede ver la agenda de todos"*.

⚠️ Ojo: las políticas RLS actuales dejan a **cualquier** odontólogo ver los
pacientes de toda la clínica. Eso contradice la entrevista. Es una deuda de RLS
que Matías corrige al integrar; no lo resuelvas recortando datos en la UI, porque
eso oculta un problema de permisos en lugar de arreglarlo.

## Si un SELECT viene vacío

Con RLS activo, `[]` puede significar "sin permiso", no "cero". Usa
`DatosDashboard<T>` de `tipos.ts`, que separa `sinPermiso` de un valor vacío.

## Archivos que ya existen aquí

| Archivo | Qué aporta |
|---------|-----------|
| `tipos.ts` | `Indicador`, `SerieGrafica`, `ResumenAgenda`, `ResumenIngresos`, `DASHBOARD_POR_ROL`, `DatosDashboard<T>` |
| `dashboardCards.ts` | Lógica pura de tarjetas (tono, delta, estado) |
| `dashboardCards.test.ts` | Pruebas unitarias de `dashboardCards.ts` |
| `DashboardStatCard.tsx` | Adaptador `Indicador` → `StatTile` |
| `DashboardEmptyState.tsx` | Adaptador `DatosDashboard<T>` → `EmptyState` |
| `superadminResumen.ts` | Lógica pura del panel superadmin (conteos, indicadores) |
| `superadminResumen.test.ts` | Pruebas unitarias de `superadminResumen.ts` |
| `dashboardSuperadminService.ts` | Servicio de lectura (Supabase) para T-13.2 |
| `dashboardSuperadminService.test.ts` | Pruebas del servicio con mock |
| `useSuperadminResumen.ts` | Hook que carga el resumen con estados DatosDashboard |
| `DashboardSuperadmin.tsx` | **Implementado (T-13.2):** panel con clínicas y usuarios activos |
| `DashboardRecepcion.tsx` | Panel de recepción (citas, pagos pendientes) |
| `DashboardOdontologo.tsx` | Panel real del odontólogo |
| `DashboardPaciente.tsx` | Panel real del paciente |
| `DashboardPlaceholder.tsx` | Estado para rol sin panel asignado |
| `DashboardPage.tsx` | Selector por rol (T-13.1) |
| `mapa-calor.tsx` | Mapa de calor SVG (sin conectar a paneles todavía) |
| `ClinicalFindingsChart.tsx` | Hallazgos clínicos SVG (sin conectar) |
| `clinica-calor.ts` | Lógica pura del mapa de calor |
| `dashboard.css` | Estilos del módulo (tuyo) |

**Decisión sobre reutilización (T-13.2):** no se reutiliza `listarClinicas()` de `data/api.ts` porque filtra solo activas (no permite obtener total). `listarPersonalApi()` depende de la Edge Function. Por eso el módulo usa su propio servicio (`dashboardSuperadminService.ts`) leyendo `public.clinicas` y `public.perfiles` directamente con `obtenerSupabase()`, respetando RLS.

## Verificación

```sh
cd frontend
npm run build
npm run lint
```

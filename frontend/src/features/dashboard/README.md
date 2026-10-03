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
| `odontologo_admin` | `DashboardAdmin` | La clínica completa: ocupación, ingresos, deuda |
| `recepcionista` | `DashboardRecepcion` | Hoy: quién viene, quién falta, quién debe |
| `odontologo` | `DashboardOdontologo` | Su agenda y sus pacientes |
| `paciente` | `DashboardPaciente` | Sus citas, su saldo, su evolución |

El mapa rol → componente ya está en `tipos.ts`, en `DASHBOARD_POR_ROL`. Cámbialo
cuando crees los componentes.

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
| `odontologo_admin` | Su clínica completa |
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
| `tipos.ts` | `Indicador`, `SerieGrafica`, `ResumenAgenda`, `ResumenIngresos`, `DASHBOARD_POR_ROL` |
| `DashboardPage.tsx` | El dashboard de demostración actual (tuyo) |
| `mapa-calor.tsx` | Mapa de calor SVG, sin conectar |
| `ClinicalFindingsChart.tsx` | Hallazgos clínicos SVG, sin conectar |
| `dashboard.css` | Estilos del módulo (tuyo) |

Por crear: `DashboardSuperadmin.tsx`, `DashboardAdmin.tsx`,
`DashboardRecepcion.tsx`, `DashboardOdontologo.tsx`, `DashboardPaciente.tsx`,
`DashboardStatCard.tsx`, `DashboardEmptyState.tsx`.

## Verificación

```sh
cd frontend
npm run build
npm run lint
```

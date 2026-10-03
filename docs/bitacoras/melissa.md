# Bitácora - Melissa (Dev 4)

## Asignación vigente

| Módulo | Carpeta exclusiva | Bitácora de referencia |
|--------|-------------------|------------------------|
| **13: [Dashboard](../modules/13-dashboard/)** — solo 2D | `frontend/src/features/dashboard/` | esta |

> ⚠️ Este módulo **cambió respecto al `INDEX.md` original**, que te asignaba el
> Módulo 04 Odontograma. El Odontograma es 3D y la 3D es de Matías, así que ya
> no es tuyo. Si tienes código del módulo 04 empezado, no lo borres: dímelo y se
> decide a qué módulo pasa.

## Propiedad de archivos — Melissa

**Escribes dentro de `features/dashboard/` y dentro de nada más.** Los archivos
que ya hay en esa carpeta son tuyos: `DashboardPage.tsx`, `dashboard.css`,
`mapa-calor.tsx`, `clinica-calor.ts` y `ClinicalFindingsChart.tsx`.

**No editas**, aunque los leas: `App.tsx`, `Sidebar.tsx`, `store.tsx`,
`types/index.ts`, `PatientProfilePage.tsx`, `components/ui/*`, `index.css`, ni
`features/agenda/`, que es de Matías.

**El acuerdo sobre la agenda:** `DashboardPage.tsx` usa la agenda, y Matías
construye el módulo 07. Para que no se pisen, Matías **no toca** tu carpeta: él
crea `features/agenda/AgendaDayGrid.tsx` como archivo nuevo y deja el
`CalendarioAgenda` actual intacto. Si necesitas un dato nuevo para tu dashboard,
**pídeselo en el PR**, no abras su carpeta.

**Nada de 3D.** Prohibido `three`, `@react-three/fiber`, `@react-three/drei`,
`OrbitControls` y `dental-arch.glb`. Ya tienes dos gráficos SVG sin conectar:
`mapa-calor.tsx` y `ClinicalFindingsChart.tsx`. Conéctalos; si necesitas otro,
escribe SVG con `components/ui/`.

Lee [`../../AGENTS.md`](../../AGENTS.md) y el
[`README.md`](../../frontend/src/features/dashboard/README.md) de tu módulo.

## Historias y tareas asignadas

**Módulo 04 (MVP):**
- Historias: US-4.1, US-4.2, US-4.3, US-4.4, US-4.5
- Tareas: T-4.1 a T-4.8, T-4.10, T-4.11

**Mes 3 — Testing e integración (en pareja con Angélica):**
- Pruebas funcionales de cada módulo contra sus criterios de aceptación
  (`user-stories.md` de cada módulo)
- Verificación de los criterios generales: carga < 3s, RLS, compatibilidad de
  navegadores, paginación y búsqueda
- Corrección de bugs encontrados antes de pasarle el paquete a Matías para el
  deploy final (el deploy en sí lo ejecuta el Product Owner, ver
  [matias.md](matias.md))

## Checklist de tareas (en orden)

### Mes 1 — Módulo 04

- [ ] T-4.1 Crear tabla `odontogramas` + RLS (piezas en JSONB) ⚠️ toca BD
- [ ] T-4.2 Obtener/crear imagen de odontograma base (FDI)
- [ ] T-4.3 Implementar mapa de zonas clickeables sobre imagen
- [ ] T-4.6 Crear servicio de odontograma (CRUD)
- [ ] T-4.4 Crear panel lateral de condiciones
- [ ] T-4.5 Implementar lógica de selección de superficie
- [ ] T-4.8 Crear vista de historial de odontogramas
- [ ] T-4.7 Implementar guardado de condiciones por pieza
- [ ] T-4.10 Agregar observaciones por pieza
- [ ] T-4.11 Integrar odontograma en ficha del paciente (depende del Módulo 02)
- [ ] Validar US-4.1 a US-4.5 contra sus criterios de aceptación

### Mes 2 — Testing Fase 2

- [ ] Testing de integración de módulos 05, 06 y 07

### Mes 3 — Testing e integración final (cubres módulos 01-04 y 07, Angélica cubre 05, 06, 08, 09)

- [ ] Pruebas funcionales del Módulo 01 (Auth/Onboarding) contra sus US
- [ ] Pruebas funcionales del Módulo 02 (Pacientes) contra sus US
- [ ] Pruebas funcionales del Módulo 03 (Historia Clínica) contra sus US
- [ ] Pruebas funcionales del Módulo 04 (Odontograma) contra sus US
- [ ] Pruebas funcionales del Módulo 07 (Agenda y Citas) contra sus US
- [ ] Verificar criterios generales: carga < 3s, compatibilidad de
      navegadores, paginación y búsqueda en los módulos de tu lista
- [ ] Reportar bugs encontrados (a quien corresponda) y confirmar su
      corrección antes de avisar a Matías que su bloque está listo para deploy

## Registro de avance

| Fecha | ID | Qué hice | Estado | Horas |
|-------|----|----|--------|-------|
| | | | | |

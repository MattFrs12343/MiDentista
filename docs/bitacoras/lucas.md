# Bitácora - Lucas (Dev 6)

## Asignación (INDEX.md)

| Fase | Mes | Responsabilidad |
|------|-----|------------------|
| 1 | Septiembre | Setup del proyecto y base del despliegue |
| 2 | Octubre | Módulo 06: [Evolución Clínica](../modules/06-evolucion-clinica/) (dueño del módulo; apoyo de Carlos/Dev 3) |
| 3 | Nov-Dic | Cierre y refinamiento del Módulo 06 (solo): tareas pendientes, bugs, integración final |

## Historias y tareas asignadas

**Mes 1 — Setup del proyecto** (ver [ARCHITECTURE.md](../ARCHITECTURE.md)):
- Scaffolding del repo (`src/app`, `src/components`, `src/features`, `src/lib`,
  `src/hooks`, `src/stores`, `src/types`)
- Configuración de Vite, TypeScript, Tailwind, shadcn/ui, ESLint, Prettier
- Configuración de `.env.example` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `VITE_APP_NAME`, `VITE_APP_URL`)
- Base del despliegue: `.htaccess` para SPA, pipeline de build (`npm run build` → `dist/`)

**Mes 2 — Módulo 06:**
- Historias: US-6.1 a US-6.4
- Tareas: T-6.1 a T-6.7

**Mes 3 — Cierre del Módulo 06 (solo):**
- Terminar cualquier tarea de T-6.1 a T-6.7 que quede pendiente de octubre
- Corrección de bugs reportados por Melissa/Angélica en testing
- Revisión final de la integración de evolución clínica con el plan de
  tratamiento (Módulo 05) y con la ficha del paciente (Módulo 02)
- El deploy a producción lo ejecuta Matías (PO) — ver [matias.md](matias.md)

## Checklist de tareas (en orden)

### Mes 1 — Setup del proyecto

- [ ] `npm create vite@latest` + configurar TypeScript
- [ ] Scaffolding de carpetas: `src/app`, `src/components`, `src/features`,
      `src/lib`, `src/hooks`, `src/stores`, `src/types`
- [ ] Configurar Tailwind CSS + shadcn/ui
- [ ] Configurar ESLint + Prettier
- [ ] Crear `.env.example` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
      `VITE_APP_NAME`, `VITE_APP_URL`)
- [ ] Configurar cliente Supabase (`src/lib/supabase.ts`)
- [ ] Preparar `.htaccess` para SPA y pipeline de build (`npm run build` →
      `dist/`) — solo la configuración, el deploy real lo hace Matías
- [ ] Verificar que `npm run dev` levanta correctamente para todo el equipo

### Mes 2 — Módulo 06 (dueño)

- [ ] T-6.1 Crear tabla `evoluciones_clinicas` + RLS ⚠️ toca BD
- [ ] T-6.2 Crear formulario de evolución clínica
- [ ] T-6.3 Implementar servicio de evolución (CRUD)
- [ ] T-6.4 Crear vista de evolución cronológica
- [ ] T-6.5 Implementar selección de próxima atención
- [ ] T-6.6 Vincular evolución con plan de tratamiento (con apoyo de Carlos;
      depende del Módulo 05)
- [ ] T-6.7 Integrar evolución en ficha del paciente (depende del Módulo 02)
- [ ] Validar US-6.1 a US-6.4 contra sus criterios de aceptación

### Mes 3 — Cierre del Módulo 06 (solo)

- [ ] Terminar cualquier tarea de T-6.1 a T-6.7 pendiente de octubre
- [ ] Corregir bugs reportados por Melissa/Angélica en testing
- [ ] Revisar la integración de evolución clínica con el Módulo 05
      (plan de tratamiento) y el Módulo 02 (ficha del paciente)
- [ ] Confirmar a Matías que el Módulo 06 está listo para el deploy final

## Registro de avance

| Fecha | ID | Qué hice | Estado | Horas |
|-------|----|----|--------|-------|
| | | | | |

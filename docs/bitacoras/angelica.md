# Bitácora - Angélica (Dev 5)

## Asignación vigente

| Módulo | Carpeta exclusiva | Bitácora de referencia |
|--------|-------------------|------------------------|
| **10: [Archivos e Imágenes](../modules/10-archivos/)** | `frontend/src/features/archivos/` | esta |

> ⚠️ Este módulo **cambió respecto al `INDEX.md` original**, que te asignaba el
> Módulo 05 Diagnóstico y el setup de base de datos. Si tienes trabajo del 05
> empezado, no lo borres: dímelo y se decide a qué módulo pasa.

## Propiedad de archivos — Angélica

**Creas archivos dentro de `features/archivos/` y dentro de nada más.**

**No editas**, aunque los leas: `App.tsx`, `Sidebar.tsx`, `store.tsx`,
`types/index.ts`, `PatientProfilePage.tsx`, `tabValue.ts`, `components/ui/*`,
`index.css`, ni las carpetas de Lucas, Bianca, Carlos o Melissa.

**Y lo más importante: no editas `bd_5clinicas_midentista.sql` ni `supabase/`.**
Son de Matías. Tu SQL va en un archivo propio:

```
docs/modules/10-archivos/sql.sql
```

Ahí ya está el DDL de la tabla `archivos` reactivada, con sus índices, el RLS
siguiendo el patrón de `docs/DATABASE.md` sección 18.3, y el bucket de Storage
con sus políticas. Matías lo pega en el archivo principal durante el merge.

Mientras tanto **tu UI y tu servicio pueden avanzar**: lo único que queda
bloqueado es la persistencia.

En tu PR, **pide** lo que necesites: "necesito el tab `archivos` en
`PatientProfilePage`".

## Aviso sobre datos clínicos

La tabla `archivos` almacena radiografías y documentos de pacientes. El bucket es
**privado** y las URLs **caducan** (`createSignedUrl`, 5 minutos). Nunca
conviertas el bucket en público ni guardes URLs en la base: filtraría información
clínica con un enlace adivinable. Y como en el resto del proyecto, no se borran
datos de producción sin confirmación de Matías.

Lee [`../../AGENTS.md`](../../AGENTS.md) y el
[`README.md`](../../frontend/src/features/archivos/README.md) de tu módulo.

## Historias y tareas asignadas

**Mes 1 — Base de datos** (ver [DATABASE.md](../DATABASE.md) y
[`bd_5clinicas_midentista.sql`](../../bd_5clinicas_midentista.sql)):
- Apoyo en T-1.2 (tabla `perfiles` + trigger de sync), T-1.10 (RLS de `perfiles`),
  T-1.13 (columnas `latitud`/`longitud` + índice geo)
- Migraciones, políticas RLS de las 15 tablas, índices, triggers de
  `actualizado_en`
- ⚠️ Toda migración debe pasar por la revisión de Matías (PO) antes de
  aplicarse — ver [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md)

**Mes 2 — Módulo 05 (MVP):**
- Historias: US-5.1 a US-5.7
- Tareas: T-5.1 a T-5.10

**Mes 3 — Testing e integración (en pareja con Melissa) + datos:**
- Pruebas funcionales de cada módulo contra sus criterios de aceptación
- Población de `supabase/seed.sql` / seed de la clínica piloto (ver Tabla 12
  de volumen en el docx, Capítulo 5.1)

## Checklist de tareas (en orden)

### Mes 1 — Setup BD/Auth (apoyo a Matías en el Módulo 01)

- [ ] Diseñar/revisar `bd_5clinicas_midentista.sql` completo (15 tablas) — ⚠️ proponer a Matías, no aplicar sola
- [ ] T-1.2 Apoyo: tabla `perfiles` + trigger de sync con `auth.users` ⚠️ toca BD
- [ ] T-1.10 Apoyo: configurar RLS para `perfiles` ⚠️ toca BD
- [ ] T-1.13 Apoyo: columnas `latitud`/`longitud` + índice geo ⚠️ toca BD
- [ ] Escribir las políticas RLS de las 15 tablas (`obtener_clinica_usuario()`,
      `obtener_rol_usuario()`) ⚠️ toca BD — requiere aprobación de Matías
- [ ] Crear los triggers de `actualizado_en` para las tablas que se modifican
      ⚠️ toca BD — requiere aprobación de Matías

### Mes 2 — Módulo 05 (dueña)

- [ ] T-5.1 Crear tablas `diagnosticos` + `planes_tratamiento` +
      `procedimientos_tratamiento` + RLS ⚠️ toca BD
- [ ] T-5.2 Crear formulario de diagnóstico
- [ ] T-5.3 Implementar servicio de diagnóstico (CRUD)
- [ ] T-5.5 Crear formulario de plan de tratamiento
- [ ] T-5.4 Crear lista de diagnósticos del paciente
- [ ] T-5.6 Implementar CRUD de procedimientos (con apoyo de Bianca)
- [ ] T-5.7 Implementar máquina de estados del plan
- [ ] T-5.8 Crear vista de tratamientos por estado
- [ ] T-5.10 Calcular total del plan automáticamente (con apoyo de Bianca)
- [ ] T-5.9 Integrar diagnóstico y tratamiento en ficha (depende del Módulo 02)
- [ ] Validar US-5.1 a US-5.7 contra sus criterios de aceptación

### Mes 3 — Testing e integración final (cubres módulos 05, 06, 08, 09; Melissa cubre 01-04 y 07) + datos

- [ ] Pruebas funcionales del Módulo 05 (Diagnóstico/Tratamiento) contra sus US
- [ ] Pruebas funcionales del Módulo 06 (Evolución Clínica) contra sus US
- [ ] Pruebas funcionales del Módulo 08 (Presupuestos) contra sus US
- [ ] Pruebas funcionales del Módulo 09 (Pagos) contra sus US
- [ ] Verificar criterios generales (RLS, paginación, búsqueda) en los módulos
      de tu lista
- [ ] Poblar `supabase/seed.sql` con la clínica piloto (ver Tabla 12 de
      volumen en el docx, Capítulo 5.1)
- [ ] Confirmar con Matías que los datos de prueba están listos antes del
      deploy

## Registro de avance

| Fecha | ID | Qué hice | Estado | Horas |
|-------|----|----|--------|-------|
| | | | | |

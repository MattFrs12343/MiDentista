---
description: Registrar avance en la bitácora del integrante actual
---

# /bitacora

Registra el avance de la sesión en `docs/bitacoras/<tu-nombre>.md`.

## 1. Identifica quién eres

Pregunta el nombre si no está claro y no lo deduzcas. Cada persona tiene una
bitácora y **solo se edita la suya**.

| Nombre | Bitácora | Módulo |
|--------|----------|--------|
| Matías | `docs/bitacoras/matias.md` | 01 y 07 (+ 3D) |
| Lucas | `docs/bitacoras/lucas.md` | 06 |
| Bianca | `docs/bitacoras/bianca.md` | 08 |
| Carlos | `docs/bitacoras/carlos.md` | 09 |
| Melissa | `docs/bitacoras/melissa.md` | 13 |
| Angélica | `docs/bitacoras/angelica.md` | 10 |

## 2. Determina los IDs

Busca la tarea en el módulo correspondiente y cita sus IDs tal cual aparecen:

- `docs/modules/06-evolucion-clinica/tasks.md` → `T-6.1` … `T-6.7`
- `docs/modules/08-presupuestos/tasks.md` → `T-8.1` …
- `docs/modules/09-pagos/tasks.md` → `T-9.1` …
- `docs/modules/10-archivos/tasks.md` → `T-10.1` …
- `docs/modules/13-dashboard/tasks.md` → `T-13.1` …
- `docs/modules/*/user-stories.md` → `US-x.x`

Si el trabajo no corresponde a un ID puntual (reunión, debugging, revisión),
usa una etiqueta libre en mayúsculas: `SETUP`, `REVIEW`, `TESTING`.

## 3. Redacta la entrada

Una fila en la tabla "Registro de avance", al final, con estas cinco columnas:

| Fecha | ID | Qué hice | Estado | Horas |
|-------|----|----|--------|-------|
| `AAAA-MM-DD` | `T-8.3` | Frase concreta y breve | `pendiente` · `en progreso` · `completado` · `bloqueado` | número decimal |

Reglas para el texto:

- Describe **qué cambió**, no "trabajé en el módulo". Ejemplo: *"Añadí
  `BudgetItemsEditor` con alta y borrado en línea de partidas."*
- Si una tarea quedó **bloqueada**, escribe en "Qué hice" qué la bloqueó y deja el
  estado en `bloqueado`. No la marques como completada.
- Las horas son aproximadas y corresponden solo a ese día.

## 4. Marca el checklist

En la sección "Checklist de tareas" de tu bitácora, pasa a `- [x]` la tarea que
terminaste. Déjala en `- [ ]` si quedó a medias.

## 5. Antes de dar por terminado

```sh
cd frontend
npm run build
npm run lint
```

Si tocaste la base de datos o la arquitectura, recuerda que requiere aprobación
previa de Matías según `CONTRIBUTING.md`, y que tu SQL va en
`docs/modules/<tu-modulo>/sql.sql`, no en `bd_5clinicas_midentista.sql`.

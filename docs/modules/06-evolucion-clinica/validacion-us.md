# Validación de US-6.1 a US-6.4

**Autor: Lucas.** Fecha: 2026-10-05. Rama: `feature/modulo-06-lucas`.

Criterios de aceptación de `docs/modules/06-evolucion-clinica/user-stories.md`,
verificados contra el código de `frontend/src/features/evolucion/`.

**Alcance de esta validación.** Es una revisión a nivel de código: cada criterio
se contrasta con la ruta real que ejecuta la aplicación, no con una sesión
levantada. Lo que depende de una sesión real de odontólogo queda marcado como
*pendiente de prueba manual*. Los tres huecos de la sección final **no se
pueden cerrar desde el frontend**: son diferencias entre el spec y el esquema.

---

## US-6.1 — Registrar evolución clínica (P0)

> Given que el odontólogo atendió al paciente
> When registra fecha, motivo, procedimiento, pieza, diagnóstico, observaciones e indicaciones
> Then se guarda la evolución
> And se asocia al paciente y plan de tratamiento

| Campo | Estado | Evidencia |
|-------|--------|-----------|
| fecha | Cumple | `EvolutionTab.tsx:107` la fija con `hoyEnIso()`; no es editable a mano porque es la fecha del día de la atención |
| motivo | Cumple | `EvolutionForm.tsx:57`, obligatorio con mensaje de error |
| procedimiento | Cumple | `EvolutionForm.tsx:60`, obligatorio con mensaje de error |
| pieza | Cumple | `EvolutionForm.tsx:64-66`, entero entre 0 y 32 |
| observaciones | Cumple | `EvolutionForm.tsx`, `Textarea`, opcional |
| indicaciones | Cumple | `EvolutionForm.tsx`, `Textarea`, opcional |
| **diagnóstico** | **No cumple** | No existe el campo. Ver hueco 1 |
| Then se guarda | Cumple | `evolucionService.ts:59` inserta y exige la fila devuelta; si no vuelve, no se anuncia éxito |
| And se asocia al paciente | Cumple | `evolucionMapper.ts:71` escribe `paciente_id` |
| And se asocia al plan | Cumple | `evolucionMapper.ts:73` escribe `plan_tratamiento_id`, `null` si no se eligió |

**Veredicto: parcial.** El único campo que falta es "diagnóstico".

---

## US-6.2 — Consultar evolución cronológica (P1)

> Given que el paciente tiene evoluciones registradas
> When accede a la evolución clínica
> Then ve las atenciones ordenadas por fecha (más reciente primero)

| Criterio | Estado | Evidencia |
|----------|--------|-----------|
| Accede desde la ficha | Cumple | La pestaña está registrada en `PatientProfilePage.tsx:89,105` |
| Orden por fecha descendente | Cumple | `evolucionService.ts:54` ordena en SQL; `useEvolucionSupabase.ts:64` reordena en el cliente para desempatar dos atenciones del mismo día |
| Filtra solo al paciente | Cumple | `evolucionService.ts:53`, `.eq("paciente_id", …)` |
| No confunde "sin evoluciones" con "sin permiso" | Cumple | `useEvolucionSupabase.ts:65` expone `lecturaSinFilas` y `EvolutionTab.tsx` lo dice como tal |

**Veredicto: cumple.** Tests: `compararEvoluciones ordena de la atención más
reciente a la más antigua`, `dos atenciones del mismo día se ordenan por fecha de
creación`, `la consulta filtra por paciente y pide fecha descendente`.

---

## US-6.3 — Registrar próxima atención (P2)

> Given que el odontólogo está registrando una evolución
> When indica la próxima fecha
> Then se guarda junto con la evolución
> And aparece como recordatorio

| Criterio | Estado | Evidencia |
|----------|--------|-----------|
| Se indica la fecha | Cumple | `NextVisitPicker`, no admite fechas pasadas |
| Se guarda junto con la evolución | Cumple | `evolucionMapper.ts:82` escribe `proxima_atencion` en el mismo INSERT |
| Aparece como recordatorio | **Parcial** | Ver hueco 2 |

**Veredicto: parcial.** El dato se guarda y se muestra, pero el "recordatorio"
del criterio no existe como tal. Tests: `registrarProximaAtencion solo cambia la
fecha y conserva el resto`, `tieneProximaAtencion distingue la fecha real de null
y de cadena vacía`.

---

## US-6.4 — Asociar evolución a plan de tratamiento (P1)

> Given que existe un plan de tratamiento activo
> When el odontólogo registra una evolución
> Then puede asociarla al plan
> And el progreso del plan se actualiza

| Criterio | Estado | Evidencia |
|----------|--------|-----------|
| Given un plan **activo** | Cumple | `planesVincidables()` excluye los cancelados y el desplegable rotula el estado de cada plan |
| Then puede asociarla | Cumple | Dos desplegables en cascada en `EvolutionForm`; el segundo se habilita solo si hay plan |
| And el progreso se actualiza | **No cumple** | Ver hueco 3 |

**Veredicto: parcial.**

### Corrección aplicada durante esta validación

El selector ofrecía **todos** los planes del paciente, incluidos los
`cancelado`, lo que contradice el "Given que exista un plan de tratamiento
activo". Se agregó `planesVincidables()` y `esPlanVincidable()` en
`planesTratamientoMapper.ts`, con tests.

Dos criterios de decisión, por si se revisan:

- **`completado` sí se ofrece.** Una consulta puede documentarse después de
  cerrar el plan, y eso no es un dato incoherente.
- **Un plan sin estado (`null`) también se ofrece.** La columna admite `null`;
  descartar uno en silencio sería peor que mostrarlo.

---

## Huecos que no se pueden cerrar desde el frontend

### Hueco 1 — US-6.1 pide "diagnóstico" y la tabla no tiene esa columna

`evoluciones_clinicas` (`bd_5clinicas_midentista.sql:242`) tiene `motivo_consulta`,
`procedimiento_realizado`, `observaciones`, `indicaciones`, `numero_pieza`,
`fecha_consulta` y `proxima_atencion`. **No tiene columna de diagnóstico.** Los
diagnósticos viven en la tabla `diagnosticos` (`bd_5clinicas_midentista.sql:194`),
que escribe el Módulo 05.

Agregar el campo requiere tocar el esquema, que es del PO. Si el criterio está
bien, hace falta una columna nueva o una tabla puente; si el criterio está mal,
hay que corregir `user-stories.md`.

### Hueco 2 — US-6.3 pide un "recordatorio" y no hay ninguno para el odontólogo

Hoy la próxima atención se ve en tres lugares: la insignia "Próxima atención" en
la línea de tiempo, el detalle desplegable de cada atención, y
`frontend/src/features/portal-paciente/MisEvolucionesPage.tsx`, que la muestra al
paciente.

Lo que no existe es un recordatorio en la vista de trabajo del odontólogo: nada
en la agenda (`features/agenda/`, de Matías) ni en el dashboard
(`features/dashboard/`, de Melissa) consulta `proxima_atencion`. Si el criterio
exige un aviso al profesional, es trabajo de otro módulo.

### Hueco 3 — US-6.4 pide que se actualice el progreso del plan

Actualizar el progreso implica escribir `procedimientos_tratamiento.estado`, que
es una tabla del Módulo 05. Marcar `completado` desde el módulo 06 haría que la
pestaña de tratamiento mostrara un cambio de estado que nadie decidió ahí, y
además dejaría al odontólogo sin saber qué atenciones ya se imputaron a qué item.

Se dejó a propósito y documentado en `README.md`. La decisión es del PO.

---

## Pendiente de prueba manual

Lo que solo se puede confirmar con una sesión real de odontólogo:

1. Registrar una evolución con plan y procedimiento, y confirmar que al recargar
   los valores siguen en el desplegable.
2. Cambiar de plan con un procedimiento ya elegido y confirmar que el segundo
   desplegable se limpia.
3. Confirmar que un plan `cancelado` no aparece en la lista.
4. Confirmar el isolation con RLS en vivo: odontólogo de otra clínica no ve
   evoluciones ni planes.

## Verificación automática

```sh
cd frontend
npm run build                                          # tsc -b && vite build
npm run lint                                           # oxlint, 0 avisos en el módulo
node --test src/features/evolucion/*.test.ts           # 33 tests
node --test src/features/clinical/*.test.ts           # 16 tests, módulo 03 intacto
```
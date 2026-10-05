# Mensaje para Matías — Módulo 06, avance y tres decisiones

**Estado del mensaje: borrador, todavía NO enviado.** Copiar el cuerpo de abajo y
mandarlo por el canal que usemos con el PO.

Fecha de redacción: 2026-10-05. Rama: `feature/modulo-06-lucas`.

---

Hola Matías,

Cerré **T-6.6** (vincular la evolución con el plan de tratamiento). Está en
`feature/modulo-06-lucas`, commit `6dbaf31`. El formulario tiene dos desplegables
en cascada, plan → procedimiento, y la línea de tiempo muestra a qué plan quedó
vinculada cada atención. Es solo lectura: no toco `planes_tratamiento` ni
`procedimientos_tratamiento`.

También validé US-6.1 a US-6.4 contra el código. El detalle está en
`docs/modules/06-evolucion-clinica/validacion-us.md`. Dos historias cumplen y dos
quedan parciales, y **lo que falta depende de una decisión tuya**: o es cambio de
esquema, o es trabajo de otro módulo.

**1. US-6.1 pide registrar "diagnóstico" en la evolución, y la tabla no tiene esa
columna.** `evoluciones_clinicas` (`bd_5clinicas_midentista.sql:242`) no tiene
`diagnostico`; los diagnósticos viven en la tabla `diagnosticos`, que escribe el
Módulo 05. ¿El criterio está mal y el diagnóstico no va en la evolución, o falta
una columna? Si falta, es tu decisión porque es cambio de esquema.

**2. US-6.3 dice que la próxima atención "aparece como recordatorio".** Hoy se ve
como insignia en la línea de tiempo, en el detalle de cada atención, y el portal
del paciente la muestra. Lo que no existe es un aviso en la vista de trabajo del
odontólogo: ni la agenda ni el dashboard consultan `proxima_atencion`. ¿Eso entra
como parte del Módulo 07 o del 13?

**3. US-6.4 dice "y el progreso del plan se actualiza".** No lo implementé.
Cambiar `procedimientos_tratamiento.estado` desde el módulo 06 haría que la
pestaña de tratamiento mostrara un cambio de estado que nadie decidió ahí, y sin
dejar registro de qué atenciones se imputaron a qué item. ¿Lo dejamos para el
Módulo 05?

**Corrección que salió de la validación.** El desplegable de planes ofrecía
también los planes `cancelado`, y US-6.4 pide un plan "activo". Lo arreglé: ahora
los cancelados no aparecen y cada opción muestra su estado. Un plan `completado`
sí se ofrece, porque una consulta puede documentarse después de cerrar el plan.

**Sobre las migraciones.** Dijiste que había que hacerlas. Revisé el repo y no
existe `supabase/migrations/` ni `supabase/config.toml`, así que no hay historial
versionado de la base: arrancarlo es bootstrap completo, no agregar un archivo.
Necesito dos decisiones tuyas:

- ¿Una migración solo con el delta de RLS, o también una migración baseline del
  esquema? Si es solo la del RLS, un `supabase db reset` en una máquina nueva
  crearía una base sin tablas.
- La CLI de Supabase no está instalada en mi máquina. ¿La instalo yo o lo hacés
  vos?

**T-6.1, lo que falta para cerrarlo** (todo es tuyo):

- Integrar el SQL de `docs/modules/06-evolucion-clinica/sql.sql` en
  `bd_5clinicas_midentista.sql`
- Documentarlo en `docs/DATABASE.md`
- Borrar la evolución de prueba que quedó en la tabla
- Decidir sobre `force row level security`

**Un favor de seguridad.** Me pasaste un PAT de Supabase por chat y quedó en el
historial. Rotalo cuando puedas.

También noté que `data/api.ts:360` lee las evoluciones para el portal del
paciente pero no pide `plan_tratamiento_id`, así que el paciente no ve a qué plan
quedó vinculada su atención. Es tu archivo, no lo toqué.

¿Abrimos el PR de T-6.6 o preferís que espere?

---

## Notas para Lucas

- **El PAT no va en este archivo.** Si hay que escribir el comando de rotación,
  va solo el nombre del token, nunca el valor.
- Las tres preguntas (1, 2, 3) son las que desbloquean el cierre del módulo. Sin
  respuesta, US-6.1, US-6.3 y US-6.4 quedan parciales y eso hay que decirlo en la
  entrega, no ocultarlo.
- Si Matías contesta lo de las migraciones, el bootstrap se planifica aparte: son
  pasos en tu máquina (`npm i -g supabase`, `supabase login`, `supabase init`) y
  dos decisiones de esquema que son suyas.
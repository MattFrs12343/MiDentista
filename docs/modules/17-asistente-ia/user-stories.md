# User stories — Módulo 17

Numeración provisoria. Decisiones de arquitectura cerradas el 2026-11-20
(ver `README.md`); listas para repartirse en tareas concretas.

## A. Asistente de síntomas (portal del paciente)

- **US-17.1** — Como paciente que recién se afilió a una clínica, quiero que
  se me muestre un asistente visual de síntomas (tarjetas con imagen, ej.
  dolor de muela, fiebre, sangrado, inflamación) antes de entrar al portal,
  con la opción de omitirlo y completarlo después.
- **US-17.2** — Como paciente, si marco síntomas compatibles con una
  emergencia dental, quiero que se me indique claramente qué hacer (ej.
  contactar a la clínica ya, no esperar a sacar turno normal) — solo un
  aviso en pantalla, sin alertar automáticamente a la clínica.
- **US-17.3** — Como odontólogo, quiero poder ver el resultado del
  pre-diagnóstico de un paciente (qué marcó y la severidad calculada) al
  atenderlo por primera vez.

## B. MiDentista IA (asistente flotante por rol)

- **US-17.4** — Como usuario con sesión activa de staff (`odontologo`,
  `odontologo_admin`, `recepcionista` o `superadmin`), quiero un botón
  flotante visible en toda la app para abrir un asistente que responda sobre
  lo que yo mismo puedo ver en mi menú y que pueda navegarme a esa pantalla.
- **US-17.5** — Como usuario del asistente, quiero poder escribirle o
  hablarle, y que entienda razonablemente aunque me exprese distinto a lo
  esperado (errores de tipeo, frases no literales), mediante normalización
  y coincidencia difusa sobre el árbol de reglas — sin depender de un LLM.
- **US-17.6** — Como odontólogo o recepcionista, quiero poder preguntarle al
  asistente sobre mis pacientes, historia clínica, odontograma, presupuestos
  o pagos, y que me lleve directo a esa pantalla si se lo pido.
- **US-17.7** — Como superadmin, quiero poder preguntarle al asistente sobre
  métricas cross-clínica, sin que mezcle ni muestre datos clínicos de
  pacientes individuales de ninguna clínica.
- **US-17.8** — Como usuario, quiero que el asistente tenga un límite claro
  de lo que puede hacer por mí: navegar y buscar sí, pero nunca completar un
  pago, aplicar un presupuesto ni modificar datos clínicos o financieros.
- **US-17.9** — Como usuario con un navegador que soporta síntesis de voz,
  quiero poder recibir la respuesta hablada además de escrita; en un
  navegador que no la soporte, quiero que el asistente siga funcionando
  normalmente solo con texto.

## C. Reportes PDF / CSV

- **US-17.10** — Como odontólogo, odontólogo administrador, recepcionista o
  superadmin, quiero poder generar un reporte estandarizado (encabezado +
  tabla + totales) de los datos de mi propio alcance y descargarlo en PDF
  usando la vista de impresión del navegador.
- **US-17.11** — Como odontólogo, odontólogo administrador, recepcionista o
  superadmin, quiero poder descargar el mismo reporte en CSV, con las mismas
  columnas que veo en pantalla.
- **US-17.12** — Como superadmin, quiero que mi reporte pueda incluir todas
  las clínicas, mientras que el resto de los roles solo ve datos de la
  propia (RLS).
- **US-17.13** — Como paciente, no tengo acceso a esta función (excluido
  explícitamente del alcance).

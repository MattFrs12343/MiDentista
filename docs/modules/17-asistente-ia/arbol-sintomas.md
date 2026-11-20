# Árbol de síntomas — pieza A (asistente de síntomas del paciente)

Cerrado el 2026-11-20. Resuelve T-17.1. Tres pasos, **15 tarjetas en total**,
todas a clic sobre imagen (nunca texto libre en esta pieza — eso es solo en
la pieza B).

**Estilo de imagen:** iconos/ilustraciones simples, consistentes con el
resto de la app (que ya usa `@phosphor-icons/react` en toda la interfaz).
Nada de fotos clínicas reales — evita problemas de licencia y no expone al
paciente a imágenes fuertes cuando solo está clasificando su urgencia.

## Paso 1 — "¿Qué sentís?" (multi-selección, 9 tarjetas)

| # | Tarjeta | Nota |
|---|---------|------|
| 1 | Dolor de muela o diente | |
| 2 | Dolor de mandíbula o al morder | |
| 3 | Sangrado en la boca o encías | |
| 4 | Inflamación o hinchazón en la cara/encía | |
| 5 | Fiebre | |
| 6 | Diente roto, flojo o que se cayó (trauma) | |
| 7 | Sensibilidad al frío, calor o dulce | |
| 8 | Pus, mal sabor o mal aliento fuerte | |
| 9 | Ninguno de estos / no estoy seguro | Excluyente: si se marca, se desmarcan las demás y se salta directo al resultado "Rutina" |

## Paso 2 — intensidad del dolor (única selección, 3 tarjetas)

Solo se muestra si en el paso 1 se marcó la tarjeta 1 o 2 (dolor de
muela/diente o de mandíbula). Si no se marcó ninguna de esas dos, se salta
este paso.

| # | Tarjeta |
|---|---------|
| 1 | Leve |
| 2 | Moderado |
| 3 | Severo |

Tipo escala de caritas (cara tranquila / cara incómoda / cara con gesto de
dolor fuerte), no texto.

## Paso 3 — ¿desde cuándo? (única selección, 3 tarjetas)

Mismo criterio que el paso 2: solo se muestra si se marcó dolor en el paso 1.

| # | Tarjeta |
|---|---------|
| 1 | Hace unas horas |
| 2 | Hace 1–2 días |
| 3 | Hace más de 3 días |

## Regla de severidad (determinística — sin IA real)

Evaluar en este orden; el primer caso que matchee define el resultado:

1. **Emergencia** si:
   - dolor = Severo **y** (fiebre marcada **o** inflamación facial marcada), **o**
   - trauma dental marcado **y** sangrado marcado.
2. **Urgente (no esperar turno normal)** si:
   - dolor = Severo (sin matchear el caso 1), **o**
   - pus/mal aliento marcado **y** dolor en Moderado o Severo.
3. **Rutina** en cualquier otro caso — incluye "Ninguno / no estoy seguro",
   sensibilidad sola, o dolor Leve sin otros síntomas.

La duración (paso 3) **no entra en la fórmula de severidad** — es contexto
que se muestra al odontólogo junto con el resultado (ver `tasks.md`
T-17.4), no cambia si es emergencia o no. Si en el futuro se quiere que la
duración también pese en la clasificación (ej. "dolor severo hace más de 3
días" como señal propia), es un cambio a esta regla, no a la UI de tarjetas.

## Posible condición (orientativa, agregada 2026-11-20)

Además de la severidad, el resultado muestra una posible condición dental
— **nunca un diagnóstico**, siempre con la aclaración "orientativo, a
confirmar con examen". Se calcula con `calcularCondicionPosible` en
`sintomasArbol.ts`, 100% derivada de `sintomas`/`intensidad` (no agrega
columnas nuevas: se recalcula al mostrarla, tanto en el resultado del
paciente como en `PrediagnosticoBanner` que ve el odontólogo). Mismo
criterio que la severidad: se evalúa en orden, el primer caso que matchea
gana.

| # | Condición | Cuándo |
|---|-----------|--------|
| 1 | Posible fractura o luxación dental | trauma dental + sangrado |
| 2 | Posible fractura o aflojamiento dental | trauma dental solo |
| 3 | Posible absceso dental | dolor Severo + (fiebre o inflamación) |
| 4 | Posible infección dental | inflamación + (fiebre o pus/mal aliento), sin dolor Severo |
| 5 | Posible pulpitis | dolor Severo, sin fiebre/inflamación |
| 6 | Posible enfermedad de las encías (gingivitis o periodontitis) | sangrado + inflamación |
| 7 | Posible gingivitis | sangrado solo |
| 8 | Posible infección o caries avanzada | pus/mal aliento solo |
| 9 | Posible caries dental | dolor Leve/Moderado, sin otros síntomas |
| 10 | Posible desgaste de esmalte o caries incipiente | sensibilidad sola |
| — | (nada) | "Ninguno/no estoy seguro" o sin síntomas marcados |

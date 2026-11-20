# Motor de interpretación de texto/voz — pieza B (MiDentista IA)

Cerrado el 2026-11-20. Desarrolla en detalle T-17.5 (antes solo decía
"normalización + coincidencia difusa", sin especificar el cómo). Sin
ningún LLM detrás — ver decisión B1 en `README.md`.

## Por qué en capas y no solo "comparar strings"

Los errores de **voz** (lo que transcribe el reconocimiento de habla del
navegador) y los errores de **tipeo** no son el mismo tipo de error:

- Voz: confunde sonidos que en español se pronuncian parecido (seseo,
  yeísmo, b/v), aunque el usuario haya dicho la palabra bien.
- Tipeo: letras de más/menos, letras cambiadas de lugar, tildes olvidadas.

Por eso el pipeline tiene un paso fonético (ataca los errores de voz) y un
paso de distancia de edición (ataca los de tipeo) — uno solo no cubre al
otro bien.

## Pipeline (en orden)

1. **Normalización básica** — minúsculas, quitar tildes/diacríticos (NFD +
   strip), quitar puntuación, colapsar espacios múltiples, trim.

2. **Normalización fonética en español** — antes de comparar, igualar
   grupos de sonidos que se confunden constantemente en el habla hispana:
   - `b` ↔ `v`
   - `s` ↔ `z` ↔ `c` (suave, antes de `e`/`i`) — seseo/ceceo
   - `ll` ↔ `y` — yeísmo
   - colapsar consonantes dobles (`rr` → `r`, etc.)

   Esto hace que, por ejemplo, "sita" (como a veces lo transcribe el
   micrófono) y "cita" terminen siendo la misma clave internamente, sin
   que el usuario haya pronunciado nada "mal" — es el reconocimiento de
   voz el que lo escribió distinto.

3. **Diccionario de sinónimos por intención** — cada acción/nodo del árbol
   (por rol, según la tabla de `README.md`) tiene una lista cerrada de
   palabras/frases clave. Ejemplo:
   - intención `ver_pacientes` → `paciente`, `pacientes`, `lista de
     pacientes`, `mis pacientes`, `buscar paciente`
   - intención `ver_presupuestos` → `presupuesto`, `presupuestos`,
     `cotizacion`, `cotización`

4. **Distancia de edición (Levenshtein) como red de seguridad** — si
   después de los pasos 1–3 ninguna palabra del input calza exacto contra
   el diccionario, se compara con tolerancia (ej. 1 error permitido por
   cada ~5 caracteres de la palabra) para cubrir errores de tipeo que la
   normalización fonética no anticipó.

5. **Umbral de confianza + desambiguación — nunca adivinar a ciegas.** Se
   calcula un puntaje por intención candidata (coincidencias exactas +
   fonéticas + por distancia). Reglas de salida:
   - Una intención claramente por encima del resto → se ejecuta directo.
   - Dos o más intenciones empatadas o por debajo del umbral mínimo → el
     asistente **no actúa**: muestra 2–3 opciones como chips clicables
     ("¿quisiste decir...?").
   - Ninguna intención supera el umbral mínimo → respuesta de "no entendí"
     + un menú corto de las intenciones más comunes para ese rol. Nunca
     falla en silencio ni ejecuta la acción equivocada.

Este último punto es lo que hace seguro a B2 (el asistente también ejecuta
acciones, no solo responde): al ser un árbol de reglas sin razonamiento
real, la seguridad viene de **no actuar con baja confianza**, no de que el
motor "entienda" mejor.

## Alcance explícitamente fuera de esto

- No hay corrección ortográfica general ni comprensión de lenguaje libre
  más allá del diccionario de intenciones — frases totalmente ajenas al
  dominio (dental/administrativo) siempre caen en "no entendí".
- No se guarda ningún modelo entrenado ni se llama a ningún servicio
  externo de NLP: todo el pipeline corre en el cliente, en TypeScript
  plano, sin dependencia nueva.

# Prompts de imagen — tarjetas del árbol de síntomas (pieza A)

Para generar en ChatGPT las 15 imágenes de `arbol-sintomas.md`. Pegar el
estilo general una sola vez al principio de la conversación con ChatGPT;
después pedir cada imagen indicando "mismo estilo que la imagen anterior,
pero ahora de: ..." para que las 15 queden visualmente consistentes.

## Estilo general (pegar primero)

```
Flat vector icon illustration for a healthcare app, minimal and friendly,
no text, no watermark, centered composition with generous padding, soft
rounded shapes, consistent stroke weight, no outlines, no gradients, no
realistic photography, not scary or graphic. Two-tone palette: primary
color deep blue #2f6a9a, background accent pale blue #eef6fb or white.
Square 1:1 composition, 1024x1024px.
```

Colores tomados de `frontend/src/index.css` (`--color-brand-600`,
`--color-brand-50`) para que combinen con el resto de la app.

**Dimensión:** 1024×1024 px cuadradas. En la app se muestran chicas
(~96–128 px), 1024 da margen de sobra para verse nítidas en retina. Si
ChatGPT no deja fondo transparente, pedir fondo blanco liso y recortar
después.

## Las 15 tarjetas

| # | Archivo | Subject (pegar después del estilo general) |
|---|---------|----------------------------------------------|
| 1 | `dolor-muela.png` | A hand gently touching a cheek, with a small glowing ache symbol (a few short radiating lines) near the jaw — tooth pain |
| 2 | `dolor-mandibula.png` | A side-profile outline of a jaw/mouth with a radiating ache symbol centered at the jaw hinge — jaw pain when biting |
| 3 | `sangrado.png` | A simple tooth icon with a small droplet shape beside it, droplet in a contrasting red-toned accent — bleeding in the mouth |
| 4 | `inflamacion.png` | A rounded face/cheek silhouette with one side visibly puffier than the other — facial swelling |
| 5 | `fiebre.png` | A simple thermometer icon with a few small heat-wave lines above it — fever |
| 6 | `trauma-dental.png` | A single tooth icon with a visible crack or chipped corner — broken or loose tooth |
| 7 | `sensibilidad.png` | A tooth icon flanked by a small snowflake on one side and a small flame on the other — sensitivity to cold and heat |
| 8 | `pus-mal-aliento.png` | A mouth/tooth icon with a few small wavy odor lines rising from it — bad smell or discharge |
| 9 | `ninguno.png` | A simple checkmark inside a soft rounded shield or circle — "none of the above" / feeling fine |
| 10 | `intensidad-leve.png` | A simple rounded face icon, calm neutral expression — mild pain |
| 11 | `intensidad-moderado.png` | A simple rounded face icon, slightly tense uncomfortable expression — moderate pain |
| 12 | `intensidad-severo.png` | A simple rounded face icon, clearly pained strained expression — severe pain |
| 13 | `duracion-horas.png` | A simple clock icon with hands positioned to suggest a short recent time — "a few hours ago" |
| 14 | `duracion-dias.png` | A simple calendar icon with one or two days lightly marked — "1 to 2 days ago" |
| 15 | `duracion-mas-dias.png` | A simple calendar icon with several days marked across a week — "more than 3 days ago" |

## Dónde van después de generarlas

Pendiente de decidir la carpeta exacta en `tasks.md` (T-17.2) — probablemente
`frontend/src/features/portal-paciente/assets/sintomas/` dado que la pieza A
es de Matías. Guardalas con estos mismos nombres de archivo para que calcen
directo con las claves del árbol en `arbol-sintomas.md`.

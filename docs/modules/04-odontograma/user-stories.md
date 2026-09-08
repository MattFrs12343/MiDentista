# Historias de Usuario - Odontograma

| ID | Historia | Prioridad | Estimación |
|----|----------|-----------|------------|
| US-4.1 | Visualizar odontograma | P0 | XL |
| US-4.2 | Registrar condición de pieza | P0 | L |
| US-4.3 | Registrar condición por superficie | P1 | L |
| US-4.4 | Agregar observaciones por pieza | P2 | M |
| US-4.5 | Ver historial de odontogramas | P1 | M |
| US-4.6 | Comparar odontogramas *(VERSIÓN 2 - fuera del MVP)* | P2 | L |

---

## US-4.1: Visualizar odontograma
**Como** odontólogo, **quiero** ver el odontograma visual con todas las piezas dentales, **para** evaluar el estado bucal.

- **Prioridad:** P0
- **Estimación:** XL
- **Criterios de aceptación:**
  - Given que el odontólogo accede al odontograma del paciente
  - When se carga la página
  - Then ve una imagen de la dentadura con zonas clickeables por pieza
  - And cada pieza muestra su estado actual con color/código

---

## US-4.2: Registrar condición de pieza
**Como** odontólogo, **quiero** seleccionar una pieza y registrar su condición, **para** documentar el diagnóstico visual.

- **Prioridad:** P0
- **Estimación:** L
- **Criterios de aceptación:**
  - Given que el odontólogo está en el odontograma
  - When hace clic en una pieza
  - Then se abre un panel con opciones: sano, caries, restauración, ausente, corona, implante, endodoncia, extracción
  - And al guardar, la pieza cambia de color/indicador

---

## US-4.3: Registrar condición por superficie
**Como** odontólogo, **quiero** especificar la superficie afectada (facial, lingual, mesial, distal, oclusal), **para** ser más preciso.

- **Prioridad:** P1
- **Estimación:** L
- **Criterios de aceptación:**
  - Given que el odontólogo selecciona una pieza
  - When elige la condición
  - Then puede seleccionar la superficie específica
  - And se guarda la condición por superficie

---

## US-4.4: Agregar observaciones por pieza
**Como** odontólogo, **quiero** agregar notas a cada pieza dental, **para** documentar detalles relevantes.

- **Prioridad:** P2
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que el odontólogo está en la ficha de una pieza
  - When escribe una observación
  - Then se guarda junto con la condición de la pieza

---

## US-4.5: Ver historial de odontogramas
**Como** odontólogo, **quiero** ver odontogramas anteriores del paciente, **para** comparar evolución.

- **Prioridad:** P1
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que el paciente tiene odontogramas previos
  - When el odontólogo accede al historial
  - Then ve lista de odontogramas por fecha
  - And puede seleccionar uno para comparar

---

## US-4.6: Comparar odontogramas  *(VERSIÓN 2 - fuera del MVP)*
**Como** odontólogo, **quiero** comparar dos odontogramas lado a lado, **para** ver cambios.

- **Prioridad:** P2
- **Estimación:** L
- **Criterios de aceptación:**
  - Given que el paciente tiene al menos 2 odontogramas
  - When selecciona dos fechas
  - Then se muestran lado a lado
  - And las diferencias se resaltan

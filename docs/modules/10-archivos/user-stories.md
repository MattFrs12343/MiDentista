# Historias de Usuario - Archivos e Imágenes

| ID | Historia | Prioridad | Estimación |
|----|----------|-----------|------------|
| US-10.1 | Subir fotografía clínica | P1 | M |
| US-10.2 | Subir radiografía | P1 | M |
| US-10.3 | Subir documento PDF | P2 | M |
| US-10.4 | Visualizar archivos | P1 | M |
| US-10.5 | Descargar archivos | P2 | S |
| US-10.6 | Asociar archivo a entidad | P1 | M |

---

## US-10.1: Subir fotografía clínica
**Como** odontólogo, **quiero** subir una fotografía clínica del paciente, **para** documentar su estado visual.

- **Prioridad:** P1
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que el odontólogo está en la ficha del paciente
  - When selecciona y sube una imagen JPG/PNG
  - Then se almacena en Supabase Storage
  - And aparece en la galería del paciente

---

## US-10.2: Subir radiografía
**Como** odontólogo, **quiero** subir una radiografía del paciente, **para** tener registro de imágenes diagnósticas.

- **Prioridad:** P1
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que el odontólogo tiene una radiografía digital
  - When la sube al sistema
  - Then se almacena y clasifica como "radiografía"

---

## US-10.3: Subir documento PDF
**Como** recepcionista u odontólogo, **quiero** subir documentos PDF, **para** adjuntar informes o referencias.

- **Prioridad:** P2
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que hay un documento PDF para adjuntar
  - When se sube al sistema
  - Then se almacena y se puede descargar

---

## US-10.4: Visualizar archivos
**Como** odontólogo, **quiero** ver las imágenes y documentos en el navegador, **para** revisarlos sin descargar.

- **Prioridad:** P1
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que hay archivos subidos
  - When se hace clic en un archivo
  - Then se abre en visor/embebido
  - And se puede hacer zoom

---

## US-10.5: Descargar archivos
**Como** odontólogo o paciente, **quiero** descargar archivos, **para** tener copia local.

- **Prioridad:** P2
- **Estimación:** S
- **Criterios de aceptación:**
  - Given que hay archivos disponibles
  - When se hace clic en "Descargar"
  - Then se descarga el archivo

---

## US-10.6: Asociar archivo a entidad
**Como** odontólogo, **quiero** asociar un archivo a una consulta, tratamiento o paciente específico, **para** organizar la información.

- **Prioridad:** P1
- **Estimación:** M
- **Criterios de aceptación:**
  - Given que se sube un archivo
  - When se asocia a una entidad
  - Then aparece en la sección correspondiente

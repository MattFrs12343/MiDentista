# Módulo 04: Odontograma

## Descripción
Módulo para representar y registrar visualmente el estado de las piezas dentales usando nomenclatura FDI.

## Responsable
Dev 4

## Funcionalidades
- Visualizar piezas dentales (imagen + zonas clickeables)
- Seleccionar pieza dental
- Registrar condiciones: sano, caries, restauración, ausente, corona, implante, endodoncia, extracción
- Registrar condición por superficie (facial, lingual, mesial, distal, oclusal)
- Agregar observaciones por pieza
- Ver historial de odontogramas
- Comparar odontogramas anteriores *(VERSIÓN 2 - fuera del MVP)*

## Tablas relacionadas
- `odontogramas` - Encabezado del odontograma (piezas en JSONB, sin tabla `odontograma_piezas`)

## Dependencias
- Módulo 02 (Pacientes) completado
- Tabla `odontogramas` (piezas en JSONB) creada
- Imagen base de odontograma FDI

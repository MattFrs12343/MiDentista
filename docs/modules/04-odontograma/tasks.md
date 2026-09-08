# Tareas de Implementación - Odontograma

| ID | Tarea | Estimación | Dependencias |
|----|-------|------------|--------------|
| T-4.1 | Crear tabla odontogramas + RLS *(piezas en JSONB, sin tabla odontograma_piezas)* | M | Módulo 01 |
| T-4.2 | Obtener/crear imagen de odontograma base (FDI) | L | - |
| T-4.3 | Implementar mapa de zonas clickeables sobre imagen | XL | T-4.2 |
| T-4.4 | Crear panel lateral de condiciones | M | T-4.3 |
| T-4.5 | Implementar lógica de selección de superficie | L | T-4.3 |
| T-4.6 | Crear servicio de odontograma (CRUD) | M | T-4.1 |
| T-4.7 | Implementar guardado de condiciones por pieza | M | T-4.4, T-4.6 |
| T-4.8 | Crear vista de historial de odontogramas | M | T-4.6 |
| T-4.9 | Implementar comparación de odontogramas *(VERSIÓN 2 - fuera del MVP)* | L | T-4.8 |
| T-4.10 | Agregar observaciones por pieza | M | T-4.4 |
| T-4.11 | Integrar odontograma en ficha del paciente | M | Módulo 02 |

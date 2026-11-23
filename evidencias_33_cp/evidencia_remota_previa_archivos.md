# Evidencia manual remota previa autorizada — CP-17 a CP-19

Fuente: confirmaciones del equipo ya documentadas en PRESENTACION y ratificadas expresamente por el usuario para esta tarea. No son nuevas ejecuciones remotas del agente. No se inventan fechas, identificadores ni capturas.

- CP-17: cuota decimal de clínica 5.000.000.000 bytes; máximo individual 10.485.760 bytes. Ocupación anterior 272025, WEBP de 18084; posterior 290109. Operación confirmada, con archivo_id informado por el equipo y bytes_reservados 0.
- CP-18: con solo 5000 bytes disponibles se rechazó el WEBP de 18084. Mensaje comunicado: “No hay espacio suficiente en el almacenamiento de la clínica.” Cuota restaurada a 5.000.000.000; ocupados 290109, reservados 0. No se vuelve a reducir la cuota productiva durante esta validación.
- CP-19: auditoría superadmin Detectar candidatos devolvió 0 candidatos y fue no destructiva. No prueba inexistencia absoluta de huérfanos.

Complemento actual: suite Node 697/697, Edge Archivos 16/16 y SQL efímero 8/8, ejecutados el 23/11/2026. Son validaciones locales de flujo, límites, cuota, reservas, idempotencia, autorización y auditoría; no constituyen una repetición de las tres comprobaciones manuales remotas.

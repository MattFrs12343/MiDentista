# Guía de recorridos autenticados utilizada

Los cuatro inicios manuales se completaron durante esta validación. Los resultados reales, límites y fallos están consolidados en `RESULTADOS_EJECUCION_33_CP.md`; esta guía conserva la preparación del procedimiento, no atribuye ejecución a cada complemento opcional.

El navegador de validación usa un perfil Edge nuevo y aislado, abierto en `http://127.0.0.1:5173/login`. No se leen contraseñas, tokens, cookies, almacenamiento de sesión ni perfiles personales. La autenticación se realiza manualmente por el titular de las cuentas. No se habilitan mocks para estos recorridos.

## Odontólogo / odontólogo administrador

- CP-01: iniciar sesión manualmente; observar destino de personal, rol visible y acceso a la clínica correspondiente, sin publicar la identidad de la cuenta.
- CP-09: abrir `/app/pacientes`, seleccionar exclusivamente un paciente sintético autorizado; pestaña Odontograma; pieza 16, caries y nota identificada como prueba; guardar, recargar y verificar exactamente la pieza y la nota. No escribir sobre pacientes reales.
- CP-26: en la misma ficha, buscar acceso a versiones y selección de dos fechas. Registrar la ausencia si no existe; no implementar el comparador.
- CP-27: revisar navegación disponible y catálogo utilizado por presupuestos; intentar encontrar alta, edición y desactivación. Si faltan superficies, registrar fallo sin cambiar código.
- Complementos CP-10 a CP-16: solo con registros sintéticos autorizados; diagnóstico y preservación de borrador, transición del plan con estado previo, procedimientos y relectura de total, evolución y referencias, presupuesto y descuento, pago pendiente frente a confirmado, QR estático. Las fichas de estos CP ya definen pruebas unitarias o servicios simulados; cualquier recorrido real adicional se identifica aparte.
- Evidencia: ruta, controles y mensajes pertinentes, estado antes/después y persistencia observada; sin datos clínicos personales.

## Recepción

- CP-03 y CP-24 (denegación): intentar `/app/admin`; verificar redirección y ausencia de Bitácora global.
- CP-05 (complemento visual): abrir formulario de paciente, enviar datos inválidos y comprobar errores sin guardar registros.
- CP-06 y CP-23: `/app/pacientes`; buscar `PRUEBA`, comprobar cero resultados y coincidencias existentes; si hay más de veinte, paginar. Descargar realmente CSV y comparar todas las filas filtradas, no solo la página. Revisar seis encabezados, caracteres especiales, comas y comillas. Abrir impresión real con `window.print()`; no atribuir una biblioteca PDF inexistente.
- Evidencia: descarga CSV real, encabezados y conteos sin exponer pacientes reales; pantalla de impresión o evento real de impresión y comparación con el listado.

## Paciente

- CP-03: intentar `/app/admin` y `/app/pacientes`; verificar retorno al portal y ausencia de datos de otras personas.
- CP-25: `/portal/citas`; intentar configurar horario, consultar disponibilidad, reservar, confirmar, reprogramar y cancelar. Registrar qué controles existen y qué falta; los enlaces a teléfono/correo no son reserva implementada.
- Evidencia: destinos reales y controles disponibles; no publicar información clínica del titular.

## Superadmin

- CP-03: abrir `/app/admin`; intentar `/app/pacientes`; verificar acceso administrativo y exclusión de edición clínica.
- CP-24: abrir Bitácora; registrar columnas y filtros realmente presentes, consultar sin alterar ni borrar eventos. Comparar un evento sintético solo si existe y está identificado.
- CP-32: reporte de personal, filtros ofrecidos y asistente; descargar CSV real, comparar nombre, correo, rol, clínica y estado. Imprimir mediante el diálogo del navegador. No publicar identidades de usuarios reales.
- CP-19: puede observarse auditoría no destructiva; no es necesario repetir el cambio de cuota remoto de CP-18. La evidencia previa de Archivos se conserva atribuida al equipo.

## Credencial incorrecta (CP-02)

En un cierre de sesión acordado, el titular introduce manualmente una contraseña incorrecta para su cuenta de validación existente. El agente observa únicamente el mensaje de rechazo y la imposibilidad de abrir rutas protegidas. No lee el formulario ni captura la contraseña. Un rechazo por formato de correo o una cuenta ficticia no sustituye esta prueba.

## Dependencias de datos

Antes de cualquier escritura, identificar manualmente clínica y paciente sintéticos autorizados. Si no hay un registro seguro, continuar los recorridos de solo lectura y registrar la dependencia concreta sin alterar información real. No cambiar contraseñas, cuotas, permisos, RLS ni usuarios; no aplicar migraciones ni ejecutar seeds remotos.

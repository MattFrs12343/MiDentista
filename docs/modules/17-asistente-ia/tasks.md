# Tasks — Módulo 17

Decisiones de arquitectura cerradas el 2026-11-20 (ver `README.md`). Al
repartir esto en PRs, seguir el mismo patrón que el resto de los módulos
(carpeta propia, `tipos.ts` + `*Mapper.ts` + `*Service.ts` + `README.md`).

## Correcciones post-implementación (2026-11-20, probado en local)

- [x] **Posible condición** en el resultado del wizard y en
      `PrediagnosticoBanner`: `calcularCondicionPosible` en
      `sintomasArbol.ts` (derivada, sin columna nueva) — ver
      `arbol-sintomas.md` sección "Posible condición".
- [x] **Acceso flotante para el paciente**: `AsistenteSintomasFlotante.tsx`
      (botón flotante en `PortalPacienteLayout`, abre `SintomasWizard` en un
      `Dialog`, repetible) — `SintomasWizard.tsx` se extrajo de
      `SintomasWizardPage.tsx` para reutilizarse en los dos.
- [x] **Animación de descubrimiento** en ambos botones flotantes
      (`.fab-aviso` en `index.css`): anillo que pulsa 3 veces y se apaga
      solo (`animation-iteration-count: 3`, no `infinite`), y se apaga antes
      si el usuario hace clic. Respeta `prefers-reduced-motion`.
- [x] **Fix micrófono (2 rondas).** 1ª ronda: pedía permiso pero no
      escuchaba — se llamaba a `.start()` sin esperar a que el permiso
      estuviera concedido (`getUserMedia` primero lo resolvió), y `lang`
      pasó de `es-BO` a `es-ES`. 2ª ronda: con eso arreglado, "se prende y
      después se apaga solo" — causa real: `continuous: false` corta la
      escucha apenas detecta el primer silencio, o a los pocos segundos si
      no detecta nada ("no-speech"), sin avisar nada (el `onerror` solo
      hacía `setEscuchando(false)` en silencio). Fix: `continuous: true` +
      `interimResults: true` (el texto va apareciendo en vivo en el input
      mientras se habla, confirma que el micrófono sí capta algo; se
      detiene sola al llegar un resultado final) y `onerror` ahora responde
      en el chat con el motivo real (`no-speech`, `not-allowed`,
      `audio-capture`, etc.) en vez de apagarse callado. 3ª ronda: error
      `network` — el reconocimiento de Chrome **no es local**, manda el
      audio a los servidores de Google; ese error es intermitente por
      naturaleza (VPN, antivirus con inspección HTTPS, el servicio gratuito
      fallando un momento) y no siempre significa que falte internet. Se
      agregaron 2 reintentos silenciosos antes de mostrar el error — si
      persiste después de reintentar, es de la red/entorno del usuario, no
      del código (nada que se pueda arreglar desde el repo).
- [x] **Fase de "pensando" a 850ms** (de 380ms a 650ms a 850ms, en rondas
      sucesivas de feedback) — ahora da tiempo real a leer cada fase.
- [x] **Fix loop de desambiguación en "reporte de pacientes".** Causa raíz:
      el intent "reporte" no tenía la frase "reporte de pacientes" como
      palabra clave propia, así que empataba con el intent "pacientes"
      (ambos puntuaban solo por la palabra suelta "pacientes") — y como el
      catálogo reducido de la desambiguación vuelve a tener la misma
      palabra, el empate se repetía para siempre. Se agregaron frases
      completas ("reporte de pacientes", "reporte de personal", etc.) como
      palabras clave de mayor peso en `intenciones.ts`. De paso: un "sí" /
      "así es" al responder la desambiguación ahora repregunta cuál de las
      dos opciones (`esAfirmacion` en `conversacion.ts`) en vez de caer en
      "no entendí" — sin un LLM no hay forma de saber a cuál se refería un
      "sí" suelto.
- [x] **Fix CSV mal transcrito por voz** ("ccb", "ssb", "ssv" en vez de
      "csv") y **fix reporte vacío por filtro de fecha** ("dame la lista de
      los pacientes" sin resultados en el rango de fechas elegido ahora cae
      a mostrar todos, con una nota, en vez de un reporte de "0 pacientes"
      sin explicación). Lógica movida a `reporteConversacional.ts` (antes
      vivía sin tests dentro de `AsistenteFlotante.tsx`).
- [x] **Todas las respuestas pasan por "pensando" (~1.5s), incluidas las
      preguntas.** Antes solo las tarjetas de datos tenían la secuencia de
      fases; un saludo o "¿de qué paciente?" contestaban de golpe.
      `responder()` ahora corre la misma secuencia de 4 fases que
      `mostrarConPensando` antes de mostrar cualquier texto. Voz de salida:
      `utterance.rate = 1.15` (un poco más ágil que el 1.0 por defecto).
- [x] **"Reporte" ahora es una conversación de 3 preguntas, no un botón
      directo**: formato (PDF/CSV) → alcance. Para pacientes: rango de
      fechas (reconoce "todos", "últimos N días/semanas/meses"; cualquier
      frase no reconocida cae en "sin filtro", nunca traba el flujo) y
      paciente específico o todos. Para personal (superadmin): especialidad
      específica o todas, y clínica específica o todas (sin pregunta de
      fecha — `PerfilAdmin` no tiene fecha de alta registrada). El resultado
      final muestra un solo botón de descarga, con el formato que se pidió.
- [x] **Intención "reporte" en el catálogo**: ahora se puede pedir el
      reporte por voz/texto ("dame el reporte", "quiero exportar").
- [x] **Cambio de arquitectura: nada navega, todo pasa dentro del chat.**
      El pedido original (B2: "navegar sí, nunca ejecutar más") quedó
      reemplazado por este: cada intención arma una tarjeta-resumen con los
      mismos servicios que usa la pantalla real (`cargarHistoriaClinica`,
      `cargarPresupuestos`/`cargarPresupuestosClinica`, `cargarPagos` +
      `calcularEstadoCuenta`, y dos consultas nuevas livianas en
      `datosResumen.ts` para odontograma/tratamiento, que no tenían un
      service de una sola función). Antes de mostrar el resultado se juega
      una secuencia de "Cargando… Analizando… Pensando… Empaquetando…"
      (`mostrarConPensando`, ~1.5s, en paralelo a la consulta real, nunca
      más lenta que los datos). La navegación solo ocurre si el usuario
      toca "Ver ficha completa"/"Ver todos" dentro de la tarjeta — eso sigue
      siendo explícito, nunca automático.
      - `pacientes`, `reporte`, `reporte_personal`, `panel_general`,
        `panel_admin`, `presupuestos`: no necesitan paciente.
      - `pagos`, `historia_clinica`, `odontograma`,
        `diagnostico_tratamiento`: si no se nombra un paciente en el mismo
        mensaje, el asistente pregunta "¿de qué paciente?" y espera la
        respuesta antes de armar la tarjeta.
      - "Descargar PDF"/"Descargar CSV" de `reporte`/`reporte_personal`
        funcionan directo desde el chat: se reutiliza `ReporteImprimible`
        (montado oculto dentro de `AsistenteFlotante`) y `exportarCsv.ts`,
        sin ir a `/app/pacientes` ni `/app/admin`.

## A. Asistente de síntomas

- [x] T-17.1 — Árbol de síntomas definido en firme: ver
      `arbol-sintomas.md` (15 tarjetas, 3 pasos, regla de severidad).
- [x] T-17.2 — `SintomasWizardPage.tsx` (3 pasos a tarjeta, "Saltar por
      ahora" en cada paso), ruta `/portal/sintomas`, engachado desde
      `BuscarClinicaPage` (`onExito` del `DialogAfiliacion`, solo cuando
      `esPrimeraAfiliacion`).
- [x] T-17.3 — Tabla `prediagnosticos_sintomas` (insert-only, sin
      update/delete) integrada en `bd_5clinicas_midentista.sql` y
      `docs/modules/17-asistente-ia/sql.sql`. `sintomasMapper.ts` +
      `sintomasService.ts` siguiendo el patrón de `features/clinical/`.
      **Pendiente: aplicar la migración en el proyecto real de Supabase**
      (no se puede ejecutar desde este entorno) — ver nota al final de este
      archivo.
- [x] T-17.4 — `PrediagnosticoBanner.tsx` en `PatientProfilePage.tsx`,
      debajo de `PatientHero`, solo lectura.

## B. MiDentista IA (asistente flotante)

- [x] T-17.5 — Motor de interpretación de texto/voz definido en detalle:
      ver `motor-interpretacion.md` (normalización fonética en español +
      diccionario de intenciones + distancia de edición + umbral de
      confianza con desambiguación). Sin llamadas a ningún LLM.
- [x] T-17.6 — `AsistenteFlotante.tsx`, montado en `AppShell.tsx` (único
      archivo de integración tocado para esto). Oculto si no hay sesión o
      si el catálogo de intenciones del rol está vacío (nunca se muestra
      para `paciente`, que ni pasa por `AppShell`).
- [x] T-17.7 — Entrada de voz con `SpeechRecognition` /
      `webkitSpeechRecognition` (feature-detect; sin el navegador soportado
      el botón de micrófono ni se muestra).
- [x] T-17.8 — Salida de voz con `window.speechSynthesis`
      (feature-detect + toggle para silenciarla; sin soporte, solo texto).
- [x] T-17.9 — `intenciones.ts`: catálogo por rol (`odontologo`/
      `odontologo_admin`/`recepcionista` comparten uno, `superadmin` otro),
      calcado de las rutas reales de `Sidebar.tsx`/`App.tsx`.
- [x] T-17.10 — Único tipo de acción permitida: navegar (`navigate(ruta)`).
      La única "búsqueda" es `buscarPacientePorNombre` (coincidencia exacta,
      nunca adivina entre varias) — no existe ninguna acción de escritura.
- [x] T-17.11 — Historial en `useState` del componente, se pierde al
      cerrar/recargar. Sin tabla ni `localStorage`.

## C. Reportes PDF / CSV

- [x] T-17.12 — `ReporteImprimible.tsx` (`features/reportes/`), reutiliza
      la infraestructura ya existente `components/print/PrintDocument.tsx`
      (se le agregó la prop opcional `firma?: boolean`, default `true`, para
      no mostrar firma de odontólogo en un reporte administrativo —
      retrocompatible con los 4 documentos clínicos que ya la usan).
      **Esto mismo destraba T-8.5 de Bianca** (módulo 08): ya existía el
      enfoque de PDF vía `window.print()` + `@media print`, no hubo que
      decidir ni instalar nada nuevo.
- [x] T-17.13 — `exportarCsv.ts` (`construirCsv` + `descargarCsv`), sin
      `papaparse`, con tests de los casos de escape (coma, comillas,
      numéricos, sin filas).
- [x] T-17.14 — `PatientsListPage.tsx` exporta `filtrados` (la propia
      clínica, vía RLS de `useClinicaData`); `AdminPage.tsx` exporta
      `personal` completo (todas las clínicas, solo visible para
      `superadmin` porque esa pantalla ya es exclusiva de ese rol).
- [x] T-17.15 — `BotonesReporte.tsx` montado en `PatientsListPage.tsx`
      (cubre `odontologo`/`odontologo_admin`/`recepcionista`, que comparten
      esa pantalla) y en `AdminPage.tsx` (superadmin). Ninguno en
      `portal-paciente/`.

## Migración de base de datos — aplicada

`public.prediagnosticos_sintomas` (ver `sql.sql`) ya está aplicada en el
proyecto real de Supabase (`aoarcxvqlidcvytkxbmq`) — tabla, índice y las dos
policies (`prediagnosticos_select`, `prediagnosticos_insert`) verificadas el
2026-11-20 vía la Management API de Supabase. `guardarPrediagnostico` /
`cargarPrediagnostico` ya deberían funcionar contra datos reales.

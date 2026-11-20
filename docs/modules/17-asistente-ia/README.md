# Módulo 17 — MiDentista IA

Estado: **implementado y migrado (2026-11-20)** — las tres piezas tienen
código real, tests y build/lint en verde (ver `tasks.md`), y la migración de
`prediagnosticos_sintomas` ya está aplicada en el Supabase real.

Contexto verificado el 2026-11-20: hoy el repo no tiene **ninguna** librería
de IA, voz, PDF o CSV instalada (`frontend/package.json` no trae
`jspdf`, `papaparse`, ningún SDK de IA, ni se usa `SpeechRecognition` /
`speechSynthesis` en ningún archivo). Todo lo de este módulo es greenfield.

Según `AGENTS.md`, esto no entra en la matriz de carpetas de los 6
integrantes: toca `portal-paciente/`, el shell que envuelve todas las
pantallas de `/app/*`, y datos de varios módulos ajenos (pacientes, pagos,
presupuestos, dashboard). Asumido como **pilot/spike de Matías**, no tarea
asignada a Lucas/Melissa/Bianca/Carlos/Angélica — si eso cambia, decirlo
explícito antes de tocar una carpeta de otro dueño.

Son **tres piezas independientes**, que pueden construirse y entregarse por
separado:

## A. Asistente de síntomas (pre-diagnóstico) — portal del paciente

**Dónde engancha:** el paciente nuevo hoy hace
`Login → (onboarding si es la primera vez con Google) → BuscarClinicaPage
(elige/afilia su clínica) → PortalHomePage (/portal)`
(`frontend/src/features/portal-paciente/BuscarClinicaPage.tsx` →
`PortalHomePage.tsx`). Este asistente se inserta **entre afiliarse a la
clínica y llegar al home del portal**.

**Qué es:** un árbol de decisión a base de tarjetas con imagen + clic (ej.
"dolor de muela", "fiebre", "sangrado", "inflamación") que arma un
pre-diagnóstico de severidad, pensado específicamente para detectar cuadros
que son **emergencia dental** (dolor agudo + fiebre + inflamación facial,
por ejemplo) y distinguirlos de una consulta de rutina.

**No es:** un diagnóstico clínico real ni un sustituto del odontólogo. Es una
clasificación de urgencia para orientar el primer contacto.

**Decidido (2026-11-20):**
- **Omitible** — el paciente puede "saltar por ahora" y completarlo después;
  no bloquea el acceso al portal.
- Si el árbol detecta un cuadro de emergencia, **solo se avisa al paciente**
  (recomendación clara en pantalla, ej. "contactá a la clínica ya"). No
  dispara ninguna alerta automática del lado de la clínica — si eso se
  quiere más adelante, es un cambio aparte.
- *Asumido, confirmar si no:* el resultado **sí se persiste** (ligado al
  perfil del paciente), para que el odontólogo lo vea como contexto al
  atenderlo por primera vez — es solo guardar qué tarjetas marcó y la
  severidad calculada, no agrega complejidad relevante. Se completa **una
  sola vez**, en el primer ingreso tras afiliarse a la clínica (no se repite
  en cada visita al portal).

## B. "MiDentista IA" — asistente flotante por rol (texto + voz)

**Dónde engancha:** un botón flotante disponible en todas las pantallas de
`/app/*`, exclusivo de los 4 roles de staff (`odontologo`, `odontologo_admin`,
`recepcionista`, `superadmin`). **El paciente no lo tiene** — en `/portal/*`
solo existe la pieza A (asistente de síntomas). Al hacer clic abre un panel
de chat que acepta texto **y** voz.

**Regla central que pediste:** el asistente debe poder responder sobre **todo
lo que ese rol ya puede hacer desde su propio menú**. Mapeado contra el
código real de `Sidebar.tsx` y `features/dashboard/`:

| Rol | Ve en su sidebar / dashboard hoy | El asistente debería cubrir |
|---|---|---|
| `odontologo` / `odontologo_admin` | Panel general (`DashboardOdontologo.tsx`), Pacientes, Historia clínica, Odontograma, Diagnóstico y tratamiento, Presupuestos, Pagos y cuentas | Preguntas y **acciones** sobre sus pacientes, historia clínica, odontograma, presupuestos y pagos — con los mismos datos que ya ve, filtrados por su propia sesión/clínica (RLS) |
| `recepcionista` | Mismo menú "Atención clínica" que arriba (hoy no hay diferenciación de sidebar por rol, salvo superadmin) | Igual que el odontólogo — el sidebar real no distingue rol salvo superadmin, así que el asistente tampoco distingue |
| `superadmin` | Solo "Panel de administración" (`DashboardSuperadmin.tsx`, `SuperadminCharts.tsx`) — nada de la vista clínica | Preguntas y acciones sobre métricas cross-clínica, nunca datos clínicos de pacientes individuales |

**Decidido (2026-11-20):**
- **Motor: árbol de reglas + coincidencia de palabras clave, sin LLM real.**
  Cero costo por request, cero API key, 100% determinístico — es la "IA sin
  que lo sea" que pediste desde el principio. La tolerancia a texto/voz mal
  expresados se resuelve con normalización + fuzzy matching (ver T-17.5),
  no con un modelo de lenguaje.
- **También ejecuta acciones**, no solo responde — puede navegar a una
  pantalla, abrir la ficha de un paciente, filtrar una lista, etc. **Barrera
  dura por tratarse de un árbol de reglas (sin razonamiento real detrás):**
  la lista de acciones permitidas es explícita y cerrada por rol (ver
  T-17.10); nunca puede completar/cancelar un pago, aplicar un presupuesto,
  tocar RLS/SQL, ni ninguna escritura que no sea trivial y reversible.
  Navegar y buscar sí; mutar datos clínicos o financieros, no.
- **Voz:** entrada siempre (hablar para tipear). Salida con
  *feature-detection* de `window.speechSynthesis` — si el navegador la
  soporta, el asistente responde también hablando; si no, se queda en
  texto. Sin servicio de voz pago, solo Web Speech API nativa del navegador.
- **Exclusivo de los 4 roles de staff** — el paciente no lo tiene (ver
  pieza A).
- *Asumido, confirmar si no:* el historial de conversación es **efímero por
  sesión** (no se persiste en una tabla nueva) — más simple, y un árbol de
  reglas no necesita memoria de largo plazo para funcionar bien.

## C. Reportes PDF / CSV — todos los roles excepto Paciente

**Alcance confirmado por vos:** `odontologo`, `odontologo_admin`,
`recepcionista` y `superadmin` (incluido explícitamente) pueden generar y
descargar reportes en PDF y en CSV. `paciente` queda afuera.

**Decidido (2026-11-20):**
- **PDF: `window.print()` nativo** con una hoja `@media print` dedicada —
  cero dependencias nuevas. Esta misma decisión **destraba también T-8.5 de
  Bianca** (PDF del presupuesto, módulo 08), que estaba bloqueada por la
  misma pregunta: ambos usan el mismo enfoque de ahora en más.
- **Reporte estandarizado**, no uno distinto por rol: mismo formato de
  reporte (encabezado de clínica/rol/fecha + tabla de datos + totales
  cuando aplique), reutilizado entre `odontologo`, `odontologo_admin`,
  `recepcionista` y `superadmin` — solo cambia **qué datos** trae cada uno
  según su propio alcance (RLS): el `superadmin` puede ver/exportar todas
  las clínicas, el resto solo la propia.
- CSV: exporta las mismas columnas que ya se ven en la tabla en pantalla
  (consistente con "estandarizado") — sin necesidad de `papaparse`, armar el
  string CSV a mano alcanza para este volumen de datos.

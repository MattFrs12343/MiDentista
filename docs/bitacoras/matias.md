# Bitácora - Matías (Dev 1 · Product Owner)

## Rol de Product Owner

Además de programar sus propios módulos, Matías es el **Product Owner** del
proyecto: aprueba cualquier migración de base de datos, cambio de arquitectura
o cambio de alcance antes de que se aplique. Ver la política completa en
[`../../CONTRIBUTING.md`](../../CONTRIBUTING.md).

## Asignación (INDEX.md)

| Fase | Mes | Responsabilidad |
|------|-----|------------------|
| 1 | Septiembre | Módulo 01: [Auth y Onboarding](../modules/01-auth-onboarding/) |
| 2 | Octubre | Módulo 07: [Agenda y Citas](../modules/07-agenda-citas/) |
| 3 | Nov-Dic | Testing final integral + **Deploy** a producción + revisión/aprobación de todo cambio de BD o arquitectura del resto del equipo |

Es la carga más pesada del proyecto: dos módulos completos (01 y 07) más el
despliegue a producción y la responsabilidad de revisar cada migración y cada
cambio de esquema antes de que el equipo lo aplique.

## Historias y tareas asignadas

**Módulo 01 (MVP):**
- Historias: US-1.1, US-1.2, US-1.3, US-1.5, US-1.6, US-1.7, US-1.8
- Tareas: T-1.1 a T-1.6, T-1.8 a T-1.15

**Módulo 07 (MVP):**
- Historias: US-7.1, US-7.2, US-7.3, US-7.4, US-7.5, US-7.7
- Tareas: T-7.1 a T-7.8, T-7.10, T-7.11

**Mes 3 — Deploy (ver [SETUP.md](../SETUP.md), "Despliegue en producción"):**
- `npm run build`, subida por FTP a HostGator, configuración de `.htaccess`
- Verificación de variables de entorno de producción
- Aprobación final de toda migración aplicada durante las 3 fases antes de
  publicar

## Checklist de tareas (en orden)

### Mes 1 — Módulo 01

- [ ] T-1.1 Configurar Supabase Auth (email/password)
- [ ] T-1.2 Crear tabla `perfiles` y trigger de sync con `auth.users`
- [x] T-1.13 Agregar columnas `latitud`/`longitud` a `clinicas` + índice geo ⚠️ toca BD
- [ ] T-1.3 Crear middleware de autenticación (JWT + `clinica_id`)
- [x] T-1.5 Implementar formulario de registro de paciente
- [ ] T-1.6 Implementar flujo de recuperación de contraseña
- [ ] T-1.8 Crear wizard de onboarding de clínica (MVP)
- [x] T-1.10 Configurar RLS para `perfiles` ⚠️ toca BD
- [ ] T-1.4 Implementar página de login
- [ ] T-1.9 Implementar ProtectedRoute y role-based routing
- [ ] T-1.11 Implementar cierre de sesión
- [ ] T-1.12 Crear hooks de autenticación (`useAuth`, `useUser`)
- [x] T-1.14 Implementar pestaña de búsqueda de clínicas (nombre + radio 5 km)
- [x] T-1.15 Implementar flujo de afiliación del paciente
- [ ] Validar US-1.1 a US-1.8 contra sus criterios de aceptación

### Mes 2 — Módulo 07

- [ ] T-7.1 Crear tablas `horarios` + `citas` + RLS ⚠️ toca BD
- [ ] T-7.2 Crear formulario de disponibilidad horaria
- [ ] T-7.4 Crear componente de calendario (vista diaria/semanal)
- [ ] T-7.3 Implementar CRUD de horarios
- [ ] T-7.5 Implementar selector de horarios disponibles para paciente
- [ ] T-7.6 Crear flujo de agendamiento de citas
- [ ] T-7.7 Implementar reprogramación de citas
- [ ] T-7.8 Implementar cancelación de citas
- [ ] T-7.10 Implementar máquina de estados de cita
- [ ] T-7.11 Integrar agenda en ficha del paciente
- [ ] Validar US-7.1 a US-7.5, US-7.7 contra sus criterios de aceptación

### Mes 3 — PO + Deploy

- [ ] Revisar y aprobar/rechazar cada PR que toque BD, RLS o arquitectura
- [ ] Testing final integral de los 9 módulos (junto al reporte de
      Melissa/Angélica)
- [ ] `npm run build`
- [ ] Subir `dist/` por FTP al subdominio en HostGator (cPanel)
- [ ] Configurar `.htaccess` para SPA
- [ ] Verificar variables de entorno de producción y HTTPS activo
- [ ] Capacitar al personal de la clínica piloto (Dr. Rojas / María López)

## Registro de avance

| Fecha | ID | Qué hice | Estado | Horas |
|-------|----|----|--------|-------|
| 2026-10-03 | Planta-0 | Módulos puros de la planta: `tipos.ts`, `plantaLayout.ts`, `plantaAgenda.ts`, `plantaMapper.ts` y `plantaService.ts`, con 29 pruebas | Hecho | 3 |
| 2026-10-03 | Planta-1 | Vistas 2D (`PlantaSvg`, `OverlayAgenda`, `DetalleZona`, `LeyendaZonas`, `SelectorModo`), sin three | Hecho | 2 |
| 2026-10-03 | Planta-3 | Vista 3D procedural (`geometria.ts`, `useOrbitaManual.ts`, `ZonasInstanciadas.tsx`, `Vista3DBase.tsx`) con presupuesto de 12K triángulos y 25 draw calls | Hecho | 3 |
| 2026-10-03 | Planta-4 | `AgendaPlantaMini` en el módulo de agenda y SQL propuesto de `zonas_clinica` + `citas.zona_id` | Hecho | 1 |
| 2026-10-03 | Planta-5 | Ruta `/app/planta`, entrada en el Sidebar, `README.md` del módulo y fila en `AGENTS.md` | Hecho | 1 |
| 2026-10-03 | Planta-6 | Baja del módulo Planta: no aporta valor porque cada clínica tiene una arquitectura distinta y muchas no tienen varios profesionales. Se eliminan `features/planta/`, `AgendaPlantaMini`, la ruta, la entrada del Sidebar y la fila en `AGENTS.md` | Hecho | 1 |
| 2026-10-03 | Fix-P0 | Rollback del estado optimista en `store.tsx` (`actualizarHistoria`, `registrarCondicion`) y manejo de error + estado `enviando` en `PatientForm.tsx` para que falle visible el alta de paciente | Hecho | 2 |
| 2026-10-03 | Fix-3D | Carga del arco 3D: se clona la escena por montaje en `DentalArch3D.tsx`, se añaden `modeloArco.ts` y `precargaVista3D.ts`, auto-reintento en `OdontogramTab` y prefetch al abrir la ficha | Hecho | 3 |
| 2026-10-03 | T-2.5 | Ficha del paciente completa (US-2.4): pestañas **Evolución** (módulo 06) y **Pagos** (módulo 09) integradas en `PatientProfilePage`/`tabValue`; se expone `miPerfil` en el store para los módulos que escriben | Hecho | 3 |
| 2026-10-03 | US-2.5 | Contacto de emergencia: campos en `Paciente`, mapeo y payloads del store, formulario y vista de la ficha | Hecho | 1 |
| 2026-10-03 | US-2.3/2.6 | Búsqueda de pacientes por teléfono y correo, y paginación a 20 por página (lista y selector) | Hecho | 1 |
| 2026-10-03 | US-1.2/T-1.5 | Portal del paciente: alta del perfil `paciente` tras el login con Google (`paciente/registrar` en la Edge Function) y formulario de onboarding en `/onboarding` | Hecho | 3 |
| 2026-10-03 | T-1.14 | Búsqueda de clínicas por nombre/ciudad y por cercanía (geolocalización + Haversine, radio 5 km); `listarClinicas` extendido con latitud/longitud | Hecho | 3 |
| 2026-10-03 | T-1.15/T-1.10 | Afiliación del paciente con la función `SECURITY DEFINER afiliar_paciente` (una policy de UPDATE sobre `perfiles` dejaría cambiar el propio rol) y portal de lectura (historia, odontograma, evoluciones, pagos) vía `paciente/mi-ficha` con service_role | Hecho | 4 |
| 2026-10-03 | US-1.8 | Ruteo por rol: área `/portal` con guard `RequirePaciente` y `/onboarding`; login y callback de Google redirigen según el rol | Hecho | 2 |
| 2026-10-04 | Fix-UTF8 | Doble codificación UTF-8 en 10 archivos (270 caracteres): el usuario veía `DefiniciÃ³n`, `clÃ­nicas`, `Ã©xito`. Recodificación cp1252→UTF-8 tras verificar que no quedaban secuencias `Ã` ni `U+FFFD`, más `Número de operación` en `PaymentForm.tsx` | Hecho | 2 |
| 2026-10-04 | Fix-3D-select | Seleccionar un diente en la vista 3D no funcionaba: `DentalArch3D` llamaba `setPointerCapture` en el div contenedor, lo que retargetaba el `click` al wrapper y R3F (que escuchaba en su div interno) nunca lo recibía. Se agrega `eventSource={containerRef}` al `<Canvas>`; además `onPointerMissed` deselecciona, las piezas `ausente` ya no son seleccionables (`Raycaster` ignora `visible`) y el tooltip no parpadea en la esquina | Hecho | 2 |
| 2026-10-04 | FormTheme | Sistema de tema de formularios por sección: `form-theme.ts` (12 secciones) + `form-parts.tsx` (`FormShell`, `FormGroup`, `FormActions`, `FormAlert`), propagado por contexto para que `Field`/`Input`/`Textarea`/`Select` lo hereden solos. `Field` gana `error`. Piloto aplicado a pacientes, historia clínica (8 modales) y pagos | Hecho | 4 |
| 2026-10-04 | Secciones-UI | El usuario no veía cambios en `:8080`: el `FormTheme` quedaba escondido detrás de diálogos y tarjetas colapsadas, y las fichas no mostraban estado. Nuevo `section-board.tsx` (`SectionStatStrip`, `SectionToolbar`, `RailCard`) y aplicado a las 4 secciones: pacientes (métricas + buscador fijo), historia clínica (métricas de alergias/enfermedades/medicamentos/hábitos), odontograma (3D promovida a protagonista a 420px, editor en columna fija, métricas de piezas) y diagnóstico/tratamiento (métricas con costo estimado y prioridad alta) | Hecho | 3 |
| 2026-10-04 | Portal-3D-celular | Odontograma 3D para el paciente en el portal, más arreglo de dos bugs de la vista 3D del clínico. (1) El encuadre se calculaba sobre la escena completa, que la domina la mandíbula (escala ~5): por eso las encías se veían diminutas. Ahora hay una caja por nivel de anatomía. (2) `/mandible\|maxilla\|sinus/` no casaba con `mandibular-alveolar-process` ni con `mandibular-condyle-*`, así que medio maxilar quedaba oculto y la otra mitad visible en blanco sin material; se reemplaza por la lista explícita `NODOS_HUESO`. Selector encías / encías+hueso, pellizco para zoom táctil y botones de 44px. El `.glb` (1,4 MB) no se descarga hasta que el paciente lo pide. Vista de pacientes: tarjetas en celular porque la tabla de 6 columnas obligaba a arrastrar en horizontal | Hecho | 5 |
| 2026-10-04 | Accesos-premium | Rediseño visual de las seis tarjetas de acceso sin tocar estructura, textos ni rutas. **Jerarquía de una sola tarjeta**: "Agendar cita" es la única con degradado de marca y texto blanco; las otras cinco son blancas con un velo `brand-50/60` y texto oscuro. Antes las seis pesaban igual y el usuario no tenía forma de saber por dónde empezar, que es el defecto clásico de un dashboard de tarjetas genéricas. La diferencia la da el fondo, no el tamaño: las cinco secundarias tienen el mismo icono, flecha y padding que la principal. **Alturas**: se eliminaron los `min-h` fijos y se pasó la grilla a `auto-rows-fr`, así cada fila se estira por su contenido más largo y las tarjetas quedan parejas sin aire sobrante. **Adornos**: bajados de 18-40% a 7-9% (12% en la principal) y reubicados en la esquina inferior derecha, en la diagonal opuesta al texto; a 18%+ el ojo iba al dibujo antes que al título. **Contraste**: dos correcciones que la medición obligaba — la flecha pasó de `brand-400` (2.52 sobre el velo) a `brand-500` (3.89), y el anillo de `line` (1.24 contra el canvas) a `line-strong` (1.54), porque con el borde anterior el canto de la tarjeta se perdía. **Tipografía**: `Inter` entra en la pila de `--font-sans` justo después de SF Pro, así que se usa solo si ya está instalada y no suma una petición de red ni un FOUT. Las transiciones nombran `box-shadow` y `transform` en vez de `all`, que pelearía con el `lift-hover` | Hecho | 4 |
| 2026-10-04 | Accesos-celeste | Los seis accesos pasan a **celeste a blanco de izquierda a derecha**, con la luz entrando por el lado del ícono y la tarjeta abriéndose hacia el título y la flecha. Como el degradado termina en blanco, el texto tiene que ir **oscuro**: blanco sobre blanco da 1.0. Medido sobre el tramo más celeste (`brand-200`): título `ink` 10.79 AAA y detalle `ink-soft` 5.17 AA. El detalle va en `ink-soft` y no en `ink-muted` porque `ink-muted` (#6b6659) sobre `brand-200` da 3.93, por debajo de 4.5 — y por la misma razón ningún degradado baja de `brand-200`: en `brand-300` el `ink-soft` cae a 3.86. Lo que sigue distinguiendo las seis es dónde está el punto más celeste, de modo que la grilla se lee como progresión y no como seis copias. El barrido de hover pasó de blanco a una banda de azul `brand-600` al 20% (`#2f6a9a33`): sobre un degradado que termina en blanco, un brillo blanco no se vería. El chip y el badge son lo único que sigue en blanco, porque van sobre azul sólido `brand-600` donde el blanco da 5.75 AA. Las claras llevan `shadow-card` más una sombra cálida propia: blanca contra el canvas `#f1efea` da 1.15 y el borde de 1px no alcanza | Hecho | 2 |
| 2026-10-04 | Accesos-un-color | Las seis tarjetas de acceso quedan en **un solo color**: azul de marca, degradado de izquierda a derecha (`bg-gradient-to-r`) y texto blanco en todas. Se withdrawron las tres cartas claras de la versión anterior. Como ya no hay contraste de color entre tarjetas, lo que las distingue es (a) **dónde entra la luz** — la principal la lleva al centro y las demás la van corriendo, para que la grilla se lea como una banda continua de luz y no como seis bloques pegados — y (b) el motivo, que sigue saliendo del nombre de cada tarjeta. La principal conserva el `ring-2 brand-400` para seguir siendo la principal ahora que todas comparten color. Contraste: el piso es `brand-700` en las seis, donde el blanco puro da 8.39 y el detalle al 90% 7.18; se subió el detalle del 75% al 90% porque a 75% daba 5.52, justo, y con el brillo de hover encima bajaba más. Ninguna baja de `brand-700` | Hecho | 2 |
| 2026-10-04 | Accesos-dinamicos | Las tarjetas tienen dos animaciones. `acento-barrido`: un brillo que cruza la tarjeta **en el mismo sentido que el degradado**, de izquierda a derecha, al hacer hover. Es *feedback* — confirma que el elemento es un enlace — y por eso solo corre bajo `@media (hover: hover) and (pointer: fine)`: en táctil no hay hover y el destello saltaría solo al tocar, que es ruido. `acceso-deriva`: el motivo flota muy lento en bucle, 26s, con los índices impares en reversa y 31s para que no arranquen en fase y se lean como una sola capa en movimiento. Ambas se mueven con `transform` y nunca con `left`/`top`/`width`, que forzaría reflow de la tarjeta entera en cada frame. Con `prefers-reduced-motion` el barrido no se elimina del todo: queda como cambio de opacidad de 160ms para que el hover siga confirmando que es un enlace; la deriva, que es puramente decorativa, sí se apaga | Hecho | 3 |
| 2026-10-04 | Accesos-claros-oscuros | Los accesos alternan ahora cartas claras y oscuras: tres con degradado blanco→azul de marca (cita, historia, evoluciones) y tres azules profundos (odontograma, pagos, clínica). Alternarlas da ritmo a la grilla y hace que la acción principal se encuentre sin leer. La principal **cambió a carta clara con borde `ring-2 brand-500`**: siendo la más clara y la única con borde de color, es la que el ojo agarra primero. Contraste medido en las dos familias: sobre blanco/brand-50/brand-100 el `ink` da 15.72/14.19/12.24 (AAA) y el detalle `ink-muted` 7.47/6.74/5.81 (AA); sobre azul, el piso sigue siendo `brand-700` con blanco al 100 (8.39) y 90% para el detalle. Las claras llevan `shadow-card` y una sombra cálida propia porque blanca contra el canvas `#f1efea` da solo 1.15 y el borde no alcanza; la cálida evita que la sombra se lea como mancha sobre el azul. Cada motivo ahora sale del **nombre** de su tarjeta: reloj y troquel para la cita, arco de piezas para el odontograma, hoja con tabla de piezas para la historia, borde de comprobante con renglón de total para pagos, calendario con días marcados para evoluciones, anillos con pin para la clínica. Los chips usan un color de acento distinto por tarjeta (`brand-600`, `brand-700`, `ink`) | Hecho | 3 |
| 2026-10-04 | Accesos-variados | Los seis accesos dejan de ser la misma tarjeta repetida. Ahora cada uno tiene motivo, degradado y estructura de fondo propios: **agendar cita** es un turno con troquel punteado y ocupa doble columna en móvil; **odontograma** lleva el arco de 13 piezas sobre un panel claro, porque los trazos finos se pierden sobre el degradado; **historia** muestra un legajo de hojas apiladas con esquina en corte a 45°; **pagos** es un comprobante con borde en sierra y una barra de avance real; **evoluciones** usa la grilla de calendario con días marcados; **buscar clínica** tiene los anillos de radio igual que el mapa. El arco y la grilla se calculan en render con 13 y 16 elementos: escritos a mano con `rotate` la curva sale rota. Lo que sí se mantiene igual en las seis es el esqueleto — ícono arriba a la izquierda, texto abajo a la izquierda, flecha abajo a la derecha, mismo radio y misma altura mínima. Si el texto se moviera por tarjeta, el ojo no podría recorrer la grilla y volvería a leer como filas iguales. La barra de pagos se calcula sobre pagado + pendiente, no sobre el total histórico: sin saldo pendiente va a 100, porque `0` de avance se lee como "nunca pagó" | Hecho | 3 |
| 2026-10-04 | Portada-sin-consulta | Se eliminan las dos tarjetas de consulta de la portada del portal: "Tu clínica" (nombre + ciudad) y "Resumen de tu atención" (evoluciones / diagnósticos / tratamientos / pagado). Repetían datos que ya están en el hero y en la fila de métricas y empujaban los accesos hacia abajo. La información no se pierde, cambia de lugar: el nombre y la ciudad de la clínica pasan al subtítulo de "Cambiar de clínica" (que ahora se titula "Buscar clínica" cuando no hay ninguna) y las cifras al subtítulo de la tarjeta a la que corresponden — "N diagnósticos · M tratamientos" en odontograma, "N evoluciones" en historia, "Al día · Bs X pagado" o el saldo pendiente en pagos. Debajo del strip queda un solo bloque: los seis accesos | Hecho | 1 |
| 2026-10-04 | Accesos-dentales | Cada tarjeta de acceso lleva identidad de consultorio odontológico. Tres capas: silueta de diente en SVG (trazo de 2.5px, corona + cuello + dos raíces) como marca de agua al 8-10%, dos blobs de color al 30% como el lenguaje de `TonePanel`, y un filo superior de luz de 2px que separa la tarjeta del canvas sin borde oscuro — sobre azul, un borde sólido se lee sucio. El chip del ícono usa `ring-white/25` en vez de borde para el mismo motivo. Los degradados varían de tono **dentro** de la rampa de marca, no de familia de color: seis colores distintos harían que la portada perdiera identidad. El piso lo fija la parada más clara, y ahí hay un límite medido: blanco al 75% da 5.52 sobre `brand-700` pero solo 4.03 sobre `brand-600`, y el cuerpo de 13px pide 4.5 — así que ningún degradado baja de `brand-700` | Hecho | 2 |
| 2026-10-04 | Accesos-portal | La portada pasa a tener accesos directos con degradado (`CardAcceso`, nuevo archivo) bajo el título "¿Qué querés hacer?". Seis destinos — agendar cita, odontograma, historia, pagos, evoluciones y cambiar de clínica — cada uno con el dato real en el subtítulo (cuántas evoluciones, si hay saldo, cuántos diagnósticos), para que la tarjeta responda sin abrir. El degradado va de `brand-900` a `brand-700` y no más claro: blanco sobre `brand-500` da 4.05, insuficiente para cuerpo de 13px, y `brand-400` da 2.62. Los accesos van **antes** de las tarjetas de clínica y resumen, porque son acción y las de abajo son consulta. Nueva ruta `/portal/citas` y `MisCitasPage`: muestra la próxima cita destacada, el resto y las atendidas. **No hay formulario de reserva**: `citas.odontologo_id` es `not null` y la política `citas_insert` solo habilita al personal de la clínica o al superadmin, así que un paciente no puede escribir la fila. En su lugar la vista da `tel:` y `mailto:` de la clínica, que sí están en `ClinicaResumen`. Habilitar la reserva real requiere una RPC `solicitar_cita` con `SECURITY DEFINER`: es cambio de base de datos y queda pendiente de aprobación del PO | Hecho | 4 |
| 2026-10-04 | Contraste-superficies | El canvas baja de `#fbfaf7` a `#f1efea` y `--color-line` de `#e8e5df` a `#ddd8ce`. La auditoría anterior solo midió texto contra tarjeta (5.7-15.7, todo bien) y por eso dio falso conforme: lo que no se veía era la tarjeta. Blanca contra canvas daba **1.04** y el borde con `border-ink/[0.07]` daba 1.26, o sea nada. Ahora tarjeta/canvas es 1.15 y borde/tarjeta 1.42, y `ink-muted` sobre el canvas nuevo sigue en 4.98 (AA). `border-ink/[0.07]` y `/[0.08]` se sustituyen por el token `line` en `card.tsx`, `button.tsx` y los accesos de la portada. La fila `SectionStatStrip` era `bg-surface-sunken/50` (1.02 contra el canvas) y pasa a superficie blanca con borde. El valor de `StatTile` baja de 26px a 22px en móvil, que con dos columnas no dejaba respirar el dígito | Hecho | 3 |
| 2026-10-04 | Menu-movil | El portal pasa a drawer lateral en móvil, igual que el `Sidebar` del clínico. Antes eran seis chips con scroll horizontal: "Odontograma" y "Evoluciones" quedaban fuera de pantalla sin ningún indicador de que había más, y en un riel angosto se leía como carrusel accidental. Ahora hay botón de hamburguesa `lg:hidden` con los seis items completos (ícono, nombre y qué hay adentro), cierre con `Esc`, con el overlay o al elegir sección, y se cierra solo al pasar a desktop para no dejar el velo puesto al rotar. La tira horizontal queda para escritorio. Cada item mide 56px, sobre el mínimo táctil de 44px | Hecho | 2 |
| 2026-10-04 | Sin-verde | Segundo pase de color sobre lo anterior. El verde pastel (`pastel-green-bg` `#edf3ec` / `pastel-green-fg` `#346538`) sale del portal: en `PortalHomePage` la tarjeta "Tu atención", en `MisPagosPage` y `MiOdontogramaPage` las métricas de "total pagado" y "en buen estado", y el aviso de "ya estás afiliado" de `BuscarClinicaPage`. Donde el verde marcaba un dato neutro (saldo al día, piezas sanas) va ahora `neutral` o `brand`: el azul de marca ya dice "esto va bien" sin abrir un tono nuevo. El verde sigue existiendo en `badge` / `stat-tile` / `card` / `section-board` porque lo usan admin, agenda y auth como estado semántico, y ahí sí informa algo (validación exitosa, pago recibido) | Hecho | 2 |
| 2026-10-04 | Color-marca | Revisión de la paleta. Los pasteles `pastel-blue` (`#e1f3fe`, celeste) y `pastel-violet` (`#f1ecfb` / `#5b3f9f`, lila con base morada) no pertenecen a la identidad: la plataforma es el azul `--color-brand-*` sobre canvas cálido, y esos dos se leen ajenos. `blue` y `violet` pasan a resolver a la rampa de marca en `badge.tsx`, `stat-tile.tsx`, `card.tsx` y `section-board.tsx`; los nombres se conservan porque el resto de la app los pide por tono de módulo. `CardTone` pierde `violet` (el morado sí funciona en el gradiente grande y oscuro de un hero, no como superficie de tarjeta). El mapa tenía los azules genéricos `#2563eb` / `#3b82f6` / `#0ea5e9` de otra librería, ahora alineados con la marca en `TONE_MARCA`. Fuera de la identidad quedan los pasteles cálidos (green/yellow/red), que sí pertenecen al sistema semántico | Hecho | 3 |
| 2026-10-04 | Mapa-busqueda | `BuscarClinicaPage`: segmented control en vez de dos botones (el estado activo se lee por relleno y no solo por color), `SectionToolbar` para los controles, `PortalSubHeader`, y en cada tarjeta `tel:` para llamar y `geo:` para "cómo llegar" (solo si hay coordenadas). El círculo del mapa pasa a `alcanceEfectivo`: el filtro recorta a 5 km, así que el radio dibujado podía ser mayor que el área con resultados y sugerir un alcance inexistente. Hover sobre un pin resalta la tarjeta de la lista, y al cambiar de vista se limpia el foco. El estado vacío ofrece una salida ("Buscar sin ubicación" / "Limpiar búsqueda") en vez de dejar al paciente mirando un vacío | Hecho | 3 |
| 2026-10-04 | Superficies | Todas las tarjetas de la app eran el mismo bloque: `bg-white/85` + `backdrop-blur-2xl` + `shadow-e2`. Tres consecuencias: sin jerarquía (si las 59 están elevadas nada destaca, la jerarquía solo se expresaba con tamaño de texto), texto con menos contraste del debido por la superficie lechosa, y 59 `backdrop-filter` por frame en el celular. Se reescribe `card.tsx` con tres niveles de elevación (`flat` anidado / `raised` normal / `overlay` flotante) más `glass` como opt-in, superficie opaca, y tonos que reutilizan los pasteles de `badge.tsx`. Se suman `accent` (filo de 3px que identifica la sección), `divided` en header/footer para que la tarjeta no se lea como una sola masa de texto, y `as` en `CardTitle` para arreglar la jerarquía de encabezados. `SectionStatStrip` recibe el mismo filo, derivado de la métrica destacada: cada sección cambia de color sin tocar un solo archivo de Features | Hecho | 3 |
| 2026-10-04 | Ficha-hero | La ficha del paciente era la única sección sin hero: arrancaba con una tarjeta plana que tapaba por completo el fondo animado global (`AppBackground` → `AnimatedTeeth` va a opacidad 0.13-0.16 y quedaba invisible bajo las tarjetas opacas de las pestañas). Nuevo `PatientHero.tsx`: panel con el gradiente violeta del módulo, los mismos blobs de `AppBackground` y `AnimatedTeeth` en `vivid`; la decoración lleva `print:hidden` para no gastar tinta al imprimir | Hecho | 2 |

> Pendiente de la acción del PO: integrar
> [`docs/modules/01-auth-onboarding/sql.sql`](../modules/01-auth-onboarding/sql.sql)
> en `bd_5clinicas_midentista.sql` y desplegar la Edge Function
> (`supabase functions deploy api`) para que el flujo funcione contra Supabase.

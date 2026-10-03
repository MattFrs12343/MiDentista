# Integración de Historia clínica con Supabase

## Estado de esta rama

Historia clínica tiene un servicio de Supabase preparado. Necesita recibir
`pacienteId` y `clinicaId` reales y que Auth/RLS esté configurado al fusionar las ramas.

La demo sigue usando `ClinicalHistoryTab` y el store en memoria. No se han cambiado
Auth, Pacientes, rutas, tablas ni policies. El nuevo hook no está conectado a la UI
y no ejecuta consultas automáticamente. Los IDs `p1`, `p2`, `p3` y `p_...` se rechazan
antes de acceder al cliente; no se convierten en UUIDs.

## Configuración

Instalar las dependencias del frontend con `npm install`. Crear localmente
`frontend/.env.local` y completar los valores públicos del proyecto:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

El `.env.example` de la raíz contiene las variables vacías como referencia.
Vite carga las variables desde el directorio `frontend`, no desde el `.env` raíz
de Docker. Reiniciar Vite después de configurar las variables.
No colocar claves `service_role` en el frontend.

`obtenerSupabase()` en `src/lib/supabase.ts` crea un único cliente de forma diferida.
La aplicación puede seguir funcionando sin credenciales mientras el servicio no se use.
Este módulo no inicia sesión ni sustituye el login simulado.

## API del módulo

```ts
import { cargarHistoriaClinica, guardarHistoriaClinica } from "@/features/clinical/clinicalHistoryService";

const historia = await cargarHistoriaClinica(pacienteUuidReal);
const guardada = await guardarHistoriaClinica(pacienteUuidReal, clinicaUuidReal, historiaCompleta);
```

Las funciones devuelven `HistoriaClinica` y rechazan su promesa si ocurre un error.
Permiten recibir opcionalmente un `SupabaseClient` ya configurado como último argumento.
El flujo general debe proporcionar IDs de filas existentes y confirmar que el
paciente pertenece a la clínica. La validación de formato UUID no demuestra esa relación.
El servicio solo accede a `public.historiales_clinicos`.

- Carga: consulta por `paciente_id`; si no hay filas visibles devuelve una historia vacía.
- Guardado: busca la fila; actualiza por `id`, `paciente_id` y `clinica_id`, o inserta
  usando exclusivamente los UUIDs recibidos. Exige recuperar la fila guardada.
- Si hay varias historias visibles para el paciente, devuelve un error. El esquema
  no garantiza unicidad por paciente: el equipo debe decidir cuál editar.
- Si una historia existente pertenece a otra clínica, no se actualiza.
- No hay garantía de exclusión entre INSERTs concurrentes de distintos clientes sin
  una restricción de unicidad en BD. No se añadió ni modificó ninguna restricción.

## Estados preparados

`useClinicalHistorySupabase()` expone:

```ts
const { historia, cargando, guardando, error, cargar, guardar } = useClinicalHistorySupabase();
```

`cargar(pacienteId)` y `guardar(pacienteId, clinicaId, historiaCompleta)` devuelven la
historia resultante o `null` si falla la operación; el detalle queda en `error`.
No se borra el contenido previo ante un error. Las respuestas antiguas no reemplazan
el estado de una operación más reciente. No iniciar otro guardado mientras
`guardando` sea verdadero: una segunda llamada devuelve `null` y un mensaje para reintentar.

Al fusionar, conectar este hook o el servicio al flujo de Historia clínica solo
cuando estén disponibles los dos UUIDs. Las modificaciones de alergias también
deben formar parte de la historia completa enviada al guardar. No confundir una
respuesta `null` con éxito, ni descartar ediciones pendientes durante un guardado.

## Formato de las columnas existentes

- `motivo_consulta`, `antecedentes_odontologicos`, `observaciones`: textos directos.
- `antecedentes_medicos`: JSON `{ "personales": "...", "familiares": "..." }`.
- `medicamentos`, `enfermedades`, `habitos`: JSON de arrays de textos.
- `alergias`: JSON del array completo con `id`, `sustancia` y `severidad`.

La lectura valida la estructura JSON y no sustituye datos malformados por listas vacías.
Textos legados de medicamentos/enfermedades/hábitos se conservan como un único
elemento, sin partirlos por comas. Antecedentes médicos en texto libre se conservan
como personales, con familiares vacío.

Las alergias en texto libre o sin severidad requieren revisión: no se infiere una
severidad. Alergias JSON válidas sin `id` reciben un identificador local basado en
su posición, para cumplir el tipo frontend; nunca se genera un UUID de paciente
o clínica. Ese identificador se conserva cuando la historia se guarda en JSON.

## Trazabilidad

No se envían `id`, `creado_en` ni `actualizado_en` como contenido de escritura.
Se usa `actualizado_en` devuelto por Supabase para `actualizadoEl`, dejando la fecha
a los defaults y trigger existentes de la BD.

`actualizadoPor` no se persiste porque no existe una columna equivalente. El servicio
de guardado conserva el valor recibido solo en el resultado frontend. Una nueva
lectura no puede recuperar ese responsable. Su origen dependerá de Auth al fusionar
las ramas; este servicio no inventa un usuario ni modifica el esquema.

## Dependencia de RLS y Auth

La sesión simulada de React no autentica frente a Supabase. Sin una sesión Supabase,
el cliente realiza peticiones como `anon`.

Con RLS habilitado sin policies aplicables y con permisos de tabla:

- SELECT suele devolver `[]`, aunque existan filas. Una historia vacía significa
  ausencia de filas visibles, no confirma que el paciente no tenga historia.
- INSERT será rechazado por RLS.
- UPDATE puede no afectar ninguna fila. `.select(...).single()` permite tratar
  la falta de una fila devuelta como error, no como éxito.

También puede haber errores de permisos de tabla. El integrante encargado debe
configurar el acceso adecuado; policies solo para `authenticated` no permiten
operar con el login simulado. No se han creado policies ni desactivado RLS.
Estas pruebas no verifican la configuración de la base remota.

## Verificación local

Desde `frontend`, con Node 24:

```sh
node --test src/features/clinical/clinicalHistoryMapper.test.ts src/features/clinical/clinicalHistoryService.test.ts
npm run build
npm run lint
```

Las pruebas usan respuestas simuladas y UUIDs sintéticos exclusivos de prueba.
No necesitan credenciales ni leen/escriben Supabase.

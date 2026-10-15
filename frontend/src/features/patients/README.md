# Módulo 02 — Gestión de Pacientes

Carpeta de **Bianca (Dev 2)**. Regla de la casa (AGENTS §2): *cada persona crea
archivos nuevos dentro de la carpeta de su módulo y nada más*. Leer archivos de
otros módulos está bien; escribirlos, no.

## Qué NO es de este módulo

Dos archivos de esta carpeta son **de integración de Matías** y no se editan acá:

- `PatientProfilePage.tsx` — pestañas de la ficha.
- `tabValue.ts` — unión de pestañas válidas.

El CRUD de pacientes (altas, ediciones, borrados) **no vive en un servicio de
este módulo**: está en `src/data/store.tsx`, que también es de Matías. Este
módulo consume `useClinicaData()` (`pacientes`, `obtenerPaciente`, `registrarPaciente`,
`actualizarPaciente`, `citasDe`).

## Archivos

| Archivo | Qué hace |
|---------|----------|
| `PatientForm.tsx` | Alta y edición. Aplica `validarPaciente` (T-2.8) y muestra los errores por campo vía `Field error=`. `noValidate` desactiva los globos nativos para que los mensajes salgan en el idioma de la app. |
| `PatientsListPage.tsx` | Listado con búsqueda y botón de alta. |
| `PatientsTable.tsx` | Tabla del listado, con paginación y estado vacío. |
| `PersonalDataTab.tsx` | Pestaña "Datos personales": usa `PatientForm` en modo edición. |
| `PatientHero.tsx` | Encabezado de la ficha con iniciales y datos de contacto. |
| `PatientPickerPage.tsx` | Selector de paciente para otros flujos. |
| `PersonalDataPrint.tsx` | Hoja imprimible de datos personales. |
| `validacionesPaciente.ts` | Validaciones de formulario, lógica pura (T-2.8). |
| `historialAtenciones.ts` | Agregador puro del historial (US-2.7). |
| `HistorialAtenciones.tsx` | Vista "Historial de atenciones" (US-2.7). |
| `*.test.ts` | Pruebas con `node --test`, sin credenciales ni red. |

## Validaciones (T-2.8)

`validacionesPaciente.ts` no toca React ni la red: recibe un `BorradorPaciente`
(`Omit<Paciente, "id" | "creadoEl">`) y devuelve `ErroresPaciente`
(`Partial<Record<keyof BorradorPaciente, string>>`).

```ts
import {
  validarPaciente,
  hayErrores,
  type BorradorPaciente,
  type ErroresPaciente,
} from "@/features/patients/validacionesPaciente";

const errores = validarPaciente(datos); // opcional 2.º arg: la "hoy" para testear
if (hayErrores(errores)) return;
```

Reglas: nombres y apellidos obligatorios y con tope de largo; CI `[0-9A-Za-z-]{4,20}`;
fecha de nacimiento ISO real, no futura y de a lo sumo 120 años (se parsea en hora
**local** para no correrse un día por UTC); teléfono con `+`, dígitos, espacios,
guiones y paréntesis; correo opcional pero válido; dirección con tope; contacto de
emergencia opcional, pero si se completa exige nombre y teléfono.

## Historial de atenciones (US-2.7)

`historialAtenciones.ts` une las **citas** (módulo 07, ya en el store) y las
**evoluciones** (módulo 06) en una línea de tiempo ordenada de lo más nuevo a lo
más viejo. Es lógica pura: recibe las listas ya cargadas.

```ts
import { construirHistorialAtenciones } from "@/features/patients/historialAtenciones";

const historial = construirHistorialAtenciones(citas, evoluciones);
```

`HistorialAtenciones.tsx` es la vista de solo lectura. Toma `pacienteId`, lee las
citas con `useClinicaData().citasDe(...)` y las evoluciones con
`useEvolucionSupabase()` (importar el hook del módulo 06 es válido; editarlo, no).
Maneja carga, error con reintento y el caso de lectura vacía por RLS: una lista
vacía **no** prueba que el paciente no tenga atenciones.

## Integración pendiente (Matías)

La pestaña nueva todavía no está registrada. El cambio son tres líneas en dos
archivos de Matías; este módulo ya deja el componente listo:

En `tabValue.ts`:

```ts
export type TabValue = "datos" | "historia" | "odontograma" | "tratamiento" | "evolucion" | "pagos" | "historial";
// y agregar `|| valor === "historial"` en esTabValida
```

En `PatientProfilePage.tsx`:

```tsx
import { HistorialAtenciones } from "@/features/patients/HistorialAtenciones";
// dentro de <TabsList>:
<TabsTrigger value="historial">Historial de atenciones</TabsTrigger>
// junto a los demás <TabsContent>:
<TabsContent value="historial">
  <HistorialAtenciones pacienteId={paciente.id} />
</TabsContent>
```

## Verificación local

Desde `frontend`, con Node 24:

```sh
node --test src/features/patients/*.test.ts
npm run build
npm run lint
```

Las pruebas usan objetos de prueba, no credenciales, y no leen ni escriben
Supabase.

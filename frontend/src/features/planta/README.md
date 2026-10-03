# Planta de la clínica (2D + 3D)

Carpeta exclusiva de Matías (ver `AGENTS.md` §2). Nadie más escribe aquí.

## Qué es

Plano de la clínica con la agenda del día encima: qué consultorio está libre,
cuál está lleno y qué cita hay en cada sala. El **2D es la vista principal** y
funciona siempre; el **3D es una mejora opcional** que se carga solo cuando se
pide.

## Contrato de lectura

Quien quiera mostrar la planta debe consumir estos módulos, no reimplementarlos:

| Módulo | Qué resuelve |
|--------|--------------|
| `plantaLayout.ts` | Encuadre en metros, `viewBox` del SVG, colisiones, área, colores, demo |
| `plantaAgenda.ts` | Eje de la jornada, ocupación por zona, citas que no se pueden ubicar |
| `plantaMapper.ts` | Traducción de filas de `zonas_clinica` y `citas`, con validación |
| `plantaService.ts` | Lectura y escritura en Supabase |
| `three/geometria.ts` | Traducción al espacio de three y presupuesto de render |

Las dos vistas (2D y 3D) consumen `plantaLayout.ts` y `plantaAgenda.ts`. Si el
plano cambia de reglas, cambian esos dos archivos y las dos vistas cambian
juntas: no se edita un `viewBox` en un componente.

## Reglas que ya se aplican

- **Nada de `@react-three/drei` ni `OrbitControls`** (AGENTS.md §3). La órbita es
  `three/useOrbitaManual.ts`, y el `DentalArch3D` no se toca.
- **Sin `.glb` para la planta.** La geometría es procedural: una planta son cajas.
  `three/useCargaGLB.ts` existe para el odontograma, no para esto.
- **`frameloop="demand"`**. Como no hay animación, cada gesto tiene que pedir el
  frame a mano (`alCambiar` → `invalidate`). Si la vista empieza a pedir frames
  sola, algo se animo sin querer.
- **Colores solo de tokens existentes.** `COLOR_TIPO` y `COLOR_PLANO` citan el
  token del que sale cada hex. Si hace falta un color nuevo: primero el token en
  `index.css`, después la entrada aquí.
- **UUIDs reales.** `plantaService` rechaza los ids de demo antes de tocar la red.
- **`null` no es éxito.** Toda escritura relee la fila. Un `SELECT` vacío puede
  ser RLS.
- **Nada de borrado físico.** Las zonas se dan de baja con `activa = false`: el
  edificio tiene historial y las citas viejas apuntan a esas zonas.

## Sistema de coordenadas

Metros, origen en la esquina superior izquierda, `x` a la derecha e `y` hacia
abajo (`plantaLayout.ts`). El SVG usa esos números tal cual. La traducción al
espacio de three (Y arriba) ocurre en un solo punto,
`three/geometria.ts:geometriaDeZona`, donde el eje Y del plano se mapea a **−Z**.
Si se toca esa función, hay que volver a correr `geometria.test.ts`: ese test
existe para que el 3D no aparezca reflejado respecto del 2D.

## Presupuesto de render

`PRESUPUESTO` en `three/geometria.ts`: 12 000 triángulos y 25 draw calls. Con
una instancia por zona (`instancedMesh`), el costo no depende de cuántas salas
haya, solo de cuántos tipos distintos. `metricasDeEscena` lo calcula y la vista
lo muestra en pantalla: es una promesa de rendimiento y una promesa sin
verificar no sirve.

## Pruebas

```sh
cd frontend
node --test src/features/planta/*.test.ts
```

`plantaLayout.test.ts` y `plantaAgenda.test.ts` cubren el encuadre, las
colisiones y la ocupación; `geometria.test.ts` cubre la traducción a three y el
presupuesto. Los tres módulos probados son puros: nada de React ni de three, y
por eso corren con `node --test` sin navegador.

**Ojo con los imports:** `node --test` no resuelve el alias `@/`. Los imports de
runtime hacia otros módulos usan ruta relativa con extensión (`.ts`); los
`import type` sí pueden usar `@/` porque se borran al compilar.

## SQL pendiente de aplicar

`plantaService.ts` consulta `zonas_clinica` y la columna `citas.zona_id`, que
**todavía no existen**. Hasta que Matías los integre en
`bd_5clinicas_midentista.sql`, la vista cae al plano de demostración (ids
`demo-*`, `clinicaId: ""`), que el servicio se niega a guardar.

Propuesta, tal como va a integrarse:

```sql
create table if not exists public.zonas_clinica (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas (id) on delete cascade,
  nombre text not null check (length(btrim(nombre)) > 0),
  tipo text not null check (tipo in (
    'consultorio', 'esterilizacion', 'recepcion', 'sala_espera',
    'laboratorio', 'almacen', 'administracion', 'pasillo', 'bano'
  )),
  piso smallint not null default 0 check (piso >= 0),
  x numeric(6,2) not null default 0,
  y numeric(6,2) not null default 0,
  ancho numeric(6,2) not null check (ancho > 0),
  alto numeric(6,2) not null check (alto > 0),
  capacidad smallint not null default 1 check (capacidad >= 1),
  odontologo_id uuid references public.perfiles (id) on delete set null,
  activa boolean not null default true,
  orden smallint not null default 0,
  notas text not null default '',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- Un profesional no puede tener dos consultorios asignados a la vez.
create unique index if not exists zonas_clinica_odontologo_unico
  on public.zonas_clinica (odontologo_id)
  where odontologo_id is not null and activa;

alter table public.citas
  add column if not exists zona_id uuid references public.zonas_clinica (id) on delete set null;

-- RLS: cada clínica ve y edita solo sus zonas.
alter table public.zonas_clinica enable row level security;

create policy "zonas de la propia clinica" on public.zonas_clinica
  for all using (clinica_id = auth.clinica_id())
  with check (clinica_id = auth.clinica_id());
```

Decisiones que conviene revisar antes de aplicar:

- `x`, `y`, `ancho` y `alto` en metros, no en centímetros. Si el resto del
  proyecto midiera en centímetros, esto se cambia y se ajusta el mapper.
- `tipo` es un `check` y replica `TIPOS_ZONA` de `tipos.ts`. Si se agrega un
  tipo, hay que tocar los dos lados.
- La zona de una cita se resuelve con `citas.zona_id` si existe y, si no, con el
  `odontologo_id` de la zona. Por eso el índice único de arriba: sin él, el
  desempaste por odontólogo sería ambiguo.
- La baja es lógica (`activa = false`), nunca `delete`.
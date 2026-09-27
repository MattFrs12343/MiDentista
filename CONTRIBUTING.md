# Política de cambios y migraciones - MiDentista

## Product Owner

**Matías** (Dev 1, [@MattFrs12343](https://github.com/MattFrs12343)) es el
Product Owner del proyecto. Ninguna persona del equipo (Bianca, Carlos,
Melissa, Angélica, Lucas) aplica los siguientes cambios sin su aprobación
previa:

- Migraciones o cambios de esquema de base de datos (`bd_5clinicas_midentista.sql`,
  `supabase/migrations/`, cualquier `CREATE TABLE`, `ALTER TABLE`, política RLS
  nueva o modificada).
- Cambios en `docs/DATABASE.md` o `docs/ARCHITECTURE.md` (son los documentos
  que describen el esquema y la arquitectura del sistema).
- Cambios de alcance del MVP (agregar o quitar funcionalidad respecto a lo que
  ya está definido en `docs/SPEC.md` y `docs/modules/`).
- Despliegue a producción (HostGator) — lo ejecuta únicamente Matías.
- Merge a la rama `main`.

## Por qué existe esta regla

El equipo está empezando a usar herramientas de IA (como Claude Code) para
programar. Una IA puede generar cambios de base de datos o de arquitectura
que parecen correctos pero rompen el aislamiento multi-tenant (RLS), la
consistencia del esquema, o el alcance acordado del MVP. Revisar antes de
aplicar evita que un cambio mal entendido rompa el proyecto para todo el
equipo.

## Cómo proponer un cambio

1. Trabaja en tu propia rama (`feature/modulo-XX-descripcion`), nunca
   directamente sobre `main`.
2. Si tu cambio toca base de datos, arquitectura o alcance, avisa a Matías
   **antes** de escribir el código (no solo antes de mergear) — puede ahorrar
   trabajo si la idea necesita ajustarse.
3. Abre un Pull Request hacia `main`. Matías debe aprobarlo antes de que se
   pueda mergear.
4. Cambios que **no** requieren aprobación previa (pero sí PR revisado):
   trabajo normal dentro de tu propio módulo que no toca el esquema de BD ni
   la arquitectura — componentes, formularios, servicios, historias de
   usuario ya definidas en `docs/modules/`.

## Referencia rápida: ¿necesito aprobación?

| Cambio | ¿Aprobación previa de Matías? |
|--------|-------------------------------|
| Nueva tabla, columna o índice | Sí |
| Nueva política RLS | Sí |
| Cambiar `docs/DATABASE.md` o `docs/ARCHITECTURE.md` | Sí |
| Agregar/quitar funcionalidad fuera de tu módulo asignado | Sí |
| Desplegar a producción | Sí (lo hace Matías) |
| Nuevo componente/formulario dentro de tu módulo | No, pero sí PR revisado |
| Corregir un bug dentro de tu módulo | No, pero sí PR revisado |

Ver también la asignación de equipo y las bitácoras en
[`docs/bitacoras/`](docs/bitacoras/README.md).

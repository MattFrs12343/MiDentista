# LA BASE DE DATOS DE MiDentista EXPLICADA PARA TODOS

Esta guía no usa palabras difíciles. Es como si te explicara el consultorio de un dentista, nada más que en versión digital.

> **Nota de alcance:** esta guía describe el **MVP de 3 meses** de MiDentista: **15 tablas, 9 módulos y 3 roles**, en una sola clínica que administra su odontólogo.

---

## PARTE 1 → LA IDEA EN UNA IMAGEN (pantallazo del proyecto)

Imagina un consultorio dental normal. El doctor usa estas cosas:

| En el consultorio físico | En MiDentista (la BD) | Nombre técnico |
|--------------------------|----------------------|----------------|
| La carpeta de cada paciente | 1 tarjeta por paciente | tabla `pacientes` |
| La cartilla del estado de los dientes | El mapa de la boca | tabla `odontogramas` |
| La agenda de citas | La lista de citas | tabla `citas` |
| El cuaderno de cobros | La lista de pagos | tabla `pagos` |
| El expediente médico | Los antecedentes | tabla `historiales_clinicos` |
| El plan de tratamiento que arma el doctor | La lista de tratamientos | tabla `planes_tratamiento` |

> **La base de datos es un archivero:** cada "tarjeta" es una **tabla** (una hoja tipo Excel) y las tarjetas se **conectan entre sí** para formar la historia completa del paciente.

### El sistema completo de un vistazo

```
            ┌────────────────────────────────────────────────────┐
            │   MIDENTISTA (Supabase)                             │
            │   Un solo archivero digital que guarda TODO         │
            │   15 tablas · 9 módulos · seguridad por clínica     │
            └──────────────────────────┬─────────────────────────┘
                                       │
   ┌──────────────┬──────────────┬─────┴──────────────┬──────────────┐
   │              │              │                    │              │
   ▼              ▼              ▼                    ▼              ▼
 ¿QUIÉNES        EL PACIENTE    LA OPERACIÓN        CATÁLOGOS      COBROS
 SON?           Y SU SALUD     DEL DÍA A DÍA                       Y PLANES
 3 tablas        5 tablas       3 tablas             1 tabla        3 tablas
                                                                    
 clinicas        pacientes      horarios             servicios      presupuestos
 perfiles        historiales    citas                               items_
                 odontogramas                                        presupuesto
                 diagnosticos                                       pagos
                 planes_tratamiento
                 procedimientos_tratamiento
                 evoluciones_clinicas
```

**La frase que lo resume:** *"La clínica es la raíz de todo y el paciente es el centro."*
- **La clínica** (`clinicas`) está conectada con TODO (todas las demás tablas tienen una columna que dice `clinica_id` = "de qué clínica es esta tarjeta").
- **El paciente** (`pacientes`) es el centro de la parte médica: a su alrededor giran historia, odontogramas, planes, citas y pagos.

---

## PARTE 2 → CADA TIPO DE DATO Y POR QUÉ ES NECESARIO

Un tipo de dato es como una **caja con forma especial**: cada caja solo acepta un tipo de contenido. Así el sistema no deja que se guarde basura.

| Tipo de dato | Es una caja para... | Por qué la necesitamos en MiDentista | Ejemplo |
|--------------|---------------------|--------------------------------------|---------|
| `UUID` | Un **carnet de identidad** único (códigos largos irrepetibles) | Para que cada tarjeta (fila) tenga un número **que jamás se repita** entre pacientes, citas o clínicas | el `id` de todas las tablas |
| `TEXT` | **Texto libre** (corto o largo) | Para nombres, direcciones y notas, porque **no sabemos de antemano qué tan largo** será | `nombre_completo`, `notas` |
| `INTEGER` | **Números exactos** (sin decimales) | Para contar cosas que no pueden ser "y medio": dientes, cantidades, minutos | `numero_pieza` (1, 2, 3...32), `cantidad` |
| `NUMERIC(10,2)` | **Dinero** (números con 2 decimales) | El dinero **no puede perder decimales** (Bs 12,50 ≠ Bs 12), así que se guarda con precisión | `monto`, `precio_unitario`, `costo_total` |
| `BOOLEAN` | Un **sí/no** (verdadero o falso) | Para **encender o apagar** cosas: ¿la clínica está activa? ¿el servicio se ofrece? | `activo` |
| `DATE` | **Solo la fecha** | Para días donde la hora no importa (nacimiento, día de la cita) | `fecha_nacimiento`, `fecha_cita` |
| `TIME` | **Solo la hora** | Para saber a qué hora empieza y termina un turno | `hora_inicio`, `hora_fin` |
| `TIMESTAMPTZ` | **Fecha + hora + zona horaria** | Para registrar el momento EXACTO en que se creó o modificó algo, aunque el servidor esté en otro país | `creado_en`, `actualizado_en` |
| `JSONB` | Una **lista o ficha estructurada** dentro de una sola casilla | En el MVP se usa para guardar las **piezas del odontograma** (los dientes con su condición) | `odontogramas.piezas` |

**Analogía para recordar:** guardar un precio en `INTEGER` sería como meter Bs 12,50 en una caja de bolígrafos: no cabe el "50 centavos". Por eso el dinero usa su propia caja (`NUMERIC`).

---

## PARTE 3 → MAPEO: CADA TABLA Y CON QUÉ OTRAS SE CONECTA

> Estas son las "líneas" del diagrama. Si entiendes esto, entiendes el diagrama completo.

### 🤝 Cómo se "conecta" una tabla con otra
Se conectan por medio de una columna que guarda el **id** de la otra tabla:
- La columna `paciente_id` en `citas` guarda el `id` de un paciente → por eso sabemos de quién es cada cita.

### El mapeo tabla por tabla (15 tablas)

**1. `clinicas` → se conecta con: TODAS las demás (14 tablas).**
> ▪ Porque es la raíz: cada tabla tiene una columna `clinica_id` para saber de qué clínica es cada tarjeta. Es lo que hace que cada clínica solo vea lo suyo (seguridad RLS).

**2. `perfiles` → se conecta con:**
> ▪ `auth.users` (la tabla de usuarios de Supabase) → porque "perfiles ES ese usuario + más datos" (herencia)
> ▪ `clinicas` (a qué clínica pertenece) · `pacientes` (si el usuario también es paciente, `perfil_id`)
> ▪ Casi todo lo que hace un **odontólogo**: `odontogramas`, `diagnosticos`, `planes_tratamiento`, `evoluciones_clinicas`, `horarios`, `citas`, `presupuestos` (todos usan `odontologo_id`)
> ▪ `pagos` (columna `registrado_por`)

**3. `pacientes` → se conecta con (¡es el centro médico!):**
> ▪ `historiales_clinicos` (su expediente) · `odontogramas` (su mapa dental) · `diagnosticos` · `planes_tratamiento` · `evoluciones_clinicas` · `citas` · `presupuestos` · `pagos`

**4. `historiales_clinicos` → se conecta con:** `pacientes`, `clinicas`
> ▪ Un paciente tiene un historial; el historial pertenece a una clínica.

**5. `odontogramas` → se conecta con:** `pacientes`, `perfiles`, `clinicas`
> ▪ El odontograma (examen) lo hace un doctor a un paciente en una fecha. Los dientes NO son otra tabla: viven dentro del mismo registro en una casilla JSONB (`piezas`).

**6. `diagnosticos` → se conecta con:** `pacientes`, `perfiles`, `clinicas`

**7. `planes_tratamiento` → se conecta con:** `pacientes`, `perfiles`, `clinicas`, y **compone** `procedimientos_tratamiento`
> ▪ Además se enlaza con `evoluciones_clinicas` y `citas` (opcional).

**8. `procedimientos_tratamiento` → se conecta con:** `planes_tratamiento` (composición), `servicios`, `clinicas`

**9. `evoluciones_clinicas` → se conecta con:** `pacientes`, `perfiles`, `planes_tratamiento`, `procedimientos_tratamiento`, `clinicas`
> ▪ Es la bitácora de cada consulta.

**10. `horarios` → se conecta con:** `perfiles` (el odontólogo), `clinicas`
> ▪ Disponibilidad semanal del doctor.

**11. `citas` → se conecta con:** `pacientes`, `perfiles`, `planes_tratamiento`, `clinicas`

**12. `servicios` → se conecta con:** `clinicas`, y se usa en `procedimientos_tratamiento` e `items_presupuesto`
> ▪ Es el catálogo de lo que ofrece la clínica (limpieza, extracción, corona...).

**13. `presupuestos` → se conecta con:** `pacientes`, `perfiles`, `clinicas`, y **compone** `items_presupuesto`

**14. `items_presupuesto` → se conecta con:** `presupuestos` (composición), `servicios`, `clinicas`

**15. `pagos` → se conecta con:** `pacientes` (quién paga), `presupuestos`, `perfiles` (quién registró), `clinicas`

---

## RESUMEN EN 3 FRASES PARA LA DEFENSA

1. **"La base de datos es un archivero digital con 15 tablas que se conectan entre sí por claves: la clínica es la raíz y el paciente es el centro."**
2. **"Cada tipo de dato es una caja con forma: UUID para los carnets únicos, NUMERIC para el dinero, BOOLEAN para sí/no, DATE y TIME para fechas y horas, y JSONB para las piezas del odontograma."**
3. **"El diagrama se lee así: una línea conecta dos tablas y los números del extremo dicen cuántos hay — `1` = uno solo, `*` = muchos. Cuando el rombo es relleno, el hijo no puede existir sin su padre."**

---

*Esta versión usa solo analogías. Los datos técnicos reales (15 tablas, columnas, claves y relaciones del MVP) están en `docs/GUION_EXPLICACION_BD_SIMPLE.md` y `docs/DATABASE.md`.*

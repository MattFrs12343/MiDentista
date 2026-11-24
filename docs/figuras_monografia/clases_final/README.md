# Figura 95 — dominio general actual

Fuente editable: `figura_095_clases_actuales.svg`. La figura reúne 18 clases
conceptuales, no clases TypeScript literales ni un esquema de tablas. Los
recuadros «ref» repiten la misma clase para evitar cruces; no son entidades nuevas.
Los atributos son una selección conceptual de los datos existentes.

## Contraste realizado

- `bd_5clinicas_midentista.sql`: pertenencia, referencias opcionales y obligatorias,
  colecciones y unicidad parcial de `presupuestos.plan_tratamiento_id`.
- `frontend/src/types/index.ts`, tipos/servicios/mappers de `clinical`, `treatment`,
  `evolucion`, `presupuestos`, `pagos` y `archivos`; `data/store.tsx` y `data/api.ts`.
- `docs/modules/10-archivos/sql.sql`, `migracion-t-10-9.sql` y
  `migracion-ciclo-4.sql`: metadatos, asociaciones y contabilidad durable.
- Tabla 69 y las imágenes actuales de Figuras 97 y 98 del ENTREGA local.
  Se usaron como contraste, no como autoridad para trasladar operaciones o
  multiplicidades históricas que el código/SQL no garantizan.

## Relaciones esenciales

- Clínica–Perfil: 0..1 clínicas por perfil; 0..* perfiles por clínica.
- Clínica–Paciente y Clínica–Servicio: 1 clínica; 0..* pacientes/servicios.
- Perfil–Paciente: 0..1 perfil por paciente; 0..* pacientes por perfil.
- Paciente–Historia/Odontograma/Diagnóstico/Plan/Evolución/Cita/Presupuesto/Pago/
  Archivo: 1 paciente por registro y 0..* registros por paciente.
- Plan–Procedimiento y Presupuesto–Partida: composición 1 a 0..*. No se impone
  1..*: un encabezado puede existir sin hijos; los hijos dependen de él y tienen
  borrado en cascada. No se utiliza agregación decorativa.
- Plan–Evolución y Procedimiento–Evolución: 0..1 referencia por evolución y
  0..* evoluciones por plan/procedimiento.
- Perfil–Horario/Cita: 1 profesional por registro; 0..* registros por profesional.
- Servicio–Partida: 0..1 servicio por partida y 0..* partidas por servicio.
- Presupuesto–Pago: 0..1 presupuesto por pago y 0..* pagos por presupuesto.
- Plan–Presupuesto: 0..1 en ambos extremos, por FK nullable e índice único parcial.
- Clínica–Archivo: 1 clínica y 0..* archivos. Clínica–Cuota: 0..1 en ambos extremos
  al considerar la conservación histórica; `archivos_cuotas.clinica_id` es PK,
  pero deliberadamente NO es FK a `clinicas`. Cuota–Operación: 1 a 0..*.

Historia clínica: el servicio espera como máximo una y rechaza duplicados, pero
el SQL versionado no contiene UNIQUE(paciente_id). La multiplicidad 0..* refleja
esa ausencia de garantía y se explicita en la figura. No se certifica por ello
que producción contenga duplicados.

Se omiten enlaces secundarios y clases técnicas para permitir lectura en una
página. No se dibuja una relación directa Diagnóstico–Procedimiento, porque el
procedimiento actual no contiene diagnóstico_id. No se atribuye comparación
histórica implementada ni métodos ficticios a las entidades. Operación–Archivo
no se fuerza a 1:1: archivo_id es histórico y no tiene FK ni UNIQUE inversa.

Figura 96 se conserva como línea base histórica; Figuras 97 y 98 permanecen
intactas como desgloses complementarios de diseño. Figura 95 es la síntesis
actual contrastada con los contratos versionados.

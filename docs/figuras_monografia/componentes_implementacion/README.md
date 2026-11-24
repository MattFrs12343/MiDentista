# Figuras 121–130 — componentes de implementación

Fuentes editables SVG, monocromáticas, con fuente Arial y trazos uniformes.
No se crean figuras adicionales ni PK-10.

El mapeo se confirmó en la tabla de paquetes del ENTREGA local y en sus captions
65–73, además de `../uc_paquetes.puml`:

- PK-01: UC-01–UC-09, acceso y onboarding.
- PK-02: UC-10–UC-15, pacientes.
- PK-03: UC-16–UC-20, historia clínica.
- PK-04: UC-21–UC-25, odontograma.
- PK-05: UC-26–UC-30, diagnóstico y tratamiento.
- PK-06: UC-31–UC-33, evolución clínica.
- PK-07: UC-34–UC-39, agenda y citas.
- PK-08: UC-40–UC-44, presupuestos.
- PK-09: UC-45–UC-48, pagos y cuentas.

## Notación y alcance

El socket pertenece al consumidor superior; el círculo y su tallo pertenecen al
proveedor inferior. La unión representa ensamblaje mediante el contrato rotulado,
no una flecha de flujo ni símbolos ornamentales. Los nombres I… son abstracciones
de interfaz de esta vista UML, no declaraciones TypeScript inventadas.

La primera unión expresa la interfaz de acciones/consulta que las vistas requieren
del acceso local. La segunda expresa los contratos remotos requeridos por ese
acceso y provistos por Supabase. Se diferencia explícitamente lógica ejecutada en
el navegador de backend administrado y persistencia; las tablas no son clases de
servicio y no se atribuye acceso SQL directo al navegador.

Figura 121 organiza los nueve paquetes y sus CU en el frontend, conectado al
acceso compartido/modular y a Supabase. Las ampliaciones de Archivos siguen siendo
complementarias, no un décimo paquete académico.

Figuras 122–130 detallan, respectivamente, las vistas, contextos/hooks, servicios
reales y persistencia de cada PK. La verificación se hizo leyendo los componentes,
sus imports y servicios/mappers, `data/store.tsx`, `data/api.ts`,
`lib/supabase.ts`, `supabase/functions/api/index.ts` y el SQL versionado.

La pertenencia de un CU no demuestra que esté enteramente implementado. Se hacen
visibles las limitaciones ya documentadas: UC-25 sin comparación acreditada;
agenda/configuración/reprogramación no integrales; catálogo de servicios con
lectura no equivalente a administración; estado enviado sin acreditar envío;
QR de cobro estático, sin integración bancaria. El portal usa `miFichaPacienteApi`;
el CRUD de pacientes del personal usa principalmente `ClinicaDataProvider`, no
un servicio de pacientes inexistente.

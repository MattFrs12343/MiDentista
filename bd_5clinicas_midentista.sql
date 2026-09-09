-- ============================================================================
-- MIDENTISTA - Base de Datos con 5 clínicas (PostgreSQL)
-- ============================================================================
-- Contenido:
--   1) Extensiones
--   2) Esquema MVP: 15 tablas (clinicas, perfiles, pacientes, servicios,
--      historiales_clinicos, odontogramas, diagnosticos, planes_tratamiento,
--      procedimientos_tratamiento, evoluciones_clinicas, horarios, citas,
--      presupuestos, items_presupuesto, pagos)
--   3) Índices
--   4) Triggers (actualizado_en automático)
--   5) SEED con 5 clínicas:
--        - Dental Cristo Rey (La Paz)  [clínica piloto, datos completos]
--        - Clínica Dental Los Andes    (La Paz)
--        - Sonrisa Perfecta Dental     (El Alto)
--        - Dental Vida                 (Cochabamba)
--        - Dr. Sonrisa                 (Santa Cruz de la Sierra)
--
-- Compatible con PostgreSQL 13+ (incluye Supabase).
-- NOTA: en Supabase los perfiles se vinculan a auth.users y se agregan las
-- políticas RLS que figuran en supabase_schema_mvp.txt. Este script es la
-- versión autónoma (sin auth) para correr en PostgreSQL puro.
--
-- Uso:  psql -U usuario -d midentista -f bd_5clinicas_midentista.sql
-- (ejecutar sobre una base vacía)
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONES
-- ============================================================================
create extension if not exists "pgcrypto";

-- ============================================================================
-- 2. ESQUEMA (15 TABLAS)
-- ============================================================================

-- 2.1 clinicas (Tenant)
create table if not exists public.clinicas (
    id              uuid primary key default gen_random_uuid(),
    nombre          text not null,
    slug            text unique not null,
    email           text,
    telefono        text,
    direccion       text,
    ciudad          text,
    pais            text default 'Bolivia',
    latitud         numeric(9,6),
    longitud        numeric(9,6),
    moneda          text default 'Bs',
    simbolo_moneda  text default 'Bs',
    activo          boolean default true,
    creado_en       timestamptz default now(),
    actualizado_en  timestamptz default now()
);

-- Migración para bases existentes: agrega coordenadas a clinicas
alter table public.clinicas
    add column if not exists latitud  numeric(9,6),
    add column if not exists longitud numeric(9,6);

-- Rellena coordenadas de clínicas ya cargadas (por slug)
update public.clinicas set latitud = -16.499000, longitud = -68.145000 where slug = 'dental-cristo-rey';
update public.clinicas set latitud = -16.537500, longitud = -68.086500 where slug = 'dental-los-andes';
update public.clinicas set latitud = -16.492000, longitud = -68.196000 where slug = 'sonrisa-perfecta';
update public.clinicas set latitud = -17.392000, longitud = -66.152000 where slug = 'dental-vida';
update public.clinicas set latitud = -17.771700, longitud = -63.174000 where slug = 'dr-sonrisa';

-- 2.2 perfiles (en Supabase se vincula a auth.users; aquí autónomo)
create table if not exists public.perfiles (
    id              uuid primary key default gen_random_uuid(),
    email           text unique not null,
    nombre_completo text not null,
    telefono        text,
    avatar_url      text,
    rol             text not null default 'paciente'
                    check (rol in ('odontologo', 'recepcionista', 'paciente')),
    clinica_id      uuid references public.clinicas(id),
    especialidad    text,
    consultorio     text,
    activo          boolean default true,
    creado_en       timestamptz default now(),
    actualizado_en  timestamptz default now()
);

-- 2.3 pacientes
create table if not exists public.pacientes (
    id                              uuid primary key default gen_random_uuid(),
    clinica_id                      uuid not null references public.clinicas(id) on delete cascade,
    perfil_id                       uuid references public.perfiles(id),
    ci                              text,
    nombre_completo                 text not null,
    fecha_nacimiento                date,
    genero                          text check (genero in ('M', 'F', 'Otro')),
    telefono                        text,
    email                           text,
    direccion                       text,
    ocupacion                       text,
    contacto_emergencia_nombre      text,
    contacto_emergencia_telefono    text,
    contacto_emergencia_parentesco  text,
    tipo_sangre                     text,
    alergias                        text,
    notas                           text,
    activo                          boolean default true,
    creado_en                       timestamptz default now(),
    actualizado_en                  timestamptz default now()
);

-- 2.4 servicios
create table if not exists public.servicios (
    id                  uuid primary key default gen_random_uuid(),
    clinica_id          uuid not null references public.clinicas(id) on delete cascade,
    nombre              text not null,
    descripcion         text,
    precio_por_defecto  numeric(10,2),
    duracion_minutos    integer,
    activo              boolean default true,
    creado_en           timestamptz default now(),
    actualizado_en      timestamptz default now()
);

-- 2.5 historiales_clinicos
create table if not exists public.historiales_clinicos (
    id                            uuid primary key default gen_random_uuid(),
    clinica_id                    uuid not null references public.clinicas(id) on delete cascade,
    paciente_id                   uuid not null references public.pacientes(id) on delete cascade,
    motivo_consulta               text,
    antecedentes_medicos          text,
    antecedentes_odontologicos    text,
    alergias                      text,
    medicamentos                  text,
    enfermedades                  text,
    habitos                       text,
    observaciones                 text,
    creado_en                     timestamptz default now(),
    actualizado_en                timestamptz default now()
);

-- 2.6 odontogramas (piezas en JSONB)
create table if not exists public.odontogramas (
    id              uuid primary key default gen_random_uuid(),
    clinica_id      uuid not null references public.clinicas(id) on delete cascade,
    paciente_id     uuid not null references public.pacientes(id) on delete cascade,
    odontologo_id   uuid not null references public.perfiles(id),
    fecha_examen    date default current_date,
    piezas          jsonb default '[]'::jsonb,
    notas           text,
    creado_en       timestamptz default now(),
    actualizado_en  timestamptz default now()
);

-- 2.7 diagnosticos
create table if not exists public.diagnosticos (
    id               uuid primary key default gen_random_uuid(),
    clinica_id       uuid not null references public.clinicas(id) on delete cascade,
    paciente_id      uuid not null references public.pacientes(id) on delete cascade,
    odontologo_id    uuid not null references public.perfiles(id),
    numero_pieza     integer,
    descripcion      text not null,
    observaciones    text,
    estado           text default 'activo'
                     check (estado in ('activo', 'inactivo', 'resuelto')),
    fecha_diagnostico date default current_date,
    creado_en        timestamptz default now(),
    actualizado_en   timestamptz default now()
);

-- 2.8 planes_tratamiento
create table if not exists public.planes_tratamiento (
    id               uuid primary key default gen_random_uuid(),
    clinica_id       uuid not null references public.clinicas(id) on delete cascade,
    paciente_id      uuid not null references public.pacientes(id) on delete cascade,
    odontologo_id    uuid not null references public.perfiles(id),
    titulo           text,
    estado           text default 'propuesto'
                     check (estado in ('propuesto', 'aceptado', 'en_proceso', 'completado', 'cancelado')),
    costo_total      numeric(10,2) default 0,
    notas            text,
    creado_en        timestamptz default now(),
    actualizado_en   timestamptz default now()
);

-- 2.9 procedimientos_tratamiento
create table if not exists public.procedimientos_tratamiento (
    id                      uuid primary key default gen_random_uuid(),
    clinica_id              uuid not null references public.clinicas(id) on delete cascade,
    plan_tratamiento_id     uuid not null references public.planes_tratamiento(id) on delete cascade,
    servicio_id             uuid references public.servicios(id),
    numero_pieza            integer,
    descripcion             text not null,
    prioridad               text default 'normal'
                            check (prioridad in ('urgente', 'alta', 'normal', 'baja')),
    costo                   numeric(10,2) default 0,
    estado                  text default 'pendiente'
                            check (estado in ('pendiente', 'en_proceso', 'completado', 'cancelado')),
    creado_en               timestamptz default now(),
    actualizado_en          timestamptz default now()
);

-- 2.10 evoluciones_clinicas
create table if not exists public.evoluciones_clinicas (
    id                      uuid primary key default gen_random_uuid(),
    clinica_id              uuid not null references public.clinicas(id) on delete cascade,
    paciente_id             uuid not null references public.pacientes(id) on delete cascade,
    odontologo_id           uuid not null references public.perfiles(id),
    plan_tratamiento_id     uuid references public.planes_tratamiento(id),
    procedimiento_id        uuid references public.procedimientos_tratamiento(id),
    numero_pieza            integer,
    fecha_consulta          date default current_date,
    motivo_consulta         text,
    procedimiento_realizado text,
    observaciones           text,
    indicaciones            text,
    proxima_atencion        date,
    creado_en               timestamptz default now()
);

-- 2.11 horarios
create table if not exists public.horarios (
    id              uuid primary key default gen_random_uuid(),
    clinica_id      uuid not null references public.clinicas(id) on delete cascade,
    odontologo_id   uuid not null references public.perfiles(id),
    dia_semana      integer not null check (dia_semana between 0 and 6),
    hora_inicio     time not null,
    hora_fin        time not null,
    activo          boolean default true,
    creado_en       timestamptz default now()
);

-- 2.12 citas
create table if not exists public.citas (
    id                      uuid primary key default gen_random_uuid(),
    clinica_id              uuid not null references public.clinicas(id) on delete cascade,
    paciente_id             uuid not null references public.pacientes(id) on delete cascade,
    odontologo_id           uuid not null references public.perfiles(id),
    plan_tratamiento_id     uuid references public.planes_tratamiento(id),
    fecha_cita              date not null,
    hora_inicio             time not null,
    hora_fin                time not null,
    estado                  text default 'reservada'
                            check (estado in ('reservada', 'confirmada', 'atendida', 'cancelada')),
    motivo_consulta         text,
    notas                   text,
    creado_en               timestamptz default now(),
    actualizado_en          timestamptz default now()
);

-- 2.13 presupuestos
create table if not exists public.presupuestos (
    id               uuid primary key default gen_random_uuid(),
    clinica_id       uuid not null references public.clinicas(id) on delete cascade,
    paciente_id      uuid not null references public.pacientes(id) on delete cascade,
    odontologo_id    uuid not null references public.perfiles(id),
    titulo           text,
    descuento        numeric(10,2) default 0,
    total            numeric(10,2) default 0,
    estado           text default 'borrador'
                     check (estado in ('borrador', 'enviado', 'aceptado', 'rechazado')),
    valido_hasta     date,
    notas            text,
    creado_en        timestamptz default now(),
    actualizado_en   timestamptz default now()
);

-- 2.14 items_presupuesto
create table if not exists public.items_presupuesto (
    id              uuid primary key default gen_random_uuid(),
    clinica_id      uuid not null references public.clinicas(id) on delete cascade,
    presupuesto_id  uuid not null references public.presupuestos(id) on delete cascade,
    servicio_id     uuid references public.servicios(id),
    descripcion     text not null,
    numero_pieza    integer,
    cantidad        integer default 1,
    precio_unitario numeric(10,2) not null,
    subtotal        numeric(10,2) not null,
    creado_en       timestamptz default now()
);

-- 2.15 pagos
create table if not exists public.pagos (
    id                  uuid primary key default gen_random_uuid(),
    clinica_id          uuid not null references public.clinicas(id) on delete cascade,
    paciente_id         uuid not null references public.pacientes(id) on delete cascade,
    presupuesto_id      uuid references public.presupuestos(id),
    monto               numeric(10,2) not null,
    metodo_pago         text default 'efectivo'
                        check (metodo_pago in ('efectivo', 'qr', 'transferencia', 'otro')),
    fecha_pago          date default current_date,
    codigo_referencia   text,
    notas               text,
    estado              text default 'confirmado'
                        check (estado in ('pendiente', 'confirmado', 'rechazado')),
    registrado_por      uuid references public.perfiles(id),
    creado_en           timestamptz default now()
);

-- ============================================================================
-- 3. ÍNDICES
-- ============================================================================
create index if not exists idx_pacientes_clinica on public.pacientes (clinica_id);
create index if not exists idx_pacientes_nombre on public.pacientes (clinica_id, nombre_completo);
create index if not exists idx_pacientes_ci on public.pacientes (clinica_id, ci);
create index if not exists idx_historiales_paciente on public.historiales_clinicos (paciente_id);
create index if not exists idx_odontogramas_paciente on public.odontogramas (paciente_id);
create index if not exists idx_diagnosticos_paciente on public.diagnosticos (paciente_id);
create index if not exists idx_planes_paciente on public.planes_tratamiento (paciente_id);
create index if not exists idx_planes_estado on public.planes_tratamiento (estado);
create index if not exists idx_procedimientos_plan on public.procedimientos_tratamiento (plan_tratamiento_id);
create index if not exists idx_evoluciones_paciente on public.evoluciones_clinicas (paciente_id);
create index if not exists idx_evoluciones_fecha on public.evoluciones_clinicas (fecha_consulta);
create index if not exists idx_horarios_odontologo on public.horarios (odontologo_id);
create index if not exists idx_citas_clinica_fecha on public.citas (clinica_id, fecha_cita);
create index if not exists idx_citas_odontologo on public.citas (odontologo_id, fecha_cita);
create index if not exists idx_citas_paciente on public.citas (paciente_id);
create index if not exists idx_citas_estado on public.citas (estado);
create index if not exists idx_servicios_clinica on public.servicios (clinica_id);
create index if not exists idx_presupuestos_paciente on public.presupuestos (paciente_id);
create index if not exists idx_items_presupuesto on public.items_presupuesto (presupuesto_id);
create index if not exists idx_pagos_paciente on public.pagos (paciente_id);
create index if not exists idx_pagos_clinica on public.pagos (clinica_id, fecha_pago);
create index if not exists idx_pagos_estado on public.pagos (estado);
create index if not exists idx_perfiles_clinica on public.perfiles (clinica_id);
create index if not exists idx_perfiles_email on public.perfiles (email);
create index if not exists idx_clinicas_geo on public.clinicas (latitud, longitud);

-- ============================================================================
-- 4. TRIGGERS (actualizado_en automático)
-- ============================================================================
create or replace function public.actualizar_fecha_modificacion()
returns trigger
language plpgsql
as $$
begin
    new.actualizado_en = now();
    return new;
end;
$$;

create trigger trigger_clinicas_actualizar
    before update on public.clinicas
    for each row execute function public.actualizar_fecha_modificacion();
create trigger trigger_perfiles_actualizar
    before update on public.perfiles
    for each row execute function public.actualizar_fecha_modificacion();
create trigger trigger_pacientes_actualizar
    before update on public.pacientes
    for each row execute function public.actualizar_fecha_modificacion();
create trigger trigger_historiales_actualizar
    before update on public.historiales_clinicos
    for each row execute function public.actualizar_fecha_modificacion();
create trigger trigger_odontogramas_actualizar
    before update on public.odontogramas
    for each row execute function public.actualizar_fecha_modificacion();
create trigger trigger_diagnosticos_actualizar
    before update on public.diagnosticos
    for each row execute function public.actualizar_fecha_modificacion();
create trigger trigger_planes_tratamiento_actualizar
    before update on public.planes_tratamiento
    for each row execute function public.actualizar_fecha_modificacion();
create trigger trigger_procedimientos_actualizar
    before update on public.procedimientos_tratamiento
    for each row execute function public.actualizar_fecha_modificacion();
create trigger trigger_citas_actualizar
    before update on public.citas
    for each row execute function public.actualizar_fecha_modificacion();
create trigger trigger_presupuestos_actualizar
    before update on public.presupuestos
    for each row execute function public.actualizar_fecha_modificacion();
create trigger trigger_servicios_actualizar
    before update on public.servicios
    for each row execute function public.actualizar_fecha_modificacion();

-- ============================================================================
-- 5. SEED - 5 CLÍNICAS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5.1 CLÍNICAS
-- ----------------------------------------------------------------------------
insert into public.clinicas (nombre, slug, email, telefono, direccion, ciudad, pais, latitud, longitud, moneda, simbolo_moneda, activo) values
('Dental Cristo Rey',             'dental-cristo-rey', 'contacto@dentalcristorey.com', '+591 2 2445678', 'Av. 6 de Agosto Nº 2240, Edif. Torre Azul, Piso 3', 'La Paz',                 'Bolivia', -16.499000, -68.145000, 'Bs', 'Bs', true),
('Clínica Dental Los Andes',      'dental-los-andes',  'contacto@dentalandes.com',     '+591 2 2791234', 'Calacoto, Av. Costanera Nº 100, Edif. Alborada',      'La Paz',                 'Bolivia', -16.537500, -68.086500, 'Bs', 'Bs', true),
('Sonrisa Perfecta Dental',       'sonrisa-perfecta',  'info@sonrisaperfecta.com',      '+591 2 2834567', 'Ceja de El Alto, Av. Juan Pablo II Nº 1450',          'El Alto',                'Bolivia', -16.492000, -68.196000, 'Bs', 'Bs', true),
('Dental Vida',                   'dental-vida',       'contacto@dentalvida.com',       '+591 4 4501234', 'Av. América Oeste Nº 356',                            'Cochabamba',             'Bolivia', -17.392000, -66.152000, 'Bs', 'Bs', true),
('Dr. Sonrisa',                   'dr-sonrisa',        'hola@drsonrisa.com',            '+591 3 3335678', 'Av. Monseñor Rivero Nº 780, Zona Equipetrol',         'Santa Cruz de la Sierra', 'Bolivia', -17.771700, -63.174000, 'Bs', 'Bs', true);

-- ----------------------------------------------------------------------------
-- 5.2 PERFILES (odontólogos, recepcionistas y un paciente-usuario)
-- ----------------------------------------------------------------------------
insert into public.perfiles (email, nombre_completo, rol, clinica_id, especialidad, consultorio)
select v.email, v.nombre, v.rol, c.id, v.especialidad, v.consultorio
from (values
    ('dental-cristo-rey',  'ayrthon.rojas@dentalcristorey.com',    'Dr. Ayrthon Rojas Orellana',    'odontologo',    'Endodoncia y Odontología General', 'Consultorio 1'),
    ('dental-cristo-rey',  'carlos.vargas@dentalcristorey.com',    'Dr. Carlos Vargas Pinto',       'odontologo',    'Ortodoncia',                     'Consultorio 2'),
    ('dental-cristo-rey',  'luisa.mendoza@dentalcristorey.com',    'Dra. Luisa Mendoza Ruiz',       'odontologo',    'Periodoncia',                    'Consultorio 3'),
    ('dental-cristo-rey',  'maria.lopez@dentalcristorey.com',      'María López Cárdenas',          'recepcionista', NULL,                             'Recepción'),
    ('dental-los-andes',   'jorge.arce@dentalandes.com',           'Dr. Jorge Arce Torrez',         'odontologo',    'Odontología General',            'Consultorio 1'),
    ('dental-los-andes',   'carla.quispe@dentalandes.com',         'Carla Quispe Mamani',           'recepcionista', NULL,                             'Recepción'),
    ('sonrisa-perfecta',   'rosa.camacho@sonrisaperfecta.com',     'Dra. Rosa Camacho Flores',      'odontologo',    'Odontopediatría',                'Consultorio 1'),
    ('sonrisa-perfecta',   'pedro.huanca@sonrisaperfecta.com',     'Pedro Huanca Apaza',            'recepcionista', NULL,                             'Recepción'),
    ('dental-vida',        'fernando.lara@dentalvida.com',         'Dr. Fernando Lara Gutiérrez',   'odontologo',    'Cirugía Bucal',                  'Consultorio 1'),
    ('dental-vida',        'ana.silva@dentalvida.com',             'Ana Silva Rojas',               'recepcionista', NULL,                             'Recepción'),
    ('dr-sonrisa',         'marta.rios@drsonrisa.com',             'Dra. Marta Ríos Vaca',          'odontologo',    'Odontología General',            'Consultorio 1'),
    ('dr-sonrisa',         'luis.heredia@drsonrisa.com',           'Luis Heredia Salinas',          'recepcionista', NULL,                             'Recepción'),
    ('dental-cristo-rey',  'adriana.copa@gmail.com',               'Adriana Copa Limachi',          'paciente',      NULL,                             NULL)
) as v(slug, email, nombre, rol, especialidad, consultorio)
join public.clinicas c on c.slug = v.slug;

-- ----------------------------------------------------------------------------
-- 5.3 PACIENTES
-- ----------------------------------------------------------------------------
insert into public.pacientes (clinica_id, perfil_id, ci, nombre_completo, fecha_nacimiento, genero, telefono, email, direccion, ocupacion, tipo_sangre, alergias, contacto_emergencia_nombre, contacto_emergencia_telefono, contacto_emergencia_parentesco, notas)
select c.id,
       (select p2.id from public.perfiles p2 where p2.email = v.perfil_email),
       v.ci, v.nombre, v.fn::date, v.genero, v.tel, v.email, v.direccion, v.ocupacion,
       v.ts, v.alergias, v.emerg_n, v.emerg_t, v.emerg_p, v.notas
from (values
  -- Dental Cristo Rey (6 pacientes)
  ('dental-cristo-rey', '4875309 LP', 'Juan Carlos Mamani Quispe',    '1985-04-12', 'M', '+591 70000101', 'juan.mamani@gmail.com',     'Villa Fátima, Calle 3, Edif. Los Pinos',        'Docente',        'A+',  'Penicilina',   'Rosa Mamani',     '+591 70000102', 'Esposa', NULL, NULL),
  ('dental-cristo-rey', '5523401 LP', 'Rosa Delia Apaza Mamani',      '1990-08-25', 'F', '+591 70000103', 'rosa.apaza@hotmail.com',   'Sopocachi, Av. Sánchez Lima Nº 2451',           'Enfermera',      'O+',  NULL,           'Carmen Apaza',    '+591 70000104', 'Madre',  NULL, NULL),
  ('dental-cristo-rey', '6187320 LP', 'Pedro Luis Gutiérrez Choque',  '1978-01-30', 'M', '+591 70000105', 'pedro.gutierrez@gmail.com','Miraflores, Av. Illimani Nº 356',              'Ingeniero',      'B+',  'Ibuprofeno',   'María Gutiérrez', '+591 70000106', 'Hermana', NULL, NULL),
  ('dental-cristo-rey', '5910456 LP', 'Carmen Rosa Andrade Ríos',     '2001-11-17', 'F', '+591 70000107', 'carmen.andrade@gmail.com', 'Ciudad Satélite, Calle 8, Edif. Marcia',        'Estudiante',     'O-',  NULL,           'Julia Ríos',      '+591 70000108', 'Madre',  NULL, NULL),
  ('dental-cristo-rey', '7955210 LP', 'Miguel Ángel Torrez Salazar',  '1995-06-03', 'M', '+591 70000109', 'miguel.torrez@gmail.com',  'Achumani, Av. Ballivián Nº 800',                'Contador',       'O+',  NULL,           'Ana Salazar',     '+591 70000110', 'Madre',  NULL, NULL),
  ('dental-cristo-rey', '4421187 LP', 'Adriana Copa Limachi',         '1988-02-22', 'F', '+591 70000111', 'adriana.copa@gmail.com',   'San Pedro, Calle México Nº 450',                'Administradora', 'AB+', 'Látex',        'Limber Copa',     '+591 70000112', 'Esposo', NULL, 'adriana.copa@gmail.com'),
  -- Clínica Dental Los Andes (2 pacientes)
  ('dental-los-andes',  '5234881 LP', 'Gabriel Mamani Flores',        '1992-05-14', 'M', '+591 70100101', 'gabriel.mamani@gmail.com', 'La Paz, zona Obrajes, Av. Hernando Siles Nº 102','Comerciante',    'O+',  NULL,           NULL,              NULL,            NULL,     NULL, NULL),
  ('dental-los-andes',  '7741239 LP', 'Elena Villca Canaza',          '1983-09-09', 'F', '+591 70100102', 'elena.villca@gmail.com',   'La Paz, zona Llojeta, Calle 4 Nº 12',           'Ama de casa',    'A-',  'Penicilina',   NULL,              NULL,            NULL,     NULL, NULL),
  -- Sonrisa Perfecta (2 pacientes)
  ('sonrisa-perfecta',  '6123490 LP', 'Mateo Quispe Huanca',          '2015-03-21', 'M', '+591 70200101', 'familia.quispe@gmail.com', 'El Alto, Villa Dolores, Calle 6 Nº 23',         'Estudiante',     'O+',  'Látex',        'Julia Huanca',    '+591 70200102', 'Madre',  NULL, NULL),
  ('sonrisa-perfecta',  '5432231 LP', 'Daniela Mamani Pérez',         '2000-12-05', 'F', '+591 70200103', 'daniela.mamani@gmail.com', 'El Alto, Ciudad Satélite, Av. 4 Nº 15',         'Estudiante',     'B+',  NULL,           NULL,              NULL,            NULL,     NULL, NULL),
  -- Dental Vida (2 pacientes)
  ('dental-vida',       '3456781 CB', 'Jorge Camacho Ríos',           '1987-07-19', 'M', '+591 70300101', 'jorge.camacho@gmail.com',  'Cochabamba, zona Norte, Calle Colombia Nº 210', 'Agricultor',     'O+',  NULL,           NULL,              NULL,            NULL,     NULL, NULL),
  ('dental-vida',       '4509123 CB', 'Patricia Choque Rojas',        '1993-10-28', 'F', '+591 70300102', 'patricia.choque@gmail.com','Cochabamba, Cercado, Av. Blanco Galindo Km 4',  'Dependiente',    'B-',  'Penicilina',   NULL,              NULL,            NULL,     NULL, NULL),
  -- Dr. Sonrisa (2 pacientes)
  ('dr-sonrisa',        '6123345 SC', 'Renata Justiniano Roca',       '1996-04-02', 'F', '+591 70400101', 'renata.justiniano@gmail.com','Santa Cruz, Equipetrol, Calle Los Pitones 34',  'Abogada',        'A+',  NULL,           NULL,              NULL,            NULL,     NULL, NULL),
  ('dr-sonrisa',        '5598765 SC', 'Óscar Ribera Arteaga',         '1981-12-15', 'M', '+591 70400102', 'oscar.ribera@gmail.com',   'Santa Cruz, plan 3000, UV 120, Mz 5',           'Chofer',         'AB-', NULL,           NULL,              NULL,            NULL,     NULL, NULL)
) as v(slug, ci, nombre, fn, genero, tel, email, direccion, ocupacion, ts, alergias, emerg_n, emerg_t, emerg_p, notas, perfil_email)
join public.clinicas c on c.slug = v.slug;

-- ----------------------------------------------------------------------------
-- 5.4 SERVICIOS (catálogo por clínica)
-- ----------------------------------------------------------------------------
insert into public.servicios (clinica_id, nombre, descripcion, precio_por_defecto, duracion_minutos, activo)
select c.id, v.nombre, v.descripcion, v.precio, v.duracion, true
from (values
  -- Dental Cristo Rey (10)
  ('dental-cristo-rey', 'Consulta general',          'Diagnóstico inicial y evaluación',             100.00,  30),
  ('dental-cristo-rey', 'Profilaxis dental',         'Limpieza y pulido dental',                     200.00,  45),
  ('dental-cristo-rey', 'Radiografía panorámica',    'Estudio radiográfico completo',                150.00,  15),
  ('dental-cristo-rey', 'Obturación de caries',      'Restauración de pieza dental',                 250.00,  45),
  ('dental-cristo-rey', 'Endodoncia',                'Tratamiento de conducto',                      900.00,  90),
  ('dental-cristo-rey', 'Extracción dental',         'Exodoncia simple',                             350.00,  30),
  ('dental-cristo-rey', 'Blanqueamiento dental',     'Aclaramiento estético',                       1200.00,  60),
  ('dental-cristo-rey', 'Corona de porcelana',       'Restauración protésica',                      1500.00,  90),
  ('dental-cristo-rey', 'Ortodoncia (mensual)',      'Aplicación y control de brackets',             600.00,  30),
  ('dental-cristo-rey', 'Implante dental',           'Implante unitario',                           2500.00,  90),
  -- Clínica Dental Los Andes (6)
  ('dental-los-andes',  'Consulta general',          'Diagnóstico inicial y evaluación',             120.00,  30),
  ('dental-los-andes',  'Profilaxis dental',         'Limpieza y pulido dental',                     180.00,  45),
  ('dental-los-andes',  'Obturación de caries',      'Restauración de pieza dental',                 220.00,  45),
  ('dental-los-andes',  'Endodoncia',                'Tratamiento de conducto',                      850.00,  90),
  ('dental-los-andes',  'Radiografía periapical',    'Radiografía de una pieza',                      80.00,  15),
  ('dental-los-andes',  'Extracción dental',         'Exodoncia simple',                             320.00,  30),
  -- Sonrisa Perfecta (5)
  ('sonrisa-perfecta',  'Consulta pediátrica',       'Evaluación dental de niños y niñas',            90.00,  30),
  ('sonrisa-perfecta',  'Profilaxis dental',         'Limpieza y pulido dental',                     180.00,  45),
  ('sonrisa-perfecta',  'Selladores dentales',       'Sellado de fosas y fisuras',                   120.00,  30),
  ('sonrisa-perfecta',  'Obturación de caries',      'Restauración de pieza dental',                 200.00,  45),
  ('sonrisa-perfecta',  'Fluorización',              'Aplicación tópica de flúor',                   100.00,  20),
  -- Dental Vida (5)
  ('dental-vida',       'Consulta general',          'Diagnóstico inicial y evaluación',             110.00,  30),
  ('dental-vida',       'Extracción de terceros molares', 'Exodoncia de muelas del juicio',          600.00,  60),
  ('dental-vida',       'Cirugía bucal menor',       'Cirugía de tejidos blandos y duros',           800.00,  90),
  ('dental-vida',       'Limpieza dental',           'Profilaxis y pulido',                          190.00,  45),
  ('dental-vida',       'Radiografía panorámica',    'Estudio radiográfico completo',                160.00,  20),
  -- Dr. Sonrisa (5)
  ('dr-sonrisa',        'Consulta general',          'Diagnóstico inicial y evaluación',             130.00,  30),
  ('dr-sonrisa',        'Blanqueamiento dental',     'Aclaramiento estético con LED',               1100.00,  60),
  ('dr-sonrisa',        'Ortodoncia (mensual)',      'Aplicación y control de brackets',             650.00,  30),
  ('dr-sonrisa',        'Profilaxis dental',         'Limpieza y pulido dental',                     210.00,  45),
  ('dr-sonrisa',        'Carillas de porcelana',     'Carillas estéticas por pieza',                1800.00,  90)
) as v(slug, nombre, descripcion, precio, duracion)
join public.clinicas c on c.slug = v.slug;

-- ----------------------------------------------------------------------------
-- 5.5 HISTORIALES CLÍNICOS
-- ----------------------------------------------------------------------------
insert into public.historiales_clinicos (clinica_id, paciente_id, motivo_consulta, antecedentes_medicos, antecedentes_odontologicos, alergias, medicamentos, enfermedades, habitos, observaciones)
select c.id, p.id, v.motivo, v.ant_med, v.ant_odon, v.alergias, v.medicamentos, v.enfermedades, v.habitos, v.observaciones
from (values
  ('dental-cristo-rey', 'Juan Carlos Mamani Quispe',   'Dolor en pieza 36',            'Hipertensión controlada', 'Obturaciones previas',      'Penicilina', 'Losartán 50 mg',        'Hipertensión',     'Bruxismo',                       'Remitido a endodoncia'),
  ('dental-cristo-rey', 'Rosa Delia Apaza Mamani',     'Control de profilaxis',        'Ninguno',                  'Ortodoncia previa',          NULL,         NULL,                   NULL,               'Fuma ocasionalmente',            NULL),
  ('dental-cristo-rey', 'Pedro Luis Gutiérrez Choque', 'Fractura de pieza 16',         'Sin antecedentes',          'Ninguno',                    'Ibuprofeno',  NULL,                   NULL,               'Consumo de mate',                'Posible corona'),
  ('dental-cristo-rey', 'Carmen Rosa Andrade Ríos',    'Dolor agudo en pieza 26',      'Ninguno',                   'Amalgamas en molares',       NULL,         'Anticonceptivos orales', NULL,               'Estudiante, pocas horas de sueño',NULL),
  ('dental-cristo-rey', 'Miguel Ángel Torrez Salazar', 'Evaluación para implante',     'Sin antecedentes',          'Ninguno',                    NULL,         NULL,                   NULL,               'No fuma',                        'Plan quirúrgico en curso'),
  ('dental-cristo-rey', 'Adriana Copa Limachi',        'Dolor de muela',               'Ninguna',                   'Obturaciones previas',       'Látex',       NULL,                   NULL,               NULL,                             NULL),
  ('dental-los-andes',  'Gabriel Mamani Flores',       'Consulta general',             'Ninguno',                   'Ninguno',                    NULL,         NULL,                   NULL,               NULL,                             NULL),
  ('dental-los-andes',  'Elena Villca Canaza',         'Dolor dental leve',            'Gastritis',                 'Ninguno',                    'Penicilina',  'Omeprazol',            NULL,               NULL,                             NULL),
  ('sonrisa-perfecta',  'Mateo Quispe Huanca',         'Control odontopediátrico',     'Ninguno',                   'Ninguno',                    'Látex',       NULL,                   NULL,               'Dieta alta en azúcar',           NULL),
  ('sonrisa-perfecta',  'Daniela Mamani Pérez',        'Fluorización',                 'Ninguno',                   'Ninguno',                    NULL,         NULL,                   NULL,               NULL,                             NULL),
  ('dental-vida',       'Jorge Camacho Ríos',          'Dolor en tercer molar 48',     'Diabetes tipo 2',           'Ninguno',                    NULL,         'Metformina',           'Diabetes',         NULL,                             'Control prequirúrgico'),
  ('dental-vida',       'Patricia Choque Rojas',       'Limpieza dental',              'Ninguno',                   'Ninguno',                    'Penicilina',  NULL,                   NULL,               NULL,                             NULL),
  ('dr-sonrisa',        'Renata Justiniano Roca',      'Mejora estética dental',       'Ninguno',                   'Blanqueamiento previo',      NULL,         NULL,                   NULL,               NULL,                             NULL),
  ('dr-sonrisa',        'Óscar Ribera Arteaga',        'Chequeo general',              'Sin antecedentes',          'Ninguno',                    NULL,         NULL,                   NULL,               'Fumador',                        NULL)
) as v(slug, paciente, motivo, ant_med, ant_odon, alergias, medicamentos, enfermedades, habitos, observaciones)
join public.clinicas c on c.slug = v.slug
join public.pacientes p on p.clinica_id = c.id and p.nombre_completo = v.paciente;

-- ----------------------------------------------------------------------------
-- 5.6 ODONTOGRAMAS (piezas en JSONB, nomenclatura FDI)
-- ----------------------------------------------------------------------------
insert into public.odontogramas (clinica_id, paciente_id, odontologo_id, fecha_examen, piezas, notas)
select c.id, p.id, odo.id, v.fecha::date, v.piezas::jsonb, v.notas
from (values
  ('dental-cristo-rey', 'Juan Carlos Mamani Quispe',  'ayrthon.rojas@dentalcristorey.com', '2026-07-15',
     '[{"numero":16,"condiciones":["caries"],"observacion":"caries oclusal en 16"},{"numero":26,"condiciones":["restauracion"],"observacion":"obturación clase II"},{"numero":36,"condiciones":["endodoncia"],"observacion":"tratamiento de conducto en curso"}]',
     'Estado inicial del tratamiento'),
  ('dental-cristo-rey', 'Rosa Delia Apaza Mamani',    'ayrthon.rojas@dentalcristorey.com', '2026-07-02',
     '[{"numero":26,"condiciones":["restauracion"],"observacion":"obturación clase I"}]',
     NULL),
  ('dental-cristo-rey', 'Pedro Luis Gutiérrez Choque','ayrthon.rojas@dentalcristorey.com', '2026-05-10',
     '[{"numero":16,"condiciones":["fractura"],"observacion":"fractura coronaria"},{"numero":11,"condiciones":["restauracion"]}]',
     NULL),
  ('dental-cristo-rey', 'Carmen Rosa Andrade Ríos',   'ayrthon.rojas@dentalcristorey.com', '2026-09-01',
     '[{"numero":26,"condiciones":["caries"],"observacion":"caries proximal"}]',
     NULL),
  ('dental-cristo-rey', 'Miguel Ángel Torrez Salazar','ayrthon.rojas@dentalcristorey.com', '2026-06-20',
     '[{"numero":36,"condiciones":["ausente"],"observacion":"pieza perdida"},{"numero":46,"condiciones":["caries"]}]',
     NULL),
  ('dental-cristo-rey', 'Adriana Copa Limachi',       'ayrthon.rojas@dentalcristorey.com', '2026-09-08',
     '[{"numero":16,"condiciones":["caries"],"observacion":"caries interproximal"},{"numero":12,"condiciones":["restauracion"]}]',
     NULL),
  ('sonrisa-perfecta',  'Mateo Quispe Huanca',        'rosa.camacho@sonrisaperfecta.com',  '2026-08-20',
     '[{"numero":54,"condiciones":["caries"],"observacion":"caries oclusal en 54"},{"numero":64,"condiciones":["sellador"]}]',
     NULL)
) as v(slug, paciente, odontologo, fecha, piezas, notas)
join public.clinicas c on c.slug = v.slug
join public.pacientes p on p.clinica_id = c.id and p.nombre_completo = v.paciente
join public.perfiles odo on odo.email = v.odontologo;

-- ----------------------------------------------------------------------------
-- 5.7 DIAGNÓSTICOS
-- ----------------------------------------------------------------------------
insert into public.diagnosticos (clinica_id, paciente_id, odontologo_id, numero_pieza, descripcion, observaciones, estado, fecha_diagnostico)
select c.id, p.id, odo.id, v.pieza, v.descripcion, v.observaciones, v.estado, v.fecha::date
from (values
  ('dental-cristo-rey', 'Juan Carlos Mamani Quispe',  'ayrthon.rojas@dentalcristorey.com', 36,  'Caries profunda con compromiso pulpar', 'Indicado tratamiento de conducto', 'activo',   '2026-07-15'),
  ('dental-cristo-rey', 'Juan Carlos Mamani Quispe',  'ayrthon.rojas@dentalcristorey.com', 36,  'Pulpitis irreversible',                 NULL,                                 'activo',   '2026-07-15'),
  ('dental-cristo-rey', 'Rosa Delia Apaza Mamani',    'ayrthon.rojas@dentalcristorey.com', 26,  'Caries oclusal',                        'Resuelta con obturación',            'resuelto', '2026-07-02'),
  ('dental-cristo-rey', 'Pedro Luis Gutiérrez Choque','ayrthon.rojas@dentalcristorey.com', 16,  'Fractura coronaria',                    'Posible restauración protésica',     'activo',   '2026-05-10'),
  ('dental-cristo-rey', 'Carmen Rosa Andrade Ríos',   'ayrthon.rojas@dentalcristorey.com', 26,  'Caries proximal',                       'Tratamiento en curso',               'activo',   '2026-09-01'),
  ('dental-cristo-rey', 'Miguel Ángel Torrez Salazar','ayrthon.rojas@dentalcristorey.com', 36,  'Pérdida de pieza 36',                   'Indicación de implante',             'inactivo', '2026-06-20'),
  ('dental-cristo-rey', 'Adriana Copa Limachi',       'ayrthon.rojas@dentalcristorey.com', 16,  'Caries interproximal',                  NULL,                                 'activo',   '2026-09-08'),
  ('sonrisa-perfecta',  'Mateo Quispe Huanca',        'rosa.camacho@sonrisaperfecta.com',  54,  'Caries apical en 54',                   NULL,                                 'activo',   '2026-08-20')
) as v(slug, paciente, odontologo, pieza, descripcion, observaciones, estado, fecha)
join public.clinicas c on c.slug = v.slug
join public.pacientes p on p.clinica_id = c.id and p.nombre_completo = v.paciente
join public.perfiles odo on odo.email = v.odontologo;

-- ----------------------------------------------------------------------------
-- 5.8 PLANES DE TRATAMIENTO
-- ----------------------------------------------------------------------------
insert into public.planes_tratamiento (clinica_id, paciente_id, odontologo_id, titulo, estado, costo_total, notas)
select c.id, p.id, odo.id, v.titulo, v.estado, v.costo, v.notas
from (values
  ('dental-cristo-rey', 'Juan Carlos Mamani Quispe',  'ayrthon.rojas@dentalcristorey.com', 'Plan de endodoncia pieza 36',          'en_proceso',  1150.00, 'Endodoncia + obturación definitiva'),
  ('dental-cristo-rey', 'Rosa Delia Apaza Mamani',    'ayrthon.rojas@dentalcristorey.com', 'Plan de profilaxis y control',         'completado',   200.00, NULL),
  ('dental-cristo-rey', 'Carmen Rosa Andrade Ríos',   'ayrthon.rojas@dentalcristorey.com', 'Plan de obturación pieza 26',          'aceptado',     250.00, NULL),
  ('dental-cristo-rey', 'Miguel Ángel Torrez Salazar','ayrthon.rojas@dentalcristorey.com', 'Plan de implante pieza 36',            'propuesto',   4000.00, 'Implante unitario + corona'),
  ('dental-cristo-rey', 'Adriana Copa Limachi',       'ayrthon.rojas@dentalcristorey.com', 'Plan de obturación y blanqueamiento',  'propuesto',   1450.00, NULL)
) as v(slug, paciente, odontologo, titulo, estado, costo, notas)
join public.clinicas c on c.slug = v.slug
join public.pacientes p on p.clinica_id = c.id and p.nombre_completo = v.paciente
join public.perfiles odo on odo.email = v.odontologo;

-- ----------------------------------------------------------------------------
-- 5.9 PROCEDIMIENTOS DEL PLAN DE TRATAMIENTO
-- ----------------------------------------------------------------------------
insert into public.procedimientos_tratamiento (clinica_id, plan_tratamiento_id, servicio_id, numero_pieza, descripcion, prioridad, costo, estado)
select c.id, pl.id, s.id, v.pieza, v.descripcion, v.prioridad, v.costo, v.estado
from (values
  ('dental-cristo-rey', 'Plan de endodoncia pieza 36',         'Endodoncia',           36,   'Tratamiento de conducto pieza 36',  'alta',   900.00, 'en_proceso'),
  ('dental-cristo-rey', 'Plan de endodoncia pieza 36',         'Obturación de caries', 36,   'Obturación definitiva',            'normal', 250.00, 'pendiente'),
  ('dental-cristo-rey', 'Plan de profilaxis y control',        'Profilaxis dental',    NULL, 'Limpieza y pulido dental',         'normal', 200.00, 'completado'),
  ('dental-cristo-rey', 'Plan de obturación pieza 26',         'Obturación de caries', 26,   'Obturación definitiva',            'normal', 250.00, 'pendiente'),
  ('dental-cristo-rey', 'Plan de implante pieza 36',           'Implante dental',      36,   'Implante unitario pieza 36',       'alta',   2500.00,'pendiente'),
  ('dental-cristo-rey', 'Plan de implante pieza 36',           'Corona de porcelana',  36,   'Corona sobre implante',            'normal', 1500.00,'pendiente'),
  ('dental-cristo-rey', 'Plan de obturación y blanqueamiento', 'Obturación de caries', 16,   'Obturación pieza 16',              'normal', 250.00, 'pendiente'),
  ('dental-cristo-rey', 'Plan de obturación y blanqueamiento', 'Blanqueamiento dental', NULL, 'Blanqueamiento integral',          'normal', 1200.00,'pendiente')
) as v(slug, plan, servicio, pieza, descripcion, prioridad, costo, estado)
join public.clinicas c on c.slug = v.slug
join public.planes_tratamiento pl on pl.clinica_id = c.id and pl.titulo = v.plan
join public.servicios s on s.clinica_id = c.id and s.nombre = v.servicio;

-- ----------------------------------------------------------------------------
-- 5.10 EVOLUCIONES CLÍNICAS
-- ----------------------------------------------------------------------------
insert into public.evoluciones_clinicas (clinica_id, paciente_id, odontologo_id, plan_tratamiento_id, numero_pieza, fecha_consulta, motivo_consulta, procedimiento_realizado, observaciones, indicaciones, proxima_atencion)
select c.id, p.id, odo.id, pl.id, v.pieza, v.fecha::date, v.motivo, v.realizado, v.observaciones, v.indicaciones, v.proxima::date
from (values
  ('dental-cristo-rey', 'Juan Carlos Mamani Quispe',  'ayrthon.rojas@dentalcristorey.com', 'Plan de endodoncia pieza 36',         36, '2026-08-20', 'Dolor en pieza 36',                 'Apertura cameral y limpieza de conductos', 'Sangrado leve',          'No masticar de ese lado',      '2026-08-27'),
  ('dental-cristo-rey', 'Juan Carlos Mamani Quispe',  'ayrthon.rojas@dentalcristorey.com', 'Plan de endodoncia pieza 36',         36, '2026-08-27', 'Continuación de endodoncia',       'Instrumentación y medicación',    NULL,                     'Mantener higiene bucal',      '2026-09-10'),
  ('dental-cristo-rey', 'Rosa Delia Apaza Mamani',    'ayrthon.rojas@dentalcristorey.com', 'Plan de profilaxis y control',        NULL,'2026-07-02', 'Profilaxis anual',                 'Limpieza y pulido dental',        NULL,                     'Enjuague con flúor',          NULL),
  ('dental-cristo-rey', 'Carmen Rosa Andrade Ríos',   'ayrthon.rojas@dentalcristorey.com', 'Plan de obturación pieza 26',         26, '2026-09-01', 'Dolor agudo en 26',                'Remoción de caries y obturación temporal', NULL, 'Evitar alimentos pegajosos', '2026-09-15'),
  ('dental-cristo-rey', 'Miguel Ángel Torrez Salazar','ayrthon.rojas@dentalcristorey.com', NULL,                               36, '2026-08-15', 'Evaluación de implante',           'Planificación quirúrgica',        NULL,                     NULL,                         '2026-09-14')
) as v(slug, paciente, odontologo, plan, pieza, fecha, motivo, realizado, observaciones, indicaciones, proxima)
join public.clinicas c on c.slug = v.slug
join public.pacientes p on p.clinica_id = c.id and p.nombre_completo = v.paciente
join public.perfiles odo on odo.email = v.odontologo
left join public.planes_tratamiento pl on pl.clinica_id = c.id and pl.titulo = v.plan;

-- ----------------------------------------------------------------------------
-- 5.11 HORARIOS (0=Domingo ... 6=Sábado)
-- ----------------------------------------------------------------------------
insert into public.horarios (clinica_id, odontologo_id, dia_semana, hora_inicio, hora_fin, activo)
select c.id, odo.id, v.dia, v.h_in::time, v.h_fin::time, true
from (values
  ('dental-cristo-rey', 'ayrthon.rojas@dentalcristorey.com', 1, '08:00', '12:00'),
  ('dental-cristo-rey', 'ayrthon.rojas@dentalcristorey.com', 1, '14:00', '18:00'),
  ('dental-cristo-rey', 'ayrthon.rojas@dentalcristorey.com', 2, '08:00', '12:00'),
  ('dental-cristo-rey', 'ayrthon.rojas@dentalcristorey.com', 2, '14:00', '18:00'),
  ('dental-cristo-rey', 'ayrthon.rojas@dentalcristorey.com', 3, '08:00', '12:00'),
  ('dental-cristo-rey', 'ayrthon.rojas@dentalcristorey.com', 3, '14:00', '18:00'),
  ('dental-cristo-rey', 'ayrthon.rojas@dentalcristorey.com', 4, '14:00', '19:00'),
  ('dental-cristo-rey', 'ayrthon.rojas@dentalcristorey.com', 5, '08:00', '12:00'),
  ('dental-cristo-rey', 'ayrthon.rojas@dentalcristorey.com', 5, '14:00', '18:00'),
  ('dental-cristo-rey', 'carlos.vargas@dentalcristorey.com',  2, '09:00', '13:00'),
  ('dental-cristo-rey', 'carlos.vargas@dentalcristorey.com',  3, '15:00', '19:00'),
  ('dental-cristo-rey', 'carlos.vargas@dentalcristorey.com',  5, '09:00', '13:00'),
  ('dental-cristo-rey', 'luisa.mendoza@dentalcristorey.com',  1, '09:00', '13:00'),
  ('dental-cristo-rey', 'luisa.mendoza@dentalcristorey.com',  3, '08:00', '12:00'),
  ('dental-cristo-rey', 'luisa.mendoza@dentalcristorey.com',  4, '14:00', '18:00'),
  ('dental-los-andes',  'jorge.arce@dentalandes.com',         1, '08:00', '12:00'),
  ('dental-los-andes',  'jorge.arce@dentalandes.com',         2, '14:00', '18:00'),
  ('dental-los-andes',  'jorge.arce@dentalandes.com',         3, '08:00', '12:00'),
  ('dental-los-andes',  'jorge.arce@dentalandes.com',         4, '14:00', '18:00'),
  ('dental-los-andes',  'jorge.arce@dentalandes.com',         5, '08:00', '12:00'),
  ('sonrisa-perfecta',  'rosa.camacho@sonrisaperfecta.com',   2, '09:00', '13:00'),
  ('sonrisa-perfecta',  'rosa.camacho@sonrisaperfecta.com',   4, '09:00', '13:00'),
  ('sonrisa-perfecta',  'rosa.camacho@sonrisaperfecta.com',   5, '14:00', '18:00'),
  ('dental-vida',       'fernando.lara@dentalvida.com',       1, '09:00', '13:00'),
  ('dental-vida',       'fernando.lara@dentalvida.com',       3, '14:00', '18:00'),
  ('dental-vida',       'fernando.lara@dentalvida.com',       5, '09:00', '13:00'),
  ('dr-sonrisa',        'marta.rios@drsonrisa.com',           1, '08:00', '12:00'),
  ('dr-sonrisa',        'marta.rios@drsonrisa.com',           2, '14:00', '18:00'),
  ('dr-sonrisa',        'marta.rios@drsonrisa.com',           4, '08:00', '12:00'),
  ('dr-sonrisa',        'marta.rios@drsonrisa.com',           5, '14:00', '18:00')
) as v(slug, odontologo, dia, h_in, h_fin)
join public.clinicas c on c.slug = v.slug
join public.perfiles odo on odo.email = v.odontologo;

-- ----------------------------------------------------------------------------
-- 5.12 CITAS
-- ----------------------------------------------------------------------------
insert into public.citas (clinica_id, paciente_id, odontologo_id, plan_tratamiento_id, fecha_cita, hora_inicio, hora_fin, estado, motivo_consulta, notas)
select c.id, p.id, odo.id, pl.id, v.fecha::date, v.h_in::time, v.h_fin::time, v.estado, v.motivo, v.notas
from (values
  -- Dental Cristo Rey
  ('dental-cristo-rey', 'Juan Carlos Mamani Quispe',    'ayrthon.rojas@dentalcristorey.com', 'Plan de endodoncia pieza 36',          '2026-08-27', '09:00', '10:30', 'atendida',   'Segunda sesión de endodoncia',           NULL),
  ('dental-cristo-rey', 'Juan Carlos Mamani Quispe',    'ayrthon.rojas@dentalcristorey.com', 'Plan de endodoncia pieza 36',          '2026-09-09', '09:00', '10:30', 'confirmada', 'Tercera sesión de endodoncia',          NULL),
  ('dental-cristo-rey', 'Rosa Delia Apaza Mamani',      'ayrthon.rojas@dentalcristorey.com', 'Plan de profilaxis y control',         '2026-07-02', '10:00', '10:45', 'atendida',   'Profilaxis anual',                      NULL),
  ('dental-cristo-rey', 'Rosa Delia Apaza Mamani',      'ayrthon.rojas@dentalcristorey.com', 'Plan de profilaxis y control',         '2026-09-10', '10:00', '10:45', 'confirmada', 'Control post tratamiento',              NULL),
  ('dental-cristo-rey', 'Carmen Rosa Andrade Ríos',     'ayrthon.rojas@dentalcristorey.com', 'Plan de obturación pieza 26',          '2026-09-01', '16:00', '16:45', 'atendida',   'Obturación temporal pieza 26',          NULL),
  ('dental-cristo-rey', 'Carmen Rosa Andrade Ríos',     'ayrthon.rojas@dentalcristorey.com', 'Plan de obturación pieza 26',          '2026-09-11', '15:00', '15:45', 'confirmada', 'Colocación de obturación definitiva',   NULL),
  ('dental-cristo-rey', 'Carmen Rosa Andrade Ríos',     'carlos.vargas@dentalcristorey.com', NULL,                                      '2026-09-15', '09:00', '09:45', 'reservada',  'Evaluación de ortodoncia',              NULL),
  ('dental-cristo-rey', 'Pedro Luis Gutiérrez Choque',  'ayrthon.rojas@dentalcristorey.com', NULL,                                      '2026-09-09', '11:00', '11:45', 'reservada',  'Evaluación de fractura pieza 16',       NULL),
  ('dental-cristo-rey', 'Miguel Ángel Torrez Salazar', 'ayrthon.rojas@dentalcristorey.com', 'Plan de implante pieza 36',            '2026-09-14', '09:00', '10:30', 'reservada',  'Colocación de implante',                NULL),
  ('dental-cristo-rey', 'Adriana Copa Limachi',         'ayrthon.rojas@dentalcristorey.com', 'Plan de obturación y blanqueamiento',  '2026-09-08', '16:00', '16:45', 'atendida',   'Obturación pieza 16',                   NULL),
  -- Clínica Dental Los Andes
  ('dental-los-andes',  'Gabriel Mamani Flores',        'jorge.arce@dentalandes.com',       NULL,                                      '2026-09-09', '09:00', '09:45', 'confirmada', 'Consulta general',                      NULL),
  ('dental-los-andes',  'Elena Villca Canaza',          'jorge.arce@dentalandes.com',       NULL,                                      '2026-09-10', '10:00', '10:45', 'reservada',  'Limpieza dental',                       NULL),
  -- Sonrisa Perfecta
  ('sonrisa-perfecta',  'Mateo Quispe Huanca',          'rosa.camacho@sonrisaperfecta.com', NULL,                                      '2026-09-09', '14:00', '14:45', 'confirmada', 'Control de selladores',                 NULL),
  ('sonrisa-perfecta',  'Daniela Mamani Pérez',         'rosa.camacho@sonrisaperfecta.com', NULL,                                      '2026-09-11', '09:00', '09:45', 'reservada',  'Fluorización',                          NULL),
  -- Dental Vida
  ('dental-vida',       'Jorge Camacho Ríos',           'fernando.lara@dentalvida.com',     NULL,                                      '2026-09-10', '15:00', '16:00', 'confirmada', 'Extracción de tercer molar',            NULL),
  ('dental-vida',       'Patricia Choque Rojas',        'fernando.lara@dentalvida.com',     NULL,                                      '2026-09-11', '09:00', '09:45', 'reservada',  'Limpieza dental',                       NULL),
  -- Dr. Sonrisa
  ('dr-sonrisa',        'Renata Justiniano Roca',       'marta.rios@drsonrisa.com',         NULL,                                      '2026-09-12', '10:00', '10:30', 'confirmada', 'Blanqueamiento dental',                 NULL),
  ('dr-sonrisa',        'Óscar Ribera Arteaga',         'marta.rios@drsonrisa.com',         NULL,                                      '2026-09-14', '11:00', '11:45', 'reservada',  'Consulta general',                      NULL)
) as v(slug, paciente, odontologo, plan, fecha, h_in, h_fin, estado, motivo, notas)
join public.clinicas c on c.slug = v.slug
join public.pacientes p on p.clinica_id = c.id and p.nombre_completo = v.paciente
join public.perfiles odo on odo.email = v.odontologo
left join public.planes_tratamiento pl on pl.clinica_id = c.id and pl.titulo = v.plan;

-- ----------------------------------------------------------------------------
-- 5.13 PRESUPUESTOS
-- ----------------------------------------------------------------------------
insert into public.presupuestos (clinica_id, paciente_id, odontologo_id, titulo, descuento, total, estado, valido_hasta, notas)
select c.id, p.id, odo.id, v.titulo, v.descuento, v.total, v.estado, v.valido::date, v.notas
from (values
  ('dental-cristo-rey', 'Juan Carlos Mamani Quispe',    'ayrthon.rojas@dentalcristorey.com', 'Presupuesto endodoncia pieza 36',             50.00, 1100.00, 'enviado',  '2026-11-30', 'Incluye endodoncia y obturación'),
  ('dental-cristo-rey', 'Carmen Rosa Andrade Ríos',     'ayrthon.rojas@dentalcristorey.com', 'Presupuesto obturación pieza 26',              0.00,  250.00, 'aceptado', '2026-11-30', NULL),
  ('dental-cristo-rey', 'Miguel Ángel Torrez Salazar', 'ayrthon.rojas@dentalcristorey.com', 'Presupuesto implante y corona',               100.00, 3900.00, 'enviado',  '2026-12-15', 'Implante unitario con corona de porcelana'),
  ('dental-cristo-rey', 'Adriana Copa Limachi',         'ayrthon.rojas@dentalcristorey.com', 'Presupuesto obturación y blanqueamiento',      0.00, 1450.00, 'borrador', NULL,         NULL),
  ('dental-cristo-rey', 'Rosa Delia Apaza Mamani',      'ayrthon.rojas@dentalcristorey.com', 'Presupuesto profilaxis anual',                 0.00,  200.00, 'aceptado', NULL,         NULL),
  ('dental-los-andes',  'Gabriel Mamani Flores',        'jorge.arce@dentalandes.com',       'Presupuesto consulta y limpieza',              0.00,  300.00, 'aceptado', NULL,         NULL),
  ('sonrisa-perfecta',  'Mateo Quispe Huanca',          'rosa.camacho@sonrisaperfecta.com', 'Presupuesto selladores y control',             0.00,  210.00, 'enviado',  '2026-11-30', NULL),
  ('dental-vida',       'Jorge Camacho Ríos',           'fernando.lara@dentalvida.com',     'Presupuesto extracción terceros molares',      0.00,  600.00, 'aceptado', NULL,         NULL),
  ('dr-sonrisa',        'Renata Justiniano Roca',       'marta.rios@drsonrisa.com',         'Presupuesto blanqueamiento dental',            50.00, 1050.00, 'enviado',  '2026-11-30', NULL)
) as v(slug, paciente, odontologo, titulo, descuento, total, estado, valido, notas)
join public.clinicas c on c.slug = v.slug
join public.pacientes p on p.clinica_id = c.id and p.nombre_completo = v.paciente
join public.perfiles odo on odo.email = v.odontologo;

-- ----------------------------------------------------------------------------
-- 5.14 ITEMS DE PRESUPUESTO
-- ----------------------------------------------------------------------------
insert into public.items_presupuesto (clinica_id, presupuesto_id, servicio_id, descripcion, numero_pieza, cantidad, precio_unitario, subtotal)
select c.id, pr.id, s.id, v.descripcion, v.pieza, v.cantidad, v.precio, v.subtotal
from (values
  ('dental-cristo-rey', 'Presupuesto endodoncia pieza 36',             'Endodoncia',           'Endodoncia pieza 36',     36,  1, 900.00,  900.00),
  ('dental-cristo-rey', 'Presupuesto endodoncia pieza 36',             'Obturación de caries', 'Obturación pieza 36',     36,  1, 250.00,  250.00),
  ('dental-cristo-rey', 'Presupuesto obturación pieza 26',             'Obturación de caries', 'Obturación pieza 26',     26,  1, 250.00,  250.00),
  ('dental-cristo-rey', 'Presupuesto implante y corona',               'Implante dental',      'Implante unitario pieza 36', 36, 1, 2500.00, 2500.00),
  ('dental-cristo-rey', 'Presupuesto implante y corona',               'Corona de porcelana',  'Corona sobre implante',   36,  1, 1500.00, 1500.00),
  ('dental-cristo-rey', 'Presupuesto obturación y blanqueamiento',     'Obturación de caries', 'Obturación pieza 16',     16,  1, 250.00,  250.00),
  ('dental-cristo-rey', 'Presupuesto obturación y blanqueamiento',     'Blanqueamiento dental','Blanqueamiento integral', NULL, 1, 1200.00, 1200.00),
  ('dental-cristo-rey', 'Presupuesto profilaxis anual',                'Profilaxis dental',    'Profilaxis anual',        NULL, 1, 200.00,  200.00),
  ('dental-los-andes',  'Presupuesto consulta y limpieza',             'Consulta general',     'Consulta inicial',        NULL, 1, 120.00,  120.00),
  ('dental-los-andes',  'Presupuesto consulta y limpieza',             'Profilaxis dental',    'Limpieza dental',         NULL, 1, 180.00,  180.00),
  ('sonrisa-perfecta',  'Presupuesto selladores y control',            'Consulta pediátrica',  'Consulta de control',     NULL, 1, 90.00,    90.00),
  ('sonrisa-perfecta',  'Presupuesto selladores y control',            'Selladores dentales',  'Selladores pieza 54',     54,  1, 120.00,  120.00),
  ('dental-vida',       'Presupuesto extracción terceros molares',     'Extracción de terceros molares', 'Exodoncia pieza 48', 48, 1, 600.00, 600.00),
  ('dr-sonrisa',        'Presupuesto blanqueamiento dental',           'Blanqueamiento dental','Blanqueamiento con LED',  NULL, 1, 1100.00, 1100.00)
) as v(slug, presupuesto, servicio, descripcion, pieza, cantidad, precio, subtotal)
join public.clinicas c on c.slug = v.slug
join public.presupuestos pr on pr.clinica_id = c.id and pr.titulo = v.presupuesto
join public.servicios s on s.clinica_id = c.id and s.nombre = v.servicio;

-- ----------------------------------------------------------------------------
-- 5.15 PAGOS
-- ----------------------------------------------------------------------------
insert into public.pagos (clinica_id, paciente_id, presupuesto_id, monto, metodo_pago, fecha_pago, codigo_referencia, notas, estado, registrado_por)
select c.id, p.id, pr.id, v.monto, v.metodo, v.fecha::date, v.ref, v.notas, v.estado, rp.id
from (values
  ('dental-cristo-rey', 'Juan Carlos Mamani Quispe',    'Presupuesto endodoncia pieza 36',        550.00, 'transferencia', '2026-09-01', 'TRF-2026-0910', 'Primer pago (50%)',  'confirmado', 'maria.lopez@dentalcristorey.com'),
  ('dental-cristo-rey', 'Juan Carlos Mamani Quispe',    'Presupuesto endodoncia pieza 36',        550.00, 'efectivo',      '2026-09-12', NULL,              'Saldo pendiente',     'pendiente',  'maria.lopez@dentalcristorey.com'),
  ('dental-cristo-rey', 'Carmen Rosa Andrade Ríos',     'Presupuesto obturación pieza 26',        250.00, 'efectivo',      '2026-09-02', NULL,              'Pago total',          'confirmado', 'maria.lopez@dentalcristorey.com'),
  ('dental-cristo-rey', 'Rosa Delia Apaza Mamani',      'Presupuesto profilaxis anual',           200.00, 'efectivo',      '2026-07-02', NULL,              NULL,                  'confirmado', 'maria.lopez@dentalcristorey.com'),
  ('dental-cristo-rey', 'Miguel Ángel Torrez Salazar', 'Presupuesto implante y corona',         1000.00, 'qr',            '2026-09-05', 'QR-001124',       'Seña de implante',    'confirmado', 'maria.lopez@dentalcristorey.com'),
  ('dental-los-andes',  'Gabriel Mamani Flores',        'Presupuesto consulta y limpieza',        300.00, 'transferencia', '2026-09-02', 'TRF-2026-0915', NULL,                  'confirmado', 'carla.quispe@dentalandes.com'),
  ('sonrisa-perfecta',  'Mateo Quispe Huanca',          'Presupuesto selladores y control',       120.00, 'qr',            '2026-09-03', 'QR-889977',       'Saldo pendiente 90',  'confirmado', 'pedro.huanca@sonrisaperfecta.com'),
  ('dental-vida',       'Jorge Camacho Ríos',           'Presupuesto extracción terceros molares', 200.00, 'efectivo',      '2026-09-04', NULL,              'Saldo pendiente 400', 'confirmado', 'ana.silva@dentalvida.com'),
  ('dr-sonrisa',        'Renata Justiniano Roca',       'Presupuesto blanqueamiento dental',       500.00, 'transferencia', '2026-09-06', 'TRF-2026-0920', 'Saldo pendiente 550', 'confirmado', 'luis.heredia@drsonrisa.com')
) as v(slug, paciente, presupuesto, monto, metodo, fecha, ref, notas, estado, registrado_por)
join public.clinicas c on c.slug = v.slug
join public.pacientes p on p.clinica_id = c.id and p.nombre_completo = v.paciente
join public.perfiles rp on rp.email = v.registrado_por
left join public.presupuestos pr on pr.clinica_id = c.id and pr.titulo = v.presupuesto;

-- ============================================================================
-- 6. VERIFICACIÓN RÁPIDA
-- ============================================================================
-- Consultas de ejemplo para confirmar que la base quedó poblada:
--
-- select nombre, ciudad, moneda from public.clinicas order by nombre;
-- select c.nombre as clinica, count(*) as pacientes from public.pacientes pc
--   join public.clinicas c on c.id = pc.clinica_id group by c.nombre order by c.nombre;
-- select c.nombre, count(*) citas from public.citas ct
--   join public.clinicas c on c.id = ct.clinica_id group by c.nombre;
-- select p.nombre_completo, sum(pg.monto) as pagado
--   from public.pacientes p join public.pagos pg on pg.paciente_id = p.id
--   where p.clinica_id = (select id from public.clinicas where slug='dental-cristo-rey')
--   group by p.nombre_completo order by p.nombre_completo;
-- ============================================================================
-- FIN DE LA BASE DE DATOS MIDENTISTA (5 CLÍNICAS)
-- ============================================================================
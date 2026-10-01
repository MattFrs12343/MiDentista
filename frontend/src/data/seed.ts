import type {
  Paciente,
  HistoriaClinica,
  CondicionPieza,
  Diagnostico,
  PlanTratamiento,
} from "@/types";

export const pacientesSeed: Paciente[] = [
  {
    id: "p1",
    nombres: "Valeria",
    apellidos: "Fernández Quispe",
    ci: "6234871 LP",
    fechaNacimiento: "1994-03-12",
    sexo: "femenino",
    telefono: "+591 700 45211",
    email: "valeria.fernandez@gmail.com",
    direccion: "Av. Ballivián #1420, Sopocachi, La Paz",
    creadoEl: "2026-08-14",
  },
  {
    id: "p2",
    nombres: "Marcelo",
    apellidos: "Ibáñez Choque",
    ci: "5871093 LP",
    fechaNacimiento: "1988-11-02",
    sexo: "masculino",
    telefono: "+591 712 88034",
    email: "marcelo.ibanez88@hotmail.com",
    direccion: "Calle Illampu #732, La Paz",
    creadoEl: "2026-08-20",
  },
  {
    id: "p3",
    nombres: "Daniela",
    apellidos: "Paredes Mamani",
    ci: "7452108 LP",
    fechaNacimiento: "2001-06-27",
    sexo: "femenino",
    telefono: "+591 699 21456",
    email: "daniela.paredes01@gmail.com",
    direccion: "Zona Miraflores, calle 4 #221, La Paz",
    creadoEl: "2026-09-02",
  },
];

export const historiasSeed: Record<string, HistoriaClinica> = {
  p1: {
    pacienteId: "p1",
    motivoConsulta: "Dolor en molar inferior derecho al masticar, de una semana de evolución.",
    antecedentesPersonales: "Bruxismo nocturno. Sin cirugías previas.",
    antecedentesFamiliares: "Madre con antecedente de enfermedad periodontal.",
    enfermedadesBase: ["Hipotiroidismo controlado"],
    alergias: [{ id: "a1", sustancia: "Penicilina", severidad: "grave" }],
  },
  p2: {
    pacienteId: "p2",
    motivoConsulta: "Control de rutina y limpieza semestral.",
    antecedentesPersonales: "Fumador ocasional.",
    antecedentesFamiliares: "Sin antecedentes relevantes.",
    enfermedadesBase: [],
    alergias: [],
  },
  p3: {
    pacienteId: "p3",
    motivoConsulta: "Sensibilidad al frío en pieza 26 desde hace tres días.",
    antecedentesPersonales: "Ninguno relevante.",
    antecedentesFamiliares: "Padre con caries múltiples en la juventud.",
    enfermedadesBase: [],
    alergias: [{ id: "a2", sustancia: "Látex", severidad: "leve" }],
  },
};

export const odontogramasSeed: Record<string, CondicionPieza[]> = {
  p1: [
    { pieza: 46, condicion: "caries", nota: "Caries oclusal profunda", actualizadoEl: "2026-09-25" },
    { pieza: 36, condicion: "obturado", actualizadoEl: "2024-02-10" },
    { pieza: 16, condicion: "corona", actualizadoEl: "2022-07-01" },
  ],
  p2: [
    { pieza: 18, condicion: "ausente", actualizadoEl: "2020-01-01" },
    { pieza: 28, condicion: "ausente", actualizadoEl: "2020-01-01" },
  ],
  p3: [{ pieza: 26, condicion: "caries", nota: "Sensibilidad al frío", actualizadoEl: "2026-09-27" }],
};

export const diagnosticosSeed: Record<string, Diagnostico[]> = {
  p1: [
    {
      id: "d1",
      descripcion: "Caries dental profunda con compromiso pulpar probable en pieza 46.",
      pieza: 46,
      registradoEl: "2026-09-25",
    },
  ],
  p2: [],
  p3: [
    {
      id: "d2",
      descripcion: "Caries incipiente interproximal en pieza 26.",
      pieza: 26,
      registradoEl: "2026-09-27",
    },
  ],
};

export const planesSeed: Record<string, PlanTratamiento> = {
  p1: {
    pacienteId: "p1",
    observaciones: "Prioridad alta por riesgo de compromiso pulpar. Requiere radiografía periapical previa.",
    items: [
      {
        id: "t1",
        procedimiento: "Endodoncia",
        pieza: 46,
        costoEstimado: 850,
        prioridad: "alta",
      },
      {
        id: "t2",
        procedimiento: "Corona de porcelana",
        pieza: 46,
        costoEstimado: 1200,
        prioridad: "media",
      },
    ],
  },
  p2: { pacienteId: "p2", observaciones: "", items: [] },
  p3: {
    pacienteId: "p3",
    observaciones: "Tratamiento conservador, control en tres semanas.",
    items: [
      {
        id: "t3",
        procedimiento: "Obturación resina compuesta",
        pieza: 26,
        costoEstimado: 320,
        prioridad: "media",
      },
    ],
  },
};

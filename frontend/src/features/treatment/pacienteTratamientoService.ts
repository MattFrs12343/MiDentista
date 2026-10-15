import type { SupabaseClient } from "@supabase/supabase-js";
import type { Paciente } from "../../types/index.ts";
import { obtenerSupabase } from "../../lib/supabase.ts";
import { exigirUuid } from "./diagnosticoMapper.ts";
import { puedeLeerDiagnosticos } from "./diagnosticoPermisos.ts";
import type { PerfilDiagnosticos } from "./tipos.ts";

export interface PacienteTratamiento { paciente: Paciente; clinicaId: string }
/** Lectura confirmada de la ficha actual, independiente del cache global de pacientes. */
export async function obtenerPacienteTratamiento(id: string, perfil: PerfilDiagnosticos, cliente?: SupabaseClient): Promise<PacienteTratamiento> {
  exigirUuid(id, "pacienteId");
  if (!puedeLeerDiagnosticos(perfil)) throw new Error("Perfil sin acceso a la ficha clínica.");
  if (perfil.clinicaId !== null) exigirUuid(perfil.clinicaId, "clinicaId");
  let consulta = (cliente ?? obtenerSupabase()).schema("public").from("pacientes")
    .select("id,clinica_id,nombre_completo,nombres,apellidos,ci,fecha_nacimiento,genero,telefono,email,direccion,creado_en").eq("id", id).eq("activo", true);
  if (perfil.clinicaId !== null) consulta = consulta.eq("clinica_id", perfil.clinicaId);
  const { data, error } = await consulta.single();
  if (error || !data) throw new Error("No se pudo confirmar el paciente de esta ficha. Revisa sesión, permisos y conexión y reintenta.", { cause: error });
  const f = data as unknown as Record<string, unknown>;
  exigirUuid(f.id, "id recibido"); exigirUuid(f.clinica_id, "clínica recibida");
  if ((f.id as string).toLowerCase() !== id.toLowerCase()
      || (perfil.clinicaId && (f.clinica_id as string).toLowerCase() !== perfil.clinicaId.toLowerCase())) throw new Error("La ficha recibida pertenece a otro paciente o clínica.");
  const texto = (campo: string) => {
    if (f[campo] === null) return "";
    if (typeof f[campo] !== "string") throw new Error(`Campo de paciente no confirmado: ${campo}.`);
    return f[campo] as string;
  };
  const fecha = texto("fecha_nacimiento");
  const creado = texto("creado_en");
  if ((fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) || (creado && !Number.isFinite(Date.parse(creado)))) throw new Error("Fecha del paciente no válida.");
  const nombres = texto("nombres"), apellidos = texto("apellidos");
  return { clinicaId: (f.clinica_id as string).toLowerCase(), paciente: {
    id: (f.id as string).toLowerCase(), nombres: nombres || (!apellidos ? texto("nombre_completo") : ""), apellidos,
    ci: texto("ci"), fechaNacimiento: fecha, sexo: f.genero === "M" ? "masculino" : f.genero === "F" ? "femenino" : "otro",
    telefono: texto("telefono"), email: texto("email"), direccion: texto("direccion"), creadoEl: creado.slice(0, 10),
  } };
}

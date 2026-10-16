import { esUuid } from "./diagnosticoMapper.ts";
import type { DiagnosticoPaciente, PerfilDiagnosticos } from "./tipos.ts";

export function puedeLeerDiagnosticos(perfil: PerfilDiagnosticos | null): boolean {
  return Boolean(perfil?.activo && esUuid(perfil.id) && (perfil.rol === "superadmin"
    || ((perfil.rol === "odontologo" || perfil.rol === "odontologo_admin" || perfil.rol === "recepcionista") && perfil.clinicaId && esUuid(perfil.clinicaId))));
}

export function puedeCrearDiagnostico(perfil: PerfilDiagnosticos | null): boolean {
  return Boolean(perfil?.activo && (perfil.rol === "odontologo" || perfil.rol === "odontologo_admin") && esUuid(perfil.id)
    && perfil.clinicaId && esUuid(perfil.clinicaId));
}

export function puedeEditarDiagnostico(perfil: PerfilDiagnosticos | null, diagnostico: DiagnosticoPaciente): boolean {
  return puedeCrearDiagnostico(perfil) && perfil!.id.toLowerCase() === diagnostico.odontologoId
    && perfil!.clinicaId!.toLowerCase() === diagnostico.clinicaId;
}

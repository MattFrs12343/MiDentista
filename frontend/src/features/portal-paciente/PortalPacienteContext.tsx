import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { miFichaPacienteApi, type FichaPaciente } from "@/data/api";

interface PortalState {
  ficha: FichaPaciente | null;
  cargando: boolean;
  error: string | null;
  recargar: () => Promise<void>;
}

const PortalPacienteContext = createContext<PortalState | null>(null);

/** Carga la ficha del paciente una sola vez para todas las vistas del portal. */
export function PortalPacienteProvider({ children }: { children: ReactNode }) {
  const [ficha, setFicha] = useState<FichaPaciente | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setFicha(await miFichaPacienteApi());
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo cargar tu información");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  return (
    <PortalPacienteContext.Provider value={{ ficha, cargando, error, recargar }}>
      {children}
    </PortalPacienteContext.Provider>
  );
}

export function usePortalPaciente() {
  const ctx = useContext(PortalPacienteContext);
  if (!ctx) throw new Error("usePortalPaciente debe usarse dentro de PortalPacienteProvider");
  return ctx;
}

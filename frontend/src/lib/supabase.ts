import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cliente: SupabaseClient | undefined;

/** Inicialización diferida: la demo no necesita variables de Supabase. */
export function obtenerSupabase(): SupabaseClient {
  if (cliente) return cliente;

  const url = import.meta.env?.VITE_SUPABASE_URL?.trim();
  const clave = import.meta.env?.VITE_SUPABASE_ANON_KEY?.trim();
  if (!url || !clave) {
    throw new Error(
      "Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en frontend/.env.local.",
    );
  }

  cliente = createClient(url, clave);
  return cliente;
}
